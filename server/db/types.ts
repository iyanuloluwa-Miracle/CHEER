import type {
  AuditAction as AuditActionValues,
  NotificationProvider as NotificationProviderValues,
  NotificationStatus as NotificationStatusValues,
  NotificationType as NotificationTypeValues,
  OtpPurpose as OtpPurposeValues,
  PaymentProvider as PaymentProviderValues,
  PaymentStatus as PaymentStatusValues,
  SocialPlatform as SocialPlatformValues,
  TipStatus as TipStatusValues,
} from './enums';

/** The enums are `as const` maps, so the union types are derived from their values. */
export type SocialPlatform =
  (typeof SocialPlatformValues)[keyof typeof SocialPlatformValues];
export type TipStatus = (typeof TipStatusValues)[keyof typeof TipStatusValues];
export type PaymentProvider =
  (typeof PaymentProviderValues)[keyof typeof PaymentProviderValues];
export type PaymentStatus =
  (typeof PaymentStatusValues)[keyof typeof PaymentStatusValues];
export type OtpPurpose =
  (typeof OtpPurposeValues)[keyof typeof OtpPurposeValues];
export type NotificationType =
  (typeof NotificationTypeValues)[keyof typeof NotificationTypeValues];
export type NotificationStatus =
  (typeof NotificationStatusValues)[keyof typeof NotificationStatusValues];
export type NotificationProvider =
  (typeof NotificationProviderValues)[keyof typeof NotificationProviderValues];
export type AuditAction =
  (typeof AuditActionValues)[keyof typeof AuditActionValues];

/** Plain document shapes used across services (string ids, no Mongoose internals). */

export type User = {
  id: string;
  email: string;
  passwordHash: string | null;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreatorProfile = {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  supportMessage: string | null;
  currency: string;
  suggestedTipAmounts: string[] | null;
  isActive: boolean;
  bachsAccountId: string | null;
  fridayPayoutEnabled: boolean;
  goalTitle: string | null;
  goalTargetAmount: string | null;
  goalActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type SocialLink = {
  id: string;
  creatorId: string;
  platform: SocialPlatform;
  url: string;
  label: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type Tip = {
  id: string;
  creatorId: string;
  amount: string;
  currency: string;
  message: string | null;
  aiThankYouMessage: string | null;
  isAnonymous: boolean;
  supporterName: string | null;
  supporterEmail: string | null;
  status: TipStatus;
  paymentTransactionId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PaymentTransaction = {
  id: string;
  internalReference: string;
  provider: PaymentProvider;
  providerReference: string | null;
  amount: string;
  currency: string;
  status: PaymentStatus;
  metadata: Record<string, unknown> | null;
  rawProviderStatus: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type WebhookEvent = {
  id: string;
  providerEventId: string;
  provider: PaymentProvider;
  eventType: string;
  payload: Record<string, unknown>;
  processedAt: Date | null;
  createdAt: Date;
};

export type OtpChallenge = {
  id: string;
  userId: string | null;
  email: string;
  codeHash: string;
  purpose: OtpPurpose;
  expiresAt: Date;
  attemptCount: number;
  maxAttempts: number;
  consumedAt: Date | null;
  createdAt: Date;
};

export type Notification = {
  id: string;
  userId: string | null;
  email: string;
  type: NotificationType;
  provider: NotificationProvider;
  providerMessageId: string | null;
  status: NotificationStatus;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AuditLog = {
  id: string;
  actorUserId: string | null;
  action: AuditAction;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
};

export type TipPageView = {
  id: string;
  creatorId: string;
  createdAt: Date;
};
