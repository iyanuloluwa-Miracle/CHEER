import { PaymentStatus, TipStatus } from '../../db/enums';
import type {
  PaymentStatus as PaymentStatusT,
  TipStatus as TipStatusT,
} from '../../db/types';
import type { PaymentVerificationStatus } from './payment-provider.port';

/**
 * TippyMe tip status machine (Phase 3 / Phase 8).
 * Terminal states are sticky — a PAID tip must not become FAILED from a stale webhook.
 */
const TIP_TERMINAL: ReadonlySet<TipStatusT> = new Set([
  TipStatus.PAID,
  TipStatus.FAILED,
  TipStatus.EXPIRED,
]);

const PAYMENT_TERMINAL: ReadonlySet<PaymentStatusT> = new Set([
  PaymentStatus.SUCCEEDED,
  PaymentStatus.FAILED,
  PaymentStatus.CANCELLED,
  PaymentStatus.EXPIRED,
]);

export function isTipTerminal(status: TipStatusT): boolean {
  return TIP_TERMINAL.has(status);
}

export function isPaymentTerminal(status: PaymentStatusT): boolean {
  return PAYMENT_TERMINAL.has(status);
}

export function mapVerificationToStatuses(
  status: PaymentVerificationStatus,
): { tipStatus: TipStatusT; paymentStatus: PaymentStatusT } | null {
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
export function canTransitionTip(from: TipStatusT, to: TipStatusT): boolean {
  if (from === to) return false;
  if (isTipTerminal(from)) return false;
  return (
    to === TipStatus.PAID || to === TipStatus.FAILED || to === TipStatus.EXPIRED
  );
}
