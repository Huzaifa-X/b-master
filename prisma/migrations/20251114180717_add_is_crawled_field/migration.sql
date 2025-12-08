-- AlterTable
ALTER TABLE "public"."assistant_knowledgebases" ADD COLUMN     "isCrawled" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "assistant_knowledgebases_isCrawled_idx" ON "public"."assistant_knowledgebases"("isCrawled");
