-- Harden interactive story production constraints:
-- 1. authoritative content mode enum on story
-- 2. choice monetization metadata
-- 3. duplicate-submit support index

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'InteractiveContentMode'
  ) THEN
    CREATE TYPE "InteractiveContentMode" AS ENUM ('NORMAL', 'ADULT');
  END IF;
END $$;

ALTER TABLE "interactive_stories"
ADD COLUMN IF NOT EXISTS "contentMode" "InteractiveContentMode";

ALTER TABLE "interactive_stories"
ADD COLUMN IF NOT EXISTS "targetAudience" TEXT DEFAULT 'US teens';

UPDATE "interactive_stories"
SET "contentMode" = CASE
  WHEN UPPER(COALESCE("contentMode"::text, '')) = 'ADULT' THEN 'ADULT'::"InteractiveContentMode"
  WHEN EXISTS (
    SELECT 1
    FROM "series"
    WHERE "series"."id" = "interactive_stories"."seriesId"
      AND "series"."adult" = true
  ) THEN 'ADULT'::"InteractiveContentMode"
  ELSE 'NORMAL'::"InteractiveContentMode"
END
WHERE "contentMode" IS NULL
   OR "contentMode"::text NOT IN ('NORMAL', 'ADULT');

ALTER TABLE "interactive_stories"
ALTER COLUMN "contentMode" SET DEFAULT 'NORMAL';

ALTER TABLE "interactive_stories"
ALTER COLUMN "contentMode" SET NOT NULL;

ALTER TABLE "interactive_story_choices"
ADD COLUMN IF NOT EXISTS "requiresPremium" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "requiresTokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "unlockLabel" TEXT;

ALTER TABLE "interactive_story_nodes"
ADD COLUMN IF NOT EXISTS "generatedByAI" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "reviewStatus" TEXT NOT NULL DEFAULT 'approved',
ADD COLUMN IF NOT EXISTS "editorNotes" TEXT;

CREATE TABLE IF NOT EXISTS "user_interactive_choice_unlocks" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "storyId" TEXT NOT NULL,
  "choiceId" TEXT NOT NULL,
  "unlockType" TEXT NOT NULL,
  "tokensPaid" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_interactive_choice_unlocks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_interactive_choice_unlocks_userId_choiceId_key"
ON "user_interactive_choice_unlocks"("userId", "choiceId");

CREATE INDEX IF NOT EXISTS "user_interactive_choice_unlocks_userId_storyId_createdAt_idx"
ON "user_interactive_choice_unlocks"("userId", "storyId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_interactive_choice_unlocks_userId_fkey'
  ) THEN
    ALTER TABLE "user_interactive_choice_unlocks"
    ADD CONSTRAINT "user_interactive_choice_unlocks_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_interactive_choice_unlocks_storyId_fkey'
  ) THEN
    ALTER TABLE "user_interactive_choice_unlocks"
    ADD CONSTRAINT "user_interactive_choice_unlocks_storyId_fkey"
    FOREIGN KEY ("storyId") REFERENCES "interactive_stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_interactive_choice_unlocks_choiceId_fkey'
  ) THEN
    ALTER TABLE "user_interactive_choice_unlocks"
    ADD CONSTRAINT "user_interactive_choice_unlocks_choiceId_fkey"
    FOREIGN KEY ("choiceId") REFERENCES "interactive_story_choices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DROP INDEX IF EXISTS "interactive_stories_isPublished_updatedAt_idx";
CREATE INDEX "interactive_stories_contentMode_isPublished_updatedAt_idx"
ON "interactive_stories"("contentMode", "isPublished", "updatedAt");

CREATE INDEX IF NOT EXISTS "user_story_choice_logs_userId_storyId_nodeId_choiceId_createdAt_idx"
ON "user_story_choice_logs"("userId", "storyId", "nodeId", "choiceId", "createdAt");
