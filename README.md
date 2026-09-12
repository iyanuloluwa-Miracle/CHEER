# TippyMe

Creator support platform for African builders — **one link** to receive tips via Bachs.

## Stack

| Layer | Tech |
|-------|------|
| App | Vue 3 + Nuxt 3 + Nitro (SSR + `/api`) + TypeScript + Tailwind + Pinia |
| DB | PostgreSQL + Prisma |
| Payments | Bachs |
| Email | Resend |

## Setup

```bash
npm install
cp .env.example .env
docker compose up -d postgres
npm run prisma:migrate
npm run prisma:seed
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
| `npm run prisma:migrate:deploy` | **Safe** production migrations |

## Production

- [docs/PHASE-15-PRODUCTION.md](./docs/PHASE-15-PRODUCTION.md)
- [docs/production-checklist.md](./docs/production-checklist.md)

Docker: `Dockerfile` + `docker-compose.prod.yml`.  
Bachs webhooks: `https://<domain>/api/webhooks/bachs`.

## Docs

See [docs/README.md](./docs/README.md).
