# Phase 7 — Bachs Payment Integration

**Status:** Complete  
**Date:** 2026-09-07

## What shipped

- `BachsPaymentProvider` behind `PaymentProviderPort`
- Thin `BachsHttpClient` for official REST (`POST/GET /v1/checkout-sessions`)
- Provider selection: `BACHS_API_KEY` set → Bachs; otherwise stub (local/tests)
- Tip create stores `PaymentProvider.BACHS`, sends Bachs `Idempotency-Key` = internal reference
- Init failures mark tip/payment `FAILED` and return safe public errors
- `POST /api/webhooks/bachs` verifies `X-Bachs-Signature` / `X-Bachs-Timestamp`, dedupes on `evt_…`, updates tip only after verification
- Creator tip-received email via SendByte (or DEV_LOG)

## Authoritative flow

Supporter → Nuxt → NestJS creates pending Tip + PaymentTransaction → Bachs checkout session → hosted checkout → webhook/verify → NestJS updates PaymentTransaction + Tip → notify creator

Redirect to `success_url` is **never** treated as payment proof.

## Sandbox setup

See [bachs-integration.md](./bachs-integration.md) § Phase 7 sandbox setup.
