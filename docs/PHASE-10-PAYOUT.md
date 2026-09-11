# Phase 10 — Payout and settlement

**Decision: do not implement TippyMe-initiated payouts or a TippyMe wallet in MVP.**

TippyMe is not a bank. Successful tip totals on the dashboard are TippyMe business records. They are **not** a withdrawable balance.

---

## Verified Bachs capabilities (official docs)

Sources: [docs.bachs.io](https://docs.bachs.io), [llms.txt](https://docs.bachs.io/llms.txt), and pages linked from `docs/bachs-integration.md`.

| Area | What Bachs documents |
|------|----------------------|
| Creator settlement | Via **Connect**: destination charges (`transfer_data.destination` + `platform_fee`) or platform collect then `POST /v1/transfers` to recipient accounts |
| Bank accounts | Payout **destinations** (bank / MoMo / crypto); resolve bank account before create; NGN bank transfer documented for fiat withdrawals |
| Balances | `GET` balances — `available_balance`, pending/locked buckets; transfers draw on available only |
| Payouts / withdrawals | `Create Payout` / quote / estimate; async status; webhooks `payout.created`, `payout.paid`, `payout.failed` |
| Transfers | `POST /v1/transfers` between platform and connected accounts (`transfers` capability on recipient) |
| Scheduled settlement | **Payout schedules** on `balance_settings`: `manual`, `instant`, `daily`, `weekly` (weekday list incl. friday), `monthly` — per currency, optional `X-Account-Id` for connected accounts |
| Automated payouts | Bachs schedules automate payout of **settled collections** on that Bachs balance to a default destination — not TippyMe inventing a ledger |

Platform prerequisite: active `connect` capability (`GET /v1/accounts/me` → `enabled_capabilities`). Recipient accounts request `transfers` + `payouts`.

---

## TippyMe MVP gaps (why payout is not implemented)

1. Checkout does **not** set `transfer_data.destination` — tips are not settled into per-creator Connect balances.
2. No Connect account create / hosted onboarding flow for creators.
3. `CreatorProfile.bachsAccountId` exists for future use but is unused in product flows.
4. **UNKNOWN — NEEDS VERIFICATION:** whether the TippyMe Bachs org already has `connect` enabled.

Without those pieces, a TippyMe “Request payout” or “Withdrawable balance” UI would be **fake**.

---

## What Phase 10 ships

- Documentation of Bachs vs TippyMe (this file + `bachs-integration.md` settlement section).
- Dashboard `settlement` status:
  - `readiness: NOT_CONFIGURED` (or `CONNECTED` if an `acct_` is stored later)
  - `tippyHoldsWithdrawableBalance: false`
  - `tippyInitiatedPayoutAvailable: false`
  - `automatedFridayPayout: FUTURE_CAPABILITY`
- Extensible types only — no payout POST endpoints, no TippyMe ledger.

---

## Automatic Friday payout — future capability

Product idea: auto-pay creators on Fridays.

Bachs can schedule weekly payouts including `friday` via `weekly_payout_days` on **Bachs** `balance_settings` — but only after Connect settlement and approved destinations exist.

**Automatic scheduled payout — future capability.** Not built into MVP.

---

## Future implementation checklist (Connect demo shipped)

Shipped for hackathon demo (see also `docs/DEMO-SCRIPT.md`):

1. ~~Enable platform `connect`; create recipient accounts; hosted onboarding~~ — `POST /api/creators/me/connect/onboard` (stub when no Bachs key).
2. ~~Tip checkout with destination charge tied to `bachsAccountId`~~ — `transfer_data` + `platform_fee` when linked.
3. Optionally read Bachs balances / transfer list for dashboard (never invent TippyMe balances).
4. ~~Optionally set Bachs payout schedules (e.g. weekly friday)~~ — `POST /api/creators/me/connect/friday-payout`.
5. TippyMe UX mirrors Connect readiness only — still no TippyMe wallet.

---

## Testing

No payout request / webhook payout fulfilment tests in this phase (no payout API).

Covered: settlement status builder unit tests (no withdrawable wallet; future Friday flag).
