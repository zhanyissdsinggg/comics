-- Interactive story MVP foundation
-- Adds structured story graph + per-user state/progress + generation logs.

CREATE TABLE "interactive_stories" (
  "id" TEXT NOT NULL,
  "seriesId" TEXT,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "baseContext" TEXT,
  "initialNodeId" TEXT,
  "initialState" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "interactive_stories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "interactive_story_nodes" (
  "id" TEXT NOT NULL,
  "storyId" TEXT NOT NULL,
  "nodeKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "baseContext" TEXT,
  "basePrompt" TEXT,
  "fallbackText" TEXT,
  "requiredFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "blockedFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "stateEffects" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isEnding" BOOLEAN NOT NULL DEFAULT false,
  "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "interactive_story_nodes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "interactive_story_choices" (
  "id" TEXT NOT NULL,
  "nodeId" TEXT NOT NULL,
  "targetNodeId" TEXT,
  "choiceKey" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "requiredFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "blockedFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "stateEffects" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "interactive_story_choices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_story_progress" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "storyId" TEXT NOT NULL,
  "currentNodeId" TEXT NOT NULL,
  "lastChoiceId" TEXT,
  "lastChoiceAt" TIMESTAMP(3),
  "lastGeneratedText" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_story_progress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_story_state" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "storyId" TEXT NOT NULL,
  "state" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "flags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_story_state_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_story_choice_logs" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "storyId" TEXT NOT NULL,
  "nodeId" TEXT NOT NULL,
  "choiceId" TEXT NOT NULL,
  "targetNodeId" TEXT,
  "stateBefore" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "stateAfter" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_story_choice_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "story_generation_logs" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "storyId" TEXT NOT NULL,
  "nodeId" TEXT NOT NULL,
  "choiceId" TEXT,
  "status" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "model" TEXT,
  "prompt" TEXT NOT NULL,
  "response" TEXT,
  "errorMessage" TEXT,
  "latencyMs" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "story_generation_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "interactive_stories_seriesId_key" ON "interactive_stories"("seriesId");
CREATE UNIQUE INDEX "interactive_stories_slug_key" ON "interactive_stories"("slug");
CREATE INDEX "interactive_stories_isPublished_updatedAt_idx" ON "interactive_stories"("isPublished", "updatedAt");

CREATE UNIQUE INDEX "interactive_story_nodes_storyId_nodeKey_key" ON "interactive_story_nodes"("storyId", "nodeKey");
CREATE INDEX "interactive_story_nodes_storyId_sortOrder_idx" ON "interactive_story_nodes"("storyId", "sortOrder");

CREATE UNIQUE INDEX "interactive_story_choices_nodeId_choiceKey_key" ON "interactive_story_choices"("nodeId", "choiceKey");
CREATE INDEX "interactive_story_choices_nodeId_sortOrder_idx" ON "interactive_story_choices"("nodeId", "sortOrder");
CREATE INDEX "interactive_story_choices_targetNodeId_idx" ON "interactive_story_choices"("targetNodeId");

CREATE UNIQUE INDEX "user_story_progress_userId_storyId_key" ON "user_story_progress"("userId", "storyId");
CREATE INDEX "user_story_progress_storyId_updatedAt_idx" ON "user_story_progress"("storyId", "updatedAt");

CREATE UNIQUE INDEX "user_story_state_userId_storyId_key" ON "user_story_state"("userId", "storyId");
CREATE INDEX "user_story_state_storyId_updatedAt_idx" ON "user_story_state"("storyId", "updatedAt");

CREATE INDEX "user_story_choice_logs_userId_storyId_createdAt_idx" ON "user_story_choice_logs"("userId", "storyId", "createdAt");
CREATE INDEX "user_story_choice_logs_storyId_createdAt_idx" ON "user_story_choice_logs"("storyId", "createdAt");

CREATE INDEX "story_generation_logs_storyId_createdAt_idx" ON "story_generation_logs"("storyId", "createdAt");
CREATE INDEX "story_generation_logs_userId_createdAt_idx" ON "story_generation_logs"("userId", "createdAt");
CREATE INDEX "story_generation_logs_status_createdAt_idx" ON "story_generation_logs"("status", "createdAt");

ALTER TABLE "interactive_stories"
ADD CONSTRAINT "interactive_stories_seriesId_fkey"
FOREIGN KEY ("seriesId") REFERENCES "series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "interactive_story_nodes"
ADD CONSTRAINT "interactive_story_nodes_storyId_fkey"
FOREIGN KEY ("storyId") REFERENCES "interactive_stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "interactive_story_choices"
ADD CONSTRAINT "interactive_story_choices_nodeId_fkey"
FOREIGN KEY ("nodeId") REFERENCES "interactive_story_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "interactive_story_choices"
ADD CONSTRAINT "interactive_story_choices_targetNodeId_fkey"
FOREIGN KEY ("targetNodeId") REFERENCES "interactive_story_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "user_story_progress"
ADD CONSTRAINT "user_story_progress_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_story_progress"
ADD CONSTRAINT "user_story_progress_storyId_fkey"
FOREIGN KEY ("storyId") REFERENCES "interactive_stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_story_progress"
ADD CONSTRAINT "user_story_progress_currentNodeId_fkey"
FOREIGN KEY ("currentNodeId") REFERENCES "interactive_story_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_story_progress"
ADD CONSTRAINT "user_story_progress_lastChoiceId_fkey"
FOREIGN KEY ("lastChoiceId") REFERENCES "interactive_story_choices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "user_story_state"
ADD CONSTRAINT "user_story_state_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_story_state"
ADD CONSTRAINT "user_story_state_storyId_fkey"
FOREIGN KEY ("storyId") REFERENCES "interactive_stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_story_choice_logs"
ADD CONSTRAINT "user_story_choice_logs_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_story_choice_logs"
ADD CONSTRAINT "user_story_choice_logs_storyId_fkey"
FOREIGN KEY ("storyId") REFERENCES "interactive_stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_story_choice_logs"
ADD CONSTRAINT "user_story_choice_logs_nodeId_fkey"
FOREIGN KEY ("nodeId") REFERENCES "interactive_story_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_story_choice_logs"
ADD CONSTRAINT "user_story_choice_logs_choiceId_fkey"
FOREIGN KEY ("choiceId") REFERENCES "interactive_story_choices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_story_choice_logs"
ADD CONSTRAINT "user_story_choice_logs_targetNodeId_fkey"
FOREIGN KEY ("targetNodeId") REFERENCES "interactive_story_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "story_generation_logs"
ADD CONSTRAINT "story_generation_logs_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "story_generation_logs"
ADD CONSTRAINT "story_generation_logs_storyId_fkey"
FOREIGN KEY ("storyId") REFERENCES "interactive_stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "story_generation_logs"
ADD CONSTRAINT "story_generation_logs_nodeId_fkey"
FOREIGN KEY ("nodeId") REFERENCES "interactive_story_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "story_generation_logs"
ADD CONSTRAINT "story_generation_logs_choiceId_fkey"
FOREIGN KEY ("choiceId") REFERENCES "interactive_story_choices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
