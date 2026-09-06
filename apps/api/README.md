# TippyMe API (`@cheer/api`)

NestJS backend for TippyMe creator auth, profiles, and (later) Bachs tips.

## Scripts

```bash
npm run start:dev -w @cheer/api
npm run test -w @cheer/api
npm run test:e2e -w @cheer/api
```

## Swagger

In non-production environments, OpenAPI UI is available at:

- UI: `http://localhost:3001/api/docs`
- JSON: `http://localhost:3001/api/docs-json`

Authenticate protected routes with the `tippyme_session` cookie (set by `POST /api/auth/verify-otp`) or `Authorization: Bearer <jwt>`.

Swagger is disabled when `NODE_ENV=production`.
