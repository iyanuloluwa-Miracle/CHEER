# OutRay Development Notes (TippyMe)

**Sources:** [outray.dev/docs](https://outray.dev/docs)  
**Role:** Development-only HTTPS tunnel so Bachs can reach local Nitro webhooks.

**Production must not depend on OutRay.** Production uses the deployed HTTPS URL.

---

## What OutRay is

Open-source tunnel (ngrok-like). OutRay edge receives public HTTPS traffic and forwards it to a local port.

TippyMe path:

```text
Bachs → https://<subdomain>.tunnel.outray.app/api/webhooks/bachs
      → OutRay → localhost:3000 → Nuxt/Nitro → PostgreSQL
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

## Local webhook flow

1. `npm run db:up` then `npm run db:migrate`  
2. `npm run dev` (Nuxt on port **3000**)  
3. Expose local Nitro:

```bash
outray http 3000 --subdomain cheer
```

4. Point Bachs sandbox webhook to:
   `https://cheer.tunnel.outray.app/api/webhooks/bachs`  
5. Set `BACHS_WEBHOOK_SECRET` in `.env` and restart.  
6. Create a tip and confirm webhook fulfilment updates tip status to `PAID`.

**Production:** `https://<domain>/api/webhooks/bachs` — no OutRay.
