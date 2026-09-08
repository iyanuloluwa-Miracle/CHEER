import { buildSettlementStatus } from './settlement.types';

describe('buildSettlementStatus', () => {
  it('reports NOT_CONFIGURED without a Connect account id', () => {
    const status = buildSettlementStatus(null);
    expect(status.readiness).toBe('NOT_CONFIGURED');
    expect(status.bachsConnectAccountId).toBeNull();
    expect(status.tippyHoldsWithdrawableBalance).toBe(false);
    expect(status.tippyInitiatedPayoutAvailable).toBe(false);
    expect(status.automatedFridayPayout).toBe('FUTURE_CAPABILITY');
    expect(status.message).toMatch(/future capability/i);
  });

  it('never claims a TippyMe withdrawable wallet when connected', () => {
    const status = buildSettlementStatus('acct_test_123');
    expect(status.readiness).toBe('CONNECTED');
    expect(status.bachsConnectAccountId).toBe('acct_test_123');
    expect(status.tippyHoldsWithdrawableBalance).toBe(false);
    expect(status.tippyInitiatedPayoutAvailable).toBe(false);
    expect(status.automatedFridayPayout).toBe('FUTURE_CAPABILITY');
  });
});
