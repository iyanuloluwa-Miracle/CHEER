import { ConnectService } from '../../../../services/creators/connect.service';
import { requireUser } from '../../../../lib/auth';
import { defineApiHandler } from '../../../../lib/define-api';

/** Enable weekly Friday payout schedule on the linked Bachs Connect balance. */
export default defineApiHandler(async (event) => {
  const user = await requireUser(event);
  const connect = new ConnectService();
  const settlement = await connect.enableFridayPayout(user.sub);
  return { settlement };
});
