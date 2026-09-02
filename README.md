# Cheer

Creator support platform for African builders — **one link** to receive tips via Bachs.

## Stack

| Layer | Tech |
|-------|------|
| Web | Vue 3 + Nuxt 3 + TypeScript + Tailwind + Pinia |
| API | Node.js + NestJS + TypeScript |
| DB | PostgreSQL + Prisma (Phase 3) |
| Payments | Bachs (later phases) |
| Email | SendByte (later phases) |

## Monorepo

```text
apps/web   Nuxt frontend (port 3000)
apps/api   NestJS API (port 3001, prefix /api)
docs/      Architecture & integration research
```

## Setup

```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
docker compose up -d postgres
npm run prisma:migrate -w @cheer/api
npm run prisma:seed -w @cheer/api
```

## Develop

```bash
npm run dev:api
npm run dev:web
```

Health check: [http://localhost:3001/api/health](http://localhost:3001/api/health)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run lint` | Lint API + web |
| `npm run typecheck` | TypeScript checks |
| `npm run test` | Unit tests |
| `npm run build` | Production builds |

## Docs

See [docs/README.md](./docs/README.md).
