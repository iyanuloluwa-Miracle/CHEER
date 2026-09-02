# Bachs Integration Notes (Cheer)

**Sources:** [docs.bachs.io](https://docs.bachs.io), [llms.txt index](https://docs.bachs.io/llms.txt)  
**Rule:** Anything not confirmed below is marked UNKNOWN — NEEDS VERIFICATION. Do not invent endpoints or fields at implementation time — re-read the linked API pages.

---

## Role in Cheer

Bachs is the **payment infrastructure**. Cheer owns creator profiles, tip UX, messages, anonymity, and Cheer-side transaction records. Cheer is not a payment processor.

---

## Authentication

| Item | Verified |
|------|----------|
| Mechanism | Bearer token: `Authorization: Bearer <secret_key>` |
| Sandbox keys | Prefix `sk_sandbox_...` |
| Production keys | Prefix `sk_live_...` |
| Scopes | Pattern `resource:read` / `resource:write` (e.g. `payments:write`, `webhooks:write`) |
| Client exposure | **Forbidden** — secret keys server-side only |

Docs: [Authentication](https://docs.bachs.io/authentication.md)

Official example env name: `BACHS_API_KEY`

---

## API base URLs

| Environment | Base URL |
|-------------|----------|
| Sandbox | `https://sandbox-api.bachs.io` |
| Production | `https://api.bachs.io` |

API version path prefix: `/v1`

Docs: [API Standards](https://docs.bachs.io/api-reference/api-standards.md)

---

## Sandbox vs production

- Fully isolated deployments (keys, charges, webhooks, balances do not cross).
- Sandbox: no real money; simulated outcomes where documented.
- Going live: account verification + swap base URL and key.

Docs: [Sandbox](https://docs.bachs.io/integrate/sandbox.md), [Go live](https://docs.bachs.io/go-live.md)

---

## Payment initialization (checkout)

**Endpoint:** `POST /v1/checkout-sessions`

Cheer tips should use **dynamic pricing** (no catalog product required):

```json
{
  "pricing": { "currency": "NGN", "amount": "5000.00" },
  "customer": { "email": "supporter@example.com" },
  "success_url": "https://example.com/thanks",
  "cancel_url": "https://example.com/cancel",
  "reference": "<cheer_tip_id>",
  "metadata": { "tip_id": "<cheer_tip_id>" }
}
```

Alternative: `product_cart` with catalog products (exactly one of `product_cart` or `pricing`).

**Response (documented fields include):** `checkout_id`, `checkout_url`, `status`, `expires_at`, `created_at`

Redirect the supporter to `checkout_url`.

Docs: [Accept a payment with Checkout](https://docs.bachs.io/guides/checkout/checkout-sessions.md), [Create checkout session](https://docs.bachs.io/api-reference/payments/create-checkout-session.md)

---

## Checkout / payment flow (Cheer)

1. NestJS creates Cheer tip row (`CREATED`) with server-validated amount/currency.
2. NestJS calls Bachs `POST /v1/checkout-sessions` with `Idempotency-Key` + Cheer `reference`.
3. Store `checkout_id`; return `checkout_url` to Nuxt.
4. Supporter pays on Bachs hosted checkout.
5. Bachs redirects to `success_url?checkout_id=...` — **UX only, not proof**.
6. NestJS marks tip `PAID` only after verified webhook / server retrieval.

---

## Payment verification

| Mechanism | Trust level |
|-----------|-------------|
| Frontend redirect | **Not proof** |
| Webhook `collection.succeeded` | Trusted (after signature verify) |
| Webhook `checkout.completed` with `payment_status: paid` | Trusted for Connect marketplace flow (after signature verify) |
| `GET` checkout session by id | Server-side reconcile |

Docs explicitly: treat webhooks as source of truth for fulfilment.

---

## Payment / collection status values

Documented examples vary by event:

| Context | Example values from docs |
|---------|---------------------------|
| Checkout session create response | `open` (and later completed/expired — see object reference) |
| `collection.succeeded` `data.status` | Examples include `succeeded` / `SUCCEEDED` / `ACCEPTED` / `OVERPAID` (payment-events guide) |
| `checkout.completed` `data.payment_status` | `paid` (Connect marketplace guide) |

**UNKNOWN — NEEDS VERIFICATION:** Exhaustive enum of all tip-relevant status strings across every event type. Re-read event payload pages before branching logic; normalize carefully.

---

## Webhook mechanism

- Register HTTPS destination in Developer Portal or via Webhook Endpoint API (`webhooks:write`).
- Delivery: signed `POST` JSON envelope.
- At-least-once delivery — dedupe on event `id` (`evt_...`).

Envelope shape:

```json
{
  "id": "evt_...",
  "type": "collection.succeeded",
  "created_at": "2026-02-22T16:20:00.123456+00:00",
  "organization_id": "acct_...",
  "data": {}
}
```

Docs: [Setting Up Webhooks](https://docs.bachs.io/guides/webhooks/overview.md)

### Relevant event types (subscribe for Cheer)

| Category | Events |
|----------|--------|
| Checkout | `checkout.completed`, `checkout.expired` |
| Payments | `collection.succeeded`, `collection.failed`, `collection.underpaid` |
| Withdrawals (later) | `payout.created`, `payout.paid`, `payout.failed` |
| Connect (later) | `capability.updated`, `transfer.created`, `account.updated` |

### Signature verification

| Header | Purpose |
|--------|---------|
| `X-Bachs-Timestamp` | Unix seconds |
| `X-Bachs-Signature` | HMAC-SHA256 hex of `"{timestamp}.{raw_body}"` |

Verify against endpoint signing secret; reject stale timestamps (docs example tolerance: 300s). Use **raw body** before JSON parse.

Cheer env placeholder name: `BACHS_WEBHOOK_SECRET` (Cheer-chosen; not a Bachs-prescribed global name).

---

## Transaction / reference identifiers

| ID | Prefix / notes |
|----|----------------|
| Checkout | `chk_...` |
| Charge | `ch_...` / `chr_...` (docs show both styles in places — treat as opaque) |
| Event | `evt_...` |
| Customer | `cust_...` |
| Account (Connect) | `acct_...` |
| Cheer tip | Cheer UUID / internal ID — send as Bachs `reference` (unique per org, max 128 chars) and `metadata` |

---

## Currency & amount representation

- Amounts: **decimal strings** at currency precision (e.g. `"29.00"`, `"75000.00"`).
- Currency: ISO 4217 field alongside amount.
- **Never** minor units (kobo/cents as integers).
- Collection currencies include USD, NGN, several MoMo currencies, crypto codes — see [Supported Currencies](https://docs.bachs.io/for-you/supported-currencies.md).
- Balance currencies documented: USD, NGN (others may need enabling).
- Withdrawals (fiat): NGN bank transfer documented; crypto USDT networks listed.

Cheer MVP tip currency: prefer `NGN` (and optionally `USD`) — confirm account enabled methods via `GET /v1/accounts/checkout/settings` before offering corridors.

---

## Supported payment methods (platform capability)

Corridors include: `USD_CARD`, `NGN_CARD`, `NGN_BANK_TRANSFER`, `MOMO_*`, `CRYPTO`.

Actual offer set is **account-specific**. Restrict via `payment_method_options` on checkout.

Docs: [Payment method support](https://docs.bachs.io/guides/payments/payment-method-support.md)

---

## Settlement / payout / Connect

For multi-creator Cheer:

- Prefer **platform collects** (marketplace) with destination/split to Connect accounts (`transfer_data.destination`, `platform_fee`) — see [Accept a payment for a seller](https://docs.bachs.io/connect/marketplaces/accept-a-payment.md).
- Creators as **recipients**: request `transfers` + `payouts` under recipient persona — [Creator payouts](https://docs.bachs.io/connect/payout-networks.md).
- Platform needs `connect` capability — [Become a platform](https://docs.bachs.io/connect/become-a-platform.md).

**UNKNOWN — NEEDS VERIFICATION:** Whether the Cheer Bachs sandbox org already has `connect` enabled.

---

## Idempotency

- Header: `Idempotency-Key` on `POST` (and `PATCH` per API standards).
- Cache successful responses 24 hours per API key.
- Mismatch body → `409` / `IDEMPOTENCY_CONFLICT`.

Docs: [Idempotency](https://docs.bachs.io/guides/idempotency.md)

---

## Error responses

HTTP codes documented: `400`, `401`, `403`, `404`, `409`, `422`, `429`, `500`.  
Machine-readable `error_code` on 4xx.

Docs: [API Standards](https://docs.bachs.io/api-reference/api-standards.md), [Errors](https://docs.bachs.io/errors.md)

---

## Rate limits

| Environment | Limit |
|-------------|-------|
| Production | 500 req/min per API key |
| Sandbox | 100 req/min per API key |

Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After` on 429.

---

## Required environment variables (Cheer)

| Variable | Official? | Purpose |
|----------|-----------|---------|
| `BACHS_API_KEY` | Yes (docs examples) | Secret API key |
| `BACHS_API_BASE_URL` | Cheer-chosen | `https://sandbox-api.bachs.io` or `https://api.bachs.io` |
| `BACHS_WEBHOOK_SECRET` | Cheer-chosen name for dashboard signing secret | Verify `X-Bachs-Signature` |

There is no verified official env named `BACHS_SECRET` distinct from the API key — **do not invent a second secret type**.

---

## SDK availability

| Kind | Notes |
|------|-------|
| Official first-party Node SDK | **UNKNOWN — NEEDS VERIFICATION** (community SDKs listed; treat REST docs as source of truth) |
| Community Node | `bachs-sdk` listed on [Community Projects](https://docs.bachs.io/community/projects.md) — examples may diverge from official field names (e.g. `line_items` vs `product_cart`). Prefer official REST shapes if using community SDK. |

Cheer NestJS recommendation: thin HTTP client wrapping official REST until an official SDK is confirmed.

---

## Cheer NestJS ownership

NestJS owns:

- All Bachs API calls
- Webhook verification & idempotent tip fulfilment
- Amount validation
- Storage of `checkout_id`, charge ids, event ids

Nuxt never receives Bachs secrets and never marks tips paid.
