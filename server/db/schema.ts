import { createId } from '@paralleldrive/cuid2';
import { relations } from 'drizzle-orm';
import {
  boolean,
  char,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

const cuid = () => createId();
const now = () => new Date();

export const socialPlatformEnum = pgEnum('SocialPlatform', [
  'X',
  'INSTAGRAM',
  'LINKEDIN',
  'GITHUB',
  'YOUTUBE',
  'TIKTOK',
  'WEBSITE',
  'OTHER',
]);

export const tipStatusEnum = pgEnum('TipStatus', [
  'CREATED',
  'CHECKOUT_PENDING',
  'PAID',
  'FAILED',
  'EXPIRED',
]);

export const paymentProviderEnum = pgEnum('PaymentProvider', [
  'BACHS',
  'DEV_SEED',
]);

export const paymentStatusEnum = pgEnum('PaymentStatus', [
  'PENDING',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
  'EXPIRED',
]);

export const otpPurposeEnum = pgEnum('OtpPurpose', [
  'EMAIL_VERIFICATION',
  'PASSWORD_RESET',
  'LOGIN',
]);

export const notificationTypeEnum = pgEnum('NotificationType', [
  'EMAIL_OTP',
  'EMAIL_TIP_RECEIVED',
  'EMAIL_ACCOUNT_VERIFIED',
  'EMAIL_SECURITY_ALERT',
  'EMAIL_GENERIC',
]);

export const notificationStatusEnum = pgEnum('NotificationStatus', [
  'QUEUED',
  'SENT',
  'DELIVERED',
  'FAILED',
]);

export const notificationProviderEnum = pgEnum('NotificationProvider', [
  'SENDBYTE',
  'RESEND',
  'DEV_LOG',
]);

export const auditActionEnum = pgEnum('AuditAction', [
  'USER_CREATED',
  'EMAIL_VERIFIED',
  'LOGIN_SUCCESS',
  'LOGIN_FAILURE',
  'PASSWORD_RESET_REQUESTED',
  'PASSWORD_RESET_COMPLETED',
  'PROFILE_UPDATED',
  'TIP_CREATED',
  'TIP_STATUS_CHANGED',
  'PAYMENT_STATUS_CHANGED',
  'PAYOUT_REQUESTED',
  'WEBHOOK_RECEIVED',
  'WEBHOOK_IGNORED_DUPLICATE',
]);

export const users = pgTable(
  'User',
  {
    id: text('id').primaryKey().$defaultFn(cuid),
    email: text('email').notNull().unique(),
    passwordHash: text('passwordHash'),
    emailVerifiedAt: timestamp('emailVerifiedAt', { precision: 3, mode: 'date' }),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .notNull()
      .$defaultFn(now),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' })
      .notNull()
      .$defaultFn(now)
      .$onUpdateFn(now),
  },
  (t) => [index('User_createdAt_idx').on(t.createdAt)],
);

export const creatorProfiles = pgTable(
  'CreatorProfile',
  {
    id: text('id').primaryKey().$defaultFn(cuid),
    userId: text('userId')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    username: text('username').notNull().unique(),
    displayName: text('displayName').notNull(),
    bio: text('bio'),
    avatarUrl: text('avatarUrl'),
    supportMessage: text('supportMessage'),
    currency: char('currency', { length: 3 }).notNull().default('NGN'),
    suggestedTipAmounts: jsonb('suggestedTipAmounts').$type<string[] | null>(),
    isActive: boolean('isActive').notNull().default(true),
    bachsAccountId: text('bachsAccountId').unique(),
    fridayPayoutEnabled: boolean('fridayPayoutEnabled').notNull().default(false),
    goalTitle: text('goalTitle'),
    goalTargetAmount: numeric('goalTargetAmount', { precision: 18, scale: 2 }),
    goalActive: boolean('goalActive').notNull().default(false),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .notNull()
      .$defaultFn(now),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' })
      .notNull()
      .$defaultFn(now)
      .$onUpdateFn(now),
  },
  (t) => [
    index('CreatorProfile_isActive_idx').on(t.isActive),
    index('CreatorProfile_createdAt_idx').on(t.createdAt),
  ],
);

export const tipPageViews = pgTable(
  'TipPageView',
  {
    id: text('id').primaryKey().$defaultFn(cuid),
    creatorId: text('creatorId')
      .notNull()
      .references(() => creatorProfiles.id, { onDelete: 'cascade' }),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .notNull()
      .$defaultFn(now),
  },
  (t) => [index('TipPageView_creatorId_createdAt_idx').on(t.creatorId, t.createdAt)],
);

export const socialLinks = pgTable(
  'SocialLink',
  {
    id: text('id').primaryKey().$defaultFn(cuid),
    creatorId: text('creatorId')
      .notNull()
      .references(() => creatorProfiles.id, { onDelete: 'cascade' }),
    platform: socialPlatformEnum('platform').notNull(),
    url: text('url').notNull(),
    label: text('label'),
    sortOrder: integer('sortOrder').notNull().default(0),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .notNull()
      .$defaultFn(now),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' })
      .notNull()
      .$defaultFn(now)
      .$onUpdateFn(now),
  },
  (t) => [
    uniqueIndex('SocialLink_creatorId_platform_url_key').on(
      t.creatorId,
      t.platform,
      t.url,
    ),
    index('SocialLink_creatorId_sortOrder_idx').on(t.creatorId, t.sortOrder),
  ],
);

export const paymentTransactions = pgTable(
  'PaymentTransaction',
  {
    id: text('id').primaryKey().$defaultFn(cuid),
    internalReference: text('internalReference').notNull().unique(),
    provider: paymentProviderEnum('provider').notNull(),
    providerReference: text('providerReference'),
    amount: numeric('amount', { precision: 18, scale: 2 }).notNull(),
    currency: char('currency', { length: 3 }).notNull(),
    status: paymentStatusEnum('status').notNull().default('PENDING'),
    metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
    rawProviderStatus: text('rawProviderStatus'),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .notNull()
      .$defaultFn(now),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' })
      .notNull()
      .$defaultFn(now)
      .$onUpdateFn(now),
  },
  (t) => [
    uniqueIndex('PaymentTransaction_provider_providerReference_key').on(
      t.provider,
      t.providerReference,
    ),
    index('PaymentTransaction_status_createdAt_idx').on(t.status, t.createdAt),
    index('PaymentTransaction_provider_status_idx').on(t.provider, t.status),
    index('PaymentTransaction_createdAt_idx').on(t.createdAt),
  ],
);

export const tips = pgTable(
  'Tip',
  {
    id: text('id').primaryKey().$defaultFn(cuid),
    creatorId: text('creatorId')
      .notNull()
      .references(() => creatorProfiles.id, { onDelete: 'restrict' }),
    amount: numeric('amount', { precision: 18, scale: 2 }).notNull(),
    currency: char('currency', { length: 3 }).notNull(),
    message: text('message'),
    aiThankYouMessage: text('aiThankYouMessage'),
    isAnonymous: boolean('isAnonymous').notNull().default(false),
    supporterName: text('supporterName'),
    supporterEmail: text('supporterEmail'),
    status: tipStatusEnum('status').notNull().default('CREATED'),
    paymentTransactionId: text('paymentTransactionId')
      .unique()
      .references(() => paymentTransactions.id, { onDelete: 'set null' }),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .notNull()
      .$defaultFn(now),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' })
      .notNull()
      .$defaultFn(now)
      .$onUpdateFn(now),
  },
  (t) => [
    index('Tip_creatorId_createdAt_idx').on(t.creatorId, t.createdAt),
    index('Tip_creatorId_status_idx').on(t.creatorId, t.status),
    index('Tip_creatorId_status_createdAt_idx').on(
      t.creatorId,
      t.status,
      t.createdAt,
    ),
    index('Tip_creatorId_amount_idx').on(t.creatorId, t.amount),
    index('Tip_status_createdAt_idx').on(t.status, t.createdAt),
  ],
);

export const webhookEvents = pgTable(
  'WebhookEvent',
  {
    id: text('id').primaryKey().$defaultFn(cuid),
    providerEventId: text('providerEventId').notNull().unique(),
    provider: paymentProviderEnum('provider').notNull(),
    eventType: text('eventType').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    processedAt: timestamp('processedAt', { precision: 3, mode: 'date' }),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .notNull()
      .$defaultFn(now),
  },
  (t) => [
    index('WebhookEvent_provider_eventType_createdAt_idx').on(
      t.provider,
      t.eventType,
      t.createdAt,
    ),
    index('WebhookEvent_createdAt_idx').on(t.createdAt),
  ],
);

export const otpChallenges = pgTable(
  'OtpChallenge',
  {
    id: text('id').primaryKey().$defaultFn(cuid),
    userId: text('userId').references(() => users.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    codeHash: text('codeHash').notNull(),
    purpose: otpPurposeEnum('purpose').notNull(),
    expiresAt: timestamp('expiresAt', { precision: 3, mode: 'date' }).notNull(),
    attemptCount: integer('attemptCount').notNull().default(0),
    maxAttempts: integer('maxAttempts').notNull().default(5),
    consumedAt: timestamp('consumedAt', { precision: 3, mode: 'date' }),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .notNull()
      .$defaultFn(now),
  },
  (t) => [
    index('OtpChallenge_email_purpose_createdAt_idx').on(
      t.email,
      t.purpose,
      t.createdAt,
    ),
    index('OtpChallenge_expiresAt_idx').on(t.expiresAt),
  ],
);

export const notifications = pgTable(
  'Notification',
  {
    id: text('id').primaryKey().$defaultFn(cuid),
    userId: text('userId').references(() => users.id, { onDelete: 'set null' }),
    email: text('email').notNull(),
    type: notificationTypeEnum('type').notNull(),
    provider: notificationProviderEnum('provider').notNull().default('RESEND'),
    providerMessageId: text('providerMessageId'),
    status: notificationStatusEnum('status').notNull().default('QUEUED'),
    metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .notNull()
      .$defaultFn(now),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' })
      .notNull()
      .$defaultFn(now)
      .$onUpdateFn(now),
  },
  (t) => [
    index('Notification_userId_createdAt_idx').on(t.userId, t.createdAt),
    index('Notification_providerMessageId_idx').on(t.providerMessageId),
    index('Notification_status_createdAt_idx').on(t.status, t.createdAt),
  ],
);

export const auditLogs = pgTable(
  'AuditLog',
  {
    id: text('id').primaryKey().$defaultFn(cuid),
    actorUserId: text('actorUserId').references(() => users.id, {
      onDelete: 'set null',
    }),
    action: auditActionEnum('action').notNull(),
    entityType: text('entityType'),
    entityId: text('entityId'),
    metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
    ipAddress: text('ipAddress'),
    userAgent: text('userAgent'),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .notNull()
      .$defaultFn(now),
  },
  (t) => [
    index('AuditLog_actorUserId_createdAt_idx').on(t.actorUserId, t.createdAt),
    index('AuditLog_action_createdAt_idx').on(t.action, t.createdAt),
    index('AuditLog_entityType_entityId_idx').on(t.entityType, t.entityId),
    index('AuditLog_createdAt_idx').on(t.createdAt),
  ],
);

export const usersRelations = relations(users, ({ one, many }) => ({
  creatorProfile: one(creatorProfiles, {
    fields: [users.id],
    references: [creatorProfiles.userId],
  }),
  otpChallenges: many(otpChallenges),
  notifications: many(notifications),
  auditLogs: many(auditLogs),
}));

export const creatorProfilesRelations = relations(
  creatorProfiles,
  ({ one, many }) => ({
    user: one(users, {
      fields: [creatorProfiles.userId],
      references: [users.id],
    }),
    socialLinks: many(socialLinks),
    tips: many(tips),
    tipPageViews: many(tipPageViews),
  }),
);

export const socialLinksRelations = relations(socialLinks, ({ one }) => ({
  creator: one(creatorProfiles, {
    fields: [socialLinks.creatorId],
    references: [creatorProfiles.id],
  }),
}));

export const tipPageViewsRelations = relations(tipPageViews, ({ one }) => ({
  creator: one(creatorProfiles, {
    fields: [tipPageViews.creatorId],
    references: [creatorProfiles.id],
  }),
}));

export const tipsRelations = relations(tips, ({ one }) => ({
  creator: one(creatorProfiles, {
    fields: [tips.creatorId],
    references: [creatorProfiles.id],
  }),
  paymentTransaction: one(paymentTransactions, {
    fields: [tips.paymentTransactionId],
    references: [paymentTransactions.id],
  }),
}));

export const paymentTransactionsRelations = relations(
  paymentTransactions,
  ({ one }) => ({
    tip: one(tips),
  }),
);

export const otpChallengesRelations = relations(otpChallenges, ({ one }) => ({
  user: one(users, {
    fields: [otpChallenges.userId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, {
    fields: [auditLogs.actorUserId],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type CreatorProfile = typeof creatorProfiles.$inferSelect;
export type SocialLink = typeof socialLinks.$inferSelect;
export type Tip = typeof tips.$inferSelect;
export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type OtpChallenge = typeof otpChallenges.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;

export type SocialPlatform = (typeof socialPlatformEnum.enumValues)[number];
export type TipStatus = (typeof tipStatusEnum.enumValues)[number];
export type PaymentProvider = (typeof paymentProviderEnum.enumValues)[number];
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];
export type OtpPurpose = (typeof otpPurposeEnum.enumValues)[number];
export type NotificationType = (typeof notificationTypeEnum.enumValues)[number];
export type NotificationStatus =
  (typeof notificationStatusEnum.enumValues)[number];
export type NotificationProvider =
  (typeof notificationProviderEnum.enumValues)[number];
export type AuditAction = (typeof auditActionEnum.enumValues)[number];
