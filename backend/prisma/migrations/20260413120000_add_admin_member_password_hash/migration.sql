ALTER TABLE "admin_members"
ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
