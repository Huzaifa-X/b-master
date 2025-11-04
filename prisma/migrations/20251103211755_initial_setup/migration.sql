-- CreateEnum
CREATE TYPE "public"."AssistantCategory" AS ENUM ('EDUCATION', 'TRAVELLING', 'PROGRAMMING', 'MARKETING', 'ANALYSIS', 'BOOKING', 'OTHER');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(255),
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255),
    "image" VARCHAR(255),
    "otp" VARCHAR(255),
    "otpExpiresAt" TIMESTAMP(3),
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "dateOfBirth" DATE,
    "organization" VARCHAR(255),
    "stripeAccountId" VARCHAR(255),
    "feePeriodEnd" DATE,
    "totalBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "role" VARCHAR(255) NOT NULL DEFAULT 'user',
    "gender" VARCHAR(255),
    "googleId" VARCHAR(255),
    "loginType" VARCHAR(20) NOT NULL DEFAULT 'email',
    "status" VARCHAR(255) NOT NULL DEFAULT 'active',
    "contactRole" VARCHAR(255),
    "address" TEXT,
    "passwordResetToken" VARCHAR(255),
    "passwordResetExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."auth_tokens" (
    "id" SERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "token" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."plans" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "period" VARCHAR(50) NOT NULL DEFAULT 'monthly',
    "features" JSONB NOT NULL DEFAULT '[]',
    "amount" DECIMAL(10,2) NOT NULL,
    "stripeProductId" VARCHAR(255),
    "stripePriceId" VARCHAR(255),
    "assistantLimit" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."subscriptions" (
    "id" SERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "planId" INTEGER NOT NULL,
    "stripeSubscriptionId" VARCHAR(255),
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "trialStart" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invoices" (
    "id" SERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "subscriptionId" INTEGER,
    "stripeInvoiceId" VARCHAR(255),
    "stripePaymentIntentId" VARCHAR(255),
    "invoiceNumber" VARCHAR(255) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "billingDetails" JSONB NOT NULL DEFAULT '{}',
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_wallets" (
    "id" SERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "pendingAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "availableAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "totalEarnings" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "transferredAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "user_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assistants" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "priceType" VARCHAR(255) NOT NULL DEFAULT 'paid',
    "category" "public"."AssistantCategory" NOT NULL DEFAULT 'OTHER',
    "description" TEXT,
    "instructions" TEXT,
    "image" VARCHAR(255),
    "vectorStoreId" VARCHAR(255),
    "public" BOOLEAN NOT NULL DEFAULT true,
    "specialAssistant" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "assistants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assistant_knowledgebases" (
    "id" SERIAL NOT NULL,
    "assistantId" BIGINT NOT NULL,
    "name" VARCHAR(255),
    "url" TEXT,
    "note" TEXT,
    "file" TEXT,
    "fileId" TEXT,
    "type" VARCHAR(50) NOT NULL DEFAULT 'url',
    "isCrawled" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistant_knowledgebases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assistant_api_configurations" (
    "id" SERIAL NOT NULL,
    "assistantId" BIGINT NOT NULL,
    "authenticationType" VARCHAR(50) NOT NULL DEFAULT 'none',
    "apiKey" TEXT,
    "authType" VARCHAR(50),
    "clientId" VARCHAR(255),
    "clientSecret" TEXT,
    "authorizationUrl" TEXT,
    "tokenUrl" TEXT,
    "scope" TEXT,
    "tokenExchangeMethod" VARCHAR(50),
    "schema" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistant_api_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assistant_pins" (
    "id" SERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "assistantId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistant_pins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."usage_metrics" (
    "id" BIGSERIAL NOT NULL,
    "assistantId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "inputToken" INTEGER NOT NULL DEFAULT 0,
    "outputToken" INTEGER NOT NULL DEFAULT 0,
    "totalToken" INTEGER NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "toolUsing" TEXT,
    "costType" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assistant_purchases" (
    "id" SERIAL NOT NULL,
    "buyerId" BIGINT NOT NULL,
    "assistantId" BIGINT NOT NULL,
    "transactionId" INTEGER,
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "stripePaymentIntentId" VARCHAR(255),
    "stripeCheckoutSessionId" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "assistant_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assistant_transactions" (
    "id" SERIAL NOT NULL,
    "assistantOwnerId" BIGINT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "type" VARCHAR(50) NOT NULL DEFAULT 'sale',
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "stripeTransactionId" VARCHAR(255),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistant_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assistant_user_chats" (
    "id" SERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "assistantId" BIGINT NOT NULL,
    "shareableId" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "assistant_user_chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assistant_user_chat_messages" (
    "id" SERIAL NOT NULL,
    "role" VARCHAR(50) NOT NULL,
    "message" TEXT,
    "image" VARCHAR(255),
    "documents" TEXT,
    "audio" VARCHAR(255),
    "assistantUserChatId" INTEGER NOT NULL,
    "assistantId" BIGINT NOT NULL,
    "userId" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistant_user_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assistant_chats" (
    "id" SERIAL NOT NULL,
    "assistantId" BIGINT NOT NULL,
    "initiatorId" BIGINT NOT NULL,
    "participantId" BIGINT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastMessageAt" TIMESTAMP(3),
    "lastMessageId" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "assistant_chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assistant_chat_messages" (
    "id" BIGSERIAL NOT NULL,
    "assistantChatId" INTEGER NOT NULL,
    "assistantId" BIGINT NOT NULL,
    "senderId" BIGINT NOT NULL,
    "message" TEXT NOT NULL,
    "messageType" VARCHAR(50) NOT NULL DEFAULT 'text',
    "attachmentUrl" VARCHAR(255),
    "attachmentName" VARCHAR(255),
    "attachmentSize" BIGINT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistant_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assistant_news_feeds" (
    "id" SERIAL NOT NULL,
    "assistantId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "content" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistant_news_feeds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assistant_news_feed_likes" (
    "id" SERIAL NOT NULL,
    "newsFeedId" INTEGER NOT NULL,
    "userId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistant_news_feed_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assistant_news_feed_comments" (
    "id" SERIAL NOT NULL,
    "newsFeedId" INTEGER NOT NULL,
    "userId" BIGINT NOT NULL,
    "comment" TEXT,
    "parentCommentId" INTEGER,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistant_news_feed_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assistant_artifacts" (
    "id" SERIAL NOT NULL,
    "assistantId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "name" VARCHAR(255),
    "instructions" TEXT,
    "category" VARCHAR(255),
    "code" TEXT,
    "files" TEXT,
    "contacts" TEXT,
    "apiKeys" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistant_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."artifact_permissions" (
    "id" SERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "assistantId" BIGINT NOT NULL,
    "artifactId" INTEGER NOT NULL,
    "access" VARCHAR(50) NOT NULL DEFAULT 'viewer',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "artifact_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assistant_user_permissions" (
    "id" SERIAL NOT NULL,
    "assistantId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "access" VARCHAR(50) NOT NULL DEFAULT 'admin',
    "permissions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistant_user_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assistant_contacts" (
    "id" BIGSERIAL NOT NULL,
    "assistantId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistant_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" SERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "title" VARCHAR(255),
    "message" TEXT,
    "type" VARCHAR(100),
    "relatedId" INTEGER,
    "relatedType" VARCHAR(100),
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "public"."users"("googleId");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_googleId_idx" ON "public"."users"("googleId");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "public"."users"("status");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "public"."users"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "auth_tokens_token_key" ON "public"."auth_tokens"("token");

-- CreateIndex
CREATE INDEX "auth_tokens_userId_idx" ON "public"."auth_tokens"("userId");

-- CreateIndex
CREATE INDEX "auth_tokens_token_idx" ON "public"."auth_tokens"("token");

-- CreateIndex
CREATE INDEX "plans_period_idx" ON "public"."plans"("period");

-- CreateIndex
CREATE INDEX "plans_isActive_idx" ON "public"."plans"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripeSubscriptionId_key" ON "public"."subscriptions"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "subscriptions_userId_idx" ON "public"."subscriptions"("userId");

-- CreateIndex
CREATE INDEX "subscriptions_planId_idx" ON "public"."subscriptions"("planId");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "public"."subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_currentPeriodEnd_idx" ON "public"."subscriptions"("currentPeriodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_stripeInvoiceId_key" ON "public"."invoices"("stripeInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_stripePaymentIntentId_key" ON "public"."invoices"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "public"."invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoices_userId_idx" ON "public"."invoices"("userId");

-- CreateIndex
CREATE INDEX "invoices_subscriptionId_idx" ON "public"."invoices"("subscriptionId");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "public"."invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_invoiceDate_idx" ON "public"."invoices"("invoiceDate");

-- CreateIndex
CREATE INDEX "invoices_stripeInvoiceId_idx" ON "public"."invoices"("stripeInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "user_wallets_userId_key" ON "public"."user_wallets"("userId");

-- CreateIndex
CREATE INDEX "user_wallets_userId_idx" ON "public"."user_wallets"("userId");

-- CreateIndex
CREATE INDEX "user_wallets_lastUpdated_idx" ON "public"."user_wallets"("lastUpdated");

-- CreateIndex
CREATE INDEX "assistants_userId_idx" ON "public"."assistants"("userId");

-- CreateIndex
CREATE INDEX "assistants_public_idx" ON "public"."assistants"("public");

-- CreateIndex
CREATE INDEX "assistants_specialAssistant_idx" ON "public"."assistants"("specialAssistant");

-- CreateIndex
CREATE INDEX "assistants_category_idx" ON "public"."assistants"("category");

-- CreateIndex
CREATE INDEX "assistants_deletedAt_idx" ON "public"."assistants"("deletedAt");

-- CreateIndex
CREATE INDEX "assistant_knowledgebases_assistantId_idx" ON "public"."assistant_knowledgebases"("assistantId");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_api_configurations_assistantId_key" ON "public"."assistant_api_configurations"("assistantId");

-- CreateIndex
CREATE INDEX "assistant_api_configurations_assistantId_idx" ON "public"."assistant_api_configurations"("assistantId");

-- CreateIndex
CREATE INDEX "assistant_pins_userId_idx" ON "public"."assistant_pins"("userId");

-- CreateIndex
CREATE INDEX "assistant_pins_assistantId_idx" ON "public"."assistant_pins"("assistantId");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_pins_userId_assistantId_key" ON "public"."assistant_pins"("userId", "assistantId");

-- CreateIndex
CREATE INDEX "usage_metrics_assistantId_idx" ON "public"."usage_metrics"("assistantId");

-- CreateIndex
CREATE INDEX "usage_metrics_userId_idx" ON "public"."usage_metrics"("userId");

-- CreateIndex
CREATE INDEX "usage_metrics_createdAt_idx" ON "public"."usage_metrics"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_purchases_stripePaymentIntentId_key" ON "public"."assistant_purchases"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_purchases_stripeCheckoutSessionId_key" ON "public"."assistant_purchases"("stripeCheckoutSessionId");

-- CreateIndex
CREATE INDEX "assistant_purchases_buyerId_idx" ON "public"."assistant_purchases"("buyerId");

-- CreateIndex
CREATE INDEX "assistant_purchases_assistantId_idx" ON "public"."assistant_purchases"("assistantId");

-- CreateIndex
CREATE INDEX "assistant_purchases_status_idx" ON "public"."assistant_purchases"("status");

-- CreateIndex
CREATE INDEX "assistant_purchases_purchaseDate_idx" ON "public"."assistant_purchases"("purchaseDate");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_purchases_buyerId_assistantId_key" ON "public"."assistant_purchases"("buyerId", "assistantId");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_transactions_stripeTransactionId_key" ON "public"."assistant_transactions"("stripeTransactionId");

-- CreateIndex
CREATE INDEX "assistant_transactions_assistantOwnerId_idx" ON "public"."assistant_transactions"("assistantOwnerId");

-- CreateIndex
CREATE INDEX "assistant_transactions_status_idx" ON "public"."assistant_transactions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_user_chats_shareableId_key" ON "public"."assistant_user_chats"("shareableId");

-- CreateIndex
CREATE INDEX "assistant_user_chats_userId_idx" ON "public"."assistant_user_chats"("userId");

-- CreateIndex
CREATE INDEX "assistant_user_chats_assistantId_idx" ON "public"."assistant_user_chats"("assistantId");

-- CreateIndex
CREATE INDEX "assistant_user_chats_shareableId_idx" ON "public"."assistant_user_chats"("shareableId");

-- CreateIndex
CREATE INDEX "assistant_user_chat_messages_assistantUserChatId_idx" ON "public"."assistant_user_chat_messages"("assistantUserChatId");

-- CreateIndex
CREATE INDEX "assistant_user_chat_messages_assistantId_idx" ON "public"."assistant_user_chat_messages"("assistantId");

-- CreateIndex
CREATE INDEX "assistant_user_chat_messages_userId_idx" ON "public"."assistant_user_chat_messages"("userId");

-- CreateIndex
CREATE INDEX "assistant_chats_assistantId_initiatorId_idx" ON "public"."assistant_chats"("assistantId", "initiatorId");

-- CreateIndex
CREATE INDEX "assistant_chats_assistantId_participantId_idx" ON "public"."assistant_chats"("assistantId", "participantId");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_chats_assistantId_initiatorId_participantId_key" ON "public"."assistant_chats"("assistantId", "initiatorId", "participantId");

-- CreateIndex
CREATE INDEX "assistant_chat_messages_assistantChatId_idx" ON "public"."assistant_chat_messages"("assistantChatId");

-- CreateIndex
CREATE INDEX "assistant_chat_messages_assistantId_idx" ON "public"."assistant_chat_messages"("assistantId");

-- CreateIndex
CREATE INDEX "assistant_chat_messages_senderId_idx" ON "public"."assistant_chat_messages"("senderId");

-- CreateIndex
CREATE INDEX "assistant_chat_messages_createdAt_idx" ON "public"."assistant_chat_messages"("createdAt");

-- CreateIndex
CREATE INDEX "assistant_news_feeds_assistantId_idx" ON "public"."assistant_news_feeds"("assistantId");

-- CreateIndex
CREATE INDEX "assistant_news_feeds_userId_idx" ON "public"."assistant_news_feeds"("userId");

-- CreateIndex
CREATE INDEX "assistant_news_feeds_isPublic_idx" ON "public"."assistant_news_feeds"("isPublic");

-- CreateIndex
CREATE INDEX "assistant_news_feed_likes_newsFeedId_idx" ON "public"."assistant_news_feed_likes"("newsFeedId");

-- CreateIndex
CREATE INDEX "assistant_news_feed_likes_userId_idx" ON "public"."assistant_news_feed_likes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_news_feed_likes_newsFeedId_userId_key" ON "public"."assistant_news_feed_likes"("newsFeedId", "userId");

-- CreateIndex
CREATE INDEX "assistant_news_feed_comments_newsFeedId_idx" ON "public"."assistant_news_feed_comments"("newsFeedId");

-- CreateIndex
CREATE INDEX "assistant_news_feed_comments_userId_idx" ON "public"."assistant_news_feed_comments"("userId");

-- CreateIndex
CREATE INDEX "assistant_news_feed_comments_parentCommentId_idx" ON "public"."assistant_news_feed_comments"("parentCommentId");

-- CreateIndex
CREATE INDEX "assistant_artifacts_assistantId_idx" ON "public"."assistant_artifacts"("assistantId");

-- CreateIndex
CREATE INDEX "assistant_artifacts_userId_idx" ON "public"."assistant_artifacts"("userId");

-- CreateIndex
CREATE INDEX "artifact_permissions_userId_idx" ON "public"."artifact_permissions"("userId");

-- CreateIndex
CREATE INDEX "artifact_permissions_artifactId_idx" ON "public"."artifact_permissions"("artifactId");

-- CreateIndex
CREATE UNIQUE INDEX "artifact_permissions_userId_artifactId_key" ON "public"."artifact_permissions"("userId", "artifactId");

-- CreateIndex
CREATE INDEX "assistant_user_permissions_assistantId_idx" ON "public"."assistant_user_permissions"("assistantId");

-- CreateIndex
CREATE INDEX "assistant_user_permissions_userId_idx" ON "public"."assistant_user_permissions"("userId");

-- CreateIndex
CREATE INDEX "assistant_contacts_assistantId_idx" ON "public"."assistant_contacts"("assistantId");

-- CreateIndex
CREATE INDEX "assistant_contacts_userId_idx" ON "public"."assistant_contacts"("userId");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "public"."notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "public"."notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_isRead_idx" ON "public"."notifications"("isRead");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "public"."notifications"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_relatedId_relatedType_idx" ON "public"."notifications"("relatedId", "relatedType");

-- AddForeignKey
ALTER TABLE "public"."auth_tokens" ADD CONSTRAINT "auth_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "public"."subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_wallets" ADD CONSTRAINT "user_wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assistants" ADD CONSTRAINT "assistants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assistant_knowledgebases" ADD CONSTRAINT "assistant_knowledgebases_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "public"."assistants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assistant_api_configurations" ADD CONSTRAINT "assistant_api_configurations_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "public"."assistants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assistant_pins" ADD CONSTRAINT "assistant_pins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assistant_pins" ADD CONSTRAINT "assistant_pins_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "public"."assistants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."usage_metrics" ADD CONSTRAINT "usage_metrics_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "public"."assistants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."usage_metrics" ADD CONSTRAINT "usage_metrics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assistant_purchases" ADD CONSTRAINT "assistant_purchases_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assistant_purchases" ADD CONSTRAINT "assistant_purchases_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "public"."assistants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assistant_purchases" ADD CONSTRAINT "assistant_purchases_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "public"."assistant_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assistant_transactions" ADD CONSTRAINT "assistant_transactions_assistantOwnerId_fkey" FOREIGN KEY ("assistantOwnerId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assistant_user_chats" ADD CONSTRAINT "assistant_user_chats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assistant_user_chats" ADD CONSTRAINT "assistant_user_chats_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "public"."assistants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assistant_user_chat_messages" ADD CONSTRAINT "assistant_user_chat_messages_assistantUserChatId_fkey" FOREIGN KEY ("assistantUserChatId") REFERENCES "public"."assistant_user_chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assistant_user_chat_messages" ADD CONSTRAINT "assistant_user_chat_messages_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "public"."assistants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assistant_user_chat_messages" ADD CONSTRAINT "assistant_user_chat_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assistant_chats" ADD CONSTRAINT "assistant_chats_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "public"."assistants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assistant_chats" ADD CONSTRAINT "assistant_chats_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assistant_chats" ADD CONSTRAINT "assistant_chats_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assistant_chat_messages" ADD CONSTRAINT "assistant_chat_messages_assistantChatId_fkey" FOREIGN KEY ("assistantChatId") REFERENCES "public"."assistant_chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assistant_chat_messages" ADD CONSTRAINT "assistant_chat_messages_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "public"."assistants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assistant_chat_messages" ADD CONSTRAINT "assistant_chat_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assistant_news_feeds" ADD CONSTRAINT "assistant_news_feeds_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "public"."assistants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assistant_news_feeds" ADD CONSTRAINT "assistant_news_feeds_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assistant_news_feed_likes" ADD CONSTRAINT "assistant_news_feed_likes_newsFeedId_fkey" FOREIGN KEY ("newsFeedId") REFERENCES "public"."assistant_news_feeds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assistant_news_feed_likes" ADD CONSTRAINT "assistant_news_feed_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assistant_news_feed_comments" ADD CONSTRAINT "assistant_news_feed_comments_newsFeedId_fkey" FOREIGN KEY ("newsFeedId") REFERENCES "public"."assistant_news_feeds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assistant_news_feed_comments" ADD CONSTRAINT "assistant_news_feed_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assistant_news_feed_comments" ADD CONSTRAINT "assistant_news_feed_comments_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "public"."assistant_news_feed_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assistant_artifacts" ADD CONSTRAINT "assistant_artifacts_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "public"."assistants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assistant_artifacts" ADD CONSTRAINT "assistant_artifacts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."artifact_permissions" ADD CONSTRAINT "artifact_permissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."artifact_permissions" ADD CONSTRAINT "artifact_permissions_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "public"."assistants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."artifact_permissions" ADD CONSTRAINT "artifact_permissions_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "public"."assistant_artifacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assistant_user_permissions" ADD CONSTRAINT "assistant_user_permissions_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "public"."assistants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assistant_user_permissions" ADD CONSTRAINT "assistant_user_permissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assistant_contacts" ADD CONSTRAINT "assistant_contacts_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "public"."assistants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assistant_contacts" ADD CONSTRAINT "assistant_contacts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
