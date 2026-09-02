# OutRay Development Notes (Cheer)

**Sources:** [outray.dev/docs](https://outray.dev/docs)  
**Role:** Development-only HTTPS tunnel so Bachs can reach local NestJS webhooks.

**Production must not depend on OutRay.** Production uses the deployed NestJS HTTPS URL.

---

## What OutRay is

Open-source tunnel (ngrok-like). OutRay edge receives public HTTPS traffic and forwards it to a local port.

Cheer path:

```text
Bachs → https://<subdomain>.tunnel.outray.app/... → OutRay → localhost:<nestjs-port> → /api/webhooks/bachs
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
2. `outray 3000 --key outray_sk_...`

Check: `outray whoami`

Docs: [Authentication](https://outray.dev/docs/authentication)

---

## Starting a tunnel

Expose NestJS (example port **3001** — adjust to Cheer API port):

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

Default tunnels get a **random** subdomain each run — bad for Bachs webhook URLs.

Prefer reserved subdomain:

```bash
outray 3001 --subdomain cheer-api
```

Public URL shape (docs):

```text
https://cheer-api.tunnel.outray.app
```

Once used successfully, subdomain is reserved to the organization.

Docs: [Reserved Subdomains](https://outray.dev/docs/reserved-subdomains)

Custom domains (`--domain`) also documented for stable branded tunnels — optional.

---

## Local port forwarding behavior

- CLI binds tunnel to local host (default `localhost`) + port.
- Requests to public URL are forwarded to that port.
- Terminal shows method/path/status for inspection.
- Stop with `Ctrl+C` (public URL stops working).

**UNKNOWN — NEEDS VERIFICATION:** Exact path rewriting, WebSocket support for NestJS beyond HTTP, and header forwarding nuances — validate during first webhook test.

---

## Cheer development workflow (Bachs webhooks)

1. Start Postgres (Docker) and NestJS API (e.g. port `3001`).  
2. Authenticate OutRay (`outray login`).  
3. Start reserved tunnel: `outray 3001 --subdomain cheer-api`.  
4. Note public HTTPS base: `https://cheer-api.tunnel.outray.app`.  
5. In Bachs Developer Portal → Webhooks → add destination:  
   `https://cheer-api.tunnel.outray.app/api/webhooks/bachs`  
   (exact path finalized in Phase 9; use NestJS global prefix if any).  
6. Subscribe to `collection.succeeded`, `checkout.completed`, etc.  
7. Copy signing secret → `BACHS_WEBHOOK_SECRET`.  
8. Trigger sandbox checkout / payment.  
9. NestJS receives POST → verify `X-Bachs-Signature` → idempotent tip update.  
10. Inspect NestJS logs + OutRay terminal traffic + Bachs Events UI.

Optional: Bachs also documents local testing features in the Developer Portal — can complement OutRay; **UNKNOWN — NEEDS VERIFICATION** whether Bachs local testing replaces OutRay for all cases.

---

## Environment variables

OutRay itself is typically CLI-authenticated (local token / `--key`). Cheer does **not** require OutRay secrets in the NestJS app.

Optional Cheer docs-only placeholders (not required by OutRay docs):

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
| Production | `https://api.cheer.cash/api/webhooks/bachs` (or deployed API host) |

OutRay is **not** part of the production architecture diagram.
