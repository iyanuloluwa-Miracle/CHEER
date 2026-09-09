/**
 * Settlement / payout readiness for the creator dashboard.
 *
 * TippyMe is not a bank. Until Bachs Connect accounts are linked and tip
 * checkout settles into those accounts, TippyMe must not expose a withdrawable
 * wallet or accept Tippy-initiated payout requests.
 *
 * Verified Bachs capabilities (see docs/bachs-integration.md + Phase 10 doc):
 * - Connect recipient accounts (`transfers` + `payouts`)
 * - Destination charges / platform → account transfers
 * - Balances (`available_balance` / `pending_balance`)
 * - Withdrawals to bank / MoMo / crypto
 * - Payout schedules (incl. weekly days such as friday) on Bachs balances
 *
 * TippyMe MVP gap: no Connect onboarding, checkout has no
 * `transfer_data.destination`, `CreatorProfile.bachsAccountId` unused.
 */

export type SettlementReadiness = 'NOT_CONFIGURED' | 'CONNECTED';

/** Product concept — not implemented in MVP. */
export type AutomatedFridayPayoutStatus = 'FUTURE_CAPABILITY';

export interface CreatorSettlementStatusDto {
  readiness: SettlementReadiness;
  /** Bachs Connect `acct_…` when linked; null until Connect onboarding ships. */
  bachsConnectAccountId: string | null;
  /**
   * Always false until Connect settlement is live.
   * Tip totals on the dashboard are TippyMe records, not a Bachs wallet.
   */
  tippyHoldsWithdrawableBalance: false;
  /**
   * Creators cannot request a TippyMe “withdraw” in MVP.
   * Real withdrawals require Bachs balances + destinations.
   */
  tippyInitiatedPayoutAvailable: false;
  automatedFridayPayout: AutomatedFridayPayoutStatus;
  /** Human-readable status for the dashboard. */
  message: string;
}

export function buildSettlementStatus(
  bachsAccountId: string | null | undefined,
): CreatorSettlementStatusDto {
  const linked = Boolean(bachsAccountId?.trim());

  if (!linked) {
    return {
      readiness: 'NOT_CONFIGURED',
      bachsConnectAccountId: null,
      tippyHoldsWithdrawableBalance: false,
      tippyInitiatedPayoutAvailable: false,
      automatedFridayPayout: 'FUTURE_CAPABILITY',
      message:
        'Money settlement via Bachs — automatic Friday payouts coming when Connect is enabled. Successful tips are recorded in TippyMe; TippyMe is not a bank and does not hold a withdrawable balance.',
    };
  }

  // Reserved for when Connect onboarding stores acct_ ids. Still no Tippy wallet.
  return {
    readiness: 'CONNECTED',
    bachsConnectAccountId: bachsAccountId!.trim(),
    tippyHoldsWithdrawableBalance: false,
    tippyInitiatedPayoutAvailable: false,
    automatedFridayPayout: 'FUTURE_CAPABILITY',
    message:
      'Bachs Connect account linked. TippyMe does not hold a withdrawable wallet. Automatic Friday payouts via Bachs schedules will apply when destinations and Connect settlement are fully enabled.',
  };
}
