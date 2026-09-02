# Cheer — Phase 1: AIB Stack Research & Architecture

> **Superseded for detail:** Prefer the dedicated docs in this folder — especially [aib-stack.md](./aib-stack.md), [architecture.md](./architecture.md), [bachs-integration.md](./bachs-integration.md), [sendbyte-integration.md](./sendbyte-integration.md), [outray-development.md](./outray-development.md). This file remains as the original Phase 1 summary.

**Status:** Complete (provisional on AIB Stack materials)  
**Date:** 2026-09-02  
**Product:** Cheer (`cheer.cash`) — creator support/tipping on Bachs  
**Constraint:** Mandatory app stack is Vue 3 + Nuxt 3 + NestJS + PostgreSQL + Prisma + Bachs (+ SendByte + OutRay for Ship)

---

## 1. Existing implementation

Workspace `Cheer/` is empty. No prior code, schemas, or configs. Greenfield build.

---

## 2. AIB Ship 2026 / AIB Stack research

### 2.1 Official requirements search

Searched for public “AIB Ship 2026” / “AIB Stack” requirements (program sites, docs, GitHub, Bachs community, African builder programs).

**Result:** No publicly indexed official AIB Ship 2026 requirements document or mandated AIB Stack catalog was found.

### 2.2 Adjacent / non-applicable stacks (rejected for app layer)

| Source | Stack | Decision |
|--------|--------|----------|
| ShipAI (`shipai.today`) | Bun, Turborepo, **Next.js 16**, Drizzle, Better Auth, Stripe, MinIO | **Reject as app framework.** Next.js + Stripe conflict with mandatory Vue/Nuxt + Bachs. |
| Generic AI hackathon defaults | Next.js + FastAPI | **Reject.** Wrong frontend/backend. |

### 2.3 AIB Stack mapping (provisional)

Until official AIB materials are provided, treat AIB Stack as **unknown / not yet binding**, and lock the mandatory Cheer application stack.

| Concern | Provisional Cheer choice | AIB override rule |
|---------|--------------------------|-------------------|
| Frontend | Vue 3 + Nuxt 3 + TypeScript + Tailwind + Pinia | Keep unless AIB **explicitly** mandates another UI framework |
| Backend | Node.js + NestJS + TypeScript | Keep unless AIB explicitly mandates another API runtime |
| Database | PostgreSQL + Prisma | Prefer AIB-hosted Postgres if provided; keep Prisma |
| Payments | Bachs only | Non-negotiable for tip flow |
| Auth | NestJS JWT + httpOnly cookies (or AIB IdP if required) | Swap to AIB auth **only** if AIB mandates SSO/IdP |
| Cache / jobs | **No Redis in MVP** | Add Redis only if AIB provides it *and* we need rate limit/idempotency beyond DB |
| Object storage | Local/URL avatars first; S3-compatible later if AIB provides MinIO/S3 | Adopt AIB storage if required for media |
| Observability | Structured NestJS logs + basic health endpoints | Plug AIB OTel/logging if provided |
| Deployment | Docker Compose (web + api + postgres) | Prefer AIB deploy targets when known |
| Email | Deferred / optional SMTP | Use AIB mail if provided |

**Open item:** User should supply official AIB Ship 2026 brief / stack list when available. Decisions above will be revised without replacing Vue/Nuxt or NestJS unless AIB explicitly forces an equivalent.

---

## 3. Bachs research (official docs only)

Primary index: [https://docs.bachs.io/llms.txt](https://docs.bachs.io/llms.txt)

### 3.1 Environments & auth

| Item | Official value |
|------|----------------|
| Sandbox base URL | `https://sandbox-api.bachs.io` |
| Production base URL | `https://api.bachs.io` |
| Auth | `Authorization: Bearer <secret_key>` |
| Sandbox key prefix | `sk_sandbox_...` |
| Live key prefix | `sk_live_...` |
| Scopes | e.g. `payments:read/write`, `payouts:read/write`, `webhooks:write` |

Secrets never leave the NestJS server.

### 3.2 Money model

- Amounts are **decimal strings** at currency precision (e.g. `"29.00"`), with ISO 4217 `currency`.
- **Never** use minor units (kobo/cents integers).
- Idempotent POSTs via `Idempotency-Key` header.

### 3.3 Payment initialization

`POST /v1/checkout-sessions`

Cheer tip flow (dynamic amount) should use **raw `pricing`**, not a fixed catalog cart:

```json
{
  "pricing": { "currency": "NGN", "amount": "5000.00" },
  "customer": { "email": "supporter@example.com" },
  "success_url": "https://cheer.cash/u/{username}/thanks",
  "cancel_url": "https://cheer.cash/u/{username}",
  "reference": "<cheer_tip_id>",
  "metadata": { "tip_id": "<cheer_tip_id>", "creator_id": "<uuid>" }
}
```

Response includes `checkout_id`, `checkout_url`, `status`. Redirect supporter to `checkout_url`.

Optional later: `product_cart` with `custom` pricing for pay-what-you-want on hosted UI.

### 3.4 Payment confirmation (source of truth)

| Mechanism | Role |
|-----------|------|
| `success_url` redirect (`?checkout_id=`) | UX only — **not** proof of payment |
| Webhook `collection.succeeded` | Primary fulfillment signal |
| Webhook `checkout.completed` (`payment_status: paid`) | Secondary / Connect marketplace confirmation |
| `GET` checkout/charge retrieval | Server-side verify / reconcile if webhook delayed |

**Never** mark a tip paid from frontend redirect alone.

### 3.5 Webhooks

- Register HTTPS endpoint; signing secret per destination.
- Headers: `X-Bachs-Timestamp`, `X-Bachs-Signature` = HMAC-SHA256 of `"{timestamp}.{raw_body}"`.
- Verify on **raw body** before JSON parse; reject stale timestamps (~300s).
- At-least-once delivery → dedupe on envelope `id` (`evt_...`).
- Subscribe at minimum: `collection.succeeded`, `collection.failed`, `checkout.completed`, `checkout.expired`; later `payout.*`, `capability.updated`, `transfer.created`.

### 3.6 Marketplace / creator settlement (Connect)

Cheer is a multi-creator support platform. Official Connect guidance:

| Question | Cheer decision |
|----------|----------------|
| Who does the supporter think they are paying? | The **creator**, via Cheer as experience layer |
| Merchant-of-record for MVP simplicity? | **Cheer platform collects** (marketplace / destination-charge shape) |
| Why? | Shorter creator onboarding (`recipient` persona: `transfers` + `payouts`); platform controls checkout; Bachs docs recommend this for marketplaces |

Flow:

1. Platform creates Connect **account** per creator (`recipient` capabilities).
2. Creator completes hosted onboarding / payout destination.
3. Tip checkout as platform with `transfer_data.destination` + `platform_fee` (destination charge), **or** collect then transfer (documented split paths).
4. Creator withdraws via Bachs `payouts` on their Connect account.

**Prerequisite:** Platform account must have Bachs `connect` capability (“Become a platform”). Sandbox first.

Fallback if Connect not yet enabled for our Bachs account: single-merchant collect into Cheer balance + manual/scheduled transfers — still Bachs-only; document as interim.

### 3.7 Sandbox testing

- Isolated from production; `simulated_outcome` where documented.
- Local webhook testing via Bachs Developer Portal local testing (no inventing tunnels as requirement).

### 3.8 Explicit non-invented items

All endpoints/shapes above are from docs.bachs.io. Implementation phases 8–9–11 must re-read the matching API reference pages before coding; do not invent fields.

---

## 4. Product architecture (MVP)

### 4.1 System diagram

```text
[Supporter browser]                    [Creator browser]
        |                                      |
        v                                      v
+------------------+                 +------------------+
| Nuxt 3 (Cheer)   | <-- REST/JSON-->| NestJS API       |
| Public /username |                 | Auth, tips,      |
| Dashboard (auth) |                 | Bachs client     |
+------------------+                 +--------+---------+
                                              |
                     +------------------------+------------------------+
                     |                        |                        |
                     v                        v                        v
              PostgreSQL                 Bachs API              Bachs webhooks
              (Prisma)              sandbox-api / api         POST /webhooks/bachs
```

### 4.2 Monorepo layout (Phase 2)

```text
cheer/
  apps/
    web/          # Nuxt 3
    api/          # NestJS
  packages/
    shared/       # Shared types/Zod schemas (optional, thin)
  docs/
  docker-compose.yml   # postgres (+ optional redis later)
  README.md
```

### 4.3 Domain model (logical — Prisma in Phase 3)

| Entity | Purpose |
|--------|---------|
| `User` | Creator account (auth identity) |
| `CreatorProfile` | username (unique), display name, bio, avatar URL, public flags |
| `Tip` | Internal Cheer tip ID, amount, currency, message, anonymity, status |
| `PaymentAttempt` | Links tip ↔ Bachs `checkout_id` / `charge_id` / `reference` |
| `WebhookEvent` | `evt_` id unique; processing status for idempotency |
| `CreatorPayoutAccount` | Bachs Connect `acct_` id, onboarding/capability status |

**Tip status machine:** `CREATED` → `CHECKOUT_PENDING` → `PAID` | `FAILED` | `EXPIRED`  
Only server + webhook/verification path may transition to `PAID`.

### 4.4 Naming note

Master brief sometimes says “Tippy” (URL / transaction ID / account). Product name is **Cheer**. Use Cheer IDs (`tip_…` / UUID) and `cheer.cash/username` in product copy and schema naming.

### 4.5 Auth (Phase 4 plan)

- Creators only; supporters are anonymous guests.
- Email + password (MVP) or magic link if email infra ready.
- NestJS: `passport-jwt` or custom JWT; httpOnly secure cookies preferred for Nuxt SSR.
- Guards: creator owns dashboard resources; public profile + tip create are open with rate limits.

### 4.6 Security (aligned with brief)

1. Bachs secrets server-only.  
2. Amount validated server-side (min/max, currency allowlist).  
3. Cheer tip ID minted before checkout; sent as Bachs `reference` + `metadata`.  
4. Store provider refs (`checkout_id`, `charge_id`).  
5. Idempotent checkout create + webhook handling (`WebhookEvent.evt_id` unique).  
6. No client-writable payment status / balances.  
7. Financial rows append-only in practice (no casual UPDATE of amounts).

### 4.7 Redis

**Defer.** Use Postgres unique constraints for webhook/checkout idempotency in MVP.

---

## 5. Phase roadmap (unchanged)

| Phase | Focus |
|-------|--------|
| 1 | Research & architecture ← **this document** |
| 2 | Nuxt + NestJS foundation |
| 3 | PostgreSQL + Prisma |
| 4 | Authentication |
| 5 | Creator onboarding |
| 6 | Public creator page |
| 7 | Tip creation |
| 8 | Bachs payment integration |
| 9 | Webhooks + verification |
| 10 | Creator dashboard |
| 11 | Payout/settlement (Connect) |
| 12 | UX polish |
| 13 | Security audit |
| 14 | Automated tests |
| 15 | Production deploy |
| 16 | Demo prep |
| 17 | Final review |

---

## 6. Decisions log

| ID | Decision | Rationale |
|----|----------|-----------|
| D1 | Keep Vue/Nuxt + NestJS despite ShipAI Next.js stack | Mandatory stack; ShipAI not confirmed as AIB Ship |
| D2 | PostgreSQL + Prisma; no second DB | Brief + MVP simplicity |
| D3 | No Redis in MVP | Idempotency via Postgres |
| D4 | Bachs hosted checkout + webhooks | Official payment path; no fake processors |
| D5 | Dynamic tips via checkout `pricing` | Tips are variable amounts |
| D6 | Platform-collect Connect (destination / split) for creators | Official marketplace guidance; lighter creator KYC |
| D7 | Cheer naming in code; ignore “Tippy” leftovers | Product is Cheer |
| D8 | AIB infra TBD | No public AIB stack found; integrate when docs provided |

---

## 7. Phase 1 deliverables checklist

| Item | Status |
|------|--------|
| Inspect existing implementation | Done (empty repo) |
| Inspect AIB Ship 2026 requirements | Done — **not publicly found** |
| Identify AIB Stack | Provisional — awaiting official brief |
| Map stack concerns | Done (table §2.3) |
| Inspect Bachs docs (auth, checkout, webhooks, payouts, sandbox, Connect) | Done |
| Document decisions | This file |
| Tests / lint / TS / build | N/A — no application code yet |

---

## 8. Remaining work before / during Phase 2

1. **User input:** Attach or link official AIB Ship 2026 stack / deploy / auth requirements if available.  
2. **Bachs account:** Sandbox org + `sk_sandbox_` key + confirm whether `connect` is enabled.  
3. **Phase 2:** Scaffold monorepo (`apps/web`, `apps/api`), Docker Postgres, shared env examples, health checks.  
4. Do **not** implement payments, auth, or schema until their phases.

---

## 9. Sources

- [Bachs docs index](https://docs.bachs.io/llms.txt)
- [Authentication](https://docs.bachs.io/authentication.md)
- [Sandbox](https://docs.bachs.io/integrate/sandbox.md)
- [Checkout sessions](https://docs.bachs.io/guides/checkout/checkout-sessions.md)
- [Create checkout session API](https://docs.bachs.io/api-reference/payments/create-checkout-session.md)
- [Webhooks](https://docs.bachs.io/guides/webhooks/overview.md)
- [Connect overview](https://docs.bachs.io/connect/overview.md)
- [Choose your integration](https://docs.bachs.io/connect/choose-your-integration.md)
- [Accept payment for a seller](https://docs.bachs.io/connect/marketplaces/accept-a-payment.md)
- [Creator payout networks](https://docs.bachs.io/connect/payout-networks.md)
