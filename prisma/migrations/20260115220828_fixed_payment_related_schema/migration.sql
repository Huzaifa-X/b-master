/*
  Warnings:

  - You are about to drop the column `deletedAt` on the `assistant_purchases` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `assistant_purchases` table. All the data in the column will be lost.
  - You are about to drop the column `stripeCheckoutSessionId` on the `assistant_purchases` table. All the data in the column will be lost.
  - You are about to drop the column `stripePaymentIntentId` on the `assistant_purchases` table. All the data in the column will be lost.
  - You are about to drop the column `transactionId` on the `assistant_purchases` table. All the data in the column will be lost.
  - You are about to alter the column `currency` on the `assistants` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(3)`.
  - You are about to drop the column `feePeriodEnd` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `stripeAccountId` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `totalBalance` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `assistant_transactions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `invoices` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `subscriptions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_wallets` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[stripeCustomerId]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeSubscriptionId]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeConnectAccountId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."assistant_purchases" DROP CONSTRAINT "assistant_purchases_transactionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."assistant_transactions" DROP CONSTRAINT "assistant_transactions_assistantOwnerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."invoices" DROP CONSTRAINT "invoices_subscriptionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."invoices" DROP CONSTRAINT "invoices_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."subscriptions" DROP CONSTRAINT "subscriptions_planId_fkey";

-- DropForeignKey
ALTER TABLE "public"."subscriptions" DROP CONSTRAINT "subscriptions_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_wallets" DROP CONSTRAINT "user_wallets_userId_fkey";

-- DropIndex
DROP INDEX "public"."assistant_purchases_purchaseDate_idx";

-- DropIndex
DROP INDEX "public"."assistant_purchases_status_idx";

-- DropIndex
DROP INDEX "public"."assistant_purchases_stripeCheckoutSessionId_key";

-- DropIndex
DROP INDEX "public"."assistant_purchases_stripePaymentIntentId_key";

-- AlterTable
ALTER TABLE "public"."assistant_purchases" DROP COLUMN "deletedAt",
DROP COLUMN "status",
DROP COLUMN "stripeCheckoutSessionId",
DROP COLUMN "stripePaymentIntentId",
DROP COLUMN "transactionId",
ADD COLUMN     "paymentRecordId" BIGINT;

-- AlterTable
ALTER TABLE "public"."assistants" ALTER COLUMN "currency" SET DATA TYPE VARCHAR(3);

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "feePeriodEnd",
DROP COLUMN "stripeAccountId",
DROP COLUMN "totalBalance",
ADD COLUMN     "availableBalance" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "currency" VARCHAR(3) NOT NULL DEFAULT 'CHF',
ADD COLUMN     "currentPlanId" INTEGER,
ADD COLUMN     "lifetimeEarnings" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "pendingBalance" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "stripeConnectAccountId" VARCHAR(255),
ADD COLUMN     "stripeConnectOnboarded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripeConnectPayoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripeConnectStatus" VARCHAR(50),
ADD COLUMN     "stripeCustomerId" VARCHAR(255),
ADD COLUMN     "stripeSubscriptionId" VARCHAR(255),
ADD COLUMN     "subscriptionPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "subscriptionStatus" VARCHAR(50);

-- DropTable
DROP TABLE "public"."assistant_transactions";

-- DropTable
DROP TABLE "public"."invoices";

-- DropTable
DROP TABLE "public"."subscriptions";

-- DropTable
DROP TABLE "public"."user_wallets";

-- DropEnum
DROP TYPE "public"."ChatType";

-- CreateTable
CREATE TABLE "public"."payment_records" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "payerUserId" BIGINT,
    "type" VARCHAR(50) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'CHF',
    "platformFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(10,2) NOT NULL,
    "relatedType" VARCHAR(100),
    "relatedId" BIGINT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "stripePaymentIntentId" VARCHAR(255),
    "stripeChargeId" VARCHAR(255),
    "stripeCheckoutSessionId" VARCHAR(255),
    "stripeSubscriptionId" VARCHAR(255),
    "stripeInvoiceId" VARCHAR(255),
    "stripeTransferId" VARCHAR(255),
    "stripePayoutId" VARCHAR(255),
    "stripeRefundId" VARCHAR(255),
    "description" TEXT,
    "metadata" JSON,
    "completedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_records_stripePaymentIntentId_key" ON "public"."payment_records"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_records_stripeCheckoutSessionId_key" ON "public"."payment_records"("stripeCheckoutSessionId");

-- CreateIndex
CREATE INDEX "payment_records_userId_idx" ON "public"."payment_records"("userId");

-- CreateIndex
CREATE INDEX "payment_records_payerUserId_idx" ON "public"."payment_records"("payerUserId");

-- CreateIndex
CREATE INDEX "payment_records_type_idx" ON "public"."payment_records"("type");

-- CreateIndex
CREATE INDEX "payment_records_status_idx" ON "public"."payment_records"("status");

-- CreateIndex
CREATE INDEX "payment_records_relatedType_relatedId_idx" ON "public"."payment_records"("relatedType", "relatedId");

-- CreateIndex
CREATE INDEX "payment_records_stripePaymentIntentId_idx" ON "public"."payment_records"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "payment_records_stripeCheckoutSessionId_idx" ON "public"."payment_records"("stripeCheckoutSessionId");

-- CreateIndex
CREATE INDEX "payment_records_stripeSubscriptionId_idx" ON "public"."payment_records"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "payment_records_createdAt_idx" ON "public"."payment_records"("createdAt");

-- CreateIndex
CREATE INDEX "assistant_purchases_paymentRecordId_idx" ON "public"."assistant_purchases"("paymentRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripeCustomerId_key" ON "public"."users"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripeSubscriptionId_key" ON "public"."users"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripeConnectAccountId_key" ON "public"."users"("stripeConnectAccountId");

-- CreateIndex
CREATE INDEX "users_stripeCustomerId_idx" ON "public"."users"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "users_stripeConnectAccountId_idx" ON "public"."users"("stripeConnectAccountId");

-- CreateIndex
CREATE INDEX "users_currentPlanId_idx" ON "public"."users"("currentPlanId");

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_currentPlanId_fkey" FOREIGN KEY ("currentPlanId") REFERENCES "public"."plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payment_records" ADD CONSTRAINT "payment_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payment_records" ADD CONSTRAINT "payment_records_payerUserId_fkey" FOREIGN KEY ("payerUserId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assistant_purchases" ADD CONSTRAINT "assistant_purchases_paymentRecordId_fkey" FOREIGN KEY ("paymentRecordId") REFERENCES "public"."payment_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
