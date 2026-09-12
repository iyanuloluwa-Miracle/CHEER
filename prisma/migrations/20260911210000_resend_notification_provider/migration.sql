-- AlterEnum
-- Must be its own migration/transaction before using RESEND as a default.
ALTER TYPE "NotificationProvider" ADD VALUE 'RESEND';
