-- Fifth-round interactive release finish:
-- 1. published snapshots moved into audit-friendly table
-- 2. idempotency key renamed to scopedKey and narrowed to scoped uniqueness

CREATE TABLE IF NOT EXISTS "interactive_story_published_snapshots" (
  "id" TEXT NOT NULL,
  "storyId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "snapshotJson" JSONB NOT NULL,
  "checksum" TEXT NOT NULL,
  "publishedBy" TEXT,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "interactive_story_published_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "interactive_story_published_snapshots_storyId_version_key"
ON "interactive_story_published_snapshots"("storyId", "version");

CREATE INDEX IF NOT EXISTS "interactive_story_published_snapshots_storyId_isActive_publishedAt_idx"
ON "interactive_story_published_snapshots"("storyId", "isActive", "publishedAt");

CREATE INDEX IF NOT EXISTS "interactive_story_published_snapshots_storyId_isActive_version_idx"
ON "interactive_story_published_snapshots"("storyId", "isActive", "version");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'interactive_story_published_snapshots_storyId_fkey'
  ) THEN
    ALTER TABLE "interactive_story_published_snapshots"
    ADD CONSTRAINT "interactive_story_published_snapshots_storyId_fkey"
    FOREIGN KEY ("storyId") REFERENCES "interactive_stories"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "interactive_story_published_snapshots" (
  "id",
  "storyId",
  "version",
  "snapshotJson",
  "checksum",
  "publishedBy",
  "publishedAt",
  "isActive",
  "createdAt"
)
SELECT
  md5("id" || '-snapshot-' || COALESCE("publishedVersion", 0)::TEXT),
  "id",
  COALESCE("publishedVersion", 0),
  "publishedSnapshot",
  md5(COALESCE("publishedSnapshot"::TEXT, '{}')),
  NULL,
  COALESCE("publishedAt", CURRENT_TIMESTAMP),
  true,
  COALESCE("publishedAt", CURRENT_TIMESTAMP)
FROM "interactive_stories"
WHERE "publishedSnapshot" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "interactive_story_published_snapshots" existing
    WHERE existing."storyId" = "interactive_stories"."id"
      AND existing."version" = COALESCE("interactive_stories"."publishedVersion", 0)
  );

ALTER TABLE "interactive_stories"
DROP COLUMN IF EXISTS "publishedSnapshot";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'idempotency_keys'
      AND column_name = 'key'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'idempotency_keys'
      AND column_name = 'scopedKey'
  ) THEN
    ALTER TABLE "idempotency_keys" RENAME COLUMN "key" TO "scopedKey";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'idempotency_keys_userId_key_key'
  ) THEN
    ALTER TABLE "idempotency_keys"
    DROP CONSTRAINT "idempotency_keys_userId_key_key";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE indexname = 'idempotency_keys_key_key'
  ) THEN
    DROP INDEX "idempotency_keys_key_key";
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "idempotency_keys_scopedKey_key"
ON "idempotency_keys" ("scopedKey");
