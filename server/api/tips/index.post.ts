import { TipsService } from '../../services/tips/tips.service';
import type { CreateTipInput } from '../../services/tips/tips.types';
import { TIP_IDEMPOTENCY_KEY_MAX } from '../../services/tips/tips.constants';
import { ApiError } from '../../lib/errors';
import { defineApiHandler } from '../../lib/define-api';
import { assertRateLimit } from '../../lib/rate-limit';
import {
  AUTH_THROTTLE_TTL_MS,
  TIPS_CREATE_LIMIT,
} from '../../services/auth/otp.constants';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IDEMPOTENCY_RE = /^[a-zA-Z0-9_-]+$/;

export default defineApiHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown';
  assertRateLimit(`tips:create:${ip}`, TIPS_CREATE_LIMIT, AUTH_THROTTLE_TTL_MS);

  const body = await readBody<CreateTipInput>(event);

  if (!body?.username || typeof body.username !== 'string') {
    throw new ApiError(400, 'INVALID_USERNAME', 'username is required.');
  }
  if (!body?.amount) {
    throw new ApiError(400, 'INVALID_AMOUNT', 'amount is required.');
  }
  if (!body?.supporterEmail || typeof body.supporterEmail !== 'string') {
    throw new ApiError(400, 'INVALID_EMAIL', 'supporterEmail is required.');
  }
  if (!EMAIL_RE.test(body.supporterEmail.trim())) {
    throw new ApiError(400, 'INVALID_EMAIL', 'supporterEmail must be a valid email.');
  }
  if (body.idempotencyKey) {
    const key = body.idempotencyKey.trim();
    if (
      key.length < 8 ||
      key.length > TIP_IDEMPOTENCY_KEY_MAX ||
      !IDEMPOTENCY_RE.test(key)
    ) {
      throw new ApiError(
        400,
        'INVALID_IDEMPOTENCY_KEY',
        'idempotencyKey must be 8–64 alphanumeric characters, underscores, or hyphens.',
      );
    }
  }

  const idempotencyKeyHeader = getHeader(event, 'idempotency-key') ?? undefined;
  const tips = new TipsService();
  const result = await tips.createTip(
    {
      ...body,
      username: body.username.trim().toLowerCase(),
      supporterEmail: body.supporterEmail.trim().toLowerCase(),
      currency: body.currency?.trim().toUpperCase(),
    },
    {
      idempotencyKeyHeader,
      ip: getRequestIP(event) ?? undefined,
      userAgent: getHeader(event, 'user-agent') ?? undefined,
    },
  );

  setResponseStatus(event, 201);
  return result;
});
