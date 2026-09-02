# SendByte Integration Notes (Cheer)

**Sources:** [docs.sendbyte.africa](https://docs.sendbyte.africa), [llms.txt](https://docs.sendbyte.africa/llms.txt)  
**API base:** `https://api.sendbyte.africa/v1`

---

## Role in Cheer

SendByte delivers **transactional email** for:

1. Creator email verification OTP  
2. Password reset OTP (if password reset ships)  
3. Important creator notifications  
4. Payment-related transactional notifications where appropriate  

SendByte does **not** generate OTPs. NestJS generates OTPs, hashes/stores them with expiry and attempt limits, and sends the code via SendByte email.

---

## Node.js / NestJS approach

Official SDK: `@sendbyte/node` (Node 18+, TypeScript types, ESM/CJS).

```bash
npm install @sendbyte/node
```

```typescript
import { SendByte } from '@sendbyte/node';

const sendbyte = new SendByte(process.env.SENDBYTE_API_KEY!);
// Docs also show: new SendByte({ apiKey: process.env.SENDBYTE_API_KEY })
```

Docs: [Node.js SDK](https://docs.sendbyte.africa/sdks/node.md)

NestJS: wrap the client in a dedicated module/provider; inject only on the server. Never import into Nuxt client bundles.

---

## Authentication & API keys

| Item | Verified |
|------|----------|
| Header | `Authorization: Bearer <key>` |
| Sandbox | `sk_test_...` — simulated delivery, no domain required |
| Live | `sk_live_...` — real delivery; verified domain required |
| Scopes | `send_only`, `read_only`, `full_access` |
| Env name in docs | `SENDBYTE_API_KEY` |

Keys shown once at creation; stored hashed by SendByte. Prefer `send_only` for the NestJS app.

Docs: [Authentication](https://docs.sendbyte.africa/api-reference/authentication.md)

---

## Email sending

**Endpoint:** `POST https://api.sendbyte.africa/v1/emails`

Required (typical): `from`, `to`, `subject`, and one of `html` | `text` | `template_id`.

Response `201`:

```json
{
  "id": "em_01j...",
  "status": "queued",
  "sandbox": false,
  "created_at": "2024-01-15T10:00:00Z"
}
```

Docs: [Send email](https://docs.sendbyte.africa/api-reference/emails/send.md)

---

## OTP implementation guidance (Cheer + SendByte)

SendByte docs treat OTP as a **use case** of transactional email (and suggest idempotency keys like `otp-attempt-77f3`). There is **no separate SendByte OTP API** in the published reference.

Cheer must implement:

| Rule | Implementation owner |
|------|----------------------|
| Generate OTP | NestJS (crypto-secure random) |
| Never store plaintext OTP | Hash (e.g. HMAC/sha256 with server pepper) before DB write |
| Expiry | Short TTL (e.g. 10 minutes) — Cheer policy |
| Attempt limits | NestJS + DB counters |
| Resend rate limit | NestJS (optionally Redis later) |
| Never log OTP | Logging middleware redaction |
| Never return OTP in API JSON | Responses only `{ ok: true }` / errors |
| Deliver via SendByte | `emails.send` with `idempotency_key` tied to OTP session |

**UNKNOWN — NEEDS VERIFICATION:** Whether SendByte offers a dedicated OTP product beyond email (SMS/WhatsApp are marketed as future/early access on marketing site — not used for Cheer MVP unless docs confirm GA endpoints).

---

## Templates

Server-side templates with Handlebars/MJML are documented under Templates API (`template_id` + `variables` on send).

Docs: [Templates](https://docs.sendbyte.africa/api-reference/templates/manage.md)  
**UNKNOWN — NEEDS VERIFICATION at implementation:** Exact create/list field schemas if not re-fetched from that page before coding.

For MVP, HTML string templates in NestJS are acceptable; migrate to SendByte templates when ready.

---

## Sandbox

- Use `sk_test_` keys.
- Pipeline simulated (`email.sent` → `email.delivered` ≈300ms); no real inbox.
- Webhooks still fire and are signed.
- Domain not required.

Docs: [Sandbox](https://docs.sendbyte.africa/sandbox.md)

---

## Idempotency

- Field: `idempotency_key` on send body (up to 256 chars).
- First call: `201`; replay identical: `200` with original email.
- Different body same key: `409` `idempotency_conflict`.
- Keys **never expire** (project-scoped uniqueness).

Docs: [Idempotency](https://docs.sendbyte.africa/guides/idempotency.md)

---

## Webhooks (optional for Cheer MVP)

Register: `POST /v1/webhooks` with `url` + optional `events`.

Secret: `whsec_...` shown once → store as `SENDBYTE_WEBHOOK_SECRET`.

| Header | Purpose |
|--------|---------|
| `sendbyte-signature` | `t=<unix>,v1=<hex_hmac>` over `"{t}.{raw_body}"` |
| `webhook-id` | Deduplicate deliveries |

SDK: `verifyWebhookSignature(secret, header, rawBody)`.

Event types include: `email.sent`, `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`, `email.complained`, `email.unsubscribed`, `domain.verified`, `domain.degraded`.

Docs: [Webhooks guide](https://docs.sendbyte.africa/guides/webhooks.md)

Cheer MVP: optional — useful for bounce handling; OTP flow does not require waiting on delivery webhooks.

---

## Error format

```json
{
  "error": {
    "code": "domain_not_verified",
    "message": "...",
    "docs_url": "https://docs.sendbyte.africa/errors/..."
  }
}
```

Also log `x-request-id` header.

Docs: [Errors](https://docs.sendbyte.africa/api-reference/errors.md)

---

## Rate limits

Default: **120 requests per minute per API key** → `429` `rate_limit_exceeded` + `Retry-After`.

---

## Domain verification (live)

1. `POST /v1/domains` with domain  
2. Publish SPF + DKIM (+ DMARC recommended)  
3. `POST /v1/domains/{id}/verify`  

Live sends require verified domain.

Docs: [Domains](https://docs.sendbyte.africa/guides/domains.md)

---

## Required environment variables

| Variable | Official in docs? | Purpose |
|----------|-------------------|---------|
| `SENDBYTE_API_KEY` | Yes | API bearer key |
| `SENDBYTE_WEBHOOK_SECRET` | Yes (SDK examples) | Verify inbound webhooks |
| `SENDBYTE_FROM_EMAIL` | Cheer-chosen | `from` address (e.g. `Cheer <noreply@cheer.cash>`) |

---

## Security checklist (mandatory)

- [ ] `SENDBYTE_API_KEY` never in Nuxt / browser  
- [ ] OTP generated only in NestJS  
- [ ] OTP hashed at rest; expired; attempt-limited; resend-limited  
- [ ] OTP never logged or returned in API responses  
- [ ] Use `idempotency_key` for OTP / receipt emails  

---

## What SendByte is not

- Not an auth provider  
- Not a payment provider  
- Not (yet) Cheer’s SMS channel unless future docs confirm GA SMS endpoints
