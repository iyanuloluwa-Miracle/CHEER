import {
  AuditAction,
  OtpPurpose,
  type User,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { ApiError } from '../lib/errors';
import { getServerEnv } from '../lib/env';
import { usePrisma } from '../lib/prisma';
import { signAccessToken } from '../lib/auth';
import { TransactionalNotificationsService } from './notifications/transactional-notifications.service';
import {
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
} from './auth/otp.constants';
import {
  generateOtpCode,
  hashOtp,
  normalizeEmail,
  normalizeOtp,
  verifyOtpHash,
} from './auth/otp.crypto';
import type {
  PublicUser,
  RequestOtpResponse,
  VerifyOtpResponse,
} from './auth/auth.types';

const BCRYPT_ROUNDS = 12;

export class AuthService {
  constructor(
    private readonly prisma = usePrisma(),
    private readonly notifications = new TransactionalNotificationsService(),
  ) {}

  async requestOtp(
    emailRaw: string,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<RequestOtpResponse> {
    const email = normalizeEmail(emailRaw);
    const purpose = OtpPurpose.EMAIL_VERIFICATION;
    const pepper = this.requirePepper();

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing?.emailVerifiedAt && existing.passwordHash) {
      throw new ApiError(
        409,
        'ACCOUNT_EXISTS',
        'An account with this email already exists. Please log in.',
      );
    }

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
        throw new ApiError(
          429,
          'RESEND_COOLDOWN',
          `Please wait ${retryAfterSeconds}s before requesting another code.`,
          retryAfterSeconds,
        );
      }
    }

    let user = existing;
    if (!user) {
      user = await this.prisma.user.create({ data: { email } });
      await this.prisma.auditLog.create({
        data: {
          actorUserId: user.id,
          action: AuditAction.USER_CREATED,
          entityType: 'User',
          entityId: user.id,
          metadata: { source: 'signup_otp_request' },
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        },
      });
    }

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

    try {
      await this.notifications.notifyOtp({
        userId: user.id,
        email,
        code,
        challengeId: challenge.id,
        purpose,
      });
    } catch (err) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: new Date() },
      });
      console.warn(`OTP email delivery failed for challenge=${challenge.id}`);
      throw err;
    }

    return {
      ok: true,
      expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
      resendAvailableInSeconds: Math.floor(OTP_RESEND_COOLDOWN_MS / 1000),
    };
  }

  async verifyOtp(
    emailRaw: string,
    codeRaw: string,
    password: string,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ response: VerifyOtpResponse; accessToken: string }> {
    const email = normalizeEmail(emailRaw);
    const code = normalizeOtp(codeRaw);
    const purpose = OtpPurpose.EMAIL_VERIFICATION;
    const pepper = this.requirePepper();

    if (!password || password.length < 8) {
      throw new ApiError(
        400,
        'INVALID_PASSWORD',
        'Password must be at least 8 characters.',
      );
    }

    const challenge = await this.prisma.otpChallenge.findFirst({
      where: { email, purpose },
      orderBy: { createdAt: 'desc' },
    });

    if (!challenge) {
      await this.recordLoginFailure(null, email, 'NO_CHALLENGE', meta);
      throw new ApiError(
        400,
        'INVALID_OTP',
        'Invalid or expired verification code.',
      );
    }

    if (challenge.consumedAt) {
      await this.recordLoginFailure(challenge.userId, email, 'CONSUMED', meta);
      throw new ApiError(
        400,
        'OTP_CONSUMED',
        'This verification code has already been used.',
      );
    }

    if (challenge.expiresAt.getTime() <= Date.now()) {
      await this.recordLoginFailure(challenge.userId, email, 'EXPIRED', meta);
      throw new ApiError(
        400,
        'EXPIRED_OTP',
        'This verification code has expired. Request a new one.',
      );
    }

    if (challenge.attemptCount >= challenge.maxAttempts) {
      await this.recordLoginFailure(
        challenge.userId,
        email,
        'TOO_MANY_ATTEMPTS',
        meta,
      );
      throw new ApiError(
        429,
        'TOO_MANY_ATTEMPTS',
        'Too many incorrect attempts. Request a new verification code.',
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
        throw new ApiError(
          429,
          'TOO_MANY_ATTEMPTS',
          'Too many incorrect attempts. Request a new verification code.',
        );
      }

      throw new ApiError(
        400,
        'INVALID_OTP',
        'Invalid or expired verification code.',
      );
    }

    const now = new Date();
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await this.prisma.$transaction(async (tx) => {
      await tx.otpChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: now },
      });

      const verified = await tx.user.update({
        where: challenge.userId ? { id: challenge.userId } : { email },
        data: {
          emailVerifiedAt: now,
          passwordHash,
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
          metadata: { method: 'signup_otp' },
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        },
      });

      return verified;
    });

    const accessToken = await signAccessToken({
      sub: user.id,
      email: user.email,
    });

    void this.notifications
      .notifyAccountVerified({ userId: user.id, email: user.email })
      .catch((err) => {
        console.warn(
          `Account verified email failed user=${user.id}: ${err instanceof Error ? err.message : 'unknown'}`,
        );
      });

    return {
      accessToken,
      response: {
        ok: true,
        user: this.toPublicUser(user),
      },
    };
  }

  async loginWithPassword(
    emailRaw: string,
    password: string,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ response: VerifyOtpResponse; accessToken: string }> {
    const email = normalizeEmail(emailRaw);
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { creatorProfile: { select: { id: true } } },
    });

    if (!user?.passwordHash || !user.emailVerifiedAt) {
      await this.recordLoginFailure(
        user?.id,
        email,
        'INVALID_CREDENTIALS',
        meta,
      );
      throw new ApiError(
        401,
        'INVALID_CREDENTIALS',
        'Invalid email or password.',
      );
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      await this.recordLoginFailure(
        user.id,
        email,
        'INVALID_CREDENTIALS',
        meta,
      );
      throw new ApiError(
        401,
        'INVALID_CREDENTIALS',
        'Invalid email or password.',
      );
    }

    const loginAudit = await this.prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: AuditAction.LOGIN_SUCCESS,
        entityType: 'User',
        entityId: user.id,
        metadata: { method: 'password' },
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      },
    });

    const accessToken = await signAccessToken({
      sub: user.id,
      email: user.email,
    });

    void this.notifications
      .notifySecurityLogin({
        userId: user.id,
        email: user.email,
        method: 'password',
        auditLogId: loginAudit.id,
      })
      .catch((err) => {
        console.warn(
          `Security login email failed user=${user.id}: ${err instanceof Error ? err.message : 'unknown'}`,
        );
      });

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
    if (!user) return null;
    return this.toPublicUser(user);
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

  private requirePepper(): string {
    const pepper = getServerEnv().OTP_HASH_PEPPER;
    if (!pepper) {
      throw new Error('OTP_HASH_PEPPER is not configured');
    }
    return pepper;
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
