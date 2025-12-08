/*
  Warnings:

  - You are about to drop the column `openAIFileId` on the `assistant_knowledgebases` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."assistant_knowledgebases" DROP COLUMN "openAIFileId",
ADD COLUMN     "vectorFileId" TEXT;
