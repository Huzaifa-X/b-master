/*
  Warnings:

  - You are about to drop the column `permissions` on the `artifact_permissions` table. All the data in the column will be lost.
  - The `access` column on the `artifact_permissions` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."ArtifactAccessLevel" AS ENUM ('VIEWER', 'EDITOR', 'ADMIN');

-- AlterTable
ALTER TABLE "public"."artifact_permissions" DROP COLUMN "permissions",
DROP COLUMN "access",
ADD COLUMN     "access" "public"."ArtifactAccessLevel" NOT NULL DEFAULT 'VIEWER';

-- CreateTable
CREATE TABLE "public"."news_feed_permissions" (
    "id" SERIAL NOT NULL,
    "newsFeedId" INTEGER NOT NULL,
    "userId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_feed_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "news_feed_permissions_newsFeedId_idx" ON "public"."news_feed_permissions"("newsFeedId");

-- CreateIndex
CREATE INDEX "news_feed_permissions_userId_idx" ON "public"."news_feed_permissions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "news_feed_permissions_newsFeedId_userId_key" ON "public"."news_feed_permissions"("newsFeedId", "userId");

-- AddForeignKey
ALTER TABLE "public"."news_feed_permissions" ADD CONSTRAINT "news_feed_permissions_newsFeedId_fkey" FOREIGN KEY ("newsFeedId") REFERENCES "public"."assistant_news_feeds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."news_feed_permissions" ADD CONSTRAINT "news_feed_permissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
