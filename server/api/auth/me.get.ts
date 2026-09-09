import { AuthService } from '../../services/auth.service';
import { defineApiHandler } from '../../lib/define-api';
import { requireUser } from '../../lib/auth';

export default defineApiHandler(async (event) => {
  const user = await requireUser(event);
  const auth = new AuthService();
  const publicUser = await auth.getUserById(user.sub);
  return { user: publicUser };
});
