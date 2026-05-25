import { resolve } from "path";
import { PrismaClient } from "@prisma/client";
import { config as loadDotenv } from "dotenv";

const envLoader = process as NodeJS.Process & {
  loadEnvFile?: (path?: string) => void;
};

for (const candidate of [resolve(__dirname, "../.env"), resolve(__dirname, "../.env.local")]) {
  try {
    loadDotenv({ path: candidate, override: true });
  } catch {
    // Best-effort local env loading for QA runs.
  }
}

if (typeof envLoader.loadEnvFile === "function") {
  try {
    envLoader.loadEnvFile(resolve(__dirname, "../.env"));
  } catch {
    // Ignore and keep dotenv-loaded values.
  }
}

// Delay service loading until env is in place, otherwise config validation can fail
// before the script gets a chance to inject backend/.env.local.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { InteractiveStoriesService } = require("../src/modules/interactive-stories/interactive-stories.service");

async function main() {
  const prisma = new PrismaClient();
  const service = new InteractiveStoriesService(prisma as any);
  const userId = "qa-interactive-user";
  const storyId = "story-locker-letter-001";
  const access = { includeAdult: false };

  await prisma.user.upsert({
    where: { id: userId },
    update: { email: "qa-interactive@example.com", name: "QA Interactive" },
    create: {
      id: userId,
      email: "qa-interactive@example.com",
      name: "QA Interactive",
    },
  });

  await prisma.wallet.upsert({
    where: { userId },
    update: { paidPts: 100, bonusPts: 0, plan: "free" },
    create: { userId, paidPts: 100, bonusPts: 0, plan: "free" },
  });

  await prisma.userStoryProgress.deleteMany({ where: { userId, storyId } });
  await prisma.userStoryState.deleteMany({ where: { userId, storyId } });
  await prisma.userStoryChoiceLog.deleteMany({ where: { userId, storyId } });
  await prisma.userInteractiveChoiceUnlock.deleteMany({ where: { userId, storyId } });
  await prisma.idempotencyKey.deleteMany({ where: { userId, storyId } });

  const start = await service.getOrInitProgress("the-locker-letter", userId, access);
  console.log(
    JSON.stringify(
      {
        phase: "start",
        nodeKey: start?.node?.key,
        title: start?.node?.title,
      },
      null,
      2,
    ),
  );

  const step1 = await service.submitChoice(
    {
      storySlug: "the-locker-letter",
      userId,
      choiceId: "story-locker-letter-choice-002",
      idempotencyKey: "step-1",
    },
    access,
  );
  console.log(JSON.stringify({ phase: "step1", result: step1 }, null, 2));

  const walletBefore = await prisma.wallet.findUnique({ where: { userId } });
  console.log(JSON.stringify({ phase: "wallet-before", walletBefore }, null, 2));

  const concurrent = await Promise.allSettled([
    service.submitChoice(
      {
        storySlug: "the-locker-letter",
        userId,
        choiceId: "story-locker-letter-choice-007",
        idempotencyKey: "same-key",
      },
      access,
    ),
    service.submitChoice(
      {
        storySlug: "the-locker-letter",
        userId,
        choiceId: "story-locker-letter-choice-007",
        idempotencyKey: "same-key",
      },
      access,
    ),
  ]);

  const walletAfter = await prisma.wallet.findUnique({ where: { userId } });
  const unlocks = await prisma.userInteractiveChoiceUnlock.findMany({
    where: { userId, storyId },
    orderBy: { createdAt: "asc" },
  });
  const progress = await prisma.userStoryProgress.findUnique({
    where: { userId_storyId: { userId, storyId } },
  });

  console.log(
    JSON.stringify(
      {
        phase: "concurrency",
        concurrent,
        walletAfter,
        unlocks,
        progress,
      },
      null,
      2,
    ),
  );

  const replay = await service.submitChoice(
    {
      storySlug: "the-locker-letter",
      userId,
      choiceId: "story-locker-letter-choice-007",
      idempotencyKey: "same-key",
    },
    access,
  );
  console.log(JSON.stringify({ phase: "replay", replay }, null, 2));

  const finalStep = await service.submitChoice(
    {
      storySlug: "the-locker-letter",
      userId,
      choiceId: "story-locker-letter-choice-014",
      idempotencyKey: "ending-step",
    },
    access,
  );
  console.log(JSON.stringify({ phase: "ending", finalStep }, null, 2));

  await prisma.$disconnect();
}

main().catch(async (error) => {
  const errorWithCause = error as Error & { cause?: unknown };
  const cause = errorWithCause?.cause;
  const summary =
    error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
          cause: cause instanceof Error ? { name: cause.name, message: cause.message } : cause || null,
        }
      : error;
  console.error(JSON.stringify({ phase: "fatal", error: summary }, null, 2));
  process.exitCode = 1;
});
