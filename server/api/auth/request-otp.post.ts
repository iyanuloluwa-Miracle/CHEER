import { AuthService } from '../../services/auth.service';
import { ApiError } from '../../lib/errors';
import { defineApiHandler } from '../../lib/define-api';
import { assertRateLimit } from '../../lib/rate-limit';
import {
  AUTH_REQUEST_OTP_LIMIT,
  AUTH_THROTTLE_TTL_MS,
} from '../../services/auth/otp.constants';

export default defineApiHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown';
  assertRateLimit(
    `auth:request-otp:${ip}`,
    AUTH_REQUEST_OTP_LIMIT,
    AUTH_THROTTLE_TTL_MS,
  );

  const body = await readBody<{ email?: string }>(event);
  if (!body?.email || typeof body.email !== 'string') {
    throw new ApiError(400, 'INVALID_EMAIL', 'email is required.');
  }

  const auth = new AuthService();
  return auth.requestOtp(body.email, {
    ipAddress: ip,
    userAgent: getHeader(event, 'user-agent') ?? undefined,
  });
});
