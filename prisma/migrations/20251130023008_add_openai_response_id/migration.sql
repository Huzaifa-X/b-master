-- AlterTable
ALTER TABLE "public"."assistant_user_chat_messages" ADD COLUMN     "hasImages" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "openaiResponseId" VARCHAR(255);
