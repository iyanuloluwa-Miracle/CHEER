import { getServerEnv } from '../../../lib/env';
import type {
  HandleWebhookInput,
  HandleWebhookResult,
  InitializePaymentInput,
  InitializePaymentResult,
  PaymentProviderPort,
  VerifyPaymentInput,
  VerifyPaymentResult,
} from '../payment-provider.port';

/**
 * Phase 6 stub — simulates hosted checkout without calling Bachs.
 * Replace with BachsPaymentProvider in Phase 7 behind the same port.
 */
export class StubPaymentProvider implements PaymentProviderPort {
  readonly name = 'DEV_STUB' as const;

  initializePayment(
    input: InitializePaymentInput,
  ): Promise<InitializePaymentResult> {
    const appUrl = (getServerEnv().APP_URL ?? 'http://localhost:3000').replace(
      /\/$/,
      '',
    );

    const providerReference = `stub_chk_${input.tipId}`;
    const checkoutUrl = `${appUrl}/support/checkout/${encodeURIComponent(input.tipId)}`;

    return Promise.resolve({
      checkoutUrl,
      providerReference,
      rawStatus: 'stub_initialized',
      metadata: {
        provider: this.name,
        note: 'Phase 6 stub — not a Bachs checkout',
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
      },
    });
  }

  verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    return Promise.resolve({
      status: 'pending',
      providerReference: input.providerReference,
      rawStatus: 'stub_pending',
      metadata: {
        note: 'Phase 6 stub — verification deferred to Bachs (Phase 7+)',
      },
    });
  }

  handleWebhook(input: HandleWebhookInput): Promise<HandleWebhookResult> {
    void input;
    return Promise.resolve({
      acknowledged: false,
      eventType: 'stub.unimplemented',
    });
  }
}
