import type { CreatorProfile, Tip, TipStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

export interface PublicTipDto {
  id: string;
  status: TipStatus;
  amount: string;
  currency: string;
  message: string | null;
  aiThankYouMessage: string | null;
  isAnonymous: boolean;
  supporterName: string | null;
  creator: {
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  createdAt: string;
}

export interface CreateTipInput {
  username: string;
  amount: string;
  currency?: string;
  message?: string;
  isAnonymous?: boolean;
  supporterName?: string;
  supporterEmail: string;
  idempotencyKey?: string;
}

export function decimalToAmountString(value: Prisma.Decimal | string): string {
  const d = value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
  return d.toFixed(2);
}

export function toPublicTipDto(
  tip: Tip & {
    creator: Pick<CreatorProfile, 'username' | 'displayName' | 'avatarUrl'>;
  },
): PublicTipDto {
  return {
    id: tip.id,
    status: tip.status,
    amount: decimalToAmountString(tip.amount),
    currency: tip.currency,
    message: tip.message,
    aiThankYouMessage: tip.aiThankYouMessage ?? null,
    isAnonymous: tip.isAnonymous,
    supporterName: tip.isAnonymous ? null : tip.supporterName,
    creator: {
      username: tip.creator.username,
      displayName: tip.creator.displayName,
      avatarUrl: tip.creator.avatarUrl,
    },
    createdAt: tip.createdAt.toISOString(),
  };
}
