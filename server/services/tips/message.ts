import {
  TIP_MESSAGE_MAX_LENGTH,
  TIP_SUPPORTER_NAME_MAX_LENGTH,
} from './tips.constants';

/**
 * Sanitize supporter-facing text before persistence.
 * Vue text interpolation escapes XSS on display; this strips control chars / tags
 * as defense in depth and caps length.
 */
export function sanitizeTipMessage(
  raw: string | undefined | null,
): string | null {
  if (raw == null) return null;
  const cleaned = stripUnsafe(raw).trim();
  if (!cleaned) return null;
  return cleaned.slice(0, TIP_MESSAGE_MAX_LENGTH);
}

export function sanitizeSupporterName(
  raw: string | undefined | null,
): string | null {
  if (raw == null) return null;
  const cleaned = stripUnsafe(raw).replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;
  return cleaned.slice(0, TIP_SUPPORTER_NAME_MAX_LENGTH);
}

function stripUnsafe(input: string): string {
  let out = '';
  for (const ch of input) {
    const code = ch.charCodeAt(0);
    // Keep tab (9), LF (10), CR (13); drop other C0 controls and DEL
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
      continue;
    }
    if (code === 127) continue;
    out += ch;
  }

  return out
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '');
}
