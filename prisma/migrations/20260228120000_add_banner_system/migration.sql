-- CreateEnum
CREATE TYPE "BannerType" AS ENUM ('INFO', 'WARNING', 'PROMO', 'ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "BannerAudience" AS ENUM ('ALL', 'FREE_USERS', 'PAID_USERS', 'SPECIFIC_PLANS');

-- CreateTable
CREATE TABLE "banners" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "buttonText" VARCHAR(100),
    "buttonUrl" VARCHAR(500),
    "type" "BannerType" NOT NULL DEFAULT 'INFO',
    "targetAudience" "BannerAudience" NOT NULL DEFAULT 'ALL',
    "targetPlanIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_dismissed_banners" (
    "id" SERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "visitorId" VARCHAR(255),
    "bannerId" INTEGER NOT NULL,
    "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_dismissed_banners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "banners_isActive_idx" ON "banners"("isActive");

-- CreateIndex
CREATE INDEX "banners_targetAudience_idx" ON "banners"("targetAudience");

-- CreateIndex
CREATE INDEX "banners_startDate_endDate_idx" ON "banners"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "user_dismissed_banners_userId_idx" ON "user_dismissed_banners"("userId");

-- CreateIndex
CREATE INDEX "user_dismissed_banners_visitorId_idx" ON "user_dismissed_banners"("visitorId");

-- CreateIndex
CREATE INDEX "user_dismissed_banners_bannerId_idx" ON "user_dismissed_banners"("bannerId");

-- CreateIndex
CREATE UNIQUE INDEX "user_dismissed_banners_userId_bannerId_key" ON "user_dismissed_banners"("userId", "bannerId");

-- AddForeignKey
ALTER TABLE "user_dismissed_banners" ADD CONSTRAINT "user_dismissed_banners_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "banners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
