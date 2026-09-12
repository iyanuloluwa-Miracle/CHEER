import { createId } from '@paralleldrive/cuid2';
import mongoose, { type Model, type ClientSession } from 'mongoose';
import {
  AuditAction,
  NotificationProvider,
  NotificationStatus,
  NotificationType,
  OtpPurpose,
  PaymentProvider,
  PaymentStatus,
  SocialPlatform,
  TipStatus,
} from './enums';

const { Schema, model, models } = mongoose;

const cuid = () => createId();

const plainTransform = (_doc: unknown, ret: Record<string, unknown>) => {
  ret.id = ret._id;
  delete ret._id;
  delete ret.__v;
  return ret;
};

const baseOptions = {
  _id: false as const,
  timestamps: false as const,
  versionKey: false as const,
  toJSON: { transform: plainTransform },
  toObject: { transform: plainTransform },
};

function withId<T extends Record<string, unknown>>(definition: T) {
  return {
    _id: { type: String, default: cuid },
    ...definition,
  };
}

const userSchema = new Schema(
  withId({
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, default: null },
    emailVerifiedAt: { type: Date, default: null },
    createdAt: { type: Date, default: () => new Date() },
    updatedAt: { type: Date, default: () => new Date() },
  }),
  baseOptions,
);
userSchema.index({ createdAt: 1 });
userSchema.pre('save', function () {
  this.updatedAt = new Date();
});

const creatorProfileSchema = new Schema(
  withId({
    userId: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    bio: { type: String, default: null },
    avatarUrl: { type: String, default: null },
    supportMessage: { type: String, default: null },
    currency: { type: String, required: true, default: 'NGN', maxlength: 3 },
    suggestedTipAmounts: { type: [String], default: null },
    isActive: { type: Boolean, required: true, default: true },
    bachsAccountId: { type: String, default: null, unique: true, sparse: true },
    fridayPayoutEnabled: { type: Boolean, required: true, default: false },
    goalTitle: { type: String, default: null },
    goalTargetAmount: { type: String, default: null },
    goalActive: { type: Boolean, required: true, default: false },
    createdAt: { type: Date, default: () => new Date() },
    updatedAt: { type: Date, default: () => new Date() },
  }),
  baseOptions,
);
creatorProfileSchema.index({ isActive: 1 });
creatorProfileSchema.index({ createdAt: 1 });
creatorProfileSchema.pre('save', function () {
  this.updatedAt = new Date();
});

const tipPageViewSchema = new Schema(
  withId({
    creatorId: { type: String, required: true },
    createdAt: { type: Date, default: () => new Date() },
  }),
  baseOptions,
);
tipPageViewSchema.index({ creatorId: 1, createdAt: 1 });

const socialLinkSchema = new Schema(
  withId({
    creatorId: { type: String, required: true },
    platform: {
      type: String,
      required: true,
      enum: Object.values(SocialPlatform),
    },
    url: { type: String, required: true },
    label: { type: String, default: null },
    sortOrder: { type: Number, required: true, default: 0 },
    createdAt: { type: Date, default: () => new Date() },
    updatedAt: { type: Date, default: () => new Date() },
  }),
  baseOptions,
);
socialLinkSchema.index({ creatorId: 1, platform: 1, url: 1 }, { unique: true });
socialLinkSchema.index({ creatorId: 1, sortOrder: 1 });
socialLinkSchema.pre('save', function () {
  this.updatedAt = new Date();
});

const paymentTransactionSchema = new Schema(
  withId({
    internalReference: { type: String, required: true, unique: true },
    provider: {
      type: String,
      required: true,
      enum: Object.values(PaymentProvider),
    },
    providerReference: { type: String, default: null },
    amount: { type: String, required: true },
    currency: { type: String, required: true, maxlength: 3 },
    status: {
      type: String,
      required: true,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
    },
    metadata: { type: Schema.Types.Mixed, default: null },
    rawProviderStatus: { type: String, default: null },
    createdAt: { type: Date, default: () => new Date() },
    updatedAt: { type: Date, default: () => new Date() },
  }),
  baseOptions,
);
paymentTransactionSchema.index(
  { provider: 1, providerReference: 1 },
  { unique: true, sparse: true },
);
paymentTransactionSchema.index({ status: 1, createdAt: 1 });
paymentTransactionSchema.index({ provider: 1, status: 1 });
paymentTransactionSchema.index({ createdAt: 1 });
paymentTransactionSchema.pre('save', function () {
  this.updatedAt = new Date();
});

const tipSchema = new Schema(
  withId({
    creatorId: { type: String, required: true },
    amount: { type: String, required: true },
    currency: { type: String, required: true, maxlength: 3 },
    message: { type: String, default: null },
    aiThankYouMessage: { type: String, default: null },
    isAnonymous: { type: Boolean, required: true, default: false },
    supporterName: { type: String, default: null },
    supporterEmail: { type: String, default: null },
    status: {
      type: String,
      required: true,
      enum: Object.values(TipStatus),
      default: TipStatus.CREATED,
    },
    paymentTransactionId: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
    },
    createdAt: { type: Date, default: () => new Date() },
    updatedAt: { type: Date, default: () => new Date() },
  }),
  baseOptions,
);
tipSchema.index({ creatorId: 1, createdAt: 1 });
tipSchema.index({ creatorId: 1, status: 1 });
tipSchema.index({ creatorId: 1, status: 1, createdAt: 1 });
tipSchema.index({ creatorId: 1, amount: 1 });
tipSchema.index({ status: 1, createdAt: 1 });
tipSchema.pre('save', function () {
  this.updatedAt = new Date();
});

const webhookEventSchema = new Schema(
  withId({
    providerEventId: { type: String, required: true, unique: true },
    provider: {
      type: String,
      required: true,
      enum: Object.values(PaymentProvider),
    },
    eventType: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    processedAt: { type: Date, default: null },
    createdAt: { type: Date, default: () => new Date() },
  }),
  baseOptions,
);
webhookEventSchema.index({ provider: 1, eventType: 1, createdAt: 1 });
webhookEventSchema.index({ createdAt: 1 });

const otpChallengeSchema = new Schema(
  withId({
    userId: { type: String, default: null },
    email: { type: String, required: true },
    codeHash: { type: String, required: true },
    purpose: {
      type: String,
      required: true,
      enum: Object.values(OtpPurpose),
    },
    expiresAt: { type: Date, required: true },
    attemptCount: { type: Number, required: true, default: 0 },
    maxAttempts: { type: Number, required: true, default: 5 },
    consumedAt: { type: Date, default: null },
    createdAt: { type: Date, default: () => new Date() },
  }),
  baseOptions,
);
otpChallengeSchema.index({ email: 1, purpose: 1, createdAt: 1 });
otpChallengeSchema.index({ expiresAt: 1 });

const notificationSchema = new Schema(
  withId({
    userId: { type: String, default: null },
    email: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: Object.values(NotificationType),
    },
    provider: {
      type: String,
      required: true,
      enum: Object.values(NotificationProvider),
      default: NotificationProvider.RESEND,
    },
    providerMessageId: { type: String, default: null },
    status: {
      type: String,
      required: true,
      enum: Object.values(NotificationStatus),
      default: NotificationStatus.QUEUED,
    },
    metadata: { type: Schema.Types.Mixed, default: null },
    createdAt: { type: Date, default: () => new Date() },
    updatedAt: { type: Date, default: () => new Date() },
  }),
  baseOptions,
);
notificationSchema.index({ userId: 1, createdAt: 1 });
notificationSchema.index({ providerMessageId: 1 });
notificationSchema.index({ status: 1, createdAt: 1 });
notificationSchema.pre('save', function () {
  this.updatedAt = new Date();
});

const auditLogSchema = new Schema(
  withId({
    actorUserId: { type: String, default: null },
    action: {
      type: String,
      required: true,
      enum: Object.values(AuditAction),
    },
    entityType: { type: String, default: null },
    entityId: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: null },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
    createdAt: { type: Date, default: () => new Date() },
  }),
  baseOptions,
);
auditLogSchema.index({ actorUserId: 1, createdAt: 1 });
auditLogSchema.index({ action: 1, createdAt: 1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ createdAt: 1 });

function getModel<T>(name: string, schema: Schema): Model<T> {
  return (models[name] as Model<T>) || model<T>(name, schema);
}

export const UserModel = getModel('User', userSchema);
export const CreatorProfileModel = getModel(
  'CreatorProfile',
  creatorProfileSchema,
);
export const TipPageViewModel = getModel('TipPageView', tipPageViewSchema);
export const SocialLinkModel = getModel('SocialLink', socialLinkSchema);
export const PaymentTransactionModel = getModel(
  'PaymentTransaction',
  paymentTransactionSchema,
);
export const TipModel = getModel('Tip', tipSchema);
export const WebhookEventModel = getModel('WebhookEvent', webhookEventSchema);
export const OtpChallengeModel = getModel('OtpChallenge', otpChallengeSchema);
export const NotificationModel = getModel('Notification', notificationSchema);
export const AuditLogModel = getModel('AuditLog', auditLogSchema);

export type { ClientSession };

/** Convert a lean mongoose doc (with `_id`) to a plain typed object with `id`. */
export function toPlain<T extends { id: string }>(
  doc: Record<string, unknown> | null | undefined,
): T | null {
  if (!doc) return null;
  const { _id, __v, ...rest } = doc;
  return { ...rest, id: String(_id) } as T;
}

export function toPlainList<T extends { id: string }>(
  docs: Record<string, unknown>[],
): T[] {
  return docs.map((d) => toPlain<T>(d)!);
}
