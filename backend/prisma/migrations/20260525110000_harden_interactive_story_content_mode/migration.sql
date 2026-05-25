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

DROP INDEX IF EXISTS "interactive_stories_isPublished_updatedAt_idx";
CREATE INDEX "interactive_stories_contentMode_isPublished_updatedAt_idx"
ON "interactive_stories"("contentMode", "isPublished", "updatedAt");

CREATE INDEX IF NOT EXISTS "user_story_choice_logs_userId_storyId_nodeId_choiceId_createdAt_idx"
ON "user_story_choice_logs"("userId", "storyId", "nodeId", "choiceId", "createdAt");
