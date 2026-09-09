import { CreatorsService } from '../../../services/creators/creators.service';
import { requireUser } from '../../../lib/auth';
import { defineApiHandler } from '../../../lib/define-api';

export default defineApiHandler(async (event) => {
  const user = await requireUser(event);
  const creators = new CreatorsService();
  const dashboard = await creators.getDashboard(user.sub);
  return { dashboard };
});
