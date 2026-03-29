DO $$
BEGIN
  CREATE TYPE "CreatorType" AS ENUM ('PERSON', 'TEAM', 'STUDIO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "CreditRole" AS ENUM ('CREATOR', 'WRITER', 'ARTIST', 'AUTHOR', 'ADAPTER', 'STUDIO', 'TEAM');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "progress"
ALTER COLUMN "lastEpisodeId" DROP NOT NULL;

CREATE TABLE IF NOT EXISTS "creators" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "type" "CreatorType" NOT NULL DEFAULT 'PERSON',
  "bio" TEXT,
  "isPublic" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "creators_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "series_credits" (
  "id" TEXT NOT NULL,
  "seriesId" TEXT NOT NULL,
  "creatorId" TEXT NOT NULL,
  "role" "CreditRole" NOT NULL DEFAULT 'CREATOR',
  "source" TEXT NOT NULL DEFAULT 'manual',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "isPublic" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "series_credits_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "series_credits_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "series"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "series_credits_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creators"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "search_logs_dateKey_count_idx"
ON "search_logs" ("dateKey", "count");

CREATE UNIQUE INDEX IF NOT EXISTS "creators_slug_key"
ON "creators" ("slug");

CREATE UNIQUE INDEX IF NOT EXISTS "creators_normalizedName_key"
ON "creators" ("normalizedName");

CREATE INDEX IF NOT EXISTS "creators_isPublic_name_idx"
ON "creators" ("isPublic", "name");

CREATE UNIQUE INDEX IF NOT EXISTS "series_credits_seriesId_creatorId_role_key"
ON "series_credits" ("seriesId", "creatorId", "role");

CREATE INDEX IF NOT EXISTS "series_credits_creatorId_isPublic_idx"
ON "series_credits" ("creatorId", "isPublic");

CREATE INDEX IF NOT EXISTS "series_credits_seriesId_isPublic_sortOrder_idx"
ON "series_credits" ("seriesId", "isPublic", "sortOrder");

CREATE INDEX IF NOT EXISTS "episodes_seriesId_isDeleted_number_idx"
ON "episodes" ("seriesId", "isDeleted", "number");

CREATE INDEX IF NOT EXISTS "episodes_seriesId_isDeleted_releasedAt_idx"
ON "episodes" ("seriesId", "isDeleted", "releasedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "episodes_seriesId_number_key"
ON "episodes" ("seriesId", "number");

INSERT INTO "creators" ("id", "slug", "name", "normalizedName", "type", "isPublic", "createdAt", "updatedAt")
SELECT
  'creator_' || substr(md5(lower(trim(s."author"))), 1, 24) AS id,
  left(regexp_replace(lower(trim(s."author")), '[^a-z0-9]+', '-', 'g'), 48) || '-' || substr(md5(lower(trim(s."author"))), 1, 6) AS slug,
  trim(s."author") AS name,
  lower(trim(s."author")) AS "normalizedName",
  CASE
    WHEN lower(trim(s."author")) LIKE '%studio%' THEN 'STUDIO'::"CreatorType"
    WHEN lower(trim(s."author")) LIKE '%team%' THEN 'TEAM'::"CreatorType"
    ELSE 'PERSON'::"CreatorType"
  END AS type,
  true AS "isPublic",
  NOW() AS "createdAt",
  NOW() AS "updatedAt"
FROM "series" s
WHERE trim(COALESCE(s."author", '')) <> ''
ON CONFLICT ("normalizedName") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "type" = EXCLUDED."type",
  "isPublic" = true,
  "updatedAt" = NOW();

INSERT INTO "series_credits" (
  "id",
  "seriesId",
  "creatorId",
  "role",
  "source",
  "sortOrder",
  "isPrimary",
  "isPublic",
  "createdAt",
  "updatedAt"
)
SELECT
  'credit_' || substr(md5(s."id" || ':' || c."id" || ':legacy_author'), 1, 24) AS id,
  s."id" AS "seriesId",
  c."id" AS "creatorId",
  CASE
    WHEN lower(trim(s."author")) LIKE '%studio%' THEN 'STUDIO'::"CreditRole"
    WHEN lower(trim(s."author")) LIKE '%team%' THEN 'TEAM'::"CreditRole"
    ELSE 'AUTHOR'::"CreditRole"
  END AS role,
  'legacy_author' AS source,
  0 AS "sortOrder",
  true AS "isPrimary",
  true AS "isPublic",
  NOW() AS "createdAt",
  NOW() AS "updatedAt"
FROM "series" s
INNER JOIN "creators" c
  ON c."normalizedName" = lower(trim(s."author"))
WHERE trim(COALESCE(s."author", '')) <> ''
ON CONFLICT ("seriesId", "creatorId", "role") DO UPDATE
SET
  "source" = EXCLUDED."source",
  "sortOrder" = EXCLUDED."sortOrder",
  "isPrimary" = EXCLUDED."isPrimary",
  "isPublic" = EXCLUDED."isPublic",
  "updatedAt" = NOW();
