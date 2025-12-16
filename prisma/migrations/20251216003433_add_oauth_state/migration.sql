-- CreateTable
CREATE TABLE "public"."oauth_states" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "data" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "oauth_states_state_key" ON "public"."oauth_states"("state");

-- CreateIndex
CREATE INDEX "oauth_states_state_idx" ON "public"."oauth_states"("state");

-- CreateIndex
CREATE INDEX "oauth_states_expiresAt_idx" ON "public"."oauth_states"("expiresAt");

-- AddForeignKey
ALTER TABLE "public"."oauth_states" ADD CONSTRAINT "oauth_states_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
