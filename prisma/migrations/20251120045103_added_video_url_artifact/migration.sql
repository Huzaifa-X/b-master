-- AlterTable
ALTER TABLE "public"."assistant_artifacts" ADD COLUMN     "thumbnailUrl" TEXT,
ADD COLUMN     "videoMetadata" JSON,
ADD COLUMN     "videoUrl" TEXT;
