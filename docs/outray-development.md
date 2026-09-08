# OutRay Development Notes (TippyMe)

**Sources:** [outray.dev/docs](https://outray.dev/docs)  
**Role:** Development-only HTTPS tunnel so Bachs can reach local NestJS webhooks.

**Production must not depend on OutRay.** Production uses the deployed NestJS HTTPS URL.

---

## What OutRay is

Open-source tunnel (ngrok-like). OutRay edge receives public HTTPS traffic and forwards it to a local port.

TippyMe path:

```text
Bachs → https://<subdomain>.tunnel.outray.app/api/webhooks/bachs
      → OutRay → localhost:3001 → NestJS → PostgreSQL
```

---

## CLI installation

Prerequisites: Node.js 18+, npm.

```bash
npm install -g outray
outray --version
```

Update: `npm install -g outray@latest`  
Uninstall: `npm uninstall -g outray`

Docs: [Installation](https://outray.dev/docs/installation)

---

## Authentication

Interactive:

```bash
outray login
```

Opens browser, authorizes CLI, stores token locally.

Headless / CI:

1. Generate API key in Organization Settings  
2. `outray 3001 --key outray_sk_...`

Check: `outray whoami`

Docs: [Authentication](https://outray.dev/docs/authentication)

---

## Starting a tunnel

Expose NestJS (TippyMe API default port **3001**):

```bash
outray 3001
```

Example output:

```text
Tunnel ready: https://random-name.tunnel.outray.app
```

HTTP tunnels are served over **HTTPS** on the public URL.

Config multi-tunnel (`outray/config.toml`):

```toml
[tunnel.api]
protocol = "http"
local_port = 3001
subdomain = "cheer-api"
```

```bash
outray start
outray validate-config
```

Docs: [Opening a Tunnel](https://outray.dev/docs/opening-a-tunnel)

---

## Persistent / reserved subdomains

Default tunnels get a **random** subdomain each run — unsuitable for Bachs webhook URLs.

Prefer a reserved subdomain (verified in OutRay docs):

```bash
outray 3001 --subdomain cheer-api
```

Public URL shape:

```text
https://cheer-api.tunnel.outray.app
```

Once used successfully, the subdomain is reserved to the organization and other users cannot claim it.

Docs: [Reserved Subdomains](https://outray.dev/docs/reserved-subdomains)

Custom domains (`--domain`) are also documented for stable branded tunnels — optional.

---

## Local port forwarding behavior

- CLI binds tunnel to local host (default `localhost`) + port.
- Requests to the public URL are forwarded to that port.
- Terminal shows method/path/status for inspection.
- Stop with `Ctrl+C` (public URL stops working).

---

## TippyMe development workflow (Bachs webhooks — Phase 8)

Exact local procedure:

1. **Start PostgreSQL**  
   `npm run db:up` (or `docker compose up -d postgres`)

2. **Start NestJS API** (port `3001`)  
   `npm run dev:api`  
   Ensure `apps/api/.env` has sandbox values:
   - `BACHS_API_KEY=sk_sandbox_...`
   - `BACHS_API_BASE_URL=https://sandbox-api.bachs.io`
   - `BACHS_WEBHOOK_SECRET=` (set in step 7)
   - `APP_URL=http://localhost:3000`

3. **Authenticate OutRay**  
   `outray login`

4. **Start a reserved tunnel**  
   `outray 3001 --subdomain cheer-api`  
   Public base: `https://cheer-api.tunnel.outray.app`

5. **Configure Bachs webhook destination** (Developer Portal → Webhooks)  
   URL: `https://cheer-api.tunnel.outray.app/api/webhooks/bachs`  
   Subscribe at minimum:
   - `collection.succeeded`
   - `collection.failed`
   - `checkout.completed`
   - `checkout.expired`

6. **Copy signing secret** into `BACHS_WEBHOOK_SECRET` and restart NestJS.

7. **Trigger a sandbox tip** from Nuxt (`/{username}` → support → Bachs hosted checkout).

8. **Receive webhook locally** via OutRay → NestJS `POST /api/webhooks/bachs`.

9. **Validate** NestJS verifies `X-Bachs-Timestamp` + `X-Bachs-Signature`, then `GET /v1/checkout-sessions/{checkout_id}`, then amount/currency/reference checks.

10. **Confirm DB** Tip → `PAID` (or `FAILED` / `EXPIRED`), PaymentTransaction updated, creator notification queued. Confirmation page polls `GET /api/payments/:id/status` (tip id or payment id).

Inspect: NestJS logs, OutRay terminal traffic, Bachs Events UI.

---

## Environment variables

OutRay itself is CLI-authenticated (local token / `--key`). TippyMe NestJS does **not** load OutRay secrets.

Optional docs-only placeholder (not required by NestJS):

```env
# Dev notes only — not loaded by NestJS
# OUTRAY_PUBLIC_URL=https://cheer-api.tunnel.outray.app
```

Do not put OutRay into production `.env` as a dependency.

---

## Production boundary

| Environment | Webhook URL |
|-------------|-------------|
| Development | OutRay HTTPS → localhost NestJS |
| Production | Deployed API host, e.g. `https://api.example.com/api/webhooks/bachs` |

OutRay is **not** part of the production architecture.
