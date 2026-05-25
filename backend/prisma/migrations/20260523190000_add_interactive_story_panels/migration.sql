CREATE TABLE "interactive_panels" (
  "id" TEXT NOT NULL,
  "storyId" TEXT NOT NULL,
  "nodeId" TEXT NOT NULL,
  "panelNumber" INTEGER NOT NULL,
  "promptJson" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "imageUrl" TEXT,
  "finalImageUrl" TEXT,
  "dialogue" TEXT,
  "reviewStatus" TEXT NOT NULL DEFAULT 'draft',
  "provider" TEXT,
  "model" TEXT,
  "seed" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "interactive_panels_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "interactive_panels_nodeId_panelNumber_key"
ON "interactive_panels"("nodeId", "panelNumber");

CREATE INDEX "interactive_panels_storyId_nodeId_panelNumber_idx"
ON "interactive_panels"("storyId", "nodeId", "panelNumber");

CREATE INDEX "interactive_panels_storyId_reviewStatus_createdAt_idx"
ON "interactive_panels"("storyId", "reviewStatus", "createdAt");

ALTER TABLE "interactive_panels"
ADD CONSTRAINT "interactive_panels_storyId_fkey"
FOREIGN KEY ("storyId") REFERENCES "interactive_stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "interactive_panels"
ADD CONSTRAINT "interactive_panels_nodeId_fkey"
FOREIGN KEY ("nodeId") REFERENCES "interactive_story_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
