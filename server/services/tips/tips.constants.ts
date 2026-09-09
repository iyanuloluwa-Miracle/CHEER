/** Tip amount / message policy — server is source of truth. */

export const TIP_MIN_AMOUNT = '100.00';
export const TIP_MAX_AMOUNT = '1000000.00';
export const TIP_MESSAGE_MAX_LENGTH = 500;
export const TIP_SUPPORTER_NAME_MAX_LENGTH = 80;
export const TIP_IDEMPOTENCY_KEY_MAX = 64;

/** Decimal string with up to 2 fractional digits. */
export const TIP_AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

/** Throttle public tip creation (spam protection). */
export const TIP_CREATE_THROTTLE_TTL_MS = 60_000;
export const TIP_CREATE_THROTTLE_LIMIT = 10;
