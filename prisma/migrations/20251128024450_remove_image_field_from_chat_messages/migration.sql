/*
  Warnings:

  - You are about to drop the column `image` on the `assistant_user_chat_messages` table. All the data in the column will be lost.
  - Added the required column `chatType` to the `assistant_user_chats` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."ChatType" AS ENUM ('ASSISTANT', 'ASK_B');

-- AlterTable
ALTER TABLE "public"."assistant_user_chat_messages" DROP COLUMN "image";

-- AlterTable
ALTER TABLE "public"."assistant_user_chats" ADD COLUMN     "chatType" TEXT NOT NULL,
ALTER COLUMN "assistantId" DROP NOT NULL;
