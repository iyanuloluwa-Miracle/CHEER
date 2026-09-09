-- CreateIndex
CREATE INDEX "Tip_creatorId_status_createdAt_idx" ON "Tip"("creatorId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Tip_creatorId_amount_idx" ON "Tip"("creatorId", "amount");
