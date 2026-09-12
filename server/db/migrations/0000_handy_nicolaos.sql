CREATE TYPE "public"."AuditAction" AS ENUM('USER_CREATED', 'EMAIL_VERIFIED', 'LOGIN_SUCCESS', 'LOGIN_FAILURE', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_COMPLETED', 'PROFILE_UPDATED', 'TIP_CREATED', 'TIP_STATUS_CHANGED', 'PAYMENT_STATUS_CHANGED', 'PAYOUT_REQUESTED', 'WEBHOOK_RECEIVED', 'WEBHOOK_IGNORED_DUPLICATE');--> statement-breakpoint
CREATE TYPE "public"."NotificationProvider" AS ENUM('SENDBYTE', 'RESEND', 'DEV_LOG');--> statement-breakpoint
CREATE TYPE "public"."NotificationStatus" AS ENUM('QUEUED', 'SENT', 'DELIVERED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."NotificationType" AS ENUM('EMAIL_OTP', 'EMAIL_TIP_RECEIVED', 'EMAIL_ACCOUNT_VERIFIED', 'EMAIL_SECURITY_ALERT', 'EMAIL_GENERIC');--> statement-breakpoint
CREATE TYPE "public"."OtpPurpose" AS ENUM('EMAIL_VERIFICATION', 'PASSWORD_RESET', 'LOGIN');--> statement-breakpoint
CREATE TYPE "public"."PaymentProvider" AS ENUM('BACHS', 'DEV_SEED');--> statement-breakpoint
CREATE TYPE "public"."PaymentStatus" AS ENUM('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."SocialPlatform" AS ENUM('X', 'INSTAGRAM', 'LINKEDIN', 'GITHUB', 'YOUTUBE', 'TIKTOK', 'WEBSITE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."TipStatus" AS ENUM('CREATED', 'CHECKOUT_PENDING', 'PAID', 'FAILED', 'EXPIRED');--> statement-breakpoint
CREATE TABLE "AuditLog" (
	"id" text PRIMARY KEY NOT NULL,
	"actorUserId" text,
	"action" "AuditAction" NOT NULL,
	"entityType" text,
	"entityId" text,
	"metadata" jsonb,
	"ipAddress" text,
	"userAgent" text,
	"createdAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CreatorProfile" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"username" text NOT NULL,
	"displayName" text NOT NULL,
	"bio" text,
	"avatarUrl" text,
	"supportMessage" text,
	"currency" char(3) DEFAULT 'NGN' NOT NULL,
	"suggestedTipAmounts" jsonb,
	"isActive" boolean DEFAULT true NOT NULL,
	"bachsAccountId" text,
	"fridayPayoutEnabled" boolean DEFAULT false NOT NULL,
	"goalTitle" text,
	"goalTargetAmount" numeric(18, 2),
	"goalActive" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp (3) NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	CONSTRAINT "CreatorProfile_userId_unique" UNIQUE("userId"),
	CONSTRAINT "CreatorProfile_username_unique" UNIQUE("username"),
	CONSTRAINT "CreatorProfile_bachsAccountId_unique" UNIQUE("bachsAccountId")
);
--> statement-breakpoint
CREATE TABLE "Notification" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text,
	"email" text NOT NULL,
	"type" "NotificationType" NOT NULL,
	"provider" "NotificationProvider" DEFAULT 'RESEND' NOT NULL,
	"providerMessageId" text,
	"status" "NotificationStatus" DEFAULT 'QUEUED' NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp (3) NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "OtpChallenge" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text,
	"email" text NOT NULL,
	"codeHash" text NOT NULL,
	"purpose" "OtpPurpose" NOT NULL,
	"expiresAt" timestamp (3) NOT NULL,
	"attemptCount" integer DEFAULT 0 NOT NULL,
	"maxAttempts" integer DEFAULT 5 NOT NULL,
	"consumedAt" timestamp (3),
	"createdAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "PaymentTransaction" (
	"id" text PRIMARY KEY NOT NULL,
	"internalReference" text NOT NULL,
	"provider" "PaymentProvider" NOT NULL,
	"providerReference" text,
	"amount" numeric(18, 2) NOT NULL,
	"currency" char(3) NOT NULL,
	"status" "PaymentStatus" DEFAULT 'PENDING' NOT NULL,
	"metadata" jsonb,
	"rawProviderStatus" text,
	"createdAt" timestamp (3) NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	CONSTRAINT "PaymentTransaction_internalReference_unique" UNIQUE("internalReference")
);
--> statement-breakpoint
CREATE TABLE "SocialLink" (
	"id" text PRIMARY KEY NOT NULL,
	"creatorId" text NOT NULL,
	"platform" "SocialPlatform" NOT NULL,
	"url" text NOT NULL,
	"label" text,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp (3) NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "TipPageView" (
	"id" text PRIMARY KEY NOT NULL,
	"creatorId" text NOT NULL,
	"createdAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Tip" (
	"id" text PRIMARY KEY NOT NULL,
	"creatorId" text NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"currency" char(3) NOT NULL,
	"message" text,
	"aiThankYouMessage" text,
	"isAnonymous" boolean DEFAULT false NOT NULL,
	"supporterName" text,
	"supporterEmail" text,
	"status" "TipStatus" DEFAULT 'CREATED' NOT NULL,
	"paymentTransactionId" text,
	"createdAt" timestamp (3) NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	CONSTRAINT "Tip_paymentTransactionId_unique" UNIQUE("paymentTransactionId")
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"passwordHash" text,
	"emailVerifiedAt" timestamp (3),
	"createdAt" timestamp (3) NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	CONSTRAINT "User_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "WebhookEvent" (
	"id" text PRIMARY KEY NOT NULL,
	"providerEventId" text NOT NULL,
	"provider" "PaymentProvider" NOT NULL,
	"eventType" text NOT NULL,
	"payload" jsonb NOT NULL,
	"processedAt" timestamp (3),
	"createdAt" timestamp (3) NOT NULL,
	CONSTRAINT "WebhookEvent_providerEventId_unique" UNIQUE("providerEventId")
);
--> statement-breakpoint
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_User_id_fk" FOREIGN KEY ("actorUserId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CreatorProfile" ADD CONSTRAINT "CreatorProfile_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "OtpChallenge" ADD CONSTRAINT "OtpChallenge_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "SocialLink" ADD CONSTRAINT "SocialLink_creatorId_CreatorProfile_id_fk" FOREIGN KEY ("creatorId") REFERENCES "public"."CreatorProfile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TipPageView" ADD CONSTRAINT "TipPageView_creatorId_CreatorProfile_id_fk" FOREIGN KEY ("creatorId") REFERENCES "public"."CreatorProfile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Tip" ADD CONSTRAINT "Tip_creatorId_CreatorProfile_id_fk" FOREIGN KEY ("creatorId") REFERENCES "public"."CreatorProfile"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Tip" ADD CONSTRAINT "Tip_paymentTransactionId_PaymentTransaction_id_fk" FOREIGN KEY ("paymentTransactionId") REFERENCES "public"."PaymentTransaction"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog" USING btree ("actorUserId","createdAt");--> statement-breakpoint
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog" USING btree ("action","createdAt");--> statement-breakpoint
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog" USING btree ("entityType","entityId");--> statement-breakpoint
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "CreatorProfile_isActive_idx" ON "CreatorProfile" USING btree ("isActive");--> statement-breakpoint
CREATE INDEX "CreatorProfile_createdAt_idx" ON "CreatorProfile" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "Notification_providerMessageId_idx" ON "Notification" USING btree ("providerMessageId");--> statement-breakpoint
CREATE INDEX "Notification_status_createdAt_idx" ON "Notification" USING btree ("status","createdAt");--> statement-breakpoint
CREATE INDEX "OtpChallenge_email_purpose_createdAt_idx" ON "OtpChallenge" USING btree ("email","purpose","createdAt");--> statement-breakpoint
CREATE INDEX "OtpChallenge_expiresAt_idx" ON "OtpChallenge" USING btree ("expiresAt");--> statement-breakpoint
CREATE UNIQUE INDEX "PaymentTransaction_provider_providerReference_key" ON "PaymentTransaction" USING btree ("provider","providerReference");--> statement-breakpoint
CREATE INDEX "PaymentTransaction_status_createdAt_idx" ON "PaymentTransaction" USING btree ("status","createdAt");--> statement-breakpoint
CREATE INDEX "PaymentTransaction_provider_status_idx" ON "PaymentTransaction" USING btree ("provider","status");--> statement-breakpoint
CREATE INDEX "PaymentTransaction_createdAt_idx" ON "PaymentTransaction" USING btree ("createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "SocialLink_creatorId_platform_url_key" ON "SocialLink" USING btree ("creatorId","platform","url");--> statement-breakpoint
CREATE INDEX "SocialLink_creatorId_sortOrder_idx" ON "SocialLink" USING btree ("creatorId","sortOrder");--> statement-breakpoint
CREATE INDEX "TipPageView_creatorId_createdAt_idx" ON "TipPageView" USING btree ("creatorId","createdAt");--> statement-breakpoint
CREATE INDEX "Tip_creatorId_createdAt_idx" ON "Tip" USING btree ("creatorId","createdAt");--> statement-breakpoint
CREATE INDEX "Tip_creatorId_status_idx" ON "Tip" USING btree ("creatorId","status");--> statement-breakpoint
CREATE INDEX "Tip_creatorId_status_createdAt_idx" ON "Tip" USING btree ("creatorId","status","createdAt");--> statement-breakpoint
CREATE INDEX "Tip_creatorId_amount_idx" ON "Tip" USING btree ("creatorId","amount");--> statement-breakpoint
CREATE INDEX "Tip_status_createdAt_idx" ON "Tip" USING btree ("status","createdAt");--> statement-breakpoint
CREATE INDEX "User_createdAt_idx" ON "User" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "WebhookEvent_provider_eventType_createdAt_idx" ON "WebhookEvent" USING btree ("provider","eventType","createdAt");--> statement-breakpoint
CREATE INDEX "WebhookEvent_createdAt_idx" ON "WebhookEvent" USING btree ("createdAt");