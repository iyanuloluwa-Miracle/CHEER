import { PaymentStatus, TipStatus } from '@prisma/client';
import type { PaymentVerificationStatus } from './payment-provider.port';

/**
 * TippyMe tip status machine (Phase 3 / Phase 8).
 * Terminal states are sticky — a PAID tip must not become FAILED from a stale webhook.
 */
const TIP_TERMINAL: ReadonlySet<TipStatus> = new Set([
  TipStatus.PAID,
  TipStatus.FAILED,
  TipStatus.EXPIRED,
]);

const PAYMENT_TERMINAL: ReadonlySet<PaymentStatus> = new Set([
  PaymentStatus.SUCCEEDED,
  PaymentStatus.FAILED,
  PaymentStatus.CANCELLED,
  PaymentStatus.EXPIRED,
]);

export function isTipTerminal(status: TipStatus): boolean {
  return TIP_TERMINAL.has(status);
}

export function isPaymentTerminal(status: PaymentStatus): boolean {
  return PAYMENT_TERMINAL.has(status);
}

export function mapVerificationToStatuses(
  status: PaymentVerificationStatus,
): { tipStatus: TipStatus; paymentStatus: PaymentStatus } | null {
  switch (status) {
    case 'succeeded':
      return {
        tipStatus: TipStatus.PAID,
        paymentStatus: PaymentStatus.SUCCEEDED,
      };
    case 'failed':
      return {
        tipStatus: TipStatus.FAILED,
        paymentStatus: PaymentStatus.FAILED,
      };
    case 'expired':
      return {
        tipStatus: TipStatus.EXPIRED,
        paymentStatus: PaymentStatus.EXPIRED,
      };
    case 'cancelled':
      return {
        tipStatus: TipStatus.FAILED,
        paymentStatus: PaymentStatus.CANCELLED,
      };
    case 'pending':
    case 'unknown':
    default:
      return null;
  }
}

/**
 * Only non-terminal tips may advance. Terminal tips ignore further events.
 */
export function canTransitionTip(from: TipStatus, to: TipStatus): boolean {
  if (from === to) return false;
  if (isTipTerminal(from)) return false;
  // Allow CREATED / CHECKOUT_PENDING → terminal outcomes only
  return (
    to === TipStatus.PAID || to === TipStatus.FAILED || to === TipStatus.EXPIRED
  );
}
