import type {
  PaymentStatus,
  PaymentTransaction,
  Tip,
  TipStatus,
} from '@prisma/client';
import { decimalToAmountString } from '../tips/tips.types';
import type { CreatorSettlementStatusDto } from './settlement.types';

/** Creator-private tip row — never includes supporterEmail; anonymous names stay null. */
export interface CreatorTipDto {
  id: string;
  amount: string;
  currency: string;
  message: string | null;
  isAnonymous: boolean;
  supporterName: string | null;
  status: TipStatus;
  paymentStatus: PaymentStatus | null;
  createdAt: string;
}

export interface DashboardTotalsDto {
  /** Sum of PAID tip amounts (decimal string). */
  successfulSupport: string;
  successfulTipCount: number;
  /** PAID tip sum for the current UTC calendar month. */
  periodSupport: string;
  periodTipCount: number;
  /** e.g. "2026-09" (UTC month). */
  periodKey: string;
  periodLabel: string;
}

export interface CreatorDashboardDto {
  currency: string;
  username: string;
  displayName: string;
  publicPath: string;
  publicUrl: string;
  totals: DashboardTotalsDto;
  recentTips: CreatorTipDto[];
  recentMessages: CreatorTipDto[];
  /** Bachs Connect / payout readiness — never a TippyMe wallet. */
  settlement: CreatorSettlementStatusDto;
}

export interface CreatorTipsPageDto {
  tips: CreatorTipDto[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function toCreatorTipDto(
  tip: Tip & {
    paymentTransaction: Pick<PaymentTransaction, 'status'> | null;
  },
): CreatorTipDto {
  return {
    id: tip.id,
    amount: decimalToAmountString(tip.amount),
    currency: tip.currency,
    message: tip.message,
    isAnonymous: tip.isAnonymous,
    supporterName: tip.isAnonymous ? null : tip.supporterName,
    status: tip.status,
    paymentStatus: tip.paymentTransaction?.status ?? null,
    createdAt: tip.createdAt.toISOString(),
  };
}

export function utcMonthBounds(now = new Date()): {
  start: Date;
  end: Date;
  periodKey: string;
  periodLabel: string;
} {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));
  const periodKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const periodLabel = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(start);
  return { start, end, periodKey, periodLabel };
}
