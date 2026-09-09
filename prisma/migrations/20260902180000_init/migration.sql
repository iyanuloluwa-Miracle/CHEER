-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."SocialPlatform" AS ENUM ('X', 'INSTAGRAM', 'LINKEDIN', 'GITHUB', 'YOUTUBE', 'TIKTOK', 'WEBSITE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."TipStatus" AS ENUM ('CREATED', 'CHECKOUT_PENDING', 'PAID', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."PaymentProvider" AS ENUM ('BACHS', 'DEV_SEED');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."OtpPurpose" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET', 'LOGIN');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('EMAIL_OTP', 'EMAIL_TIP_RECEIVED', 'EMAIL_GENERIC');

-- CreateEnum
CREATE TYPE "public"."NotificationStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."NotificationProvider" AS ENUM ('SENDBYTE', 'DEV_LOG');

-- CreateEnum
CREATE TYPE "public"."AuditAction" AS ENUM ('USER_CREATED', 'EMAIL_VERIFIED', 'LOGIN_SUCCESS', 'LOGIN_FAILURE', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_COMPLETED', 'PROFILE_UPDATED', 'TIP_CREATED', 'TIP_STATUS_CHANGED', 'PAYMENT_STATUS_CHANGED', 'PAYOUT_REQUESTED', 'WEBHOOK_RECEIVED', 'WEBHOOK_IGNORED_DUPLICATE');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CreatorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "supportMessage" TEXT,
    "currency" CHAR(3) NOT NULL DEFAULT 'NGN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "bachsAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SocialLink" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "platform" "public"."SocialPlatform" NOT NULL,
    "url" TEXT NOT NULL,
    "label" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Tip" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "message" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "supporterName" TEXT,
    "supporterEmail" TEXT,
    "status" "public"."TipStatus" NOT NULL DEFAULT 'CREATED',
    "paymentTransactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PaymentTransaction" (
    "id" TEXT NOT NULL,
    "internalReference" TEXT NOT NULL,
    "provider" "public"."PaymentProvider" NOT NULL,
    "providerReference" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "status" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "rawProviderStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WebhookEvent" (
    "id" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "provider" "public"."PaymentProvider" NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OtpChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "purpose" "public"."OtpPurpose" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "provider" "public"."NotificationProvider" NOT NULL DEFAULT 'SENDBYTE',
    "providerMessageId" TEXT,
    "status" "public"."NotificationStatus" NOT NULL DEFAULT 'QUEUED',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" "public"."AuditAction" NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "public"."User"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorProfile_userId_key" ON "public"."CreatorProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorProfile_username_key" ON "public"."CreatorProfile"("username");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorProfile_bachsAccountId_key" ON "public"."CreatorProfile"("bachsAccountId");

-- CreateIndex
CREATE INDEX "CreatorProfile_isActive_idx" ON "public"."CreatorProfile"("isActive");

-- CreateIndex
CREATE INDEX "CreatorProfile_createdAt_idx" ON "public"."CreatorProfile"("createdAt");

-- CreateIndex
CREATE INDEX "SocialLink_creatorId_sortOrder_idx" ON "public"."SocialLink"("creatorId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SocialLink_creatorId_platform_url_key" ON "public"."SocialLink"("creatorId", "platform", "url");

-- CreateIndex
CREATE UNIQUE INDEX "Tip_paymentTransactionId_key" ON "public"."Tip"("paymentTransactionId");

-- CreateIndex
CREATE INDEX "Tip_creatorId_createdAt_idx" ON "public"."Tip"("creatorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Tip_creatorId_status_idx" ON "public"."Tip"("creatorId", "status");

-- CreateIndex
CREATE INDEX "Tip_status_createdAt_idx" ON "public"."Tip"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_internalReference_key" ON "public"."PaymentTransaction"("internalReference");

-- CreateIndex
CREATE INDEX "PaymentTransaction_status_createdAt_idx" ON "public"."PaymentTransaction"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentTransaction_provider_status_idx" ON "public"."PaymentTransaction"("provider", "status");

-- CreateIndex
CREATE INDEX "PaymentTransaction_createdAt_idx" ON "public"."PaymentTransaction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_provider_providerReference_key" ON "public"."PaymentTransaction"("provider", "providerReference");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_providerEventId_key" ON "public"."WebhookEvent"("providerEventId");

-- CreateIndex
CREATE INDEX "WebhookEvent_provider_eventType_createdAt_idx" ON "public"."WebhookEvent"("provider", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_createdAt_idx" ON "public"."WebhookEvent"("createdAt");

-- CreateIndex
CREATE INDEX "OtpChallenge_email_purpose_createdAt_idx" ON "public"."OtpChallenge"("email", "purpose", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "OtpChallenge_expiresAt_idx" ON "public"."OtpChallenge"("expiresAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "public"."Notification"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Notification_providerMessageId_idx" ON "public"."Notification"("providerMessageId");

-- CreateIndex
CREATE INDEX "Notification_status_createdAt_idx" ON "public"."Notification"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "public"."AuditLog"("actorUserId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "public"."AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "public"."AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "public"."AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."CreatorProfile" ADD CONSTRAINT "CreatorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SocialLink" ADD CONSTRAINT "SocialLink_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Tip" ADD CONSTRAINT "Tip_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."CreatorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Tip" ADD CONSTRAINT "Tip_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "public"."PaymentTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OtpChallenge" ADD CONSTRAINT "OtpChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
