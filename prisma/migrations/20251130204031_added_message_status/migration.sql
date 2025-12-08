-- CreateEnum
CREATE TYPE "public"."MessageStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "public"."assistant_user_chat_messages" ADD COLUMN     "status" "public"."MessageStatus" NOT NULL DEFAULT 'PENDING';
