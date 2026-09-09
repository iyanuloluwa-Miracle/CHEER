export interface HealthResponse {
  status: 'ok' | 'degraded';
  service: string;
  database?: 'up' | 'down';
  timestamp: string;
}

export interface PublicUser {
  id: string;
  email: string;
  emailVerifiedAt: string | null;
  hasCreatorProfile: boolean;
}

export type SocialPlatform =
  | 'X'
  | 'INSTAGRAM'
  | 'LINKEDIN'
  | 'GITHUB'
  | 'YOUTUBE'
  | 'TIKTOK'
  | 'WEBSITE'
  | 'OTHER';

export interface CreatorSocialLink {
  id?: string;
  platform: SocialPlatform;
  url: string;
  label?: string | null;
  sortOrder?: number;
}

export interface CreatorProfile {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  supportMessage: string | null;
  currency: string;
  suggestedTipAmounts: string[];
  isActive: boolean;
  socialLinks: CreatorSocialLink[];
  publicPath: string;
  createdAt: string;
  updatedAt: string;
}

export interface TipsThisWeek {
  sum: string;
  count: number;
  currency: string;
  weekKey: string;
  weekStart: string;
  weekEnd: string;
}

export interface PublicSupporterNote {
  amount: string;
  currency: string;
  message: string;
  displayName: string | null;
  isAnonymous: boolean;
  createdAt: string;
}

export interface PublicCreatorPage {
  profile: CreatorProfile;
  tipsThisWeek: TipsThisWeek;
  recentSupporterNotes: PublicSupporterNote[];
}

export interface UsernameAvailability {
  username: string;
  available: boolean;
  reason?: 'INVALID_FORMAT' | 'RESERVED' | 'TOO_SHORT' | 'TOO_LONG' | 'TAKEN';
}

export type TipStatus =
  | 'CREATED'
  | 'CHECKOUT_PENDING'
  | 'PAID'
  | 'FAILED'
  | 'EXPIRED';

export interface PublicTip {
  id: string;
  status: TipStatus;
  amount: string;
  currency: string;
  message: string | null;
  isAnonymous: boolean;
  supporterName: string | null;
  creator: {
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  createdAt: string;
}

export interface CreateTipResponse {
  tip: PublicTip;
  checkoutUrl: string;
}

export interface PaymentStatus {
  id: string;
  paymentId: string;
  tipId: string;
  tipStatus: TipStatus;
  paymentStatus:
    | 'PENDING'
    | 'PROCESSING'
    | 'SUCCEEDED'
    | 'FAILED'
    | 'CANCELLED'
    | 'EXPIRED';
  amount: string;
  currency: string;
  paid: boolean;
}

export type PaymentTxnStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED';

/** Creator-private tip row from dashboard APIs. */
export interface CreatorTip {
  id: string;
  amount: string;
  currency: string;
  message: string | null;
  isAnonymous: boolean;
  supporterName: string | null;
  status: TipStatus;
  paymentStatus: PaymentTxnStatus | null;
  createdAt: string;
}

export interface CreatorDashboardTotals {
  successfulSupport: string;
  successfulTipCount: number;
  periodSupport: string;
  periodTipCount: number;
  periodKey: string;
  periodLabel: string;
}

export interface CreatorDashboard {
  currency: string;
  username: string;
  displayName: string;
  publicPath: string;
  publicUrl: string;
  totals: CreatorDashboardTotals;
  recentTips: CreatorTip[];
  recentMessages: CreatorTip[];
  settlement: CreatorSettlementStatus;
}

export interface CreatorSettlementStatus {
  readiness: 'NOT_CONFIGURED' | 'CONNECTED';
  bachsConnectAccountId: string | null;
  tippyHoldsWithdrawableBalance: false;
  tippyInitiatedPayoutAvailable: false;
  automatedFridayPayout: 'FUTURE_CAPABILITY';
  message: string;
}

export interface CreatorTipsPage {
  tips: CreatorTip[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ListMyTipsQuery {
  status?: TipStatus;
  from?: string;
  to?: string;
  minAmount?: string;
  maxAmount?: string;
  page?: number;
  pageSize?: number;
}

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
  path?: string;
  timestamp?: string;
  retryAfterSeconds?: number;
}
