import { ConnectService } from '../../../../services/creators/connect.service';
import { requireUser } from '../../../../lib/auth';
import { defineApiHandler } from '../../../../lib/define-api';

/** Start Bachs Connect onboarding (or stub-link when BACHS_API_KEY is unset). */
export default defineApiHandler(async (event) => {
  const user = await requireUser(event);
  const connect = new ConnectService();
  const result = await connect.startOnboarding(user.sub);
  return result;
});
