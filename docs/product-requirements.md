# Cheer — Product Requirements (MVP)

## Positioning

Cheer is a **creator-support experience**, not a payment processor.

- **Bachs** moves money.  
- **Cheer** provides the personal tipping link, messages, anonymity, and creator dashboard.  
- Value prop: *“One link for everyone who wants to support your work.”*

Public creator URL shape: `cheer.cash/{username}` (e.g. `cheer.cash/dina`).

---

## Actors

| Actor | Account? | Goals |
|-------|----------|-------|
| Creator | Yes | Claim username, profile, receive tips, view dashboard, manage payout readiness via Bachs |
| Supporter | No | Open public page, choose amount, optional message, optional anonymous, pay via Bachs |

---

## Creator flow

Sign up → verify email (SendByte OTP) → create profile → choose unique username → configure profile → configure payout/settlement (Bachs Connect) → share Cheer URL → receive tips → dashboard (totals, tip count, recent tips, messages, anonymity, payment status, payout info).

---

## Supporter flow

Open `/{username}` → view creator → choose amount → optional message → anonymous toggle → NestJS creates tip + Bachs checkout → complete payment on Bachs → Cheer verifies via webhook → success screen.

---

## Non-goals (MVP)

- Building a payment processor  
- Supporter accounts  
- Social feed / comments beyond tip messages  
- Native mobile apps  
- Multi-currency complexity beyond what Bachs account enables  

---

## Payments (Bachs)

- Server-validated amounts only  
- Internal Cheer tip ID as Bachs `reference` / metadata  
- Idempotent checkout + webhook handling  
- No client-writable balances or statuses  

Details: [bachs-integration.md](./bachs-integration.md)

---

## Communications (SendByte)

- Email verification OTP  
- Password reset OTP (if feature ships)  
- Transactional creator notifications  

Details: [sendbyte-integration.md](./sendbyte-integration.md)

---

## Local development webhooks (OutRay)

Dev-only tunnel for Bachs → local NestJS.  
Production uses deployed HTTPS API.

Details: [outray-development.md](./outray-development.md)
