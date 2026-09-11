/**
 * Payment provider port — TippyMe never leaks Bachs-specific types into tips/UI.
 * Connect destination charges are optional on initialize when the creator has
 * a linked Bachs Connect account. TippyMe never invents a withdrawable wallet.
 */

export type PaymentProviderName = 'DEV_STUB' | 'BACHS';

export interface InitializePaymentInput {
  tipId: string;
  paymentTransactionId: string;
  internalReference: string;
  amount: string;
  currency: string;
  creatorUsername: string;
  successUrl: string;
  cancelUrl: string;
  /** Required by Bachs NewCustomerRequest (email + name). */
  customerEmail?: string;
  customerName?: string;
  metadata?: Record<string, string>;
  /**
   * Bachs Connect `acct_…` for destination charges.
   * When set, checkout includes transfer_data.destination + platform_fee.
   */
  bachsConnectAccountId?: string | null;
  /** Platform fee as decimal string (same currency). Computed by TipsService. */
  platformFee?: string | null;
}

export interface InitializePaymentResult {
  /** Hosted checkout URL (Bachs in Phase 7; Tippy stub path in Phase 6). */
  checkoutUrl: string;
  providerReference: string;
  rawStatus?: string;
  metadata?: Record<string, unknown>;
}

export interface VerifyPaymentInput {
  providerReference: string;
  internalReference?: string;
}

export type PaymentVerificationStatus =
  | 'pending'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'unknown';

export interface VerifyPaymentResult {
  status: PaymentVerificationStatus;
  providerReference: string;
  amount?: string;
  currency?: string;
  rawStatus?: string;
  metadata?: Record<string, unknown>;
}

export interface HandleWebhookInput {
  rawBody: Buffer | string;
  headers: Record<string, string | string[] | undefined>;
}

export interface HandleWebhookResult {
  acknowledged: boolean;
  providerEventId?: string;
  eventType?: string;
  /** TippyMe tip id when resolvable — status transitions happen in PaymentsService. */
  tipId?: string;
  verification?: VerifyPaymentResult;
}

export interface PaymentProviderPort {
  readonly name: PaymentProviderName;

  initializePayment(
    input: InitializePaymentInput,
  ): Promise<InitializePaymentResult>;

  verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult>;

  handleWebhook(input: HandleWebhookInput): Promise<HandleWebhookResult>;
}
