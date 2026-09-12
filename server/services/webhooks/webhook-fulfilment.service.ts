import Decimal from 'decimal.js';
import {
  AuditLogModel,
  CreatorProfileModel,
  PaymentTransactionModel,
  TipModel,
  UserModel,
  WebhookEventModel,
  isUniqueViolation,
  toPlain,
  useDb,
  withTransaction,
} from '../../db';
import type { LeanDoc } from '../../db/lean';
import { AuditAction, PaymentProvider, TipStatus } from '../../db/enums';
import type {
  CreatorProfile,
  PaymentProvider as PaymentProviderT,
  PaymentStatus as PaymentStatusT,
  PaymentTransaction,
  Tip,
  TipStatus as TipStatusT,
  User,
  WebhookEvent,
} from '../../db/types';
import { TransactionalNotificationsService } from '../notifications/transactional-notifications.service';
import { BachsProviderError } from '../payments/bachs/bachs.errors';
import type { VerifyPaymentResult } from '../payments/payment-provider.port';
import {
  canTransitionTip,
  isTipTerminal,
  mapVerificationToStatuses,
} from '../payments/payment-status.transitions';
import { PaymentsService } from '../payments/payments.service';
import { decimalToAmountString } from '../tips/tips.types';

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

/** Tip joined with the rows the fulfilment checks need. */
type HydratedTip = Tip & {
  paymentTransaction: PaymentTransaction | null;
  creator: (CreatorProfile & { user: Pick<User, 'id' | 'email'> }) | null;
};

/**
 * Authoritative Bachs webhook fulfilment (Phase 8).
 * Signature is verified by the payment provider before this runs.
 * Tip emails fire only after DB SUCCESS — never from frontend redirects.
 */
export class WebhookFulfilmentService {
  constructor(
    private readonly payments = new PaymentsService(),
    private readonly notifications = new TransactionalNotificationsService(),
  ) {}

  async processSignedBachsEvent(params: {
    providerEventId?: string;
    eventType?: string;
    tipId?: string;
    verification?: VerifyPaymentResult;
  }): Promise<ProcessWebhookResult> {
    await useDb();
    const { providerEventId, eventType, tipId, verification } = params;

    if (!providerEventId || !eventType) {
      return { ok: true, outcome: 'ignored_malformed' };
    }

    const existing = toPlain<WebhookEvent>(
      await WebhookEventModel.findOne({ providerEventId }).lean<
        LeanDoc | null
      >(),
    );
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
      amount: string;
      currency: string;
      paymentTransaction: {
        amount: string;
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
      const expected = new Decimal(tip.amount).toFixed(2);
      const got = new Decimal(verified.amount).toFixed(2);
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
      status: TipStatusT;
      paymentTransactionId: string | null;
      paymentTransaction: { provider: PaymentProviderT } | null;
    };
    mapped: { tipStatus: TipStatusT; paymentStatus: PaymentStatusT };
    verified: VerifyPaymentResult;
    providerEventId: string;
    eventType: string;
  }): Promise<{ updated: boolean; notified: boolean }> {
    try {
      const applied = await withTransaction(async (session) => {
        await WebhookEventModel.create(
          [
            {
              providerEventId: params.providerEventId,
              provider:
                params.tip.paymentTransaction?.provider ??
                PaymentProvider.BACHS,
              eventType: params.eventType,
              payload: {
                status: params.verified.status,
                providerReference: params.verified.providerReference,
                rawStatus: params.verified.rawStatus,
              },
              processedAt: new Date(),
            },
          ],
          { session },
        );

        // Re-check tip status inside transaction
        const fresh = toPlain<Tip>(
          await TipModel.findOne({ _id: params.tip.id })
            .session(session)
            .lean<LeanDoc | null>(),
        );
        if (!fresh || isTipTerminal(fresh.status)) {
          return { updated: false as const, notified: false as const };
        }
        if (!canTransitionTip(fresh.status, params.mapped.tipStatus)) {
          return { updated: false as const, notified: false as const };
        }

        if (params.tip.paymentTransactionId) {
          await PaymentTransactionModel.updateOne(
            { _id: params.tip.paymentTransactionId },
            {
              $set: {
                status: params.mapped.paymentStatus,
                providerReference: params.verified.providerReference,
                rawProviderStatus: params.verified.rawStatus,
                updatedAt: new Date(),
              },
            },
            { session },
          );
        }

        await TipModel.updateOne(
          { _id: params.tip.id },
          { $set: { status: params.mapped.tipStatus, updatedAt: new Date() } },
          { session },
        );

        await AuditLogModel.create(
          [
            {
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
          ],
          { session },
        );

        if (params.tip.paymentTransactionId) {
          await AuditLogModel.create(
            [
              {
                action: AuditAction.PAYMENT_STATUS_CHANGED,
                entityType: 'PaymentTransaction',
                entityId: params.tip.paymentTransactionId,
                metadata: {
                  to: params.mapped.paymentStatus,
                  via: params.eventType,
                  providerEventId: params.providerEventId,
                },
              },
            ],
            { session },
          );
        }

        return {
          updated: true as const,
          notified: params.mapped.tipStatus === TipStatus.PAID,
        };
      });
      return applied;
    } catch (err) {
      if (isUniqueViolation(err)) {
        return { updated: false, notified: false };
      }
      throw err;
    }
  }

  private async findTip(params: {
    tipId?: string;
    providerReference: string;
  }): Promise<HydratedTip | null> {
    if (params.tipId) {
      const byId = toPlain<Tip>(
        await TipModel.findOne({ _id: params.tipId }).lean<LeanDoc | null>(),
      );
      if (byId) return this.hydrateTip(byId);
    }

    const payment = toPlain<PaymentTransaction>(
      await PaymentTransactionModel.findOne({
        providerReference: params.providerReference,
      }).lean<LeanDoc | null>(),
    );

    if (!payment) return null;

    const byReference = toPlain<Tip>(
      await TipModel.findOne({
        paymentTransactionId: payment.id,
      }).lean<LeanDoc | null>(),
    );

    return byReference ? this.hydrateTip(byReference) : null;
  }

  private async hydrateTip(tip: Tip): Promise<HydratedTip> {
    const [paymentDoc, creatorDoc] = await Promise.all([
      tip.paymentTransactionId
        ? PaymentTransactionModel.findOne({
            _id: tip.paymentTransactionId,
          }).lean<LeanDoc | null>()
        : Promise.resolve(null),
      CreatorProfileModel.findOne({ _id: tip.creatorId }).lean<
        LeanDoc | null
      >(),
    ]);

    const creatorProfile = toPlain<CreatorProfile>(creatorDoc);
    const user = creatorProfile
      ? toPlain<User>(
          await UserModel.findOne({ _id: creatorProfile.userId }).lean<
            LeanDoc | null
          >(),
        )
      : null;

    return {
      ...tip,
      paymentTransaction: toPlain<PaymentTransaction>(paymentDoc),
      creator:
        creatorProfile && user
          ? { ...creatorProfile, user: { id: user.id, email: user.email } }
          : null,
    };
  }

  private async recordIgnoredEvent(
    providerEventId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ) {
    try {
      await WebhookEventModel.create([
        {
          providerEventId,
          provider: PaymentProvider.BACHS,
          eventType,
          payload,
          processedAt: new Date(),
        },
      ]);
      await AuditLogModel.create([
        {
          action: AuditAction.WEBHOOK_IGNORED_DUPLICATE,
          entityType: 'WebhookEvent',
          entityId: providerEventId,
          metadata: payload,
        },
      ]);
    } catch (err) {
      if (isUniqueViolation(err)) {
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
      await WebhookEventModel.create([
        {
          providerEventId,
          provider: PaymentProvider.BACHS,
          eventType,
          payload,
          processedAt: new Date(),
        },
      ]);
    } catch (err) {
      if (isUniqueViolation(err)) {
        return;
      }
      throw err;
    }
  }

  private async notifyCreatorTipReceived(tipId: string) {
    try {
      const tip = toPlain<Tip>(
        await TipModel.findOne({ _id: tipId }).lean<LeanDoc | null>(),
      );
      if (!tip) return;

      const hydrated = await this.hydrateTip(tip);
      if (!hydrated.creator) return;

      await this.notifications.notifyTipReceived({
        tipId: hydrated.id,
        userId: hydrated.creator.user.id,
        email: hydrated.creator.user.email,
        amount: decimalToAmountString(hydrated.amount),
        currency: hydrated.currency,
        isAnonymous: hydrated.isAnonymous,
        supporterName: hydrated.supporterName,
      });
    } catch (err) {
      // Never reverse payment success because email failed.
      console.error(
        `Failed to notify creator for tip=${tipId}: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }
  }
}
