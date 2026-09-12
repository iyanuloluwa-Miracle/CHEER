# TippyMe Production Checklist — Phase 15

**Product:** TippyMe  
**Date:** 2026-09-09  
**Status:** Production **readiness prepared** — do **not** mark deploy complete until each item below is verified on the live host.

AIB-mandated host remains **UNKNOWN** ([aib-stack.md](./aib-stack.md)). Default ship path: Docker images + HTTPS reverse proxy (or any host that runs the compose topology in `docker-compose.prod.yml`). **OutRay is not used in production.**

---

## Preflight (previous phases)

| Gate | Evidence | Done |
|------|----------|------|
| Architecture + AIB research | `docs/architecture.md`, `docs/aib-stack.md` | ☐ |
| Security audit + high fixes | `docs/security-audit.md` | ☐ |
| Testing pass | `docs/testing-report.md` | ☐ |
| `npm run lint` / `typecheck` / `test` / `build` green | Phase 14 report | ☐ |

---

## 1. Frontend (Nuxt)

| Check | Notes | Done |
|-------|-------|------|
| Frontend deployed | Image `Dockerfile` or `npm run build` | ☐ |
| Production domain | `NUXT_PUBLIC_APP_URL=https://<domain>` | ☐ |
| HTTPS | TLS at edge (Cloudflare / Caddy / load balancer) | ☐ |
| Production API routing | Same-origin Nitro `/api` — leave `NUXT_PUBLIC_API_URL` empty | ☐ |
| Runtime configuration | Server secrets via env / `runtimeConfig` (`MONGODB_URI`, `AUTH_*`, `BACHS_*`, `RESEND_*`) | ☐ |
| No secrets in bundle | Confirm build output has no `BACHS_*`, `RESEND_*`, `MONGODB_URI`, `AUTH_*` | ☐ |
| Privacy / terms pages | `/privacy`, `/terms` reachable | ☐ |

---

## 2. Backend (Nitro `/api`)

| Check | Notes | Done |
|-------|-------|------|
| App deployed | Image `Dockerfile` or `npm run build` + `node .output/server/index.mjs` | ☐ |
| `NODE_ENV=production` | Fail-closed env validation active | ☐ |
| HTTPS | Public `API_URL=https://…` (same origin as `APP_URL`) | ☐ |
| API URL | Matches public webhook host | ☐ |
| Health check | `GET https://<domain>/api/health` returns DB-aware status | ☐ |
| Rate limiting | Auth OTP / login / tip create throttles verified (single instance OK) | ☐ |

---

## 3. Database

| Check | Notes | Done |
|-------|-------|------|
| Production MongoDB | Managed preferred (Atlas) | ☐ |
| `MONGODB_URI` set | Atlas SRV connection string | ☐ |
| Indexes created | Mongoose schemas create indexes on connect | ☐ |
| **No destructive reset** | Never drop production collections casually | ☐ |
| Backup policy | Provider snapshots / PITR enabled | ☐ |

---

## 4. Bachs

| Check | Notes | Done |
|-------|-------|------|
| Production / live credentials | `BACHS_API_KEY` live (not sandbox) when taking real money | ☐ |
| `BACHS_API_BASE_URL` | Live API base (not sandbox) | ☐ |
| Webhook signing secret | `BACHS_WEBHOOK_SECRET` from Bachs dashboard | ☐ |
| Webhook URL | `https://<production-api-domain>/api/webhooks/bachs` | ☐ |
| OutRay unused | Production must not depend on OutRay tunnels | ☐ |
| Success/cancel URLs | Built from `APP_URL` server-side | ☐ |
| Smoke: sandbox or live tip | Checkout + webhook → tip `PAID` | ☐ |

---

## 5. Resend

| Check | Notes | Done |
|-------|-------|------|
| Production credentials | `RESEND_API_KEY` | ☐ |
| Sender / domain verified | `RESEND_FROM_EMAIL` matches verified domain | ☐ |
| OTP email | Signup OTP delivers; code never in API/logs | ☐ |
| Transactional notifications | Tip paid / account events deliver | ☐ |
| Rate limits | Auth throttle + Resend provider limits understood | ☐ |
| Key not in frontend | Absent from Nuxt env / bundle | ☐ |

---

## 6. OutRay

| Check | Notes | Done |
|-------|-------|------|
| Dev-only | Documented; not in `docker-compose.prod.yml` | ☐ |
| Production webhooks | Direct HTTPS to Nitro `/api/webhooks/bachs` | ☐ |

---

## 7. Environment & secrets

| Variable | Required in production | Location |
|----------|------------------------|----------|
| Variable | Production rule | Where |
|----------|------------------|-------|
| `NODE_ENV` | `production` | Web |
| `APP_URL` | `https://…` | Web (+ `NUXT_PUBLIC_APP_URL`) |
| `API_URL` | `https://…` (same origin as APP_URL) | Web |
| `MONGODB_URI` | Yes | Web server-only (MongoDB Atlas) |
| `AUTH_SECRET` | ≥32 chars, non-placeholder | Web server-only |
| `OTP_HASH_PEPPER` | ≥32 chars, ≠ `AUTH_SECRET` | Web server-only |
| `BACHS_API_KEY` | Yes | Web server-only |
| `BACHS_WEBHOOK_SECRET` | Yes | Web server-only |
| `BACHS_API_BASE_URL` | Live base when live | Web server-only |
| `RESEND_API_KEY` | Yes | Web server-only |
| `RESEND_FROM_EMAIL` | Verified sender | Web server-only |
| `LOG_FORMAT` | `json` recommended | Web |
| `ERROR_MONITORING_DSN` | Optional | Web |
| `NUXT_PUBLIC_APP_URL` | `https://…` | Web (public) |
| `NUXT_PUBLIC_API_URL` | Empty (same-origin Nitro `/api`) | Web (public) |

| Check | Done |
|-------|------|
| No secrets in Git | ☐ |
| No secrets in frontend bundles | ☐ |
| Secrets only in host secret store / runtime env | ☐ |

---

## 8. Observability

| Check | Notes | Done |
|-------|-------|------|
| Structured logging | JSON lines with `requestId`, method, path, status, duration | ☐ |
| Error monitoring hook | Optional `ERROR_MONITORING_DSN` | ☐ |
| Health checks | Container + `GET /api/health` | ☐ |
| Payment failure logging | Tips/Bachs providers log kinds without secrets | ☐ |
| Webhook failure logging | Signature / mismatch / verify failures logged | ☐ |
| Notification failure logging | Resend errors logged without OTP body | ☐ |
| Never log OTP / API secrets / passwords / card data | Scrubber on structured logger | ☐ |

---

## 9. Functional verification (post-deploy)

| Check | Done |
|-------|------|
| Authentication verified (OTP signup + password login) | ☐ |
| HTTPS verified (web + API) | ☐ |
| CORS verified (same-origin app) | ☐ |
| Rate limiting verified (429 on OTP burst) | ☐ |
| Monitoring verified (logs + health) | ☐ |
| Domain verified (DNS + cert) | ☐ |
| Privacy / terms pages available | ☐ |
| Creator dashboard loads for session owner only | ☐ |
| Public tip page → checkout → webhook → dashboard | ☐ |

---

## Release commands (safe)

```bash
# Build artifact
npm run build

# Or Docker (from repo root)
docker compose -f docker-compose.prod.yml build

# Start
npm run start:prod
# or: node .output/server/index.mjs
```

---

## Production readiness verdict

| Criterion | Status |
|-----------|--------|
| Artifacts & runbooks prepared | **Yes** — Dockerfiles, compose example, env templates, observability, checklist |
| Previous phases documented pass | Confirm via `docs/testing-report.md` + `docs/security-audit.md` |
| Live deploy executed | **No — operator action required** |
| Checklist items above signed off | ☐ Pending host + credentials |

**Stop condition:** Production readiness is **confirmed for preparation**. Flip each checkbox on the live environment before declaring TippyMe production-live. Do not treat this document alone as a completed deploy.
