import { CreatorsService } from '../../../services/creators/creators.service';
import type { ReplaceSocialLinksInput } from '../../../services/creators/creators.types';
import { requireUser } from '../../../lib/auth';
import { defineApiHandler } from '../../../lib/define-api';

export default defineApiHandler(async (event) => {
  const user = await requireUser(event);
  const body = await readBody<ReplaceSocialLinksInput>(event);
  const creators = new CreatorsService();
  const profile = await creators.replaceSocialLinks(user.sub, body);
  return { profile };
});
