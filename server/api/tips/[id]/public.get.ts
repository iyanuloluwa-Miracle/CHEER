import { TipsService } from '../../../services/tips/tips.service';
import { defineApiHandler } from '../../../lib/define-api';

export default defineApiHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? '';
  const tips = new TipsService();
  const tip = await tips.getPublicTip(id);
  return { tip };
});
