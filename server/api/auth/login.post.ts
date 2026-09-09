import { AuthService } from '../../services/auth.service';
import { ApiError } from '../../lib/errors';
import { defineApiHandler } from '../../lib/define-api';
import { setAuthCookie } from '../../lib/auth';
import { assertRateLimit } from '../../lib/rate-limit';
import {
  AUTH_THROTTLE_TTL_MS,
  AUTH_VERIFY_OTP_LIMIT,
} from '../../services/auth/otp.constants';

export default defineApiHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown';
  assertRateLimit(
    `auth:login:${ip}`,
    AUTH_VERIFY_OTP_LIMIT,
    AUTH_THROTTLE_TTL_MS,
  );

  const body = await readBody<{ email?: string; password?: string }>(event);
  if (!body?.email || typeof body.email !== 'string') {
    throw new ApiError(400, 'INVALID_EMAIL', 'email is required.');
  }
  if (!body?.password || typeof body.password !== 'string') {
    throw new ApiError(400, 'INVALID_PASSWORD', 'password is required.');
  }

  const auth = new AuthService();
  const { response, accessToken } = await auth.loginWithPassword(
    body.email,
    body.password,
    {
      ipAddress: ip,
      userAgent: getHeader(event, 'user-agent') ?? undefined,
    },
  );

  setAuthCookie(event, accessToken);
  return response;
});
