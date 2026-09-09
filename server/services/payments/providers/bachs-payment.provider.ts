import { getServerEnv } from '../../../lib/env';
import { BACHS_CHECKOUT_STATUS } from '../bachs/bachs.constants';
import { BachsHttpClient } from '../bachs/bachs-http.client';
import { BachsProviderError } from '../bachs/bachs.errors';
import { verifyBachsWebhookSignature } from '../bachs/bachs.webhook';
import type {
  HandleWebhookInput,
  HandleWebhookResult,
  InitializePaymentInput,
  InitializePaymentResult,
  PaymentProviderPort,
  PaymentVerificationStatus,
  VerifyPaymentInput,
  VerifyPaymentResult,
} from '../payment-provider.port';

interface BachsWebhookEnvelope {
  id?: string;
  type?: string;
  data?: Record<string, unknown>;
}

/**
 * Bachs adapter behind PaymentProviderPort.
 * Application code must not import Bachs request shapes outside this folder.
 */
export class BachsPaymentProvider implements PaymentProviderPort {
  readonly name = 'BACHS' as const;

  constructor(private readonly http = new BachsHttpClient()) {}

  async initializePayment(
    input: InitializePaymentInput,
  ): Promise<InitializePaymentResult> {
    const email = input.customerEmail?.trim();
    const name = (input.customerName?.trim() || 'Supporter').slice(0, 80);

    if (!email) {
      throw new BachsProviderError(
        'VALIDATION',
        'Customer email is required for Bachs checkout',
      );
    }

    // reference: TippyMe tip id (unique per org, max 128) — docs
    // Idempotency-Key: stable internal payment reference — docs
    const session = await this.http.createCheckoutSession(
      {
        pricing: {
          currency: input.currency,
          amount: input.amount,
        },
        customer: { email, name },
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        reference: input.tipId.slice(0, 128),
        metadata: {
          tip_id: input.tipId,
          payment_transaction_id: input.paymentTransactionId,
          creator_username: input.creatorUsername,
          ...(input.metadata ?? {}),
        },
      },
      input.internalReference.slice(0, 255),
    );

    if (!session.checkout_id || !session.checkout_url) {
      console.error('Bachs checkout response missing checkout_id/url');
      throw new BachsProviderError(
        'PROVIDER',
        'Incomplete Bachs checkout response',
      );
    }

    return {
      checkoutUrl: session.checkout_url,
      providerReference: session.checkout_id,
      rawStatus: session.status,
      metadata: {
        expires_at: session.expires_at,
        created_at: session.created_at,
        reference: session.reference ?? input.tipId,
        provider: this.name,
      },
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    const session = await this.http.getCheckoutSession(input.providerReference);
    return this.mapCheckoutToVerification(session);
  }

  handleWebhook(input: HandleWebhookInput): Promise<HandleWebhookResult> {
    const secret = getServerEnv().BACHS_WEBHOOK_SECRET?.trim();
    if (!secret) {
      console.error('BACHS_WEBHOOK_SECRET not configured');
      return Promise.resolve({ acknowledged: false });
    }

    const timestamp = headerValue(input.headers, 'x-bachs-timestamp');
    const signature = headerValue(input.headers, 'x-bachs-signature');

    const valid = verifyBachsWebhookSignature({
      rawBody: input.rawBody,
      secret,
      timestampHeader: timestamp,
      signatureHeader: signature,
    });

    if (!valid) {
      console.warn('Bachs webhook signature verification failed');
      return Promise.resolve({ acknowledged: false });
    }

    let envelope: BachsWebhookEnvelope;
    try {
      const raw =
        typeof input.rawBody === 'string'
          ? input.rawBody
          : input.rawBody.toString('utf8');
      envelope = JSON.parse(raw) as BachsWebhookEnvelope;
    } catch {
      console.warn('Bachs webhook body is not valid JSON');
      return Promise.resolve({ acknowledged: false });
    }

    const eventType = envelope.type ?? 'unknown';
    const providerEventId = envelope.id;
    const data = envelope.data ?? {};

    const tipId =
      (typeof data.tip_id === 'string' && data.tip_id) ||
      (typeof data.reference === 'string' && data.reference) ||
      undefined;

    const checkoutId =
      typeof data.checkout_id === 'string' ? data.checkout_id : undefined;

    const verification = this.mapWebhookEventToVerification(
      eventType,
      data,
      checkoutId,
    );

    return Promise.resolve({
      acknowledged: true,
      providerEventId,
      eventType,
      tipId,
      verification,
    });
  }

  private mapCheckoutToVerification(session: {
    checkout_id: string;
    status: string;
    payment_status?: string | null;
    amount?: string;
    currency?: string;
    reference?: string | null;
    charge?: { status?: string } | null;
  }): VerifyPaymentResult {
    const status = this.normalizeCheckoutStatus(
      session.status,
      session.payment_status,
      session.charge?.status,
    );

    return {
      status,
      providerReference: session.checkout_id,
      amount: session.amount,
      currency: session.currency,
      rawStatus: [
        session.status,
        session.payment_status,
        session.charge?.status,
      ]
        .filter(Boolean)
        .join('|'),
      metadata: {
        reference: session.reference ?? undefined,
      },
    };
  }

  private mapWebhookEventToVerification(
    eventType: string,
    data: Record<string, unknown>,
    checkoutId?: string,
  ): VerifyPaymentResult | undefined {
    const providerReference =
      checkoutId ||
      (typeof data.checkout_id === 'string' ? data.checkout_id : undefined);

    if (!providerReference) {
      return undefined;
    }

    let status: PaymentVerificationStatus = 'unknown';

    if (
      eventType === 'collection.succeeded' ||
      eventType === 'checkout.completed'
    ) {
      const paymentStatus =
        typeof data.payment_status === 'string'
          ? data.payment_status.toLowerCase()
          : undefined;
      const collectionStatus =
        typeof data.status === 'string' ? data.status.toLowerCase() : undefined;

      // Documented: checkout.completed payment_status paid; collection.succeeded status succeeded/etc.
      if (
        eventType === 'checkout.completed' &&
        paymentStatus &&
        paymentStatus !== 'paid'
      ) {
        status = 'pending';
      } else if (
        collectionStatus === 'succeeded' ||
        collectionStatus === 'accepted' ||
        collectionStatus === 'overpaid' ||
        paymentStatus === 'paid' ||
        paymentStatus === 'succeeded' ||
        eventType === 'collection.succeeded'
      ) {
        status = 'succeeded';
      } else {
        status = 'pending';
      }
    } else if (eventType === 'collection.failed') {
      status = 'failed';
    } else if (eventType === 'checkout.expired') {
      status = 'expired';
    } else if (eventType === 'collection.underpaid') {
      status = 'pending';
    }

    return {
      status,
      providerReference,
      amount: typeof data.amount === 'string' ? data.amount : undefined,
      currency: typeof data.currency === 'string' ? data.currency : undefined,
      rawStatus: eventType,
      metadata: { eventType },
    };
  }

  private normalizeCheckoutStatus(
    status: string,
    paymentStatus?: string | null,
    chargeStatus?: string,
  ): PaymentVerificationStatus {
    const s = status.toLowerCase();
    const ps = paymentStatus?.toLowerCase();
    const cs = chargeStatus?.toLowerCase();

    if (
      s === BACHS_CHECKOUT_STATUS.COMPLETED ||
      ps === 'succeeded' ||
      ps === 'paid' ||
      cs === 'succeeded'
    ) {
      return 'succeeded';
    }
    if (s === BACHS_CHECKOUT_STATUS.EXPIRED) return 'expired';
    if (s === BACHS_CHECKOUT_STATUS.CANCELLED) return 'cancelled';
    if (s === BACHS_CHECKOUT_STATUS.OPEN || ps === 'processing') {
      return 'pending';
    }
    if (ps === 'failed' || cs === 'failed') return 'failed';
    return 'unknown';
  }
}

function headerValue(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const raw = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(raw)) return raw[0];
  return raw;
}
