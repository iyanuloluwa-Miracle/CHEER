# Cheer Architecture

**Product:** Cheer (`cheer.cash`) — support/tipping for African creators  
**Status:** Phase 3 persistence layer added (Prisma + PostgreSQL schema)

---

## 1. Locked application stack

| Layer | Technology |
|-------|------------|
| Frontend | Vue 3 + Nuxt 3 + TypeScript + Tailwind CSS + Pinia (when needed) |
| Backend | Node.js + NestJS + TypeScript |
| Database | PostgreSQL + Prisma |
| Payments | Bachs |
| Email / OTP delivery | SendByte |
| Local webhook tunnel | OutRay (**development only**) |

Do not replace Vue/Nuxt with React/Next.js. Do not replace NestJS with another backend framework. Do not replace Bachs with another payment provider.

---

## 2. High-level runtime

```text
Nuxt 3 (Cheer UI)
        │  HTTPS / JSON
        ▼
NestJS API
        ├── PostgreSQL (Prisma)
        ├── Bachs (payments + Connect)
        ├── SendByte (OTP / transactional email)
        └── Webhooks
              └── Bachs (and optional SendByte)
```

---

## 3. Development vs production money path

### Development

```text
Bachs (sandbox)
   │  HTTPS webhook
   ▼
OutRay public URL (reserved subdomain)
   │
   ▼
NestJS localhost
   │
   ▼
PostgreSQL
```

### Production

```text
Bachs (live)
   │  HTTPS webhook
   ▼
Public production NestJS URL
   │
   ▼
PostgreSQL
```

OutRay is **not** in production.

---

## 4. Bounded contexts (NestJS modules — planned)

| Module | Responsibility |
|--------|----------------|
| `Auth` | Signup/login, JWT/session cookies, OTP verify |
| `Creators` | Profile, username, public page data |
| `Tips` | Tip creation, amounts, messages, anonymity |
| `Payments` | Bachs checkout client, references, status |
| `Webhooks` | Raw-body Bachs (and optional SendByte) verification |
| `Notifications` | SendByte email sends |
| `Payouts` | Bachs Connect account / settlement status (later) |

---

## 5. Data ownership (logical)

| Concern | System of record |
|---------|------------------|
| Creator identity & profile | Cheer Postgres |
| Tip intent, message, anonymity | Cheer Postgres |
| Tip paid / failed | Cheer Postgres, updated only after Bachs verification |
| Money movement | Bachs |
| Email delivery | SendByte |
| OTP codes | Cheer Postgres (hashed) + SendByte for transport |

---

## 6. Security boundaries

### Frontend (Nuxt) may receive

- Public creator profile fields  
- Public tip presets / UI copy  
- Checkout **redirect URL** returned by NestJS (Bachs hosted URL)  
- Auth session cookie / public user profile after login  
- `NUXT_PUBLIC_API_URL` / public app URL  

### Frontend must NEVER receive

- `BACHS_API_KEY` / Bachs webhook signing secret  
- `SENDBYTE_API_KEY` / SendByte webhook secret  
- `DATABASE_URL`  
- JWT signing secrets / OTP pepper  
- Any ability to set payment status or balances  

### NestJS owns

- Bachs privileged calls  
- Webhook signature verification  
- Payment verification & tip status transitions  
- OTP generation, hashing, verification, rate limits  
- SendByte sends  
- Database access  
- Financial record integrity (append-oriented tip status changes)

### Browser trust rule

A successful redirect to `success_url` is **never** proof of payment. Only verified Bachs webhooks (or authenticated server-side Bachs retrieval) may mark a tip paid.

---

## 7. Redis

Default MVP: **no Redis**.

Introduce later only for clear benefits (OTP resend throttling under load, rate limiting, job queues). Idempotency for tips/webhooks uses Postgres unique constraints first.

---

## 8. Planned monorepo layout (Phase 2+)

```text
cheer/
  apps/
    web/     # Nuxt 3
    api/     # NestJS
  packages/
    shared/  # optional shared types
  docs/
  docker-compose.yml
  .env.example
```

---

## 9. Related docs

- [AIB Stack](./aib-stack.md)  
- [Product requirements](./product-requirements.md)  
- [Bachs](./bachs-integration.md)  
- [SendByte](./sendbyte-integration.md)  
- [OutRay](./outray-development.md)  
