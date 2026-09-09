-- Anonymous tip-page view counts for creator dashboards (no visitor PII).
CREATE TABLE "TipPageView" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TipPageView_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TipPageView_creatorId_createdAt_idx" ON "TipPageView"("creatorId", "createdAt");

ALTER TABLE "TipPageView" ADD CONSTRAINT "TipPageView_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
