# Phase 15 — Production Deployment Prep

**Status:** Readiness prepared (not auto-deployed)  
**Date:** 2026-09-09  
**Checklist:** [production-checklist.md](./production-checklist.md)

---

## Hosting decision

AIB does not publish a mandatory host in public docs (`docs/aib-stack.md`). TippyMe ships a **portable Docker** topology:

| Service | Image | Role |
|---------|-------|------|
| `web` | `apps/web/Dockerfile` | Nuxt 3 (Nitro `node-server`) |
| `api` | `apps/api/Dockerfile` | NestJS |
| Postgres | Managed (recommended) | Prisma |

Compose example: `docker-compose.prod.yml`.

**Recommended public topology (cookie-safe):**

```text
https://<domain>/          → web:3000
https://<domain>/api/*     → api:3001   (edge reverse proxy preferred)
```

Leave `NUXT_PUBLIC_API_URL` empty so the browser uses same-origin `/api`.  
Set `API_INTERNAL_URL=http://api:3001` for SSR / Nitro proxy.

**OutRay:** development only. Production Bachs webhooks:

```text
https://<production-api-domain>/api/webhooks/bachs
```

---

## What was implemented in-repo

1. Production Dockerfiles for API and web  
2. `docker-compose.prod.yml` (secrets via host env)  
3. `prisma migrate deploy` scripts (`prisma:migrate:deploy`, `scripts/prod-migrate.sh`, `start:prod:migrate`)  
4. Fail-closed production env (`APP_URL` + `API_URL` https, Bachs, SendByte, strong secrets)  
5. Structured JSON logging + `x-request-id` + optional `ERROR_MONITORING_DSN`  
6. Nuxt server-only `apiInternalUrl` for SSR without exposing secrets  
7. Production checklist document  

---

## Operator steps (do not skip)

1. Confirm Phases 13–14 reports are green.  
2. Provision HTTPS domain(s) and managed Postgres.  
3. Create Bachs **live** (or sandbox) webhook destination → production API URL.  
4. Verify SendByte sender domain; set `SENDBYTE_FROM_EMAIL`.  
5. Inject secrets into the host (never Git).  
6. `prisma migrate deploy` against production `DATABASE_URL`.  
7. Deploy API then web; verify `/api/health`, `/privacy`, `/terms`.  
8. Run one tip end-to-end including webhook → dashboard.  
9. Sign every box in [production-checklist.md](./production-checklist.md).

---

## Explicit non-goals of this phase automation

- Pushing images to a registry  
- Creating live Bachs/SendByte dashboard resources  
- DNS / TLS certificate issuance  
- Using OutRay in production  
- `prisma migrate reset` on any shared database  
