# Phase 9 — Creator dashboard

Authenticated creators see real support totals and tip history from TippyMe APIs. No hardcoded financial statistics.

## APIs

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/creators/me/dashboard` | JWT cookie | Totals (PAID only), current UTC month, recent tips & messages |
| GET | `/api/creators/me/tips` | JWT cookie | Paginated tip list with MVP filters |

### Successful totals

Only tips with `TipStatus.PAID` contribute to:

- `totals.successfulSupport` (sum of amounts)
- `totals.successfulTipCount`
- `totals.periodSupport` / `periodTipCount` (UTC calendar month)

Failed, expired, created, and checkout-pending tips never inflate successful totals.

### Tip row privacy

- Anonymous tips always return `supporterName: null`
- `supporterEmail` is never exposed on dashboard APIs

### Filters (`GET /me/tips`)

- `status`, `from`, `to`, `minAmount`, `maxAmount`, `page`, `pageSize` (max 50)

Creator scope always comes from the session (`user.sub` → owned `creatorId`). Clients cannot pass another creator’s id.

## Frontend

`/dashboard` (auth middleware):

- Totals from `getMyDashboard`
- Tip list from `listMyTips` with status filter + pagination
- Empty state when there is no tip history
- Copy Tippy link + share (WhatsApp, X, LinkedIn; Instagram/TikTok bio via copy)

Payment success is never inferred in the browser — status comes from the API.

## Indexes

On `Tip`:

- `(creatorId, createdAt DESC)`
- `(creatorId, status)`
- `(creatorId, status, createdAt DESC)`
- `(creatorId, amount)`

Apply with your usual Prisma migrate / `db push` workflow.

## Local seed

`prisma/seed.ts` includes DEV_SEED `PAID` tips for dashboard UI. They are **not** Bachs-verified payments.
