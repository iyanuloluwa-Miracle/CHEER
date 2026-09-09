# TippyMe Architecture

**Product:** TippyMe (`cheer.cash`) — support/tipping for African creators  
**Status:** Single Nuxt/Nitro process (SSR UI + `/api` backend)

---

## 1. Locked application stack

| Layer | Technology |
|-------|------------|
| App | Vue 3 + Nuxt 3 + Nitro + TypeScript + Tailwind CSS + Pinia |
| Database | PostgreSQL + Prisma |
| Payments | Bachs |
| Email / OTP delivery | SendByte |
| Local webhook tunnel | OutRay (**development only**) |

Do not replace Vue/Nuxt with React/Next.js. Do not replace Bachs with another payment provider.

---

## 2. High-level runtime

```text
Nuxt 3 (TippyMe UI + Nitro /api)
        ├── PostgreSQL (Prisma)
        ├── Bachs (payments + Connect)
        ├── SendByte (OTP / transactional email)
        └── Webhooks (/api/webhooks/bachs)
```

Browser calls same-origin `/api/*`. SSR uses the same Nitro handlers in-process.

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
Nuxt/Nitro localhost:3000
   │
   ▼
PostgreSQL
```

### Production

```text
Bachs (live)
   │  HTTPS webhook
   ▼
Public production URL /api/webhooks/bachs
   │
   ▼
PostgreSQL
```

OutRay is **not** in production.

---

## 4. Bounded contexts (Nitro `server/`)

| Area | Responsibility |
|------|----------------|
| `Auth` | Signup/login, JWT/session cookies, OTP verify |
| `Creators` | Profile, username, public page data |
| `Tips` | Tip creation, amounts, messages, anonymity |
| `Payments` | Bachs checkout client, references, status |
| `Webhooks` | Raw-body Bachs verification + fulfilment |
| `Notifications` | SendByte email sends |
| `Payouts` | Bachs Connect account / settlement status (later) |

---

## 5. Data ownership (logical)

| Concern | System of record |
|---------|------------------|
| Creator identity & profile | TippyMe Postgres |
| Tip intent, message, anonymity | TippyMe Postgres |
| Tip paid / failed | TippyMe Postgres, updated only after Bachs verification |
| Money movement | Bachs |
| Email delivery | SendByte |
| OTP codes | TippyMe Postgres (hashed) + SendByte for transport |

---

## 6. Security boundaries

- Session: httpOnly cookie `tippyme_session` (JWT). Never expose OTP codes or secrets to the client.
- Tip `PAID` status is set only via webhook + server-side Bachs verify — never from browser redirects.
- Secrets (`AUTH_*`, `DATABASE_URL`, `BACHS_*`, `SENDBYTE_*`) stay on the Nitro server (`runtimeConfig`), never `NUXT_PUBLIC_*`.

---

## 7. Layout

```text
pages/                 Vue routes
server/
  api/                 Nitro /api handlers
  services/            Domain logic (auth, creators, tips, payments, …)
  lib/                 prisma, env, auth, errors, rate-limit
prisma/                Schema + migrations
```
