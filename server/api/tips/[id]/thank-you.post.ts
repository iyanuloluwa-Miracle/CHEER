import { eq } from 'drizzle-orm';
import { useDb } from '../../../db';
import { TipStatus } from '../../../db/enums';
import { tips } from '../../../db/schema';
import { OpenRouterAiService } from '../../../services/ai/openrouter.service';
import { ApiError } from '../../../lib/errors';
import { defineApiHandler } from '../../../lib/define-api';
import { decimalToAmountString } from '../../../services/tips/tips.types';

/**
 * Generate (or return cached) AI thank-you for a PAID tip.
 * Public — only reveals thank-you text, never emails.
 */
export default defineApiHandler(async (event) => {
  const tipId = getRouterParam(event, 'id');
  if (!tipId) {
    throw new ApiError(400, 'INVALID_TIP', 'Tip id is required.');
  }

  const db = useDb();
  const tip = await db.query.tips.findFirst({
    where: eq(tips.id, tipId),
    with: {
      creator: {
        columns: {
          displayName: true,
          supportMessage: true,
        },
      },
    },
  });

  if (!tip) {
    throw new ApiError(404, 'TIP_NOT_FOUND', 'Tip not found.');
  }

  if (tip.status !== TipStatus.PAID) {
    throw new ApiError(
      409,
      'TIP_NOT_PAID',
      'Thank-you notes are available after payment confirms.',
    );
  }

  if (tip.aiThankYouMessage?.trim()) {
    return {
      message: tip.aiThankYouMessage,
      source: 'cached' as const,
    };
  }

  const ai = new OpenRouterAiService();
  const generated = await ai.thankYouNote({
    creatorDisplayName: tip.creator.displayName,
    supporterName: tip.supporterName,
    isAnonymous: tip.isAnonymous,
    tipMessage: tip.message,
    amount: decimalToAmountString(tip.amount),
    currency: tip.currency,
    supportMessage: tip.creator.supportMessage,
  });

  const [updated] = await db
    .update(tips)
    .set({ aiThankYouMessage: generated.message })
    .where(eq(tips.id, tip.id))
    .returning();

  return {
    message: updated.aiThankYouMessage!,
    source: generated.source,
  };
});
