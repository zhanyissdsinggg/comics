CREATE TABLE IF NOT EXISTS "admin_members" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "role" TEXT NOT NULL DEFAULT 'super_admin',
  "status" TEXT NOT NULL DEFAULT 'active',
  "keySlot" INTEGER,
  "source" TEXT NOT NULL DEFAULT 'manual',
  "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
  "totpSecret" TEXT,
  "notes" TEXT,
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "admin_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "admin_members_email_key"
ON "admin_members" ("email");

CREATE UNIQUE INDEX IF NOT EXISTS "admin_members_keySlot_key"
ON "admin_members" ("keySlot");

CREATE INDEX IF NOT EXISTS "admin_members_status_role_idx"
ON "admin_members" ("status", "role");
