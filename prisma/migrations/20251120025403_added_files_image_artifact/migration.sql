-- AlterTable
ALTER TABLE "public"."assistant_artifacts" ADD COLUMN     "files" JSON,
ADD COLUMN     "images" JSON;
