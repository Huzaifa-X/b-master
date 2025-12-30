/*
  Warnings:

  - You are about to drop the `dropbox_chat_usages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `dropbox_connectors` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."ConnectorProvider" AS ENUM ('DROPBOX', 'GOOGLE');

-- DropForeignKey
ALTER TABLE "public"."dropbox_chat_usages" DROP CONSTRAINT "dropbox_chat_usages_assistantUserChatId_fkey";

-- DropForeignKey
ALTER TABLE "public"."dropbox_chat_usages" DROP CONSTRAINT "dropbox_chat_usages_dropboxConnectorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."dropbox_connectors" DROP CONSTRAINT "dropbox_connectors_assistantId_fkey";

-- DropForeignKey
ALTER TABLE "public"."dropbox_connectors" DROP CONSTRAINT "dropbox_connectors_userId_fkey";

-- DropTable
DROP TABLE "public"."dropbox_chat_usages";

-- DropTable
DROP TABLE "public"."dropbox_connectors";

-- CreateTable
CREATE TABLE "public"."connectors" (
    "id" SERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "assistantId" BIGINT,
    "provider" "public"."ConnectorProvider" NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpiry" TIMESTAMP(3) NOT NULL,
    "providerAccountId" VARCHAR(255),
    "providerEmail" VARCHAR(255),
    "scopes" JSONB NOT NULL DEFAULT '[]',
    "status" "public"."ConnectorStatus" NOT NULL DEFAULT 'PENDING',
    "requireApproval" VARCHAR(50) NOT NULL DEFAULT 'never',
    "autoRefresh" BOOLEAN NOT NULL DEFAULT true,
    "config" JSON,
    "metadata" JSON,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "connectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."connector_chat_usages" (
    "id" SERIAL NOT NULL,
    "connectorId" INTEGER NOT NULL,
    "assistantUserChatId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connector_chat_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "connectors_userId_idx" ON "public"."connectors"("userId");

-- CreateIndex
CREATE INDEX "connectors_assistantId_idx" ON "public"."connectors"("assistantId");

-- CreateIndex
CREATE INDEX "connectors_provider_idx" ON "public"."connectors"("provider");

-- CreateIndex
CREATE INDEX "connectors_status_idx" ON "public"."connectors"("status");

-- CreateIndex
CREATE UNIQUE INDEX "connectors_userId_assistantId_provider_key" ON "public"."connectors"("userId", "assistantId", "provider");

-- CreateIndex
CREATE INDEX "connector_chat_usages_connectorId_idx" ON "public"."connector_chat_usages"("connectorId");

-- CreateIndex
CREATE INDEX "connector_chat_usages_assistantUserChatId_idx" ON "public"."connector_chat_usages"("assistantUserChatId");

-- CreateIndex
CREATE UNIQUE INDEX "connector_chat_usages_connectorId_assistantUserChatId_key" ON "public"."connector_chat_usages"("connectorId", "assistantUserChatId");

-- CreateIndex
CREATE INDEX "assistant_artifacts_category_idx" ON "public"."assistant_artifacts"("category");

-- AddForeignKey
ALTER TABLE "public"."connectors" ADD CONSTRAINT "connectors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."connectors" ADD CONSTRAINT "connectors_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "public"."assistants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."connector_chat_usages" ADD CONSTRAINT "connector_chat_usages_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "public"."connectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."connector_chat_usages" ADD CONSTRAINT "connector_chat_usages_assistantUserChatId_fkey" FOREIGN KEY ("assistantUserChatId") REFERENCES "public"."assistant_user_chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;
