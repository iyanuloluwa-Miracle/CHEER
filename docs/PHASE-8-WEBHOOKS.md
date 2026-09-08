# Phase 8 — Bachs Webhooks & OutRay

**Status:** Complete  
**Date:** 2026-09-07

## Endpoint

`POST /api/webhooks/bachs` (public, raw body required)

Flow:

1. Verify `X-Bachs-Timestamp` + `X-Bachs-Signature` (HMAC-SHA256 of `{timestamp}.{raw_body}`, 300s tolerance)
2. Parse envelope; dedupe on `evt_…` via `WebhookEvent.providerEventId` unique
3. Resolve Tip by checkout id / `reference` (tip id)
4. Server-side `GET /v1/checkout-sessions/{checkout_id}`
5. Validate amount, currency, reference against TippyMe records
6. Apply safe status transitions only (`CHECKOUT_PENDING` → `PAID` | `FAILED` | `EXPIRED`)
7. Notify creator once (deduped)

Invalid signature → `401`. Malformed body → `400`. Provider verify timeout → `503` (Bachs retries).

## Frontend status

`GET /api/payments/:id/status` — `:id` may be payment or tip id. Confirmation page polls; never treats redirect as paid.

## OutRay

See [outray-development.md](./outray-development.md) for the verified local tunnel procedure. OutRay is development-only.
