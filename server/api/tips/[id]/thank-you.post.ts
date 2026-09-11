import { TipStatus } from '@prisma/client';
import { CencoriAiService } from '../../../services/ai/cencori.service';
import { ApiError } from '../../../lib/errors';
import { usePrisma } from '../../../lib/prisma';
import { defineApiHandler } from '../../../lib/define-api';

/**
 * Generate (or return cached) AI thank-you for a PAID tip.
 * Public — only reveals thank-you text, never emails.
 */
export default defineApiHandler(async (event) => {
  const tipId = getRouterParam(event, 'id');
  if (!tipId) {
    throw new ApiError(400, 'INVALID_TIP', 'Tip id is required.');
  }

  const prisma = usePrisma();
  const tip = await prisma.tip.findUnique({
    where: { id: tipId },
    include: {
      creator: {
        select: {
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

  const ai = new CencoriAiService();
  const generated = await ai.thankYouNote({
    creatorDisplayName: tip.creator.displayName,
    supporterName: tip.supporterName,
    isAnonymous: tip.isAnonymous,
    tipMessage: tip.message,
    amount: tip.amount.toFixed(2),
    currency: tip.currency,
    supportMessage: tip.creator.supportMessage,
  });

  const updated = await prisma.tip.update({
    where: { id: tip.id },
    data: { aiThankYouMessage: generated.message },
  });

  return {
    message: updated.aiThankYouMessage!,
    source: generated.source,
  };
});
