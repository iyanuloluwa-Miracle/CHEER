import { TipStatus } from '@prisma/client';
import {
  canTransitionTip,
  isTipTerminal,
  mapVerificationToStatuses,
} from './payment-status.transitions';

describe('payment status transitions', () => {
  it('maps verification statuses', () => {
    expect(mapVerificationToStatuses('succeeded')?.tipStatus).toBe(
      TipStatus.PAID,
    );
    expect(mapVerificationToStatuses('failed')?.tipStatus).toBe(
      TipStatus.FAILED,
    );
    expect(mapVerificationToStatuses('pending')).toBeNull();
  });

  it('treats PAID/FAILED/EXPIRED as terminal', () => {
    expect(isTipTerminal(TipStatus.PAID)).toBe(true);
    expect(isTipTerminal(TipStatus.CHECKOUT_PENDING)).toBe(false);
  });

  it('blocks transitions out of PAID', () => {
    expect(canTransitionTip(TipStatus.PAID, TipStatus.FAILED)).toBe(false);
    expect(canTransitionTip(TipStatus.CHECKOUT_PENDING, TipStatus.PAID)).toBe(
      true,
    );
  });
});
