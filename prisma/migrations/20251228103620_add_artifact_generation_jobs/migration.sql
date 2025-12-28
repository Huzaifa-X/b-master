-- CreateTable
CREATE TABLE "public"."artifact_generation_jobs" (
    "id" TEXT NOT NULL,
    "artifactId" INTEGER NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "result" TEXT,
    "error" TEXT,
    "metadata" JSON,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "artifact_generation_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "artifact_generation_jobs_artifactId_idx" ON "public"."artifact_generation_jobs"("artifactId");

-- CreateIndex
CREATE INDEX "artifact_generation_jobs_status_idx" ON "public"."artifact_generation_jobs"("status");

-- CreateIndex
CREATE INDEX "artifact_generation_jobs_createdAt_idx" ON "public"."artifact_generation_jobs"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."artifact_generation_jobs" ADD CONSTRAINT "artifact_generation_jobs_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "public"."assistant_artifacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
