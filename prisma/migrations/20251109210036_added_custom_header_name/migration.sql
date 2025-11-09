-- AlterTable
ALTER TABLE "public"."assistant_api_configurations" ADD COLUMN     "customHeaderName" VARCHAR(255),
ADD COLUMN     "schemaText" TEXT;

-- AlterTable
ALTER TABLE "public"."assistants" ALTER COLUMN "currency" SET DEFAULT 'chf';

-- AlterTable
ALTER TABLE "public"."usage_metrics" ALTER COLUMN "assistantId" DROP NOT NULL;
