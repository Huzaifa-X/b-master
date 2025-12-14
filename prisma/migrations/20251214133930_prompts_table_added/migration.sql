-- CreateTable
CREATE TABLE "public"."prompts" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "prompt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prompts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "prompts_name_key" ON "public"."prompts"("name");

-- CreateIndex
CREATE INDEX "prompts_name_idx" ON "public"."prompts"("name");
