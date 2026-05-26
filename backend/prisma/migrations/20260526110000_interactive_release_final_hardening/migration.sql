-- Final interactive release hardening:
-- 1. align Prisma fields to existing enum columns
-- 2. backfill interactive choice idempotency scope and enforce a scoped unique index

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
  ALTER COLUMN "contentMode" DROP DEFAULT;

ALTER TABLE "interactive_stories"
  ALTER COLUMN "contentMode" TYPE "InteractiveContentMode"
  USING (
    CASE
      WHEN UPPER(COALESCE("contentMode"::text, 'NORMAL')) = 'ADULT'
        THEN 'ADULT'::"InteractiveContentMode"
      ELSE 'NORMAL'::"InteractiveContentMode"
    END
  ),
  ALTER COLUMN "contentMode" SET DEFAULT 'NORMAL',
  ALTER COLUMN "contentMode" SET NOT NULL;

ALTER TABLE "interactive_story_choices"
  ALTER COLUMN "unlockPolicy" DROP DEFAULT;

ALTER TABLE "interactive_story_choices"
  ALTER COLUMN "unlockPolicy" TYPE "InteractiveUnlockPolicy"
  USING (
    CASE
      WHEN UPPER(COALESCE("unlockPolicy"::text, 'FREE')) = 'PREMIUM_ONLY'
        THEN 'PREMIUM_ONLY'::"InteractiveUnlockPolicy"
      WHEN UPPER(COALESCE("unlockPolicy"::text, 'FREE')) = 'TOKENS_ONLY'
        THEN 'TOKENS_ONLY'::"InteractiveUnlockPolicy"
      WHEN UPPER(COALESCE("unlockPolicy"::text, 'FREE')) = 'PREMIUM_OR_TOKENS'
        THEN 'PREMIUM_OR_TOKENS'::"InteractiveUnlockPolicy"
      WHEN UPPER(COALESCE("unlockPolicy"::text, 'FREE')) = 'PREMIUM_AND_TOKENS'
        THEN 'PREMIUM_AND_TOKENS'::"InteractiveUnlockPolicy"
      ELSE 'FREE'::"InteractiveUnlockPolicy"
    END
  ),
  ALTER COLUMN "unlockPolicy" SET DEFAULT 'FREE',
  ALTER COLUMN "unlockPolicy" SET NOT NULL;

UPDATE "idempotency_keys"
SET
  "operation" = COALESCE(NULLIF("operation", ''), 'interactive_choice_submit'),
  "requestKey" = COALESCE(NULLIF("requestKey", ''), split_part(COALESCE("scopedKey", ''), ':', 6)),
  "storyId" = COALESCE(NULLIF("storyId", ''), '__legacy_story__'),
  "fromNodeId" = COALESCE(NULLIF("fromNodeId", ''), '__legacy_node__'),
  "choiceId" = COALESCE(NULLIF("choiceId", ''), '__legacy_choice__')
WHERE COALESCE("operation", '') = 'interactive_choice_submit'
  OR (
    COALESCE("operation", '') = ''
    AND COALESCE("storyId", '') <> ''
  );

DROP INDEX IF EXISTS "idempotency_keys_operation_userId_storyId_fromNodeId_choiceId_requestKey_key";

CREATE UNIQUE INDEX IF NOT EXISTS "idempotency_keys_interactive_choice_scope_key"
ON "idempotency_keys" ("operation", "userId", "storyId", "fromNodeId", "choiceId", "requestKey")
WHERE "operation" = 'interactive_choice_submit'
  AND "userId" IS NOT NULL
  AND "storyId" IS NOT NULL
  AND "fromNodeId" IS NOT NULL
  AND "choiceId" IS NOT NULL
  AND "requestKey" IS NOT NULL;
