# TippyMe Security Audit — Phase 13

**Date:** 2026-09-09  
**Scope:** Full application (`apps/api`, `apps/web`, config, docs)  
**Method:** Static code review of authentication, authorization, payments, Bachs webhooks, SendByte OTP, input validation, secrets hygiene, rate limiting, and HTTP security headers  
**Status:** Audit complete. Critical = 0. High production fail-open issues fixed in this phase. Remaining items are medium/low or accepted single-instance constraints.

---

## Executive summary

TippyMe’s payment and auth cores are sound for MVP:

- Payment success is never determined by the frontend; only signed Bachs webhooks plus server-side checkout verify can mark a tip `PAID`.
- Creator dashboard, tips, profile, and settlement status are scoped to the JWT session subject (no client-supplied creator IDs).
- OTPs are HMAC-hashed at rest, never returned in API responses, and not logged.
- Bachs webhook verification follows documented HMAC + timestamp skew + raw body requirements.

The highest risks found were **production configuration fail-open** behavior (weak default secrets, stub payments, optional SendByte). Those are **fixed** in this phase via fail-closed env validation.

---

## Control architecture

```
Nuxt (apps/web)  --httpOnly cookie-->  Nest API (apps/api)
                                           │
                  ┌────────────────────────┼────────────────────────┐
                  │                        │                        │
           JwtAuthGuard             ThrottlerGuard             Helmet + CORS
           (cookie/Bearer)          (in-memory)                ValidationPipe
                  │                        │
           Creator "me/*"             Public tips/payments
           ownership = JWT.sub        never marks PAID
                  │
           Bachs webhook ── HMAC(ts+raw) ── GET checkout verify ── DB PAID
           SendByte OTP ── HMAC hash only in DB ── never in API response
```

| Layer | Control | Location |
|--------|---------|----------|
| Headers / CORS | Helmet; production CORS = `APP_URL` only | `apps/api/src/main.ts` |
| Input | Global `ValidationPipe` (whitelist + forbidNonWhitelisted) | `main.ts` |
| AuthN | Email OTP signup + bcrypt password login; JWT httpOnly cookie | `apps/api/src/auth/*` |
| AuthZ | Session `user.sub` for all creator mutations/reads | `creators.controller.ts` / `creators.service.ts` |
| Payments | Server validates amount/currency/creator; init never marks PAID | `tips.service.ts` |
| Webhooks | Raw body + HMAC + skew + event dedupe + server re-verify | `bachs.webhook.ts`, `webhook-fulfilment.service.ts` |
| Email | SendByte key server-only; OTP not logged | `sendbyte.service.ts` |
| Secrets | `.env` gitignored; production refuses weak defaults | `env.validation.ts`, `.gitignore` |

**Payouts:** No Tippy-initiated withdraw APIs in MVP. Settlement is status-only (`settlement.types.ts`). No wallet IDOR surface.

---

## Findings

Severity: **Critical** · **High** · **Medium** · **Low** · **Info**  
Status: **Fixed** · **Open** · **Accepted** (documented risk)

---

### 1. Authentication

#### What works

| Control | Detail |
|---------|--------|
| OTP secrecy | Generated server-side; HMAC-SHA256 with pepper; never in responses |
| OTP policy | 6 digits, 10m TTL, 5 attempts, 60s resend cooldown; prior challenges consumed on resend |
| Passwords | bcrypt cost 12; login failures use generic `INVALID_CREDENTIALS` |
| Session cookie | `httpOnly`, `secure` in production, `sameSite: 'lax'`, 7d JWT |
| Rate limits | 5 OTP requests / 10 verify-or-login per IP per minute |

#### Issues

| ID | Severity | Issue | Impact | Remediation | Status |
|----|----------|-------|--------|-------------|--------|
| A1 | **High** | Missing `AUTH_SECRET` / `OTP_HASH_PEPPER` previously defaulted to `dev-only-change-me`, including potential production misconfig | Forged sessions / OTP hash offline attacks if defaults shipped | Fail boot in production unless secrets are ≥32 chars, non-placeholder, and distinct | **Fixed** (`env.validation.ts`, `auth.module.ts`) |
| A2 | Medium | Signup `request-otp` returns `409 ACCOUNT_EXISTS` for verified users | Account enumeration | Return uniform success shape; drive returning users to login via UX | **Open** |
| A3 | Medium | Logout clears cookie only; JWT not revocable server-side | Stolen JWT valid until expiry (7d) | Shorter access TTL + refresh, or session denylist | **Open** |
| A4 | Medium | OTP attempt counter has TOCTOU race under parallel guesses | Can exceed 5 attempts under concurrency | Atomic conditional increment (`WHERE attemptCount < max`) | **Open** |
| A5 | Low | Password policy is length-only (≥8) | Weak passwords | Stronger policy / breach checks | **Open** |
| A6 | Info | `PASSWORD_RESET` / `LOGIN` OTP purposes exist unused | Incomplete future surface | Keep unimplemented until same controls apply | **Accepted** |

---

### 2. Authorization

#### What works

- All `/creators/me*` routes derive ownership from `CurrentUser().sub`.
- Tip create resolves creator by **username**, not client `creatorId`.
- Dashboard and tip lists always filter by owned `creatorId`.
- Creator tip DTOs omit `supporterEmail`.
- E2E coverage asserts cross-user access is forbidden.

#### Cross-creator access matrix (expected)

| Resource | Creator A → Creator B | Expected |
|----------|----------------------|----------|
| Profile management (`PATCH/PUT me`) | Must fail | Session-scoped — **pass** |
| Tips list / dashboard | Must fail | Filtered by owned profile — **pass** |
| Payout / settlement info | Must fail | Same session scope; no withdraw API — **pass** |
| Payment records (creator views) | Must fail | Scoped list — **pass** |
| Public tip/payment status by cuid | Anyone with ID | Intentional confirmation UX — see Z1 |

#### Issues

| ID | Severity | Issue | Impact | Remediation | Status |
|----|----------|-------|--------|-------------|--------|
| Z1 | Medium | Unauthenticated `GET /tips/:id/public` and `GET /payments/:id/status` expose amount/currency/status/message to anyone with a cuid | Information disclosure / scraping | Confirmation tokens, rate-limit reads, omit message if unused | **Open** |
| Z2 | Low | Global uniqueness on payment idempotency key | Cross-supporter key collision returns another checkout | Namespace keys or prefer server-generated only | **Open** |
| Z3 | Info | No payout withdraw endpoints | N/A | Keep Connect + ownership checks when built | **Accepted** |

**Verdict:** No classic creator-dashboard IDOR found.

---

### 3. Payment security

#### What works

- Amount validated as decimal string with min/max; currency must match creator settings.
- Message/name sanitized (control chars, tags, `javascript:` / `data:`).
- Init path: `CREATED` → `CHECKOUT_PENDING` only — **never** `PAID`.
- Confirmation page polls backend; UI copy states redirect ≠ paid.
- Stub provider never acknowledges paid via webhook.
- Webhook fulfilment re-fetches Bachs checkout and compares amount, currency, and reference before transition.
- Terminal tip states are sticky.

#### Attack scenarios

| Attack | Result |
|--------|--------|
| Amount manipulation | Rejected / overridden by server validation |
| Currency manipulation | Must match creator currency |
| Creator manipulation | Resolved by username server-side |
| Transaction ID manipulation | Unknown checkout / mismatch → ignored |
| Duplicate payment creation | Idempotency key + unique constraints |
| Duplicate webhook | `WebhookEvent.providerEventId` unique + ignore |
| Fake success callback / browser “paid” | Frontend cannot upgrade status |

#### Issues

| ID | Severity | Issue | Impact | Remediation | Status |
|----|----------|-------|--------|-------------|--------|
| P1 | **High** | Unset `BACHS_API_KEY` selected stub provider (local fake checkout) | Fake “checkout” in a misconfigured production | Require `BACHS_API_KEY` (+ webhook secret) in production; refuse stub | **Fixed** (`env.validation.ts`, `payments.module.ts`) |
| P2 | Medium | Webhook secret was optional even when Bachs enabled | Unsigned webhooks rejected at runtime, but misconfig easy | Required whenever production (and with Bachs key) | **Fixed** (bundled with P1) |
| P3 | Low | Public `paid` boolean amplifies Z1 | Disclosure | Couple with Z1 remediation | **Open** |
| P4 | Info | Success/cancel URLs built from server `APP_URL` | Prevents open redirect | Keep; https enforced in production | **Fixed** (APP_URL https check) |

---

### 4. Webhook security (Bachs)

Per Bachs docs / TippyMe Phase 8:

1. Verify `X-Bachs-Timestamp` + `X-Bachs-Signature` (HMAC-SHA256 of `{timestamp}.{raw_body}`, 300s tolerance)
2. Dedupe on `evt_…` via unique `providerEventId`
3. Resolve tip by checkout id / reference
4. Server `GET` checkout session
5. Validate amount, currency, reference
6. Safe status transitions only
7. Notify creator once

| Check | Result |
|-------|--------|
| Signature validation | Implemented with `timingSafeEqual` |
| Replay / skew | Timestamp tolerance 300s |
| Duplicate events | Unique constraint + ignore path |
| Malformed payload | `400 WEBHOOK_MALFORMED` |
| Unknown transaction | Logged and ignored (no status upgrade) |
| Raw body | Nest `rawBody: true` |

#### Issues

| ID | Severity | Issue | Impact | Remediation | Status |
|----|----------|-------|--------|-------------|--------|
| W1 | Medium | Webhook endpoint `@SkipThrottle()` | Signed traffic can still DoS verify/DB | Edge rate limit / queue expensive verify; keep signature check early | **Open** |
| W2 | Low | Response includes `outcome` | Minor recon aid | Return `{ ok: true }` only; log outcomes | **Open** |
| W3 | Low | Signature vs malformed distinction re-parses body in controller | Brittle | Typed failure reasons from provider | **Open** |
| W4 | Info | Replay with new event id still needs valid HMAC + matching verify | Design OK | Keep | **Accepted** |

---

### 5. SendByte security

| Check | Result |
|-------|--------|
| API key never reaches client | Nest env only; Nuxt has no SendByte key |
| OTP never in logs | DEV_LOG logs `to` + `subject` only |
| OTP never in API responses | Controllers return challenge metadata without code |
| OTP expiry | 10 minutes |
| Attempt limits | 5 per challenge |
| Resend limits | 60s cooldown + IP throttle |

#### Issues

| ID | Severity | Issue | Impact | Remediation | Status |
|----|----------|-------|--------|-------------|--------|
| S1 | **High** (ops) | Missing `SENDBYTE_API_KEY` previously logged error but allowed boot | Broken OTP / silent misconfig in production | Throw on construction in production | **Fixed** (`sendbyte.service.ts` + env validation) |
| S2 | Low | `SENDBYTE_WEBHOOK_SECRET` unused | Dead config | Implement delivery webhooks with verify, or remove | **Open** |
| S3 | Info | No daily per-email OTP hard cap beyond cooldown + IP | Abuse cost | Add daily cap | **Open** |

---

### 6. Input security

| Check | Result |
|-------|--------|
| XSS (API → email) | Templates use `escapeHtml` |
| XSS (Nuxt) | Text interpolation (`{{ }}`); no `v-html` found |
| SQL injection | Prisma only; sole `$queryRaw` is fixed `` SELECT 1 `` health check |
| Malformed JSON | Nest/ValidationPipe reject |
| Tip messages | Strip controls/tags/`javascript:`/`data:` |
| URLs | Social links require `http(s)`; avatar `@IsUrl` |
| Usernames | Regex + reserved list |

#### Issues

| ID | Severity | Issue | Impact | Remediation | Status |
|----|----------|-------|--------|-------------|--------|
| I1 | Medium | No explicit JSON body size limit beyond framework defaults | Large payload DoS | Set Express/Nest body limit (e.g. 100kb) | **Open** |
| I2 | Low | Avatar URL can point at arbitrary https hosts | Tracking pixels | Allowlist CDN or proxy | **Open** |
| I3 | Low | Message sanitizer is regex-based, not full HTML sanitizer | Safe for text nodes; unsafe if rendered as HTML later | DOMPurify if HTML rendering ever ships | **Accepted** (current Vue text usage) |
| I4 | Low | `trust proxy` unset historically — wrong client IP behind proxy | Weakened rate limits / logs | Set `trust proxy` to 1 in production | **Fixed** (`main.ts`) |

---

### 7. Secrets

| Check | Result |
|-------|--------|
| `.env` gitignored | Yes (`apps/api/.env` ignored) |
| Tracked env files | Placeholders only in `.env.example` |
| Hardcoded live API keys in source | **None found** |
| Demo seed password | `password123` in `prisma/seed.ts` (local demo only) |
| Accidental committed secrets | **None found** — nothing to remove |

#### Issues

| ID | Severity | Issue | Impact | Remediation | Status |
|----|----------|-------|--------|-------------|--------|
| X1 | **High** | Same as A1 — silent default secrets | Session forgery | Production fail-closed | **Fixed** |
| X2 | Low | Examples document weak placeholders | Copy-paste risk | Documented in `.env.example`; CI check optional | **Accepted** |
| X3 | Info | Local `.env` on disk | Expected | Never force-add; rotate if ever leaked | **Accepted** |

---

### 8. Rate limiting

| Endpoint | Limit | Notes |
|----------|-------|-------|
| Global default | 100 / 60s | In-memory |
| `POST /auth/request-otp` | 5 / 60s | |
| `POST /auth/verify-otp`, `/login` | 10 / 60s | |
| `POST /tips` | 10 / 60s | |
| Webhooks, health, public tip/payment status, username check | Skipped | |

#### Issues

| ID | Severity | Issue | Impact | Remediation | Status |
|----|----------|-------|--------|-------------|--------|
| R1 | **High** (scale) | In-memory throttler ineffective across multiple API instances | Limits bypassed under horizontal scale | Shared store (Redis) before multi-instance deploy | **Accepted** for single-instance MVP — **block horizontal scale until Redis** |
| R2 | Medium | Tip create is IP-only; no CAPTCHA | Tip spam under distributed IPs | CAPTCHA / attestation under abuse | **Open** |
| R3 | Medium | Login throttle without progressive account lockout | Credential stuffing aid | Lockout / CAPTCHA after N failures | **Open** |
| R4 | Low | Username availability & public GETs unthrottled | Enumeration / scraping | Light limits | **Open** |

---

### 9. Security headers

| Check | Result |
|-------|--------|
| API Helmet | Enabled; CSP default on in production |
| Swagger | Disabled in production |
| CORS | Production allowlist = `APP_URL` + credentials |
| Nuxt CSP / HSTS | Not explicitly configured in `nuxt.config.ts` |

#### Issues

| ID | Severity | Issue | Impact | Remediation | Status |
|----|----------|-------|--------|-------------|--------|
| H1 | Low | Web app lacks explicit CSP / frame-ancestors / HSTS | Clickjacking / XSS impact amplification | Add at Nuxt or CDN edge | **Open** |
| H2 | Info | Swagger off in production | Good | Keep | **Accepted** |

---

## Fixes applied in this phase

1. **Production fail-closed env validation** (`apps/api/src/config/env.validation.ts`)
   - Strong, distinct `AUTH_SECRET` and `OTP_HASH_PEPPER`
   - Required `DATABASE_URL`, `BACHS_API_KEY`, `BACHS_WEBHOOK_SECRET`, `SENDBYTE_API_KEY`
   - `APP_URL` must be `https://`
   - Dev/test retain convenient placeholders
2. **JWT module** no longer falls back to `dev-only-change-me` (`auth.module.ts`)
3. **Payments module** refuses stub provider in production (`payments.module.ts`)
4. **SendByte** throws at construction if key missing in production (`sendbyte.service.ts`)
5. **`trust proxy`** enabled in production (`main.ts`)
6. **Unit tests** for production env rules (`env.validation.spec.ts`)
7. **`.env.example`** documents production requirements

No accidentally committed secrets were found; nothing removed from git history.

---

## Severity summary

| Severity | Count | Notes |
|----------|-------|-------|
| Critical | 0 | — |
| High | 4 found | A1/X1, P1, S1 **Fixed**; R1 **Accepted** (single-instance only) |
| Medium | ~9 | Enumeration, JWT revocation, OTP race, public tip disclosure, webhook DoS, body size, tip/login abuse |
| Low / Info | Several | Password policy, Nuxt headers, avatar URLs, etc. |

---

## What is already well protected

1. **Payment authority** — `PAID` only after signed webhook + Bachs retrieve + amount/currency checks.
2. **OTP secrecy** — hashed at rest; absent from API responses, logs, and audit metadata.
3. **Creator ownership** — session-derived; dashboard/tips scoped by owned profile.
4. **Webhook crypto** — raw body, HMAC, skew, timing-safe compare, idempotent events.
5. **Input hygiene** — DTO validation, amount rules, message sanitization, reserved usernames.
6. **Repo secret hygiene** — `.env` ignored; no live keys in tracked source.
7. **Payout non-surface** — no fake wallet / withdraw API.

---

## Recommended next hardening (not blocking this phase)

**P1**
- Uniform signup OTP responses (A2)
- Atomic OTP attempt updates (A4)
- Body size limits (I1)
- Rate-limit or token-gate public tip/payment status (Z1)
- Webhook DoS protections (W1)

**P2**
- Shared rate-limit store before multi-instance (R1)
- Session revocation / shorter JWT (A3)
- Nuxt CSP/HSTS (H1)
- CAPTCHA under abuse (R2/R3)

---

## Stop condition

Phase 13 audit is complete. High production fail-open issues are fixed. Remaining findings are documented for later hardening. **Stop after this audit** — do not start the next product phase from this workstream.
