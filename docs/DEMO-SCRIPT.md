# TippyMe — 90-second hackathon demo script

Live path for judges. Practice once end-to-end before the pitch.

## Setup (before you walk on stage)

1. Dev server running (`npm run dev`) with a creator already signed in.
2. Optional: `OPENROUTER_API_KEY` for live AI; without it, local fallback copy still demos.
3. Optional: `BACHS_API_KEY` for live checkout; without it, Connect stubs + stub checkout still tell the story.
4. Two browser windows: **creator dashboard** + **incognito supporter**.

## 90-second path

| Time | Action | What to say |
|------|--------|-------------|
| 0:00–0:15 | Landing → claim username → signup/onboarding | “African builders shouldn’t paste bank details in WhatsApp. TippyMe is one link for support.” |
| 0:15–0:30 | Onboarding bio → **Polish with AI** | “OpenRouter polishes the bio in one tap — product-shaped AI, not a chatbot.” |
| 0:30–0:45 | Dashboard → **Share on WhatsApp** + show QR / support card | “The share kit closes the DM loop — link + goal, no account numbers.” |
| 0:45–1:00 | Dashboard → **Connect Bachs payouts** (stub or hosted) → Friday payouts | “Tips settle into Bachs Connect. TippyMe is not a bank. Friday payouts via Bachs schedules.” |
| 1:00–1:20 | Incognito: open `/{username}` → tip + message → pay | “Supporter needs no account. Goal progress is visible. Payment goes through Bachs.” |
| 1:20–1:30 | Confirm page → AI thank-you; dashboard tip + conversion | “Webhook confirms paid. Personalized thank-you. Views→tips conversion on the dashboard.” |

## Closing line (10 seconds)

> “TippyMe owns the creator experience. Bachs moves the money. Resend notifies. OpenRouter writes the human bits. One link for African builders.”

## If something fails live

- **No Bachs key:** Connect button still links a stub `acct_stub_…` and enables Friday payout messaging; tip uses stub checkout.
- **No OpenRouter key:** Bio polish + thank-you use deterministic local fallback — still demable.
- **Webhook slow:** Confirm page polls; say “we never trust the redirect — only verified payment.”

## Checklist after demo

- [ ] Settlement shows **Bachs Connect linked**
- [ ] Friday payout shows **Configured via Bachs** (or Available)
- [ ] Public page shows **support goal** progress (if configured)
- [ ] Confirm page shows **thank-you note**
- [ ] Dashboard shows **views → tips** percent
