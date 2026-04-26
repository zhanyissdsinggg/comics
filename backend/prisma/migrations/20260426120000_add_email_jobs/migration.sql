-- CreateTable
CREATE TABLE "email_jobs" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "provider" TEXT NOT NULL DEFAULT 'console',
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "payload" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "retries" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_jobs_status_lastAttemptAt_idx" ON "email_jobs"("status", "lastAttemptAt");

-- CreateIndex
CREATE INDEX "email_jobs_to_idx" ON "email_jobs"("to");

-- CreateIndex
CREATE INDEX "email_jobs_createdAt_idx" ON "email_jobs"("createdAt");

-- CreateIndex
CREATE INDEX "email_jobs_updatedAt_idx" ON "email_jobs"("updatedAt");
