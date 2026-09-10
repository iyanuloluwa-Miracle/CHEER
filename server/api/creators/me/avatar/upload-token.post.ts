import { requireUser } from '../../../lib/auth';
import { defineApiHandler } from '../../../lib/define-api';
import { assertRateLimit } from '../../../lib/rate-limit';
import { createAvatarUploadToken } from '../../../services/byteship/byteship.service';

export default defineApiHandler(async (event) => {
  const user = await requireUser(event);
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown';
  assertRateLimit(`byteship:avatar-token:${user.sub}:${ip}`, 10, 60_000);

  const token = await createAvatarUploadToken(user.sub);
  return token;
});
