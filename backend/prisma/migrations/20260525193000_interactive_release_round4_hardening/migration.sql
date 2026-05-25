-- Fourth-round interactive release hardening:
-- 1. explicit unlock policy
-- 2. published snapshot/version isolation
-- 3. structured idempotency scope for interactive flows

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'InteractiveUnlockPolicy'
  ) THEN
    CREATE TYPE "InteractiveUnlockPolicy" AS ENUM (
      'FREE',
      'PREMIUM_ONLY',
      'TOKENS_ONLY',
      'PREMIUM_OR_TOKENS',
      'PREMIUM_AND_TOKENS'
    );
  END IF;
END $$;

ALTER TABLE "interactive_stories"
ADD COLUMN IF NOT EXISTS "publishedVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "publishedSnapshot" JSONB,
ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);

ALTER TABLE "interactive_story_choices"
ADD COLUMN IF NOT EXISTS "unlockPolicy" "InteractiveUnlockPolicy" NOT NULL DEFAULT 'FREE';

UPDATE "interactive_story_choices"
SET "unlockPolicy" = CASE
  WHEN COALESCE("requiresPremium", false) = true AND COALESCE("requiresTokens", 0) > 0 THEN 'PREMIUM_OR_TOKENS'::"InteractiveUnlockPolicy"
  WHEN COALESCE("requiresPremium", false) = true THEN 'PREMIUM_ONLY'::"InteractiveUnlockPolicy"
  WHEN COALESCE("requiresTokens", 0) > 0 THEN 'TOKENS_ONLY'::"InteractiveUnlockPolicy"
  ELSE 'FREE'::"InteractiveUnlockPolicy"
END
WHERE "unlockPolicy" = 'FREE'::"InteractiveUnlockPolicy";

ALTER TABLE "idempotency_keys"
ADD COLUMN IF NOT EXISTS "userId" TEXT,
ADD COLUMN IF NOT EXISTS "operation" TEXT,
ADD COLUMN IF NOT EXISTS "storyId" TEXT,
ADD COLUMN IF NOT EXISTS "fromNodeId" TEXT,
ADD COLUMN IF NOT EXISTS "choiceId" TEXT,
ADD COLUMN IF NOT EXISTS "requestKey" TEXT,
ADD COLUMN IF NOT EXISTS "state" TEXT NOT NULL DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS "status" INTEGER,
ADD COLUMN IF NOT EXISTS "body" JSONB;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'idempotency_keys_userId_key_key'
  ) THEN
    ALTER TABLE "idempotency_keys"
    ADD CONSTRAINT "idempotency_keys_userId_key_key" UNIQUE ("userId", "key");
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "idempotency_keys_operation_userId_storyId_fromNodeId_choiceId_requestKey_key"
ON "idempotency_keys" ("operation", "userId", "storyId", "fromNodeId", "choiceId", "requestKey");

CREATE INDEX IF NOT EXISTS "idempotency_keys_operation_userId_storyId_fromNodeId_choiceId_idx"
ON "idempotency_keys" ("operation", "userId", "storyId", "fromNodeId", "choiceId");
