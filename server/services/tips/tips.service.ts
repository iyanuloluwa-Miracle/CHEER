import { randomBytes } from 'crypto';
import {
  AuditLogModel,
  CreatorProfileModel,
  PaymentTransactionModel,
  TipModel,
  isUniqueViolation,
  toPlain,
  useDb,
  withTransaction,
} from '../../db';
import { insertedId, type LeanDoc } from '../../db/lean';
import {
  AuditAction,
  PaymentProvider,
  PaymentStatus,
  TipStatus,
} from '../../db/enums';
import type { CreatorProfile, PaymentTransaction, Tip } from '../../db/types';
import { ApiError } from '../../lib/errors';
import { getServerEnv } from '../../lib/env';
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

export class TipsService {
  constructor(private readonly payments = new PaymentsService()) {}

  /**
   * Create Tip + PaymentTransaction (PENDING), then initialize checkout.
   * Tip starts CREATED → CHECKOUT_PENDING after provider init.
   * Never marks PAID from this path.
   */
  async createTip(
    dto: CreateTipInput,
    opts?: { idempotencyKeyHeader?: string; ip?: string; userAgent?: string },
  ): Promise<{ tip: PublicTipDto; checkoutUrl: string }> {
    await useDb();
    const creator = toPlain<CreatorProfile>(
      await CreatorProfileModel.findOne({
        username: dto.username,
      }).lean<LeanDoc | null>(),
    );

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
      const created = await withTransaction(async (session) => {
        const [payment] = await PaymentTransactionModel.create(
          [
            {
              internalReference,
              provider: dbProvider,
              amount: amountResult.decimal.toFixed(2),
              currency,
              status: PaymentStatus.PENDING,
              metadata: {
                source: 'tip_create',
                creatorUsername: creator.username,
              },
            },
          ],
          { session },
        );
        const newPaymentId = insertedId(payment);

        const [tip] = await TipModel.create(
          [
            {
              creatorId: creator.id,
              amount: amountResult.decimal.toFixed(2),
              currency,
              message,
              isAnonymous,
              supporterName,
              supporterEmail,
              status: TipStatus.CREATED,
              paymentTransactionId: newPaymentId,
            },
          ],
          { session },
        );
        const newTipId = insertedId(tip);

        await AuditLogModel.create(
          [
            {
              action: AuditAction.TIP_CREATED,
              entityType: 'Tip',
              entityId: newTipId,
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
          ],
          { session },
        );

        return { tipId: newTipId, paymentId: newPaymentId };
      });

      tipId = created.tipId;
      paymentId = created.paymentId;
    } catch (err) {
      if (isUniqueViolation(err)) {
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

    const updated = await withTransaction(async (session) => {
      await PaymentTransactionModel.updateOne(
        { _id: paymentId },
        {
          $set: {
            providerReference: init.providerReference,
            status: PaymentStatus.PROCESSING,
            rawProviderStatus: init.rawStatus ?? 'initialized',
            metadata: {
              source: 'tip_create',
              creatorUsername: creator.username,
              checkoutUrl: init.checkoutUrl,
              providerMeta: init.metadata ?? {},
            },
            updatedAt: new Date(),
          },
        },
        { session },
      );

      await TipModel.updateOne(
        { _id: tipId },
        { $set: { status: TipStatus.CHECKOUT_PENDING, updatedAt: new Date() } },
        { session },
      );

      const tip = toPlain<Tip>(
        await TipModel.findOne({ _id: tipId })
          .session(session)
          .lean<LeanDoc | null>(),
      );

      if (!tip) {
        throw new Error(`Tip ${tipId} missing after checkout update`);
      }

      await AuditLogModel.create(
        [
          {
            action: AuditAction.TIP_STATUS_CHANGED,
            entityType: 'Tip',
            entityId: tip.id,
            metadata: {
              from: TipStatus.CREATED,
              to: TipStatus.CHECKOUT_PENDING,
            },
          },
        ],
        { session },
      );

      await AuditLogModel.create(
        [
          {
            action: AuditAction.PAYMENT_STATUS_CHANGED,
            entityType: 'PaymentTransaction',
            entityId: paymentId,
            metadata: {
              from: PaymentStatus.PENDING,
              to: PaymentStatus.PROCESSING,
              providerReference: init.providerReference,
            },
          },
        ],
        { session },
      );

      return tip;
    });

    return {
      tip: toPublicTipDto({ ...updated, creator }),
      checkoutUrl: init.checkoutUrl,
    };
  }

  async getPublicTip(tipId: string): Promise<PublicTipDto> {
    await useDb();
    const tip = toPlain<Tip>(
      await TipModel.findOne({ _id: tipId }).lean<LeanDoc | null>(),
    );

    if (!tip) {
      throw new ApiError(404, 'TIP_NOT_FOUND', 'Tip not found.');
    }

    const creator = await this.findCreator(tip.creatorId);
    if (!creator) {
      throw new ApiError(404, 'TIP_NOT_FOUND', 'Tip not found.');
    }

    return toPublicTipDto({ ...tip, creator });
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
      await withTransaction(async (session) => {
        await PaymentTransactionModel.updateOne(
          { _id: paymentId },
          {
            $set: {
              status: PaymentStatus.FAILED,
              rawProviderStatus: kind,
              updatedAt: new Date(),
            },
          },
          { session },
        );

        await TipModel.updateOne(
          { _id: tipId },
          { $set: { status: TipStatus.FAILED, updatedAt: new Date() } },
          { session },
        );

        await AuditLogModel.create(
          [
            {
              action: AuditAction.TIP_STATUS_CHANGED,
              entityType: 'Tip',
              entityId: tipId,
              metadata: { to: TipStatus.FAILED, reason: 'payment_init_failed' },
            },
          ],
          { session },
        );
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

  private async findCreator(
    creatorId: string,
  ): Promise<CreatorProfile | null> {
    return toPlain<CreatorProfile>(
      await CreatorProfileModel.findOne({ _id: creatorId }).lean<
        LeanDoc | null
      >(),
    );
  }

  private async findByInternalReference(
    internalReference: string,
  ): Promise<{ tip: PublicTipDto; checkoutUrl: string } | null> {
    const payment = toPlain<PaymentTransaction>(
      await PaymentTransactionModel.findOne({
        internalReference,
      }).lean<LeanDoc | null>(),
    );

    if (!payment) return null;

    const tip = toPlain<Tip>(
      await TipModel.findOne({
        paymentTransactionId: payment.id,
      }).lean<LeanDoc | null>(),
    );

    if (!tip) return null;

    const creator = await this.findCreator(tip.creatorId);
    if (!creator) return null;

    const meta = payment.metadata as { checkoutUrl?: string } | null;
    const appUrl = (getServerEnv().APP_URL ?? 'http://localhost:3000').replace(
      /\/$/,
      '',
    );
    const checkoutUrl =
      meta?.checkoutUrl ??
      `${appUrl}/support/checkout/${encodeURIComponent(tip.id)}`;

    return {
      tip: toPublicTipDto({ ...tip, creator }),
      checkoutUrl,
    };
  }
}
