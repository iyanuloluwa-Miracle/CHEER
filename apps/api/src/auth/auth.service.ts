import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  AuditAction,
  NotificationProvider,
  NotificationStatus,
  NotificationType,
  OtpPurpose,
  type User,
} from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { SendByteService } from '../notifications/sendbyte.service';
import type {
  AuthUserPayload,
  PublicUser,
  RequestOtpResponse,
  VerifyOtpResponse,
} from './auth.types';
import {
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
} from './otp.constants';
import {
  generateOtpCode,
  hashOtp,
  normalizeEmail,
  normalizeOtp,
  verifyOtpHash,
} from './otp.crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sendByte: SendByteService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async requestOtp(
    emailRaw: string,
    purposeRaw: string = 'LOGIN',
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<RequestOtpResponse> {
    const email = normalizeEmail(emailRaw);
    const purpose = this.resolvePurpose(purposeRaw);
    const pepper = this.requirePepper();

    const recent = await this.prisma.otpChallenge.findFirst({
      where: { email, purpose },
      orderBy: { createdAt: 'desc' },
    });

    if (recent) {
      const elapsed = Date.now() - recent.createdAt.getTime();
      if (elapsed < OTP_RESEND_COOLDOWN_MS) {
        const retryAfterSeconds = Math.ceil(
          (OTP_RESEND_COOLDOWN_MS - elapsed) / 1000,
        );
        throw new HttpException(
          {
            statusCode: 429,
            error: 'RESEND_COOLDOWN',
            message: `Please wait ${retryAfterSeconds}s before requesting another code.`,
            retryAfterSeconds,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await this.prisma.user.create({ data: { email } });
      await this.prisma.auditLog.create({
        data: {
          actorUserId: user.id,
          action: AuditAction.USER_CREATED,
          entityType: 'User',
          entityId: user.id,
          metadata: { source: 'otp_request' },
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        },
      });
    }

    // Invalidate prior unused challenges for this email + purpose
    await this.prisma.otpChallenge.updateMany({
      where: {
        email,
        purpose,
        consumedAt: null,
      },
      data: { consumedAt: new Date() },
    });

    const code = generateOtpCode();
    const codeHash = hashOtp(code, pepper);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    const challenge = await this.prisma.otpChallenge.create({
      data: {
        userId: user.id,
        email,
        codeHash,
        purpose,
        expiresAt,
        maxAttempts: OTP_MAX_ATTEMPTS,
      },
    });

    const html = this.buildOtpEmailHtml(code);
    const text = `Your TippyMe verification code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`;

    try {
      const sendResult = await this.sendByte.sendEmail({
        to: email,
        subject: 'Your TippyMe verification code',
        html,
        text,
        idempotencyKey: `otp-${challenge.id}`,
      });

      await this.prisma.notification.create({
        data: {
          userId: user.id,
          email,
          type: NotificationType.EMAIL_OTP,
          provider:
            sendResult.provider === 'SENDBYTE'
              ? NotificationProvider.SENDBYTE
              : NotificationProvider.DEV_LOG,
          providerMessageId: sendResult.id,
          status: NotificationStatus.SENT,
          metadata: {
            purpose,
            challengeId: challenge.id,
            // Never store the OTP code in notification metadata
          },
        },
      });
    } catch (err) {
      // Challenge remains but cannot be used usefully without delivery —
      // mark consumed so it cannot be brute-forced from a failed send.
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: new Date() },
      });
      this.logger.warn(
        `OTP email delivery failed for challenge=${challenge.id}`,
      );
      throw err;
    }

    // Intentionally never log or return `code`.

    return {
      ok: true,
      expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
      resendAvailableInSeconds: Math.floor(OTP_RESEND_COOLDOWN_MS / 1000),
    };
  }

  async verifyOtp(
    emailRaw: string,
    codeRaw: string,
    purposeRaw: string = 'LOGIN',
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ response: VerifyOtpResponse; accessToken: string }> {
    const email = normalizeEmail(emailRaw);
    const code = normalizeOtp(codeRaw);
    const purpose = this.resolvePurpose(purposeRaw);
    const pepper = this.requirePepper();

    const challenge = await this.prisma.otpChallenge.findFirst({
      where: { email, purpose },
      orderBy: { createdAt: 'desc' },
    });

    if (!challenge) {
      await this.recordLoginFailure(null, email, 'NO_CHALLENGE', meta);
      throw new BadRequestException({
        statusCode: 400,
        error: 'INVALID_OTP',
        message: 'Invalid or expired verification code.',
      });
    }

    if (challenge.consumedAt) {
      await this.recordLoginFailure(challenge.userId, email, 'CONSUMED', meta);
      throw new BadRequestException({
        statusCode: 400,
        error: 'OTP_CONSUMED',
        message: 'This verification code has already been used.',
      });
    }

    if (challenge.expiresAt.getTime() <= Date.now()) {
      await this.recordLoginFailure(challenge.userId, email, 'EXPIRED', meta);
      throw new BadRequestException({
        statusCode: 400,
        error: 'EXPIRED_OTP',
        message: 'This verification code has expired. Request a new one.',
      });
    }

    if (challenge.attemptCount >= challenge.maxAttempts) {
      await this.recordLoginFailure(
        challenge.userId,
        email,
        'TOO_MANY_ATTEMPTS',
        meta,
      );
      throw new HttpException(
        {
          statusCode: 429,
          error: 'TOO_MANY_ATTEMPTS',
          message:
            'Too many incorrect attempts. Request a new verification code.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const valid = verifyOtpHash(code, challenge.codeHash, pepper);

    if (!valid) {
      const updated = await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attemptCount: { increment: 1 } },
      });

      await this.recordLoginFailure(
        challenge.userId,
        email,
        'INVALID_CODE',
        meta,
      );

      if (updated.attemptCount >= updated.maxAttempts) {
        throw new HttpException(
          {
            statusCode: 429,
            error: 'TOO_MANY_ATTEMPTS',
            message:
              'Too many incorrect attempts. Request a new verification code.',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      throw new BadRequestException({
        statusCode: 400,
        error: 'INVALID_OTP',
        message: 'Invalid or expired verification code.',
      });
    }

    const now = new Date();

    const user = await this.prisma.$transaction(async (tx) => {
      await tx.otpChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: now },
      });

      const verified = await tx.user.update({
        where: challenge.userId ? { id: challenge.userId } : { email },
        data: {
          emailVerifiedAt: now,
        },
        include: { creatorProfile: { select: { id: true } } },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: verified.id,
          action: AuditAction.EMAIL_VERIFIED,
          entityType: 'User',
          entityId: verified.id,
          metadata: { purpose, challengeId: challenge.id },
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: verified.id,
          action: AuditAction.LOGIN_SUCCESS,
          entityType: 'User',
          entityId: verified.id,
          metadata: { purpose },
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        },
      });

      return verified;
    });

    const accessToken = await this.signAccessToken(user);

    return {
      accessToken,
      response: {
        ok: true,
        user: this.toPublicUser(user),
      },
    };
  }

  async getUserById(userId: string): Promise<PublicUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { creatorProfile: { select: { id: true } } },
    });
    if (!user) {
      return null;
    }
    return this.toPublicUser(user);
  }

  async signAccessToken(user: Pick<User, 'id' | 'email'>): Promise<string> {
    const payload: AuthUserPayload = {
      sub: user.id,
      email: user.email,
    };
    return this.jwt.signAsync(payload);
  }

  async verifyAccessToken(token: string): Promise<AuthUserPayload> {
    try {
      return await this.jwt.verifyAsync<AuthUserPayload>(token);
    } catch {
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'UNAUTHORIZED',
        message: 'Authentication required.',
      });
    }
  }

  toPublicUser(
    user: User & { creatorProfile?: { id: string } | null },
  ): PublicUser {
    return {
      id: user.id,
      email: user.email,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      hasCreatorProfile: Boolean(user.creatorProfile),
    };
  }

  private resolvePurpose(purposeRaw: string): OtpPurpose {
    if (purposeRaw === 'EMAIL_VERIFICATION') {
      return OtpPurpose.EMAIL_VERIFICATION;
    }
    return OtpPurpose.LOGIN;
  }

  private requirePepper(): string {
    const pepper = this.config.get<string>('OTP_HASH_PEPPER');
    if (!pepper) {
      throw new Error('OTP_HASH_PEPPER is not configured');
    }
    return pepper;
  }

  private buildOtpEmailHtml(code: string): string {
    // Code is only embedded in the outbound email body, never logged.
    return `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; color: #0f1c17;">
  <p>Your TippyMe verification code is:</p>
  <p style="font-size: 28px; font-weight: 700; letter-spacing: 0.2em;">${code}</p>
  <p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>
</body>
</html>`.trim();
  }

  private async recordLoginFailure(
    userId: string | null | undefined,
    email: string,
    reason: string,
    meta?: { ipAddress?: string; userAgent?: string },
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId ?? undefined,
        action: AuditAction.LOGIN_FAILURE,
        entityType: 'User',
        entityId: userId ?? undefined,
        metadata: { email, reason },
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      },
    });
  }
}
