-- Add missing columns to assistant_chats table
ALTER TABLE "assistant_chats" ADD COLUMN IF NOT EXISTS "groupName" VARCHAR(255);
ALTER TABLE "assistant_chats" ADD COLUMN IF NOT EXISTS "isGroup" BOOLEAN NOT NULL DEFAULT false;

-- Create index on isGroup
CREATE INDEX IF NOT EXISTS "assistant_chats_isGroup_idx" ON "assistant_chats"("isGroup");
