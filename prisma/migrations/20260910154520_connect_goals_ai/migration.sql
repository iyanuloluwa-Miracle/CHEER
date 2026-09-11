-- AlterTable
ALTER TABLE "CreatorProfile" ADD COLUMN     "fridayPayoutEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "goalActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "goalTargetAmount" DECIMAL(18,2),
ADD COLUMN     "goalTitle" TEXT;

-- AlterTable
ALTER TABLE "Tip" ADD COLUMN     "aiThankYouMessage" TEXT;
