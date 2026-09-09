/** Bachs REST defaults — from docs.bachs.io (sandbox vs production). */
export const BACHS_SANDBOX_BASE_URL = 'https://sandbox-api.bachs.io';
export const BACHS_PRODUCTION_BASE_URL = 'https://api.bachs.io';
export const BACHS_API_VERSION_PREFIX = '/v1';

/** Documented request timeout guidance (idempotency retry examples use ~30s). */
export const BACHS_REQUEST_TIMEOUT_MS = 30_000;

/** Documented webhook timestamp tolerance (seconds). */
export const BACHS_WEBHOOK_TOLERANCE_SECONDS = 300;

export const BACHS_CHECKOUT_STATUS = {
  OPEN: 'open',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
} as const;
