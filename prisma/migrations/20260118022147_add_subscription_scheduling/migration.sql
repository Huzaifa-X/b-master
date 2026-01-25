-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "cancel_at_period_end" BOOLEAN DEFAULT false,
ADD COLUMN     "scheduled_plan_change_id" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_scheduled_plan_change_id_fkey" FOREIGN KEY ("scheduled_plan_change_id") REFERENCES "public"."plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
