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
| Frontend deployed | Image `apps/web/Dockerfile` or host build of `npm run build -w @cheer/web` | ☐ |
| Production domain | `NUXT_PUBLIC_APP_URL=https://<domain>` | ☐ |
| HTTPS | TLS at edge (Cloudflare / Caddy / load balancer) | ☐ |
| Production API routing | Prefer same-origin: edge or Nitro proxies `/api` → Nest; leave `NUXT_PUBLIC_API_URL` empty | ☐ |
| Runtime configuration | `API_INTERNAL_URL` / `NUXT_PUBLIC_API_PROXY_TARGET` = internal Nest URL | ☐ |
| No secrets in bundle | Confirm build output has no `BACHS_*`, `SENDBYTE_*`, `DATABASE_URL`, `AUTH_*` | ☐ |
| Privacy / terms pages | `/privacy`, `/terms` reachable | ☐ |

---

## 2. Backend (NestJS)

| Check | Notes | Done |
|-------|-------|------|
| Backend deployed | Image `apps/api/Dockerfile` or `npm run build -w @cheer/api` + `node dist/main` | ☐ |
| `NODE_ENV=production` | Fail-closed env validation active | ☐ |
| HTTPS | Public `API_URL=https://…` (terminate TLS at edge; `trust proxy=1`) | ☐ |
| CORS | Production allowlist = `APP_URL` only, credentials on | ☐ |
| API URL | Matches public webhook host | ☐ |
| Logging | `LOG_FORMAT=json`; request IDs via `x-request-id` | ☐ |
| Health check | `GET https://<api>/api/health` returns DB-aware status | ☐ |
| Rate limiting | Auth OTP / login / tip create throttles verified (single instance OK) | ☐ |
| Swagger disabled | No `/api/docs` in production | ☐ |

---

## 3. Database

| Check | Notes | Done |
|-------|-------|------|
| Production PostgreSQL | Managed preferred (Neon/RDS/etc.) | ☐ |
| `DATABASE_URL` set | SSL params as required by provider | ☐ |
| Migrations complete | `npm run prisma:migrate:deploy` or `scripts/prod-migrate.sh` | ☐ |
| **No destructive reset** | Never `prisma migrate reset` / `db push --force-reset` on prod | ☐ |
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

## 5. SendByte

| Check | Notes | Done |
|-------|-------|------|
| Production credentials | `SENDBYTE_API_KEY` live/test as appropriate | ☐ |
| Sender / domain verified | `SENDBYTE_FROM_EMAIL` matches verified domain | ☐ |
| OTP email | Signup OTP delivers; code never in API/logs | ☐ |
| Transactional notifications | Tip paid / account events deliver | ☐ |
| Rate limits | Auth throttle + SendByte provider limits understood | ☐ |
| Key not in frontend | Absent from Nuxt env / bundle | ☐ |

---

## 6. OutRay

| Check | Notes | Done |
|-------|-------|------|
| Dev-only | Documented; not in `docker-compose.prod.yml` | ☐ |
| Production webhooks | Direct HTTPS to Nest | ☐ |

---

## 7. Environment & secrets

| Variable | Required in production | Location |
|----------|------------------------|----------|
| `NODE_ENV` | `production` | API |
| `APP_URL` | `https://…` | API (+ Nuxt public app URL) |
| `API_URL` | `https://…` | API |
| `DATABASE_URL` | Yes | API only |
| `AUTH_SECRET` | ≥32 chars, non-placeholder | API only |
| `OTP_HASH_PEPPER` | ≥32 chars, ≠ `AUTH_SECRET` | API only |
| `BACHS_API_KEY` | Yes | API only |
| `BACHS_WEBHOOK_SECRET` | Yes | API only |
| `BACHS_API_BASE_URL` | Live base when live | API only |
| `SENDBYTE_API_KEY` | Yes | API only |
| `SENDBYTE_FROM_EMAIL` | Verified sender | API only |
| `LOG_FORMAT` | `json` recommended | API |
| `ERROR_MONITORING_DSN` | Optional | API |
| `NUXT_PUBLIC_APP_URL` | `https://…` | Web (public) |
| `NUXT_PUBLIC_API_URL` | Empty if same-origin proxy | Web (public) |
| `API_INTERNAL_URL` | Internal Nest URL | Web server-only |

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
| Notification failure logging | SendByte errors logged without OTP body | ☐ |
| Never log OTP / API secrets / passwords / card data | Scrubber on structured logger | ☐ |

---

## 9. Functional verification (post-deploy)

| Check | Done |
|-------|------|
| Authentication verified (OTP signup + password login) | ☐ |
| HTTPS verified (web + API) | ☐ |
| CORS verified (only `APP_URL`) | ☐ |
| Rate limiting verified (429 on OTP burst) | ☐ |
| Monitoring verified (logs + health) | ☐ |
| Domain verified (DNS + cert) | ☐ |
| Privacy / terms pages available | ☐ |
| Creator dashboard loads for session owner only | ☐ |
| Public tip page → checkout → webhook → dashboard | ☐ |

---

## Release commands (safe)

```bash
# Build artifacts
npm run build:api
npm run build:web

# Or Docker (from repo root)
docker compose -f docker-compose.prod.yml build

# Apply migrations ONLY (never reset)
npm run prisma:migrate:deploy
# or: sh scripts/prod-migrate.sh
# or: docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy

# Start API (after migrate)
npm run start:prod -w @cheer/api
```

Optional combined start (migrate then boot) — use only when the release job owns a single replica:

```bash
npm run start:prod:migrate -w @cheer/api
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
