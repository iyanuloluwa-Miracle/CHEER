import { USERNAME_REGEX } from '../common/constants';

/**
 * Usernames that collide with app routes or brand terms.
 * Always compared against the normalized (lowercase) form.
 */
export const RESERVED_USERNAMES = new Set([
  // App routes
  'admin',
  'api',
  'login',
  'signup',
  'sign-up',
  'signin',
  'sign-in',
  'logout',
  'dashboard',
  'settings',
  'support',
  'terms',
  'privacy',
  'about',
  'status',
  'health',
  'onboarding',
  'auth',
  'me',
  'account',
  'accounts',
  'profile',
  'profiles',
  'creator',
  'creators',
  'tip',
  'tips',
  'payment',
  'payments',
  'webhook',
  'webhooks',
  'callback',
  'callbacks',
  'assets',
  'static',
  'public',
  'app',
  'www',
  'cdn',
  'docs',
  'help',
  'faq',
  'blog',
  'news',
  'legal',
  'contact',
  'pricing',
  'home',
  'index',
  'null',
  'undefined',
  // Brand / product
  'tippy',
  'tippyme',
  'cheer',
  'cheers',
  'bachs',
  'sendbyte',
  'outray',
]);

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;

export const DISPLAY_NAME_MIN = 1;
export const DISPLAY_NAME_MAX = 80;
export const BIO_MAX = 500;
export const SUPPORT_MESSAGE_MAX = 500;
export const MAX_SOCIAL_LINKS = 8;
export const MAX_SUGGESTED_TIPS = 5;

/** Currencies TippyMe accepts for creator defaults (Bachs decimal-string aligned). */
export const ALLOWED_CURRENCIES = ['NGN', 'USD', 'GHS', 'KES', 'ZAR'] as const;
export type AllowedCurrency = (typeof ALLOWED_CURRENCIES)[number];

export type UsernameValidationResult =
  | { ok: true; username: string }
  | {
      ok: false;
      reason: 'INVALID_FORMAT' | 'RESERVED' | 'TOO_SHORT' | 'TOO_LONG';
    };

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateUsernameFormat(raw: string): UsernameValidationResult {
  const username = normalizeUsername(raw);

  if (username.length < USERNAME_MIN_LENGTH) {
    return { ok: false, reason: 'TOO_SHORT' };
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    return { ok: false, reason: 'TOO_LONG' };
  }
  if (!USERNAME_REGEX.test(username)) {
    return { ok: false, reason: 'INVALID_FORMAT' };
  }
  if (RESERVED_USERNAMES.has(username)) {
    return { ok: false, reason: 'RESERVED' };
  }

  return { ok: true, username };
}

export function usernameValidationMessage(
  reason: Exclude<UsernameValidationResult, { ok: true }>['reason'],
): string {
  switch (reason) {
    case 'TOO_SHORT':
      return `Username must be at least ${USERNAME_MIN_LENGTH} characters.`;
    case 'TOO_LONG':
      return `Username must be at most ${USERNAME_MAX_LENGTH} characters.`;
    case 'RESERVED':
      return 'That username is reserved. Please choose another.';
    case 'INVALID_FORMAT':
    default:
      return 'Usernames must be 3–30 characters: lowercase letters, numbers, and underscores only.';
  }
}
