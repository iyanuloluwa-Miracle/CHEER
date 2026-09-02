# AIB Stack — Africa Is Building Ship 2026

**Status:** Research complete with open verification items  
**Date:** 2026-09-02  
**Sources searched:** Public web, program sites, partner docs (Bachs, SendByte, OutRay)

---

## 1. Repository inspection (before research)

| Item | Current state |
|------|----------------|
| Framework | None (no app code) |
| Frontend | None |
| Backend | None |
| Package manager | None |
| Environment config | None |
| Database | None |
| Authentication | None |
| Payment code | None |
| API structure | None |
| Testing | None |
| Existing docs | `docs/PHASE-1-ARCHITECTURE.md` only |

Nothing to preserve or delete beyond prior research notes.

---

## 2. AIB Ship 2026 requirements

### Verified

**UNKNOWN — NEEDS VERIFICATION**

No publicly indexed official “Africa Is Building Ship 2026” requirements document, submission guide, or stack catalog was found at the time of research. Searches covered program names (“Africa Is Building”, “AIB Ship 2026”), partner product docs, and ecosystem mentions.

### Inferred from project brief (not official AIB docs)

The Cheer master build instruction locks:

- Frontend: Vue 3 + Nuxt 3 + TypeScript + Tailwind (+ Pinia when needed)
- Backend: Node.js + NestJS + TypeScript
- Database: PostgreSQL + Prisma
- Payments: Bachs
- Communications: SendByte
- Local webhooks: OutRay

These are treated as **project-locked requirements**. They are **not** confirmed as an official published AIB Stack mandate from a single AIB source page.

---

## 3. Relevant AIB Stack services (as named for this project)

Until an official AIB catalog is provided, Cheer treats the following as the **external service stack for Ship**:

| Service | Role | Official docs |
|---------|------|----------------|
| **Bachs** | Payments, checkout, webhooks, settlement/Connect | https://docs.bachs.io |
| **SendByte** | Transactional email / OTP delivery | https://docs.sendbyte.africa |
| **OutRay** | Dev-only HTTPS tunnel for local webhooks | https://outray.dev/docs |

Adjacent ecosystem products (Pxxl, Cencori, etc.) appear in public builder discussions alongside Bachs/SendByte but are **not** adopted here unless confirmed by official AIB materials.

| Adjacent mention | Cheer decision |
|------------------|----------------|
| Pxxl (hosting) | UNKNOWN — NEEDS VERIFICATION whether AIB requires it |
| Cencori (AI infra) | Not required for Cheer MVP tipping product |
| Redis | Optional; only if clear benefit — not AIB-mandated from public docs |

---

## 4. Services Cheer is using

| Service | Using? | Why |
|---------|--------|-----|
| Bachs | Yes | Locked payment infrastructure; creator tips |
| SendByte | Yes | Creator OTP, password reset OTP, transactional notifications |
| OutRay | Yes (dev only) | Stable public HTTPS → local NestJS for Bachs webhooks |
| Redis | No (MVP default) | Postgres uniqueness for idempotency; revisit if rate-limit/OTP protection needs it |
| Official AIB IdP / hosted DB | UNKNOWN — NEEDS VERIFICATION | |

---

## 5. Required configuration (known vs unknown)

### Known (from service docs, not AIB)

- Bachs sandbox/live API keys and webhook signing secret
- SendByte `sk_test_` / `sk_live_` API keys; optional webhook secret
- OutRay CLI auth (`outray login` or `--key`)
- Cheer `DATABASE_URL`, `APP_URL`, `API_URL`, JWT/auth secrets

### Unknown (AIB-specific)

| Item | Status |
|------|--------|
| Official AIB submission checklist | UNKNOWN — NEEDS VERIFICATION |
| Required deploy host / region | UNKNOWN — NEEDS VERIFICATION |
| Required observability tooling | UNKNOWN — NEEDS VERIFICATION |
| Required use of AIB-branded domains | UNKNOWN — NEEDS VERIFICATION |
| Demo day constraints | UNKNOWN — NEEDS VERIFICATION |
| Credit/API access via AIB portal | UNKNOWN — NEEDS VERIFICATION |

---

## 6. Environment variables (Cheer-owned names)

Official providers document:

- Bachs examples: `BACHS_API_KEY`
- SendByte examples: `SENDBYTE_API_KEY`, `SENDBYTE_WEBHOOK_SECRET`

Cheer-chosen names for secrets that providers document as “signing secret from dashboard” but do not prescribe a global env name:

- `BACHS_WEBHOOK_SECRET` — Cheer name for Bachs endpoint signing secret
- `BACHS_API_BASE_URL` — Cheer name for sandbox vs production base URL selection

See root `.env.example`.

---

## 7. Architecture impact of AIB (provisional)

Until official AIB requirements arrive:

1. Do **not** replace Vue/Nuxt or NestJS.
2. Prefer African infrastructure partners named in the brief (Bachs, SendByte, OutRay).
3. Keep production webhooks on the deployed NestJS HTTPS URL — OutRay is not production.
4. Document any AIB submission artifacts (README, demo script, env screenshots) when the official brief is available.

---

## 8. Infrastructure & deployment requirements

| Concern | Decision |
|---------|----------|
| Local | Docker Compose Postgres + NestJS + Nuxt; OutRay for Bachs webhooks |
| Production | Deploy NestJS + Nuxt + managed/self-hosted Postgres on HTTPS |
| AIB-mandated host | UNKNOWN — NEEDS VERIFICATION |

---

## 9. Action required from team

Provide any of:

- Official Africa Is Building Ship 2026 handbook / Notion / Discord / portal link
- Stack partner list from organizers
- Submission format (repo, demo video, live URL)

Update this file when verified; mark sections from UNKNOWN → verified with source URL and date.
