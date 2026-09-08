# Phase 6 — Public Creator Page & Support Experience

**Status:** Complete  
**Date:** 2026-09-06

## Flow

`/{username}` → amount / message / anonymous → `POST /api/tips` → checkout URL → stub checkout → `/support/confirm/:tipId`

No supporter account required. Bachs API integration is deferred to Phase 7.

## API

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/tips` | No (throttled) | Create Tip + PaymentTransaction, init checkout |
| GET | `/api/tips/:id/public` | No | Confirmation page payload |

### Create tip behavior

1. Resolve creator by **username** (never trust client `creatorId`)
2. Validate amount (format, min `100.00`, max `1000000.00`)
3. Force creator currency; reject currency mismatch
4. Sanitize message / supporter name
5. Create `PaymentTransaction` (`PENDING`) + `Tip` (`CREATED`)
6. Call `PaymentProviderPort.initializePayment()`
7. Move tip → `CHECKOUT_PENDING`, payment → `PROCESSING`
8. Return `checkoutUrl` — **never** marks `PAID` from redirect

Idempotency: body `idempotencyKey` or `Idempotency-Key` header → unique `internalReference`.

## Payment abstraction

`PaymentProviderPort`: `initializePayment` / `verifyPayment` / `handleWebhook`  
Phase 6 provider: `StubPaymentProvider` (`DEV_SEED`) → Tippy `/support/checkout/:tipId`  
Phase 7: Bachs adapter behind the same port.

## Frontend

- `/{username}` — personal support page + form
- `/support/checkout/:tipId` — stub hosted checkout
- `/support/confirm/:tipId` — confirmation (redirect ≠ paid)

Supporter messages rendered with text interpolation only (no `v-html`).
