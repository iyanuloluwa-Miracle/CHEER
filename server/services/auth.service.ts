import * as bcrypt from 'bcryptjs';
import { ApiError } from '../lib/errors';
import { getServerEnv } from '../lib/env';
import {
  AuditLogModel,
  CreatorProfileModel,
  OtpChallengeModel,
  UserModel,
  toPlain,
  useDb,
  withTransaction,
} from '../db';
import { insertedId, type LeanDoc } from '../db/lean';
import type { OtpChallenge, User } from '../db/types';
import { AuditAction, OtpPurpose } from '../db/enums';
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
    private readonly notifications = new TransactionalNotificationsService(),
  ) {}

  async requestOtp(
    emailRaw: string,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<RequestOtpResponse> {
    await useDb();
    const email = normalizeEmail(emailRaw);
    const purpose = OtpPurpose.EMAIL_VERIFICATION;
    const pepper = this.requirePepper();

    const existing = toPlain<User>(
      await UserModel.findOne({ email }).lean<LeanDoc | null>(),
    );
    if (existing?.emailVerifiedAt && existing.passwordHash) {
      throw new ApiError(
        409,
        'ACCOUNT_EXISTS',
        'An account with this email already exists. Please log in.',
      );
    }

    const recent = toPlain<OtpChallenge>(
      await OtpChallengeModel.findOne({ email, purpose })
        .sort({ createdAt: -1 })
        .lean<LeanDoc | null>(),
    );

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

    let userId = existing?.id;
    if (!userId) {
      const [created] = await UserModel.create([{ email }]);
      userId = insertedId(created);
      await AuditLogModel.create([
        {
          actorUserId: userId,
          action: AuditAction.USER_CREATED,
          entityType: 'User',
          entityId: userId,
          metadata: { source: 'signup_otp_request' },
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        },
      ]);
    }

    await OtpChallengeModel.updateMany(
      { email, purpose, consumedAt: null },
      { $set: { consumedAt: new Date() } },
    );

    const code = generateOtpCode();
    const codeHash = hashOtp(code, pepper);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    const [createdChallenge] = await OtpChallengeModel.create([
      {
        userId,
        email,
        codeHash,
        purpose,
        expiresAt,
        maxAttempts: OTP_MAX_ATTEMPTS,
      },
    ]);
    const challengeId = insertedId(createdChallenge);

    try {
      await this.notifications.notifyOtp({
        userId,
        email,
        code,
        challengeId,
        purpose,
      });
    } catch (err) {
      await OtpChallengeModel.updateOne(
        { _id: challengeId },
        { $set: { consumedAt: new Date() } },
      );
      console.warn(`OTP email delivery failed for challenge=${challengeId}`);
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
    await useDb();
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

    const challenge = toPlain<OtpChallenge>(
      await OtpChallengeModel.findOne({ email, purpose })
        .sort({ createdAt: -1 })
        .lean<LeanDoc | null>(),
    );

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
      const updated = toPlain<OtpChallenge>(
        await OtpChallengeModel.findOneAndUpdate(
          { _id: challenge.id },
          { $inc: { attemptCount: 1 } },
          { new: true },
        ).lean<LeanDoc | null>(),
      );

      await this.recordLoginFailure(
        challenge.userId,
        email,
        'INVALID_CODE',
        meta,
      );

      if (updated && updated.attemptCount >= updated.maxAttempts) {
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

    const verified = await withTransaction(async (session) => {
      await OtpChallengeModel.updateOne(
        { _id: challenge.id },
        { $set: { consumedAt: now } },
        { session },
      );

      const user = toPlain<User>(
        await UserModel.findOneAndUpdate(
          challenge.userId ? { _id: challenge.userId } : { email },
          {
            $set: {
              emailVerifiedAt: now,
              passwordHash,
              updatedAt: now,
            },
          },
          { new: true, session },
        ).lean<LeanDoc | null>(),
      );

      if (!user) {
        throw new Error('Verified OTP challenge has no matching user.');
      }

      await AuditLogModel.create(
        [
          {
            actorUserId: user.id,
            action: AuditAction.EMAIL_VERIFIED,
            entityType: 'User',
            entityId: user.id,
            metadata: { purpose, challengeId: challenge.id },
            ipAddress: meta?.ipAddress,
            userAgent: meta?.userAgent,
          },
        ],
        { session },
      );

      await AuditLogModel.create(
        [
          {
            actorUserId: user.id,
            action: AuditAction.LOGIN_SUCCESS,
            entityType: 'User',
            entityId: user.id,
            metadata: { method: 'signup_otp' },
            ipAddress: meta?.ipAddress,
            userAgent: meta?.userAgent,
          },
        ],
        { session },
      );

      return user;
    });

    const accessToken = await signAccessToken({
      sub: verified.id,
      email: verified.email,
    });

    void this.notifications
      .notifyAccountVerified({ userId: verified.id, email: verified.email })
      .catch((err) => {
        console.warn(
          `Account verified email failed user=${verified.id}: ${err instanceof Error ? err.message : 'unknown'}`,
        );
      });

    return {
      accessToken,
      response: {
        ok: true,
        user: this.toPublicUser({
          ...verified,
          creatorProfile: await this.findCreatorProfileRef(verified.id),
        }),
      },
    };
  }

  async loginWithPassword(
    emailRaw: string,
    password: string,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ response: VerifyOtpResponse; accessToken: string }> {
    await useDb();
    const email = normalizeEmail(emailRaw);
    const user = toPlain<User>(
      await UserModel.findOne({ email }).lean<LeanDoc | null>(),
    );

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

    const [loginAudit] = await AuditLogModel.create([
      {
        actorUserId: user.id,
        action: AuditAction.LOGIN_SUCCESS,
        entityType: 'User',
        entityId: user.id,
        metadata: { method: 'password' },
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      },
    ]);
    const auditLogId = insertedId(loginAudit);

    const accessToken = await signAccessToken({
      sub: user.id,
      email: user.email,
    });

    void this.notifications
      .notifySecurityLogin({
        userId: user.id,
        email: user.email,
        method: 'password',
        auditLogId,
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
        user: this.toPublicUser({
          ...user,
          creatorProfile: await this.findCreatorProfileRef(user.id),
        }),
      },
    };
  }

  async getUserById(userId: string): Promise<PublicUser | null> {
    await useDb();
    const user = toPlain<User>(
      await UserModel.findOne({ _id: userId }).lean<LeanDoc | null>(),
    );
    if (!user) return null;
    return this.toPublicUser({
      ...user,
      creatorProfile: await this.findCreatorProfileRef(user.id),
    });
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

  private async findCreatorProfileRef(
    userId: string,
  ): Promise<{ id: string } | null> {
    const profile = await CreatorProfileModel.findOne({ userId })
      .select('_id')
      .lean<LeanDoc | null>();
    return profile ? { id: String(profile._id) } : null;
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
    await AuditLogModel.create([
      {
        actorUserId: userId ?? null,
        action: AuditAction.LOGIN_FAILURE,
        entityType: 'User',
        entityId: userId ?? null,
        metadata: { email, reason },
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      },
    ]);
  }
}
