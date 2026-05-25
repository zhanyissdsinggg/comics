ALTER TABLE "interactive_stories"
ADD COLUMN "coverImage" TEXT,
ADD COLUMN "genre" TEXT,
ADD COLUMN "contentMode" TEXT NOT NULL DEFAULT 'normal',
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'draft';

ALTER TABLE "interactive_story_nodes"
ADD COLUMN "body" TEXT,
ADD COLUMN "imageUrl" TEXT,
ADD COLUMN "endingType" TEXT,
ADD COLUMN "orderIndex" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "interactive_story_choices"
ADD COLUMN "requiresPremium" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "requiresTokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "orderIndex" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "user_story_progress"
ADD COLUMN "pathJson" JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN "choicesJson" JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE "interactive_stories"
SET
  "contentMode" = CASE
    WHEN "seriesId" IS NOT NULL AND EXISTS (
      SELECT 1
      FROM "series" s
      WHERE s."id" = "interactive_stories"."seriesId"
        AND s."adult" = true
    ) THEN 'adult'
    ELSE 'normal'
  END,
  "status" = CASE
    WHEN "isPublished" = true THEN 'published'
    ELSE 'draft'
  END;

UPDATE "interactive_story_nodes"
SET
  "body" = COALESCE(NULLIF("fallbackText", ''), NULLIF("baseContext", ''), ''),
  "orderIndex" = "sortOrder";

UPDATE "interactive_story_choices"
SET "orderIndex" = "sortOrder";

CREATE INDEX "interactive_stories_contentMode_status_updatedAt_idx"
ON "interactive_stories"("contentMode", "status", "updatedAt");

CREATE INDEX "interactive_story_nodes_storyId_orderIndex_idx"
ON "interactive_story_nodes"("storyId", "orderIndex");

CREATE INDEX "interactive_story_choices_nodeId_orderIndex_idx"
ON "interactive_story_choices"("nodeId", "orderIndex");
