# Phase 3 — Database & Prisma

**Status:** Complete (schema + migration + client; apply when Postgres is running)  
**Date:** 2026-09-02

## Models

| Model | Purpose |
|-------|---------|
| `User` | TippyMe creator account (email unique; optional `passwordHash`) |
| `CreatorProfile` | Public identity; unique `username`; default currency |
| `SocialLink` | Variable social/website links per creator |
| `Tip` | Business tip record (`Decimal(18,2)` amounts) |
| `PaymentTransaction` | Provider payment record (separate from Tip) |
| `WebhookEvent` | Idempotent webhook dedupe (`providerEventId` unique) |
| `OtpChallenge` | Hashed OTP only; purpose, expiry, attempts, consumed |
| `Notification` | SendByte (or DEV_LOG) delivery tracking |
| `AuditLog` | Security-sensitive actions (no secrets/OTPs) |

## Money

Amounts use Prisma `Decimal` → PostgreSQL `DECIMAL(18,2)`, aligned with Bachs decimal-string amounts (never float).

## Idempotency

- `PaymentTransaction.internalReference` unique  
- `@@unique([provider, providerReference])`  
- `WebhookEvent.providerEventId` unique  
- Tip ↔ payment 1:1 via unique `Tip.paymentTransactionId`

## Local DB

```bash
docker compose up -d postgres
cp apps/api/.env.example apps/api/.env   # ensure DATABASE_URL
npm run prisma:migrate -w @cheer/api     # or: prisma migrate deploy
npm run prisma:seed -w @cheer/api
```

Seed creates demo creator `dina` with `[DEV SEED]` tips / `DEV_SEED` payments — **not** Bachs-succeeded payments.

## Note

Docker was not available in the Phase 3 build environment; migration SQL was generated with `prisma migrate diff` and checked into `prisma/migrations/`.
