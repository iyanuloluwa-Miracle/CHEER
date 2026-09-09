import { createHmac, timingSafeEqual } from 'crypto';
import { BACHS_WEBHOOK_TOLERANCE_SECONDS } from './bachs.constants';

/**
 * Verify Bachs webhook signature per docs:
 * HMAC-SHA256 hex of "{timestamp}.{raw_body}" using endpoint signing secret.
 * Headers: X-Bachs-Timestamp, X-Bachs-Signature
 */
export function verifyBachsWebhookSignature(params: {
  rawBody: Buffer | string;
  secret: string;
  timestampHeader: string | undefined;
  signatureHeader: string | undefined;
  toleranceSeconds?: number;
  nowSeconds?: number;
}): boolean {
  const {
    rawBody,
    secret,
    timestampHeader,
    signatureHeader,
    toleranceSeconds = BACHS_WEBHOOK_TOLERANCE_SECONDS,
    nowSeconds = Math.floor(Date.now() / 1000),
  } = params;

  if (!secret || !timestampHeader || !signatureHeader) {
    return false;
  }

  const timestamp = Number.parseInt(timestampHeader, 10);
  if (!Number.isFinite(timestamp)) {
    return false;
  }

  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) {
    return false;
  }

  const body = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
  const message = `${timestamp}.${body}`;
  const expected = createHmac('sha256', secret)
    .update(message, 'utf8')
    .digest('hex');

  try {
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(signatureHeader, 'utf8');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
