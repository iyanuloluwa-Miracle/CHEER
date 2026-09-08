# Phase 11 — SendByte transactional notifications

Extends the existing `SendByteService` — **no second SendByte client**.

## Architecture

```
SendByteService          ← sole SDK / DEV_LOG transport
        ↑
TransactionalNotificationsService  ← idempotency + Notification rows + templates
        ↑
AuthService / WebhookFulfilmentService
```

## Triggers (authoritative only)

| Event | When | Type | Fail behavior |
|-------|------|------|----------------|
| OTP verification | `requestOtp` | `EMAIL_OTP` | Critical — throw; challenge consumed |
| Tip received | After webhook → verify → tip `PAID` | `EMAIL_TIP_RECEIVED` | Fail-open; payment stays PAID |
| Account verified | After successful `verifyOtp` | `EMAIL_ACCOUNT_VERIFIED` | Fail-open |
| Security sign-in | After password `login` success | `EMAIL_SECURITY_ALERT` | Fail-open |

**Not sent:** frontend checkout success redirects, payout emails (Phase 10 deferred).

## Idempotency

1. Bachs `WebhookEvent.providerEventId` — duplicate webhooks never re-enter notify.
2. `Notification.metadata.idempotencyKey` (+ tipId for tips) — SENT rows skip resend.
3. SendByte `idempotency_key` on the provider call.
4. `providerMessageId` stored when SENT.

## SendByte failures

- Tip / account / security: record `NotificationStatus.FAILED`, optional one immediate retry (`retryOnce`), **do not** reverse payment or auth success.
- OTP: record FAILED, rethrow so the client can retry requesting a code.

## Copy

Concise transactional subjects, e.g. “Someone supported your work”, “Your account was verified”, “New sign-in to your TippyMe account”.

## Migration

`20260907080000_notification_types_phase11` adds `EMAIL_ACCOUNT_VERIFIED` and `EMAIL_SECURITY_ALERT`.
