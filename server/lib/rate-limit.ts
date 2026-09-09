import { ApiError } from './errors';

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

/**
 * Simple in-memory rate limiter (single-instance MVP).
 * Returns retryAfterSeconds when limited, otherwise null.
 */
export function consumeRateLimit(
  key: string,
  limit: number,
  ttlMs: number,
): number | null {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + ttlMs });
    return null;
  }

  if (existing.count >= limit) {
    return Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
  }

  existing.count += 1;
  buckets.set(key, existing);
  return null;
}

export function assertRateLimit(
  key: string,
  limit: number,
  ttlMs: number,
): void {
  const retryAfterSeconds = consumeRateLimit(key, limit, ttlMs);
  if (retryAfterSeconds != null) {
    throw new ApiError(
      429,
      'RATE_LIMITED',
      'Too many requests. Please try again shortly.',
      retryAfterSeconds,
    );
  }
}
