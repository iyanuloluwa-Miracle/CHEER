import {
  NotificationProvider,
  NotificationStatus,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { usePrisma } from '../../lib/prisma';
import { ResendService } from './resend.service';
import {
  accountVerifiedEmail,
  otpEmail,
  securityLoginEmail,
  tipReceivedEmail,
} from './email-templates';

export interface TransactionalSendResult {
  status: 'sent' | 'skipped' | 'failed';
  notificationId?: string;
  providerMessageId?: string;
}

/**
 * Idempotent transactional emails on top of ResendService.
 * Never creates a second Resend client.
 *
 * Financial state and communication state stay separate: tip payment
 * success must not be reversed when email delivery fails.
 */
export class TransactionalNotificationsService {
  constructor(
    private readonly prisma = usePrisma(),
    private readonly resend = new ResendService(),
  ) {}

  /**
   * Core send with Notification-row idempotency.
   * - SENT → skip (no duplicate email)
   * - FAILED → safe retry
   * - missing → send and persist
   * - critical=true → rethrow after recording FAILED (OTP)
   * - critical=false → swallow after FAILED (tips / account / security)
   * - retryOnce → one immediate retry after first Resend failure
   */
  async send(params: {
    type: NotificationType;
    to: string;
    userId?: string | null;
    subject: string;
    html: string;
    text?: string;
    idempotencyKey: string;
    metadata?: Record<string, unknown>;
    critical?: boolean;
    retryOnce?: boolean;
    /** Prefer this row when retrying a known FAILED notification. */
    existingId?: string;
  }): Promise<TransactionalSendResult> {
    const metadata = {
      ...(params.metadata ?? {}),
      idempotencyKey: params.idempotencyKey,
    };

    let existing = params.existingId
      ? await this.prisma.notification.findUnique({
          where: { id: params.existingId },
          select: { id: true, status: true },
        })
      : await this.findByIdempotencyKey(params.idempotencyKey);

    if (!existing) {
      existing = await this.findByIdempotencyKey(params.idempotencyKey);
    }

    if (existing?.status === NotificationStatus.SENT) {
      return { status: 'skipped', notificationId: existing.id };
    }

    const attempt = async (): Promise<TransactionalSendResult> => {
      const result = await this.resend.sendEmail({
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
        idempotencyKey: params.idempotencyKey,
      });

      const provider =
        result.provider === 'RESEND'
          ? NotificationProvider.RESEND
          : NotificationProvider.DEV_LOG;

      if (existing) {
        const updated = await this.prisma.notification.update({
          where: { id: existing.id },
          data: {
            status: NotificationStatus.SENT,
            provider,
            providerMessageId: result.id,
            metadata: metadata,
          },
        });
        return {
          status: 'sent',
          notificationId: updated.id,
          providerMessageId: result.id,
        };
      }

      const created = await this.prisma.notification.create({
        data: {
          userId: params.userId ?? undefined,
          email: params.to,
          type: params.type,
          provider,
          providerMessageId: result.id,
          status: NotificationStatus.SENT,
          metadata: metadata,
        },
      });
      return {
        status: 'sent',
        notificationId: created.id,
        providerMessageId: result.id,
      };
    };

    try {
      return await attempt();
    } catch (firstErr) {
      console.error(
        `Resend failed key=${params.idempotencyKey}: ${firstErr instanceof Error ? firstErr.message : 'unknown'}`,
      );

      if (params.retryOnce) {
        try {
          return await attempt();
        } catch (retryErr) {
          console.error(
            `Resend retry failed key=${params.idempotencyKey}: ${retryErr instanceof Error ? retryErr.message : 'unknown'}`,
          );
          const failed = await this.persistFailed({
            existingId: existing?.id,
            to: params.to,
            userId: params.userId,
            type: params.type,
            metadata,
            error: retryErr,
          });
          if (params.critical) throw firstErr;
          return { status: 'failed', notificationId: failed.id };
        }
      }

      const failed = await this.persistFailed({
        existingId: existing?.id,
        to: params.to,
        userId: params.userId,
        type: params.type,
        metadata,
        error: firstErr,
      });
      if (params.critical) throw firstErr;
      return { status: 'failed', notificationId: failed.id };
    }
  }

  /** Tip paid — only call after authoritative PAID transition. */
  async notifyTipReceived(params: {
    tipId: string;
    userId: string;
    email: string;
    amount: string;
    currency: string;
    isAnonymous: boolean;
    supporterName: string | null;
  }): Promise<TransactionalSendResult> {
    // Backward-compatible dedupe on tipId (Phase 7/8 rows may lack idempotencyKey).
    const byTip = await this.prisma.notification.findFirst({
      where: {
        type: NotificationType.EMAIL_TIP_RECEIVED,
        metadata: { path: ['tipId'], equals: params.tipId },
      },
      select: { id: true, status: true },
    });
    if (byTip?.status === NotificationStatus.SENT) {
      return { status: 'skipped', notificationId: byTip.id };
    }

    const copy = tipReceivedEmail({
      amount: params.amount,
      currency: params.currency,
      isAnonymous: params.isAnonymous,
      supporterName: params.supporterName,
    });
    return this.send({
      type: NotificationType.EMAIL_TIP_RECEIVED,
      to: params.email,
      userId: params.userId,
      subject: copy.subject,
      html: copy.html,
      text: copy.text,
      idempotencyKey: `tip_paid_${params.tipId}`,
      metadata: { tipId: params.tipId },
      critical: false,
      retryOnce: true,
      existingId:
        byTip?.status === NotificationStatus.FAILED ? byTip.id : undefined,
    });
  }

  async notifyAccountVerified(params: {
    userId: string;
    email: string;
  }): Promise<TransactionalSendResult> {
    const copy = accountVerifiedEmail();
    return this.send({
      type: NotificationType.EMAIL_ACCOUNT_VERIFIED,
      to: params.email,
      userId: params.userId,
      subject: copy.subject,
      html: copy.html,
      text: copy.text,
      idempotencyKey: `account_verified_${params.userId}`,
      metadata: { kind: 'account_verified' },
      critical: false,
      retryOnce: true,
    });
  }

  async notifySecurityLogin(params: {
    userId: string;
    email: string;
    method: string;
    auditLogId?: string;
  }): Promise<TransactionalSendResult> {
    const atIso = new Date().toISOString();
    const copy = securityLoginEmail({ method: params.method, atIso });
    const key =
      params.auditLogId != null
        ? `security_login_${params.auditLogId}`
        : `security_login_${params.userId}_${atIso.slice(0, 13)}`;
    return this.send({
      type: NotificationType.EMAIL_SECURITY_ALERT,
      to: params.email,
      userId: params.userId,
      subject: copy.subject,
      html: copy.html,
      text: copy.text,
      idempotencyKey: key,
      metadata: {
        kind: 'security_login',
        method: params.method,
        auditLogId: params.auditLogId,
      },
      critical: false,
      retryOnce: false,
    });
  }

  /** OTP — critical path; failure surfaces to the caller. */
  async notifyOtp(params: {
    userId: string;
    email: string;
    code: string;
    challengeId: string;
    purpose: string;
  }): Promise<TransactionalSendResult> {
    const copy = otpEmail(params.code);
    return this.send({
      type: NotificationType.EMAIL_OTP,
      to: params.email,
      userId: params.userId,
      subject: copy.subject,
      html: copy.html,
      text: copy.text,
      idempotencyKey: `otp-${params.challengeId}`,
      metadata: {
        purpose: params.purpose,
        challengeId: params.challengeId,
      },
      critical: true,
      retryOnce: false,
    });
  }

  private async findByIdempotencyKey(idempotencyKey: string) {
    return this.prisma.notification.findFirst({
      where: {
        metadata: { path: ['idempotencyKey'], equals: idempotencyKey },
      },
      select: { id: true, status: true },
    });
  }

  private async persistFailed(params: {
    existingId?: string;
    to: string;
    userId?: string | null;
    type: NotificationType;
    metadata: Record<string, unknown>;
    error: unknown;
  }) {
    const failureMeta = {
      ...params.metadata,
      lastError:
        params.error instanceof Error ? params.error.message : 'unknown',
      failedAt: new Date().toISOString(),
    } as Prisma.InputJsonValue;

    if (params.existingId) {
      return this.prisma.notification.update({
        where: { id: params.existingId },
        data: {
          status: NotificationStatus.FAILED,
          metadata: failureMeta,
        },
      });
    }

    return this.prisma.notification.create({
      data: {
        userId: params.userId ?? undefined,
        email: params.to,
        type: params.type,
        provider: NotificationProvider.RESEND,
        status: NotificationStatus.FAILED,
        metadata: failureMeta,
      },
    });
  }
}
