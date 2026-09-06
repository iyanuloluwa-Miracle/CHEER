# Phase 4 — Authentication & SendByte OTP

**Status:** Complete  
**Date:** 2026-09-05

## Flow

1. Creator enters email on `/login`
2. `POST /api/auth/request-otp` — NestJS generates OTP, stores **hash only**, sends via `SendByteService`
3. Creator enters code
4. `POST /api/auth/verify-otp` — verify hash, mark email verified, set httpOnly JWT cookie
5. `GET /api/auth/me` / `/dashboard` — session-derived identity (never trust client `userId`)

Supporters remain unauthenticated.

## Security

| Rule | Implementation |
|------|----------------|
| OTP generated only on NestJS | `otp.crypto.generateOtpCode` (`crypto.randomInt`) |
| Hashed at rest | HMAC-SHA256 + `OTP_HASH_PEPPER` |
| Expiry / attempts / single-use | 10 min, max 5 attempts, `consumedAt` |
| Resend cooldown | 60s (Postgres last challenge) |
| Rate limits | `@nestjs/throttler` in-memory (no Redis — Phase 1) |
| Never return / log OTP | API responses + logs omit code |
| SendByte key server-only | `SENDBYTE_API_KEY` in NestJS env |

## Endpoints

- `POST /api/auth/request-otp`
- `POST /api/auth/verify-otp`
- `GET /api/auth/me` (auth required)
- `POST /api/auth/logout`

## Session

JWT in httpOnly cookie `tippyme_session` (`AUTH_SECRET`, 7d). CORS credentials enabled for `APP_URL`.
