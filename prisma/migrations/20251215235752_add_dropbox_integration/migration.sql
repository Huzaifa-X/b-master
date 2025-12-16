-- CreateEnum
CREATE TYPE "public"."ConnectorStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED', 'ERROR', 'DISABLED');

-- CreateTable
CREATE TABLE "public"."dropbox_connectors" (
    "id" SERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "assistantId" BIGINT,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpiry" TIMESTAMP(3) NOT NULL,
    "accountId" VARCHAR(255),
    "accountEmail" VARCHAR(255),
    "status" "public"."ConnectorStatus" NOT NULL DEFAULT 'PENDING',
    "requireApproval" VARCHAR(50) NOT NULL DEFAULT 'never',
    "autoRefresh" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSON,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "dropbox_connectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."dropbox_chat_usages" (
    "id" SERIAL NOT NULL,
    "dropboxConnectorId" INTEGER NOT NULL,
    "assistantUserChatId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dropbox_chat_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dropbox_connectors_userId_idx" ON "public"."dropbox_connectors"("userId");

-- CreateIndex
CREATE INDEX "dropbox_connectors_assistantId_idx" ON "public"."dropbox_connectors"("assistantId");

-- CreateIndex
CREATE INDEX "dropbox_connectors_status_idx" ON "public"."dropbox_connectors"("status");

-- CreateIndex
CREATE UNIQUE INDEX "dropbox_connectors_userId_assistantId_key" ON "public"."dropbox_connectors"("userId", "assistantId");

-- CreateIndex
CREATE INDEX "dropbox_chat_usages_dropboxConnectorId_idx" ON "public"."dropbox_chat_usages"("dropboxConnectorId");

-- CreateIndex
CREATE INDEX "dropbox_chat_usages_assistantUserChatId_idx" ON "public"."dropbox_chat_usages"("assistantUserChatId");

-- CreateIndex
CREATE UNIQUE INDEX "dropbox_chat_usages_dropboxConnectorId_assistantUserChatId_key" ON "public"."dropbox_chat_usages"("dropboxConnectorId", "assistantUserChatId");

-- AddForeignKey
ALTER TABLE "public"."dropbox_connectors" ADD CONSTRAINT "dropbox_connectors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dropbox_connectors" ADD CONSTRAINT "dropbox_connectors_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "public"."assistants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dropbox_chat_usages" ADD CONSTRAINT "dropbox_chat_usages_dropboxConnectorId_fkey" FOREIGN KEY ("dropboxConnectorId") REFERENCES "public"."dropbox_connectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dropbox_chat_usages" ADD CONSTRAINT "dropbox_chat_usages_assistantUserChatId_fkey" FOREIGN KEY ("assistantUserChatId") REFERENCES "public"."assistant_user_chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;
