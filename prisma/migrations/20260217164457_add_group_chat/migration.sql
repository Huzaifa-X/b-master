-- CreateTable
CREATE TABLE "public"."assistant_group_chats" (
    "id" SERIAL NOT NULL,
    "assistantId" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" VARCHAR(500),
    "avatarUrl" VARCHAR(255),
    "createdById" BIGINT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastMessageAt" TIMESTAMP(3),
    "lastMessageId" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "assistant_group_chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assistant_group_chat_members" (
    "id" SERIAL NOT NULL,
    "groupChatId" INTEGER NOT NULL,
    "userId" BIGINT NOT NULL,
    "role" VARCHAR(20) NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "assistant_group_chat_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assistant_group_chat_messages" (
    "id" BIGSERIAL NOT NULL,
    "groupChatId" INTEGER NOT NULL,
    "assistantId" BIGINT NOT NULL,
    "senderId" BIGINT NOT NULL,
    "message" TEXT NOT NULL,
    "messageType" VARCHAR(50) NOT NULL DEFAULT 'text',
    "attachmentUrl" VARCHAR(255),
    "attachmentName" VARCHAR(255),
    "attachmentSize" BIGINT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistant_group_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assistant_group_chats_assistantId_idx" ON "public"."assistant_group_chats"("assistantId");

-- CreateIndex
CREATE INDEX "assistant_group_chats_createdById_idx" ON "public"."assistant_group_chats"("createdById");

-- CreateIndex
CREATE INDEX "assistant_group_chats_lastMessageAt_idx" ON "public"."assistant_group_chats"("lastMessageAt");

-- CreateIndex
CREATE INDEX "assistant_group_chat_members_groupChatId_idx" ON "public"."assistant_group_chat_members"("groupChatId");

-- CreateIndex
CREATE INDEX "assistant_group_chat_members_userId_idx" ON "public"."assistant_group_chat_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_group_chat_members_groupChatId_userId_key" ON "public"."assistant_group_chat_members"("groupChatId", "userId");

-- CreateIndex
CREATE INDEX "assistant_group_chat_messages_groupChatId_idx" ON "public"."assistant_group_chat_messages"("groupChatId");

-- CreateIndex
CREATE INDEX "assistant_group_chat_messages_assistantId_idx" ON "public"."assistant_group_chat_messages"("assistantId");

-- CreateIndex
CREATE INDEX "assistant_group_chat_messages_senderId_idx" ON "public"."assistant_group_chat_messages"("senderId");

-- CreateIndex
CREATE INDEX "assistant_group_chat_messages_createdAt_idx" ON "public"."assistant_group_chat_messages"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."assistant_group_chats" ADD CONSTRAINT "assistant_group_chats_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "public"."assistants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assistant_group_chats" ADD CONSTRAINT "assistant_group_chats_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assistant_group_chat_members" ADD CONSTRAINT "assistant_group_chat_members_groupChatId_fkey" FOREIGN KEY ("groupChatId") REFERENCES "public"."assistant_group_chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assistant_group_chat_members" ADD CONSTRAINT "assistant_group_chat_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assistant_group_chat_messages" ADD CONSTRAINT "assistant_group_chat_messages_groupChatId_fkey" FOREIGN KEY ("groupChatId") REFERENCES "public"."assistant_group_chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assistant_group_chat_messages" ADD CONSTRAINT "assistant_group_chat_messages_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "public"."assistants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assistant_group_chat_messages" ADD CONSTRAINT "assistant_group_chat_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
