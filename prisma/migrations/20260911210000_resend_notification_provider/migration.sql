-- AlterEnum
ALTER TYPE "NotificationProvider" ADD VALUE 'RESEND';

-- AlterTable
ALTER TABLE "Notification" ALTER COLUMN "provider" SET DEFAULT 'RESEND';
