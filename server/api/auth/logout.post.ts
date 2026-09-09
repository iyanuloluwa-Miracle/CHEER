import { defineApiHandler } from '../../lib/define-api';
import { clearAuthCookie } from '../../lib/auth';

export default defineApiHandler(async (event) => {
  clearAuthCookie(event);
  return { ok: true };
});
