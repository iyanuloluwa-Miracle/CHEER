# Phase 5 — Creator Onboarding

**Status:** Complete  
**Date:** 2026-09-06

## Flow

Account (Phase 4 OTP) → `/onboarding` → Username → Profile → Social → Support → Tippy page `/{username}`

## API

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/creators/username-available?username=` | No | Availability + format/reserved |
| POST | `/api/creators` | Yes | Create own profile |
| GET | `/api/creators/me` | Yes | Own profile |
| PATCH | `/api/creators/me` | Yes | Update profile fields |
| PATCH | `/api/creators/me/settings` | Yes | Currency, support message, tip presets |
| PUT | `/api/creators/me/social-links` | Yes | Replace social links |
| GET | `/api/creators/:username` | No | Public profile |

Ownership always from JWT `sub` — never from client `userId`.

## Username rules

- Normalized lowercase
- `^[a-z0-9_]{3,30}$`
- Reserved set includes routes (`login`, `dashboard`, `api`, …) and brand terms
- Uniqueness via Prisma unique + `P2002` race handling

## Schema

`CreatorProfile.suggestedTipAmounts` JSON (decimal strings).

## Frontend

- `/onboarding` multi-step with progress
- `/{username}` public Tippy page preview (no payments yet)
- Post-login: no profile → onboarding; else dashboard
