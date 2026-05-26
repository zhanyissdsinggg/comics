ALTER TABLE "interactive_stories"
ADD COLUMN "targetAudience" TEXT;

ALTER TABLE "interactive_story_nodes"
ADD COLUMN "generatedByAI" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT 'approved',
ADD COLUMN "editorNotes" TEXT;

ALTER TABLE "story_generation_logs"
ADD COLUMN "contentMode" TEXT,
ADD COLUMN "generationType" TEXT,
ADD COLUMN "responseJson" JSONB,
ADD COLUMN "safetyNotes" TEXT,
ADD COLUMN "reviewStatus" TEXT;

CREATE INDEX "interactive_story_nodes_storyId_reviewStatus_orderIndex_idx"
ON "interactive_story_nodes"("storyId", "reviewStatus", "orderIndex");

CREATE INDEX "story_generation_logs_contentMode_generationType_createdAt_idx"
ON "story_generation_logs"("contentMode", "generationType", "createdAt");
