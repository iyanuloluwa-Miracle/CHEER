import { CreatorsService } from '../../services/creators/creators.service';
import { defineApiHandler } from '../../lib/define-api';

export default defineApiHandler(async (event) => {
  const query = getQuery(event);
  const username = typeof query.username === 'string' ? query.username : '';
  const creators = new CreatorsService();
  return creators.checkUsernameAvailability(username);
});
