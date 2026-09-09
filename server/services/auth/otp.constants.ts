/** OTP policy — TippyMe server-side only. Never expose codes to clients. */
export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds

export const AUTH_THROTTLE_TTL_MS = 60_000;
export const AUTH_REQUEST_OTP_LIMIT = 5;
export const AUTH_VERIFY_OTP_LIMIT = 10;
export const TIPS_CREATE_LIMIT = 10;
