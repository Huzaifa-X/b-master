-- Add emailVisible column to users table
-- Defaults to FALSE (private by default — users must opt in to be discoverable)
ALTER TABLE "public"."users" ADD COLUMN "email_visible" BOOLEAN NOT NULL DEFAULT false;
