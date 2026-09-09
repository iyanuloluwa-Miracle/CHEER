import {
  AuditAction,
  PaymentProvider,
  PaymentStatus,
  Prisma,
  TipStatus,
} from '@prisma/client';
import { usePrisma } from '../../lib/prisma';
import { TransactionalNotificationsService } from '../notifications/transactional-notifications.service';
import { BachsProviderError } from '../payments/bachs/bachs.errors';
import type { VerifyPaymentResult } from '../payments/payment-provider.port';
import {
  canTransitionTip,
  isTipTerminal,
  mapVerificationToStatuses,
} from '../payments/payment-status.transitions';
import { PaymentsService } from '../payments/payments.service';

export type WebhookProcessOutcome =
  | 'ignored_duplicate'
  | 'ignored_unknown'
  | 'ignored_malformed'
  | 'ignored_mismatch'
  | 'ignored_terminal'
  | 'ignored_pending'
  | 'updated'
  | 'verify_failed';

export interface ProcessWebhookResult {
  ok: boolean;
  outcome: WebhookProcessOutcome;
  tipId?: string;
  /** When true, caller should respond 5xx so Bachs retries. */
  retryable?: boolean;
}

/**
 * Authoritative Bachs webhook fulfilment (Phase 8).
 * Signature is verified by the payment provider before this runs.
 * Tip emails fire only after DB SUCCESS — never from frontend redirects.
 */
export class WebhookFulfilmentService {
  constructor(
    private readonly prisma = usePrisma(),
    private readonly payments = new PaymentsService(),
    private readonly notifications = new TransactionalNotificationsService(),
  ) {}

  async processSignedBachsEvent(params: {
    providerEventId?: string;
    eventType?: string;
    tipId?: string;
    verification?: VerifyPaymentResult;
  }): Promise<ProcessWebhookResult> {
    const { providerEventId, eventType, tipId, verification } = params;

    if (!providerEventId || !eventType) {
      return { ok: true, outcome: 'ignored_malformed' };
    }

    const existing = await this.prisma.webhookEvent.findUnique({
      where: { providerEventId },
      select: { id: true, processedAt: true },
    });
    if (existing?.processedAt) {
      return { ok: true, outcome: 'ignored_duplicate' };
    }

    if (!verification?.providerReference) {
      await this.recordIgnoredEvent(providerEventId, eventType, {
        reason: 'no_checkout_id',
      });
      return { ok: true, outcome: 'ignored_malformed' };
    }

    const tip = await this.findTip({
      tipId,
      providerReference: verification.providerReference,
    });

    if (!tip) {
      console.warn(
        `Webhook unknown transaction evt=${providerEventId} chk=${verification.providerReference}`,
      );
      await this.recordIgnoredEvent(providerEventId, eventType, {
        reason: 'unknown_transaction',
        providerReference: verification.providerReference,
      });
      return { ok: true, outcome: 'ignored_unknown' };
    }

    if (isTipTerminal(tip.status)) {
      await this.recordProcessedEvent(providerEventId, eventType, {
        tipId: tip.id,
        reason: 'already_terminal',
        status: tip.status,
      });
      return { ok: true, outcome: 'ignored_terminal', tipId: tip.id };
    }

    // Server-side verify with Bachs (docs: prefer webhook + retrieve)
    let verified: VerifyPaymentResult;
    try {
      verified = await this.payments.verifyPayment({
        providerReference: verification.providerReference,
        internalReference: tip.paymentTransaction?.internalReference,
      });
    } catch (err) {
      const kind = err instanceof BachsProviderError ? err.kind : 'PROVIDER';
      console.error(
        `Webhook Bachs verify failed tip=${tip.id} kind=${kind}`,
      );
      return {
        ok: false,
        outcome: 'verify_failed',
        tipId: tip.id,
        retryable:
          kind === 'TIMEOUT' || kind === 'NETWORK' || kind === 'PROVIDER',
      };
    }

    const mismatch = this.validateAgainstTip(tip, verified);
    if (mismatch) {
      console.error(
        `Webhook validation mismatch tip=${tip.id} reason=${mismatch}`,
      );
      await this.recordProcessedEvent(providerEventId, eventType, {
        tipId: tip.id,
        reason: 'mismatch',
        detail: mismatch,
        verifiedStatus: verified.status,
      });
      return { ok: true, outcome: 'ignored_mismatch', tipId: tip.id };
    }

    const mapped = mapVerificationToStatuses(verified.status);
    if (!mapped) {
      await this.recordProcessedEvent(providerEventId, eventType, {
        tipId: tip.id,
        reason: 'pending_or_unknown',
        verifiedStatus: verified.status,
      });
      return { ok: true, outcome: 'ignored_pending', tipId: tip.id };
    }

    if (!canTransitionTip(tip.status, mapped.tipStatus)) {
      await this.recordProcessedEvent(providerEventId, eventType, {
        tipId: tip.id,
        reason: 'transition_blocked',
        from: tip.status,
        to: mapped.tipStatus,
      });
      return { ok: true, outcome: 'ignored_terminal', tipId: tip.id };
    }

    const applied = await this.applyTransition({
      tip,
      mapped,
      verified,
      providerEventId,
      eventType,
    });

    if (applied.notified && mapped.tipStatus === TipStatus.PAID) {
      await this.notifyCreatorTipReceived(tip.id);
    }

    return {
      ok: true,
      outcome: applied.updated ? 'updated' : 'ignored_duplicate',
      tipId: tip.id,
    };
  }

  private validateAgainstTip(
    tip: {
      id: string;
      amount: Prisma.Decimal;
      currency: string;
      paymentTransaction: {
        amount: Prisma.Decimal;
        currency: string;
        internalReference: string;
      } | null;
    },
    verified: VerifyPaymentResult,
  ): string | null {
    // Reference on Bachs checkout should be TippyMe tip id
    const ref = verified.metadata?.reference;
    if (typeof ref === 'string' && ref.length > 0 && ref !== tip.id) {
      return 'reference_mismatch';
    }

    if (verified.amount) {
      const expected = tip.amount.toFixed(2);
      const got = new Prisma.Decimal(verified.amount).toFixed(2);
      if (expected !== got) {
        return `amount_mismatch expected=${expected} got=${got}`;
      }
    }

    if (verified.currency) {
      if (verified.currency.toUpperCase() !== tip.currency.toUpperCase()) {
        return `currency_mismatch expected=${tip.currency} got=${verified.currency}`;
      }
    }

    return null;
  }

  private async applyTransition(params: {
    tip: {
      id: string;
      status: TipStatus;
      paymentTransactionId: string | null;
      paymentTransaction: { provider: PaymentProvider } | null;
    };
    mapped: { tipStatus: TipStatus; paymentStatus: PaymentStatus };
    verified: VerifyPaymentResult;
    providerEventId: string;
    eventType: string;
  }): Promise<{ updated: boolean; notified: boolean }> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.webhookEvent.create({
          data: {
            providerEventId: params.providerEventId,
            provider:
              params.tip.paymentTransaction?.provider ?? PaymentProvider.BACHS,
            eventType: params.eventType,
            payload: {
              status: params.verified.status,
              providerReference: params.verified.providerReference,
              rawStatus: params.verified.rawStatus,
            },
            processedAt: new Date(),
          },
        });

        // Re-check tip status inside transaction
        const fresh = await tx.tip.findUnique({
          where: { id: params.tip.id },
          select: { status: true },
        });
        if (!fresh || isTipTerminal(fresh.status)) {
          return;
        }
        if (!canTransitionTip(fresh.status, params.mapped.tipStatus)) {
          return;
        }

        if (params.tip.paymentTransactionId) {
          await tx.paymentTransaction.update({
            where: { id: params.tip.paymentTransactionId },
            data: {
              status: params.mapped.paymentStatus,
              providerReference: params.verified.providerReference,
              rawProviderStatus: params.verified.rawStatus,
            },
          });
        }

        await tx.tip.update({
          where: { id: params.tip.id },
          data: { status: params.mapped.tipStatus },
        });

        await tx.auditLog.create({
          data: {
            action: AuditAction.TIP_STATUS_CHANGED,
            entityType: 'Tip',
            entityId: params.tip.id,
            metadata: {
              from: fresh.status,
              to: params.mapped.tipStatus,
              via: params.eventType,
              providerEventId: params.providerEventId,
            },
          },
        });

        if (params.tip.paymentTransactionId) {
          await tx.auditLog.create({
            data: {
              action: AuditAction.PAYMENT_STATUS_CHANGED,
              entityType: 'PaymentTransaction',
              entityId: params.tip.paymentTransactionId,
              metadata: {
                to: params.mapped.paymentStatus,
                via: params.eventType,
                providerEventId: params.providerEventId,
              },
            },
          });
        }
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        return { updated: false, notified: false };
      }
      throw err;
    }

    return {
      updated: true,
      notified: params.mapped.tipStatus === TipStatus.PAID,
    };
  }

  private async findTip(params: { tipId?: string; providerReference: string }) {
    if (params.tipId) {
      const byId = await this.prisma.tip.findUnique({
        where: { id: params.tipId },
        include: {
          paymentTransaction: true,
          creator: {
            include: { user: { select: { id: true, email: true } } },
          },
        },
      });
      if (byId) return byId;
    }

    const payment = await this.prisma.paymentTransaction.findFirst({
      where: { providerReference: params.providerReference },
      include: {
        tip: {
          include: {
            paymentTransaction: true,
            creator: {
              include: { user: { select: { id: true, email: true } } },
            },
          },
        },
      },
    });
    return payment?.tip ?? null;
  }

  private async recordIgnoredEvent(
    providerEventId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ) {
    try {
      await this.prisma.webhookEvent.create({
        data: {
          providerEventId,
          provider: PaymentProvider.BACHS,
          eventType,
          payload: payload as Prisma.InputJsonValue,
          processedAt: new Date(),
        },
      });
      await this.prisma.auditLog.create({
        data: {
          action: AuditAction.WEBHOOK_IGNORED_DUPLICATE,
          entityType: 'WebhookEvent',
          entityId: providerEventId,
          metadata: payload as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        return;
      }
      throw err;
    }
  }

  private async recordProcessedEvent(
    providerEventId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ) {
    try {
      await this.prisma.webhookEvent.create({
        data: {
          providerEventId,
          provider: PaymentProvider.BACHS,
          eventType,
          payload: payload as Prisma.InputJsonValue,
          processedAt: new Date(),
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        return;
      }
      throw err;
    }
  }

  private async notifyCreatorTipReceived(tipId: string) {
    try {
      const tip = await this.prisma.tip.findUnique({
        where: { id: tipId },
        include: {
          creator: {
            include: { user: { select: { id: true, email: true } } },
          },
        },
      });
      if (!tip) return;

      await this.notifications.notifyTipReceived({
        tipId: tip.id,
        userId: tip.creator.user.id,
        email: tip.creator.user.email,
        amount: tip.amount.toFixed(2),
        currency: tip.currency,
        isAnonymous: tip.isAnonymous,
        supporterName: tip.supporterName,
      });
    } catch (err) {
      // Never reverse payment success because email failed.
      console.error(
        `Failed to notify creator for tip=${tipId}: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }
  }
}
