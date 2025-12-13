/*
  Warnings:

  - You are about to drop the column `code` on the `assistant_artifacts` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[shareableId]` on the table `assistant_artifacts` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."artifact_permissions" ADD COLUMN     "permissions" JSON;

-- AlterTable
ALTER TABLE "public"."assistant_artifacts" DROP COLUMN "code",
ADD COLUMN     "activeVersionId" INTEGER,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "shareableId" VARCHAR(255);

-- CreateTable
CREATE TABLE "public"."artifact_versions" (
    "id" SERIAL NOT NULL,
    "artifactId" INTEGER NOT NULL,
    "userId" BIGINT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "versionName" VARCHAR(255),
    "code" TEXT NOT NULL,
    "description" TEXT,
    "changeType" VARCHAR(50) NOT NULL DEFAULT 'manual',
    "changedFrom" INTEGER,
    "isSnapshot" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "artifact_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "artifact_versions_artifactId_idx" ON "public"."artifact_versions"("artifactId");

-- CreateIndex
CREATE INDEX "artifact_versions_userId_idx" ON "public"."artifact_versions"("userId");

-- CreateIndex
CREATE INDEX "artifact_versions_versionNumber_idx" ON "public"."artifact_versions"("versionNumber");

-- CreateIndex
CREATE INDEX "artifact_versions_createdAt_idx" ON "public"."artifact_versions"("createdAt");

-- CreateIndex
CREATE INDEX "artifact_versions_isSnapshot_idx" ON "public"."artifact_versions"("isSnapshot");

-- CreateIndex
CREATE UNIQUE INDEX "artifact_versions_artifactId_versionNumber_key" ON "public"."artifact_versions"("artifactId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_artifacts_shareableId_key" ON "public"."assistant_artifacts"("shareableId");

-- CreateIndex
CREATE INDEX "assistant_artifacts_activeVersionId_idx" ON "public"."assistant_artifacts"("activeVersionId");

-- CreateIndex
CREATE INDEX "assistant_artifacts_shareableId_idx" ON "public"."assistant_artifacts"("shareableId");

-- AddForeignKey
ALTER TABLE "public"."assistant_artifacts" ADD CONSTRAINT "assistant_artifacts_activeVersionId_fkey" FOREIGN KEY ("activeVersionId") REFERENCES "public"."artifact_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."artifact_versions" ADD CONSTRAINT "artifact_versions_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "public"."assistant_artifacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."artifact_versions" ADD CONSTRAINT "artifact_versions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
