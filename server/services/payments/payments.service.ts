import { eq } from 'drizzle-orm';
import { useDb, isUniqueViolation } from '../../db';
import {
  AuditAction,
  PaymentProvider,
  PaymentStatus,
  TipStatus,
} from '../../db/enums';
import type { PaymentStatus as PaymentStatusT, TipStatus as TipStatusT } from '../../db/schema';
import {
  auditLogs,
  paymentTransactions,
  tips,
  webhookEvents,
} from '../../db/schema';
import { getServerEnv } from '../../lib/env';
import { decimalToAmountString } from '../tips/tips.types';
import type {
  HandleWebhookInput,
  HandleWebhookResult,
  InitializePaymentInput,
  InitializePaymentResult,
  PaymentProviderPort,
  VerifyPaymentInput,
  VerifyPaymentResult,
} from './payment-provider.port';
import {
  canTransitionTip,
  isTipTerminal,
  mapVerificationToStatuses,
} from './payment-status.transitions';
import { BachsPaymentProvider } from './providers/bachs-payment.provider';
import { StubPaymentProvider } from './providers/stub-payment.provider';

export interface PublicPaymentStatusDto {
  id: string;
  paymentId: string;
  tipId: string;
  tipStatus: TipStatusT;
  paymentStatus: PaymentStatusT;
  amount: string;
  currency: string;
  paid: boolean;
}

/**
 * Bachs when BACHS_API_KEY is set; local stub otherwise.
 * Production env validation requires BACHS_API_KEY — stub is never selected there.
 */
export function createPaymentProvider(): PaymentProviderPort {
  const env = getServerEnv();
  const key = env.BACHS_API_KEY?.trim();
  const nodeEnv = env.NODE_ENV ?? 'development';
  if (!key) {
    if (nodeEnv === 'production') {
      throw new Error(
        'BACHS_API_KEY is required in production — refusing stub payment provider',
      );
    }
    return new StubPaymentProvider();
  }
  return new BachsPaymentProvider();
}

/**
 * Facade over the configured payment provider + TippyMe status reads.
 * Authoritative webhook fulfilment lives in WebhookFulfilmentService (Phase 8).
 */
export class PaymentsService {
  private readonly db = useDb();

  constructor(
    private readonly provider: PaymentProviderPort = createPaymentProvider(),
  ) {}

  get providerName() {
    return this.provider.name;
  }

  initializePayment(
    input: InitializePaymentInput,
  ): Promise<InitializePaymentResult> {
    return this.provider.initializePayment(input);
  }

  verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    return this.provider.verifyPayment(input);
  }

  handleWebhook(input: HandleWebhookInput): Promise<HandleWebhookResult> {
    return this.provider.handleWebhook(input);
  }

  /**
   * Safe public status for confirmation polling.
   * `:id` may be PaymentTransaction.id or Tip.id.
   */
  async getPublicPaymentStatus(
    id: string,
  ): Promise<PublicPaymentStatusDto | null> {
    const payment = await this.db.query.paymentTransactions.findFirst({
      where: eq(paymentTransactions.id, id),
    });

    if (payment) {
      const tip = await this.db.query.tips.findFirst({
        where: eq(tips.paymentTransactionId, payment.id),
      });
      if (tip) {
        return this.toStatusDto(payment, tip);
      }
    }

    const tip = await this.db.query.tips.findFirst({
      where: eq(tips.id, id),
      with: { paymentTransaction: true },
    });

    if (tip?.paymentTransaction) {
      return this.toStatusDto(tip.paymentTransaction, tip);
    }

    return null;
  }

  /**
   * Apply a verified provider result (manual reconcile / tests).
   * Prefer WebhookFulfilmentService for webhook path.
   */
  async applyVerification(params: {
    tipId?: string;
    providerReference?: string;
    verification: VerifyPaymentResult;
    providerEventId?: string;
    eventType?: string;
  }): Promise<{ updated: boolean; tipId?: string }> {
    const tip = await this.findTipForVerification(params);
    if (!tip) {
      console.warn(
        `No tip found for verification ref=${params.providerReference ?? 'none'} tip=${params.tipId ?? 'none'}`,
      );
      return { updated: false };
    }

    if (isTipTerminal(tip.status)) {
      return { updated: false, tipId: tip.id };
    }

    const mapped = mapVerificationToStatuses(params.verification.status);
    if (!mapped || !canTransitionTip(tip.status, mapped.tipStatus)) {
      return { updated: false, tipId: tip.id };
    }

    try {
      await this.db.transaction(async (tx) => {
        if (params.providerEventId) {
          await tx.insert(webhookEvents).values({
            providerEventId: params.providerEventId,
            provider:
              tip.paymentTransaction?.provider ??
              (this.provider.name === 'BACHS'
                ? PaymentProvider.BACHS
                : PaymentProvider.DEV_SEED),
            eventType: params.eventType ?? 'unknown',
            payload: {
              status: params.verification.status,
              providerReference: params.verification.providerReference,
            },
            processedAt: new Date(),
          });
        }

        if (tip.paymentTransactionId) {
          await tx
            .update(paymentTransactions)
            .set({
              status: mapped.paymentStatus,
              providerReference:
                params.verification.providerReference ||
                tip.paymentTransaction?.providerReference,
              rawProviderStatus: params.verification.rawStatus,
            })
            .where(eq(paymentTransactions.id, tip.paymentTransactionId));
        }

        await tx
          .update(tips)
          .set({ status: mapped.tipStatus })
          .where(eq(tips.id, tip.id));

        await tx.insert(auditLogs).values({
          action: AuditAction.TIP_STATUS_CHANGED,
          entityType: 'Tip',
          entityId: tip.id,
          metadata: {
            to: mapped.tipStatus,
            via: params.eventType ?? 'verify',
            providerReference: params.verification.providerReference,
          },
        });
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        return { updated: false, tipId: tip.id };
      }
      throw err;
    }

    return { updated: true, tipId: tip.id };
  }

  private toStatusDto(
    payment: {
      id: string;
      status: PaymentStatusT;
      amount: string;
      currency: string;
    },
    tip: { id: string; status: TipStatusT },
  ): PublicPaymentStatusDto {
    return {
      id: payment.id,
      paymentId: payment.id,
      tipId: tip.id,
      tipStatus: tip.status,
      paymentStatus: payment.status,
      amount: decimalToAmountString(payment.amount),
      currency: payment.currency,
      paid: tip.status === TipStatus.PAID,
    };
  }

  private async findTipForVerification(params: {
    tipId?: string;
    providerReference?: string;
  }) {
    if (params.tipId) {
      return this.db.query.tips.findFirst({
        where: eq(tips.id, params.tipId),
        with: { paymentTransaction: true },
      });
    }

    if (params.providerReference) {
      const payment = await this.db.query.paymentTransactions.findFirst({
        where: eq(paymentTransactions.providerReference, params.providerReference),
      });

      if (!payment) return null;

      return this.db.query.tips.findFirst({
        where: eq(tips.paymentTransactionId, payment.id),
        with: { paymentTransaction: true },
      });
    }

    return null;
  }
}
