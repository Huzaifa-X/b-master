-- AlterTable
ALTER TABLE "public"."assistant_purchases" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "assistant_purchases_deletedAt_idx" ON "public"."assistant_purchases"("deletedAt");
