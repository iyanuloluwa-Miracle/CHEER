import { CreatorsService } from '../../services/creators/creators.service';
import { defineApiHandler } from '../../lib/define-api';

export default defineApiHandler(async (event) => {
  const username = getRouterParam(event, 'username') ?? '';
  const creators = new CreatorsService();
  const profile = await creators.getPublicByUsername(username);
  return { profile };
});
