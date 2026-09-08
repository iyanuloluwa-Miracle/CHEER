import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  AuditAction,
  PaymentProvider,
  PaymentStatus,
  Prisma,
  TipStatus,
} from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { decimalToAmountString } from '../tips/tips.types';
import {
  PAYMENT_PROVIDER,
  type HandleWebhookInput,
  type HandleWebhookResult,
  type InitializePaymentInput,
  type InitializePaymentResult,
  type PaymentProviderPort,
  type VerifyPaymentInput,
  type VerifyPaymentResult,
} from './payment-provider.port';
import {
  canTransitionTip,
  isTipTerminal,
  mapVerificationToStatuses,
} from './payment-status.transitions';

export interface PublicPaymentStatusDto {
  id: string;
  paymentId: string;
  tipId: string;
  tipStatus: TipStatus;
  paymentStatus: PaymentStatus;
  amount: string;
  currency: string;
  paid: boolean;
}

/**
 * Facade over the configured payment provider + TippyMe status reads.
 * Authoritative webhook fulfilment lives in WebhookFulfilmentService (Phase 8).
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @Inject(PAYMENT_PROVIDER)
    private readonly provider: PaymentProviderPort,
    private readonly prisma: PrismaService,
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
    const payment = await this.prisma.paymentTransaction.findUnique({
      where: { id },
      include: { tip: true },
    });

    if (payment?.tip) {
      return this.toStatusDto(payment, payment.tip);
    }

    const tip = await this.prisma.tip.findUnique({
      where: { id },
      include: { paymentTransaction: true },
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
      this.logger.warn(
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
      await this.prisma.$transaction(async (tx) => {
        if (params.providerEventId) {
          await tx.webhookEvent.create({
            data: {
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
          });
        }

        if (tip.paymentTransactionId) {
          await tx.paymentTransaction.update({
            where: { id: tip.paymentTransactionId },
            data: {
              status: mapped.paymentStatus,
              providerReference:
                params.verification.providerReference ||
                tip.paymentTransaction?.providerReference,
              rawProviderStatus: params.verification.rawStatus,
            },
          });
        }

        await tx.tip.update({
          where: { id: tip.id },
          data: { status: mapped.tipStatus },
        });

        await tx.auditLog.create({
          data: {
            action: AuditAction.TIP_STATUS_CHANGED,
            entityType: 'Tip',
            entityId: tip.id,
            metadata: {
              to: mapped.tipStatus,
              via: params.eventType ?? 'verify',
              providerReference: params.verification.providerReference,
            },
          },
        });
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        return { updated: false, tipId: tip.id };
      }
      throw err;
    }

    return { updated: true, tipId: tip.id };
  }

  private toStatusDto(
    payment: {
      id: string;
      status: PaymentStatus;
      amount: Prisma.Decimal;
      currency: string;
    },
    tip: { id: string; status: TipStatus },
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
      return this.prisma.tip.findUnique({
        where: { id: params.tipId },
        include: { paymentTransaction: true },
      });
    }

    if (params.providerReference) {
      const payment = await this.prisma.paymentTransaction.findFirst({
        where: { providerReference: params.providerReference },
        include: {
          tip: { include: { paymentTransaction: true } },
        },
      });
      return payment?.tip ?? null;
    }

    return null;
  }
}
