/** Concise transactional email copy — no marketing fluff. */

export function tipReceivedEmail(params: {
  amount: string;
  currency: string;
  isAnonymous: boolean;
  supporterName: string | null;
}): { subject: string; text: string; html: string } {
  const who = params.isAnonymous
    ? 'Someone'
    : params.supporterName?.trim() || 'A supporter';
  const subject = 'Someone supported your work';
  const text = `${who} supported your work with ${params.amount} ${params.currency} on TippyMe.`;
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; color: #1a1228; line-height: 1.5;">
  <p>${escapeHtml(who)} supported your work.</p>
  <p style="font-size: 22px; font-weight: 700;">${escapeHtml(params.amount)} ${escapeHtml(params.currency)}</p>
  <p style="color: #6b5f8a;">Your Tippy support was received. This is a confirmation only — not a marketing message.</p>
</body>
</html>`.trim();
  return { subject, text, html };
}

export function accountVerifiedEmail(): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = 'Your account was verified';
  const text =
    'Your TippyMe account was verified. You can sign in and set up your creator page.';
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; color: #1a1228; line-height: 1.5;">
  <p>Your TippyMe account was verified.</p>
  <p style="color: #6b5f8a;">You can sign in and set up your creator page whenever you are ready.</p>
</body>
</html>`.trim();
  return { subject, text, html };
}

export function securityLoginEmail(params: { method: string; atIso: string }): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = 'New sign-in to your TippyMe account';
  const text = `There was a successful sign-in to your TippyMe account (${params.method}) at ${params.atIso}. If this was not you, reset your password and contact support.`;
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; color: #1a1228; line-height: 1.5;">
  <p>New sign-in to your TippyMe account.</p>
  <p style="color: #6b5f8a;">Method: ${escapeHtml(params.method)} · ${escapeHtml(params.atIso)}</p>
  <p style="color: #6b5f8a;">If this was not you, change your password and contact support.</p>
</body>
</html>`.trim();
  return { subject, text, html };
}

export function otpEmail(code: string): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = 'Verify your TippyMe email';
  const text = `Your TippyMe verification code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`;
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; color: #1a1228;">
  <p>Your TippyMe verification code is:</p>
  <p style="font-size: 28px; font-weight: 700; letter-spacing: 0.2em;">${escapeHtml(code)}</p>
  <p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>
</body>
</html>`.trim();
  return { subject, text, html };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
