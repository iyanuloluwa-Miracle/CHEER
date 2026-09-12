# Phase 15 — Production Deployment Prep

**Status:** Readiness prepared (not auto-deployed)  
**Date:** 2026-09-09  
**Checklist:** [production-checklist.md](./production-checklist.md)

---

## Hosting decision

AIB does not publish a mandatory host in public docs (`docs/aib-stack.md`). TippyMe ships a **portable Docker** topology:

| Service | Image | Role |
|---------|-------|------|
| `web` | `Dockerfile` | Nuxt 3 + Nitro (`node-server`, SSR + `/api`) |
| Postgres | Managed (recommended) | Drizzle ORM |

Compose example: `docker-compose.prod.yml`.

**Recommended public topology (cookie-safe, single process):**

```text
https://<domain>/          → web:3000 (pages)
https://<domain>/api/*     → web:3000 (Nitro handlers)
```

Leave `NUXT_PUBLIC_API_URL` empty so the browser uses same-origin `/api`.

**OutRay:** development only. Production Bachs webhooks:

```text
https://<production-domain>/api/webhooks/bachs
```

---

## What was implemented in-repo

1. Production Dockerfile for the Nuxt/Nitro app  
2. `docker-compose.prod.yml` (secrets via host env)  
3. `drizzle-kit migrate` scripts (`db:migrate`, `scripts/prod-migrate.sh`, `start:prod:migrate`)  
4. Fail-closed production env (`APP_URL` + `API_URL` https, Bachs, SendByte, strong secrets)  
5. Production checklist document  

---

## Operator steps (do not skip)

1. Confirm Phases 13–14 reports are green.  
2. Provision HTTPS domain and managed Postgres.  
3. Create Bachs **live** (or sandbox) webhook destination → `https://<domain>/api/webhooks/bachs`.  
4. Verify SendByte sender domain; set `SENDBYTE_FROM_EMAIL`.  
5. Inject secrets into the host (never Git).  
6. `drizzle-kit migrate` against production `DATABASE_URL_UNPOOLED`.  
7. Deploy web; verify `/api/health`, `/privacy`, `/terms`.  
8. Run one tip end-to-end including webhook → dashboard.  
9. Sign every box in [production-checklist.md](./production-checklist.md).

---

## Explicit non-goals of this phase automation

- Pushing images to a registry  
- Creating live Bachs/SendByte dashboard resources  
- DNS / TLS certificate issuance  
- Using OutRay in production  
- Destructive schema resets on any shared database  
