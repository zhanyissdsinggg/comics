CREATE INDEX IF NOT EXISTS "users_createdAt_idx" ON "users"("createdAt");

CREATE INDEX IF NOT EXISTS "series_title_idx" ON "series"("title");
CREATE INDEX IF NOT EXISTS "series_createdAt_idx" ON "series"("createdAt");
CREATE INDEX IF NOT EXISTS "series_updatedAt_idx" ON "series"("updatedAt");

CREATE INDEX IF NOT EXISTS "user_behaviors_lastActiveAt_idx" ON "user_behaviors"("lastActiveAt");

CREATE INDEX IF NOT EXISTS "user_metrics_ltv_idx" ON "user_metrics"("ltv");
CREATE INDEX IF NOT EXISTS "user_metrics_churnRisk_idx" ON "user_metrics"("churnRisk");

CREATE INDEX IF NOT EXISTS "support_tickets_createdAt_idx" ON "support_tickets"("createdAt");
CREATE INDEX IF NOT EXISTS "support_tickets_updatedAt_idx" ON "support_tickets"("updatedAt");
CREATE INDEX IF NOT EXISTS "support_tickets_status_createdAt_idx" ON "support_tickets"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "support_tickets_status_updatedAt_idx" ON "support_tickets"("status", "updatedAt");

CREATE INDEX IF NOT EXISTS "orders_createdAt_idx" ON "orders"("createdAt");
CREATE INDEX IF NOT EXISTS "orders_status_idx" ON "orders"("status");
CREATE INDEX IF NOT EXISTS "orders_status_createdAt_idx" ON "orders"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "orders_amount_idx" ON "orders"("amount");

CREATE INDEX IF NOT EXISTS "payment_retries_status_idx" ON "payment_retries"("status");
