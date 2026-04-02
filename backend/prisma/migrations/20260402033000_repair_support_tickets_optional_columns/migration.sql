ALTER TABLE IF EXISTS "support_tickets"
  ADD COLUMN IF NOT EXISTS "replyEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "orderId" TEXT,
  ADD COLUMN IF NOT EXISTS "topic" TEXT;

CREATE INDEX IF NOT EXISTS "support_tickets_replyEmail_idx"
ON "support_tickets" ("replyEmail");
