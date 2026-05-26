CREATE TABLE "interactive_choice_idempotency" (
  "id" TEXT NOT NULL,
  "scopedKey" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "storyId" TEXT NOT NULL,
  "fromNodeId" TEXT NOT NULL,
  "choiceId" TEXT NOT NULL,
  "requestKey" TEXT NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'processing',
  "responseJson" JSONB,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "interactive_choice_idempotency_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "interactive_choice_idempotency_scopedKey_key"
ON "interactive_choice_idempotency"("scopedKey");

CREATE UNIQUE INDEX "interactive_choice_idempotency_scope_request_key"
ON "interactive_choice_idempotency"(
  "operation",
  "userId",
  "storyId",
  "fromNodeId",
  "choiceId",
  "requestKey"
);

CREATE INDEX "interactive_choice_idempotency_scope_state_idx"
ON "interactive_choice_idempotency"(
  "operation",
  "userId",
  "storyId",
  "fromNodeId",
  "choiceId",
  "state"
);

CREATE INDEX "interactive_choice_idempotency_user_story_created_idx"
ON "interactive_choice_idempotency"("userId", "storyId", "createdAt");
