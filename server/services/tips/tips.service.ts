import {
  AuditAction,
  PaymentProvider,
  PaymentStatus,
  Prisma,
  TipStatus,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { ApiError } from '../../lib/errors';
import { getServerEnv } from '../../lib/env';
import { usePrisma } from '../../lib/prisma';
import { ALLOWED_CURRENCIES } from '../creators/username';
import {
  BachsProviderError,
  bachsPublicMessage,
} from '../payments/bachs/bachs.errors';
import { PaymentsService } from '../payments/payments.service';
import { computePlatformFee } from '../creators/connect.service';
import { amountValidationMessage, validateTipAmount } from './amount';
import { sanitizeSupporterName, sanitizeTipMessage } from './message';
import type { CreateTipInput, PublicTipDto } from './tips.types';
import { toPublicTipDto } from './tips.types';

const tipPublicInclude = {
  creator: {
    select: {
      username: true,
      displayName: true,
      avatarUrl: true,
    },
  },
} satisfies Prisma.TipInclude;

export class TipsService {
  constructor(
    private readonly prisma = usePrisma(),
    private readonly payments = new PaymentsService(),
  ) {}

  /**
   * Create Tip + PaymentTransaction (PENDING), then initialize checkout.
   * Tip starts CREATED → CHECKOUT_PENDING after provider init.
   * Never marks PAID from this path.
   */
  async createTip(
    dto: CreateTipInput,
    opts?: { idempotencyKeyHeader?: string; ip?: string; userAgent?: string },
  ): Promise<{ tip: PublicTipDto; checkoutUrl: string }> {
    const creator = await this.prisma.creatorProfile.findUnique({
      where: { username: dto.username },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        currency: true,
        isActive: true,
        bachsAccountId: true,
      },
    });

    if (!creator || !creator.isActive) {
      throw new ApiError(404, 'CREATOR_NOT_FOUND', 'Creator not found.');
    }

    const amountResult = validateTipAmount(dto.amount);
    if (!amountResult.ok) {
      throw new ApiError(
        400,
        amountResult.reason,
        amountValidationMessage(amountResult.reason),
      );
    }

    const currency = this.resolveCurrency(creator.currency, dto.currency);
    const message = sanitizeTipMessage(dto.message);
    const isAnonymous = Boolean(dto.isAnonymous);
    const supporterName = isAnonymous
      ? null
      : sanitizeSupporterName(dto.supporterName);
    const supporterEmail = dto.supporterEmail.trim().toLowerCase();
    const customerName =
      supporterName || (isAnonymous ? 'Anonymous supporter' : 'Supporter');

    const idempotencyKey =
      dto.idempotencyKey?.trim() ||
      opts?.idempotencyKeyHeader?.trim() ||
      undefined;

    const internalReference = idempotencyKey
      ? `idem_${idempotencyKey}`
      : `tip_${randomBytes(16).toString('hex')}`;

    const existing = await this.findByInternalReference(internalReference);
    if (existing) {
      return existing;
    }

    const dbProvider =
      this.payments.providerName === 'BACHS'
        ? PaymentProvider.BACHS
        : PaymentProvider.DEV_SEED;

    let tipId: string;
    let paymentId: string;

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const payment = await tx.paymentTransaction.create({
          data: {
            internalReference,
            provider: dbProvider,
            amount: amountResult.decimal,
            currency,
            status: PaymentStatus.PENDING,
            metadata: {
              source: 'tip_create',
              creatorUsername: creator.username,
            },
          },
        });

        const tip = await tx.tip.create({
          data: {
            creatorId: creator.id,
            amount: amountResult.decimal,
            currency,
            message,
            isAnonymous,
            supporterName,
            supporterEmail,
            status: TipStatus.CREATED,
            paymentTransactionId: payment.id,
          },
        });

        await tx.auditLog.create({
          data: {
            action: AuditAction.TIP_CREATED,
            entityType: 'Tip',
            entityId: tip.id,
            ipAddress: opts?.ip,
            userAgent: opts?.userAgent,
            metadata: {
              amount: amountResult.amount,
              currency,
              isAnonymous,
              creatorId: creator.id,
              provider: dbProvider,
            },
          },
        });

        return { tip, payment };
      });

      tipId = created.tip.id;
      paymentId = created.payment.id;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const replay = await this.findByInternalReference(internalReference);
        if (replay) return replay;
      }
      throw err;
    }

    const appUrl = (getServerEnv().APP_URL ?? 'http://localhost:3000').replace(
      /\/$/,
      '',
    );

    let init;
    try {
      const destination = creator.bachsAccountId?.trim() || null;
      const platformFee = destination
        ? computePlatformFee(amountResult.amount)
        : null;

      init = await this.payments.initializePayment({
        tipId,
        paymentTransactionId: paymentId,
        internalReference,
        amount: amountResult.amount,
        currency,
        creatorUsername: creator.username,
        successUrl: `${appUrl}/support/confirm/${tipId}`,
        cancelUrl: `${appUrl}/${creator.username}`,
        customerEmail: supporterEmail,
        customerName,
        bachsConnectAccountId: destination,
        platformFee,
        metadata: {
          tip_id: tipId,
          creator_username: creator.username,
          ...(destination ? { settled_via: 'destination_charge' } : {}),
        },
      });
    } catch (err) {
      await this.markCheckoutFailed(tipId, paymentId, err);
      if (err instanceof BachsProviderError) {
        throw new ApiError(
          503,
          'PAYMENT_INIT_FAILED',
          bachsPublicMessage(err.kind),
        );
      }
      console.error(
        `Payment init failed tip=${tipId}: ${err instanceof Error ? err.message : 'unknown'}`,
      );
      throw new ApiError(
        503,
        'PAYMENT_INIT_FAILED',
        'Unable to start payment right now. Please try again shortly.',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.paymentTransaction.update({
        where: { id: paymentId },
        data: {
          providerReference: init.providerReference,
          status: PaymentStatus.PROCESSING,
          rawProviderStatus: init.rawStatus ?? 'initialized',
          metadata: {
            source: 'tip_create',
            creatorUsername: creator.username,
            checkoutUrl: init.checkoutUrl,
            providerMeta: (init.metadata ?? {}) as Prisma.InputJsonValue,
          },
        },
      });

      const tip = await tx.tip.update({
        where: { id: tipId },
        data: { status: TipStatus.CHECKOUT_PENDING },
        include: tipPublicInclude,
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.TIP_STATUS_CHANGED,
          entityType: 'Tip',
          entityId: tip.id,
          metadata: {
            from: TipStatus.CREATED,
            to: TipStatus.CHECKOUT_PENDING,
          },
        },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.PAYMENT_STATUS_CHANGED,
          entityType: 'PaymentTransaction',
          entityId: payment.id,
          metadata: {
            from: PaymentStatus.PENDING,
            to: PaymentStatus.PROCESSING,
            providerReference: init.providerReference,
          },
        },
      });

      return tip;
    });

    return {
      tip: toPublicTipDto(updated),
      checkoutUrl: init.checkoutUrl,
    };
  }

  async getPublicTip(tipId: string): Promise<PublicTipDto> {
    const tip = await this.prisma.tip.findUnique({
      where: { id: tipId },
      include: tipPublicInclude,
    });

    if (!tip) {
      throw new ApiError(404, 'TIP_NOT_FOUND', 'Tip not found.');
    }

    return toPublicTipDto(tip);
  }

  private async markCheckoutFailed(
    tipId: string,
    paymentId: string,
    err: unknown,
  ) {
    const kind = err instanceof BachsProviderError ? err.kind : 'PROVIDER';
    console.error(
      `Marking tip=${tipId} failed after payment init kind=${kind}`,
    );
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.paymentTransaction.update({
          where: { id: paymentId },
          data: {
            status: PaymentStatus.FAILED,
            rawProviderStatus: kind,
          },
        });
        await tx.tip.update({
          where: { id: tipId },
          data: { status: TipStatus.FAILED },
        });
        await tx.auditLog.create({
          data: {
            action: AuditAction.TIP_STATUS_CHANGED,
            entityType: 'Tip',
            entityId: tipId,
            metadata: { to: TipStatus.FAILED, reason: 'payment_init_failed' },
          },
        });
      });
    } catch (markErr) {
      console.error(
        `Failed to mark tip failed tip=${tipId}: ${markErr instanceof Error ? markErr.message : 'unknown'}`,
      );
    }
  }

  private resolveCurrency(creatorCurrency: string, requested?: string): string {
    const authoritative = creatorCurrency.toUpperCase();
    if (!(ALLOWED_CURRENCIES as readonly string[]).includes(authoritative)) {
      throw new ApiError(
        400,
        'UNSUPPORTED_CURRENCY',
        'Creator currency is not supported for tips.',
      );
    }

    if (requested && requested.toUpperCase() !== authoritative) {
      throw new ApiError(
        400,
        'CURRENCY_MISMATCH',
        'Currency does not match this creator’s preferred currency.',
      );
    }

    return authoritative;
  }

  private async findByInternalReference(
    internalReference: string,
  ): Promise<{ tip: PublicTipDto; checkoutUrl: string } | null> {
    const payment = await this.prisma.paymentTransaction.findUnique({
      where: { internalReference },
      include: {
        tip: { include: tipPublicInclude },
      },
    });

    if (!payment?.tip) return null;

    const meta = payment.metadata as { checkoutUrl?: string } | null;
    const appUrl = (getServerEnv().APP_URL ?? 'http://localhost:3000').replace(
      /\/$/,
      '',
    );
    const checkoutUrl =
      meta?.checkoutUrl ??
      `${appUrl}/support/checkout/${encodeURIComponent(payment.tip.id)}`;

    return {
      tip: toPublicTipDto(payment.tip),
      checkoutUrl,
    };
  }
}
