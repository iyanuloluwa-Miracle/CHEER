import { OpenRouterAiService } from '../../services/ai/openrouter.service';
import { ApiError } from '../../lib/errors';
import { requireUser } from '../../lib/auth';
import { defineApiHandler } from '../../lib/define-api';

/** Polish creator bio + tip CTA via OpenRouter (fallback when unconfigured). */
export default defineApiHandler(async (event) => {
  await requireUser(event);
  const body = await readBody<{
    displayName?: string;
    draft?: string;
    niche?: string;
  }>(event);

  const displayName = body.displayName?.trim();
  if (!displayName) {
    throw new ApiError(400, 'INVALID_INPUT', 'displayName is required.');
  }

  const ai = new OpenRouterAiService();
  const result = await ai.polishBio({
    displayName,
    draft: body.draft?.trim() || '',
    niche: body.niche?.trim(),
  });
  return result;
});
