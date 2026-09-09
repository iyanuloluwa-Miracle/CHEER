import type {
  PaymentStatus,
  PaymentTransaction,
  Tip,
  TipStatus,
} from '@prisma/client';
import { decimalToAmountString } from '../tips/tips.types';
import type { CreatorProfileDto } from './creators.types';
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

export interface ListTipsQuery {
  status?: TipStatus;
  from?: string;
  to?: string;
  minAmount?: string;
  maxAmount?: string;
  page?: number;
  pageSize?: number;
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

/**
 * UTC calendar week starting Monday 00:00 through next Monday 00:00.
 * weekKey uses ISO-like year-Wxx based on the Thursday of that week.
 */
export function utcWeekBounds(now = new Date()): {
  start: Date;
  end: Date;
  weekKey: string;
  weekStart: string;
  weekEnd: string;
} {
  const day = now.getUTCDay(); // 0 Sun … 6 Sat
  const daysFromMonday = (day + 6) % 7;
  const start = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - daysFromMonday,
      0,
      0,
      0,
      0,
    ),
  );
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);

  const thursday = new Date(start);
  thursday.setUTCDate(thursday.getUTCDate() + 3);
  const isoYear = thursday.getUTCFullYear();
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const jan4Day = (jan4.getUTCDay() + 6) % 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day);
  const weekNum =
    Math.floor((start.getTime() - week1Monday.getTime()) / 604800000) + 1;
  const weekKey = `${isoYear}-W${String(weekNum).padStart(2, '0')}`;

  return {
    start,
    end,
    weekKey,
    weekStart: start.toISOString(),
    weekEnd: end.toISOString(),
  };
}

/** Public-safe supporter note — never includes email; anonymous names are null. */
export interface PublicSupporterNoteDto {
  amount: string;
  currency: string;
  message: string;
  displayName: string | null;
  isAnonymous: boolean;
  createdAt: string;
}

export interface TipsThisWeekDto {
  sum: string;
  count: number;
  currency: string;
  weekKey: string;
  weekStart: string;
  weekEnd: string;
}

export interface PublicCreatorPageDto {
  profile: CreatorProfileDto;
  tipsThisWeek: TipsThisWeekDto;
  recentSupporterNotes: PublicSupporterNoteDto[];
}

export function toPublicSupporterNoteDto(tip: Tip): PublicSupporterNoteDto | null {
  const message = tip.message?.trim();
  if (!message) return null;
  return {
    amount: decimalToAmountString(tip.amount),
    currency: tip.currency,
    message,
    displayName: tip.isAnonymous ? null : tip.supporterName,
    isAnonymous: tip.isAnonymous,
    createdAt: tip.createdAt.toISOString(),
  };
}

