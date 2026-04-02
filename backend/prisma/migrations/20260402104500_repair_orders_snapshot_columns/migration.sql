ALTER TABLE IF EXISTS "orders"
  ADD COLUMN IF NOT EXISTS "priceSnapshot" INTEGER,
  ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;

UPDATE "orders"
SET "priceSnapshot" = COALESCE("priceSnapshot", "amount", 0)
WHERE "priceSnapshot" IS NULL;

ALTER TABLE "orders"
  ALTER COLUMN "priceSnapshot" SET DEFAULT 0,
  ALTER COLUMN "priceSnapshot" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "orders_userId_idempotencyKey_key"
ON "orders" ("userId", "idempotencyKey");
