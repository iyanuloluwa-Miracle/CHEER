# TippyMe

Creator support platform for African builders — **one link** to receive tips via Bachs.

## Stack

| Layer | Tech |
|-------|------|
| App | Vue 3 + Nuxt 3 + Nitro (SSR + `/api`) + TypeScript + Tailwind + Pinia |
| DB | MongoDB + Mongoose (Atlas in production) |
| Payments | Bachs |
| Email | Resend |

## Setup

```bash
npm install
cp .env.example .env
# Set MONGODB_URI (local Mongo or Atlas)
npm run db:seed
```

## Develop

```bash
npm run dev
```

Health check: [http://localhost:3000/api/health](http://localhost:3000/api/health)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run lint` | Lint |
| `npm run typecheck` | TypeScript checks |
| `npm run test` | Unit tests |
| `npm run build` | Production build |
| `npm run db:seed` | Seed demo creators |

## Production

- [docs/PHASE-15-PRODUCTION.md](./docs/PHASE-15-PRODUCTION.md)
- [docs/production-checklist.md](./docs/production-checklist.md)

Docker: `Dockerfile` + `docker-compose.prod.yml`.  
Bachs webhooks: `https://<domain>/api/webhooks/bachs`.

## Docs

See [docs/README.md](./docs/README.md).
