import {
  AuditLogModel,
  PaymentTransactionModel,
  TipModel,
  WebhookEventModel,
  isUniqueViolation,
  toPlain,
  useDb,
  withTransaction,
} from '../../db';
import type { LeanDoc } from '../../db/lean';
import { AuditAction, PaymentProvider, TipStatus } from '../../db/enums';
import type {
  PaymentStatus as PaymentStatusT,
  PaymentTransaction,
  Tip,
  TipStatus as TipStatusT,
} from '../../db/types';
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

type TipWithPayment = Tip & { paymentTransaction: PaymentTransaction | null };

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
    await useDb();
    const payment = toPlain<PaymentTransaction>(
      await PaymentTransactionModel.findOne({ _id: id }).lean<LeanDoc | null>(),
    );

    if (payment) {
      const tip = toPlain<Tip>(
        await TipModel.findOne({
          paymentTransactionId: payment.id,
        }).lean<LeanDoc | null>(),
      );
      if (tip) {
        return this.toStatusDto(payment, tip);
      }
    }

    const tip = toPlain<Tip>(
      await TipModel.findOne({ _id: id }).lean<LeanDoc | null>(),
    );

    if (tip) {
      const tipPayment = await this.findPayment(tip.paymentTransactionId);
      if (tipPayment) {
        return this.toStatusDto(tipPayment, tip);
      }
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
    await useDb();
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
      await withTransaction(async (session) => {
        if (params.providerEventId) {
          await WebhookEventModel.create(
            [
              {
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
              },
            ],
            { session },
          );
        }

        if (tip.paymentTransactionId) {
          await PaymentTransactionModel.updateOne(
            { _id: tip.paymentTransactionId },
            {
              $set: {
                status: mapped.paymentStatus,
                providerReference:
                  params.verification.providerReference ||
                  tip.paymentTransaction?.providerReference,
                rawProviderStatus: params.verification.rawStatus,
                updatedAt: new Date(),
              },
            },
            { session },
          );
        }

        await TipModel.updateOne(
          { _id: tip.id },
          { $set: { status: mapped.tipStatus, updatedAt: new Date() } },
          { session },
        );

        await AuditLogModel.create(
          [
            {
              action: AuditAction.TIP_STATUS_CHANGED,
              entityType: 'Tip',
              entityId: tip.id,
              metadata: {
                to: mapped.tipStatus,
                via: params.eventType ?? 'verify',
                providerReference: params.verification.providerReference,
              },
            },
          ],
          { session },
        );
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

  private async findPayment(
    paymentTransactionId: string | null,
  ): Promise<PaymentTransaction | null> {
    if (!paymentTransactionId) return null;
    return toPlain<PaymentTransaction>(
      await PaymentTransactionModel.findOne({
        _id: paymentTransactionId,
      }).lean<LeanDoc | null>(),
    );
  }

  private async findTipForVerification(params: {
    tipId?: string;
    providerReference?: string;
  }): Promise<TipWithPayment | null> {
    if (params.tipId) {
      const tip = toPlain<Tip>(
        await TipModel.findOne({ _id: params.tipId }).lean<LeanDoc | null>(),
      );
      if (!tip) return null;
      return {
        ...tip,
        paymentTransaction: await this.findPayment(tip.paymentTransactionId),
      };
    }

    if (params.providerReference) {
      const payment = toPlain<PaymentTransaction>(
        await PaymentTransactionModel.findOne({
          providerReference: params.providerReference,
        }).lean<LeanDoc | null>(),
      );

      if (!payment) return null;

      const tip = toPlain<Tip>(
        await TipModel.findOne({
          paymentTransactionId: payment.id,
        }).lean<LeanDoc | null>(),
      );
      if (!tip) return null;
      return { ...tip, paymentTransaction: payment };
    }

    return null;
  }
}
