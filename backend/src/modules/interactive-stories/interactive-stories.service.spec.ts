import { PrismaService } from "../../common/prisma/prisma.service";
import { InteractiveStoriesService } from "./interactive-stories.service";

type StoryFixtureOptions = {
  storyId?: string;
  slug?: string;
  title?: string;
  seriesId?: string;
  contentMode?: "NORMAL" | "ADULT";
  targetNodeStatus?: "approved" | "draft" | "pending_review" | "rejected";
};

type FakeDbState = {
  stories: any[];
  progress: Array<Record<string, any>>;
  states: Array<Record<string, any>>;
  wallets: Array<Record<string, any>>;
  subscriptions: Array<Record<string, any>>;
  unlocks: Array<Record<string, any>>;
  choiceLogs: Array<Record<string, any>>;
  idempotency: Array<Record<string, any>>;
};

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function cloneRecord<T extends Record<string, any> | null>(value: T): T {
  if (!value) {
    return value;
  }
  const cloned = deepClone(value);
  for (const key of ["createdAt", "updatedAt", "expiresAt", "publishedAt"]) {
    if (cloned[key]) {
      cloned[key] = new Date(cloned[key]);
    }
  }
  return cloned;
}

function createPublishedSnapshotFixture(
  options: StoryFixtureOptions = {},
) {
  const storyId = String(options.storyId || "story-1");
  const slug = String(options.slug || "solar-wind-first-contact");
  const title = String(options.title || "Solar Wind");
  const seriesId = String(options.seriesId || "series-011");
  const contentMode = String(options.contentMode || "NORMAL");
  const targetNodeStatus = String(options.targetNodeStatus || "approved");
  const nodeStartId = `${storyId}-node-1`;
  const nodeEndId = `${storyId}-node-2`;
  const freeChoiceId = `${storyId}-choice-1`;
  const tokenChoiceId = `${storyId}-choice-token`;
  const publishedSnapshot = {
    story: {
      id: storyId,
      slug,
      title,
      description: "Interactive branch.",
      baseContext: "Ship enters dark relay.",
      contentMode,
      targetAudience: "US teens",
      seriesId,
      initialNodeId: nodeStartId,
      initialState: { trust: 0, clues: 0, flags: [] },
      publishedVersion: 1,
    },
    series: {
      id: seriesId,
      title: `${title} Series`,
      adult: false,
      coverUrl: "https://cdn.test/solar.jpg",
      genres: ["Sci-Fi", "Drama"],
    },
    nodes: [
      {
        id: nodeStartId,
        storyId,
        nodeKey: "relay_entrance",
        title: "Relay Entrance",
        baseContext: "The relay crackles.",
        basePrompt: "Write setup.",
        fallbackText: "Fallback start text.",
        generatedByAI: false,
        reviewStatus: "approved",
        editorNotes: null,
        requiredFlags: [],
        blockedFlags: [],
        stateEffects: {},
        sortOrder: 0,
        isEnding: false,
        aiEnabled: true,
        choices: [
          {
            id: freeChoiceId,
            nodeId: nodeStartId,
            targetNodeId: nodeEndId,
            choiceKey: "scan_signal",
            label: "Run a deep scan.",
            description: null,
            unlockPolicy: "FREE",
            requiresPremium: false,
            requiresTokens: 0,
            unlockLabel: null,
            requiredFlags: [],
            blockedFlags: [],
            stateEffects: { trust: 1, flags: ["scan_selected"] },
            sortOrder: 0,
          },
          {
            id: tokenChoiceId,
            nodeId: nodeStartId,
            targetNodeId: nodeEndId,
            choiceKey: "token_route",
            label: "Spend tokens.",
            description: null,
            unlockPolicy: "TOKENS_ONLY",
            requiresPremium: false,
            requiresTokens: 30,
            unlockLabel: "Unlock for 30 Tokens",
            requiredFlags: [],
            blockedFlags: [],
            stateEffects: {},
            sortOrder: 1,
          },
        ],
      },
      {
        id: nodeEndId,
        storyId,
        nodeKey: "scan_results",
        title: "Scan Results",
        baseContext: "Signal reveals map fragment.",
        basePrompt: "Write discovery.",
        fallbackText: "Fallback next text.",
        generatedByAI: false,
        reviewStatus: targetNodeStatus,
        editorNotes: null,
        requiredFlags: [],
        blockedFlags: [],
        stateEffects: { clues: 1 },
        sortOrder: 1,
        isEnding: true,
        aiEnabled: true,
        choices: [],
      },
    ],
  };

  return {
    id: storyId,
    slug,
    title,
    description: "Interactive branch.",
    baseContext: "Ship enters dark relay.",
    contentMode,
    targetAudience: "US teens",
    seriesId,
    initialNodeId: nodeStartId,
    initialState: { trust: 0, clues: 0, flags: [] },
    isPublished: true,
    publishedVersion: 1,
    aiEnabled: true,
    publishedSnapshots: [
      {
        snapshotJson: publishedSnapshot,
        version: 1,
        publishedAt: new Date("2026-05-25T22:00:00.000Z"),
        isActive: true,
      },
    ],
    series: {
      id: seriesId,
      title: `${title} Series`,
      adult: false,
      coverUrl: "https://cdn.test/solar.jpg",
      genres: ["Sci-Fi", "Drama"],
    },
  };
}

function createInitialState(overrides: Partial<FakeDbState> = {}): FakeDbState {
  return {
    stories: [createPublishedSnapshotFixture()],
    progress: [],
    states: [],
    wallets: [],
    subscriptions: [],
    unlocks: [],
    choiceLogs: [],
    idempotency: [],
    ...deepClone(overrides),
  };
}

function createStateKey(userId: string, storyId: string) {
  return `${userId}:${storyId}`;
}

function createFakePrisma(initialState?: Partial<FakeDbState>) {
  let state = createInitialState(initialState);
  let transactionQueue = Promise.resolve();
  let failNextProgressUpsert = false;
  const callCounts = {
    walletUpsert: 0,
    progressUpsert: 0,
    unlockCreate: 0,
    choiceLogCreate: 0,
  };

  const findStory = (where: Record<string, any>) => {
    return state.stories.find((story) => {
      if (where?.slug && story.slug !== where.slug) {
        return false;
      }
      if (where?.seriesId && story.seriesId !== where.seriesId) {
        return false;
      }
      if (where?.isPublished !== undefined && story.isPublished !== where.isPublished) {
        return false;
      }
      return true;
    }) || null;
  };

  const findProgress = (workingState: FakeDbState, userId: string, storyId: string) =>
    workingState.progress.find(
      (row) => row.userId === userId && row.storyId === storyId,
    ) || null;

  const findStoryState = (workingState: FakeDbState, userId: string, storyId: string) =>
    workingState.states.find(
      (row) => row.userId === userId && row.storyId === storyId,
    ) || null;

  const createTx = (workingState: FakeDbState) => ({
    $queryRawUnsafe: jest.fn().mockResolvedValue([]),
    userStoryProgress: {
      upsert: jest.fn(async ({ where, update, create }: any) => {
        callCounts.progressUpsert += 1;
        if (failNextProgressUpsert) {
          failNextProgressUpsert = false;
          throw new Error("progress update failed");
        }
        const key = createStateKey(
          where.userId_storyId.userId,
          where.userId_storyId.storyId,
        );
        const existing = findProgress(
          workingState,
          where.userId_storyId.userId,
          where.userId_storyId.storyId,
        );
        if (existing) {
          Object.assign(existing, deepClone(update));
          return deepClone(existing);
        }
        const next = { ...deepClone(create), id: key };
        workingState.progress.push(next);
        return deepClone(next);
      }),
    },
    userStoryState: {
      upsert: jest.fn(async ({ where, update, create }: any) => {
        const existing = findStoryState(
          workingState,
          where.userId_storyId.userId,
          where.userId_storyId.storyId,
        );
        if (existing) {
          Object.assign(existing, deepClone(update));
          return deepClone(existing);
        }
        const next = { ...deepClone(create), id: createStateKey(create.userId, create.storyId) };
        workingState.states.push(next);
        return deepClone(next);
      }),
    },
    userStoryChoiceLog: {
      create: jest.fn(async ({ data }: any) => {
        callCounts.choiceLogCreate += 1;
        const next = { id: `log-${workingState.choiceLogs.length + 1}`, ...deepClone(data) };
        workingState.choiceLogs.push(next);
        return deepClone(next);
      }),
    },
    wallet: {
      findUnique: jest.fn(async ({ where }: any) => {
        const row = workingState.wallets.find((item) => item.userId === where.userId) || null;
        return row ? cloneRecord(row) : null;
      }),
      upsert: jest.fn(async ({ where, update, create }: any) => {
        callCounts.walletUpsert += 1;
        const existing = workingState.wallets.find((item) => item.userId === where.userId);
        if (existing) {
          Object.assign(existing, deepClone(update));
          return deepClone(existing);
        }
        const next = { id: `wallet-${where.userId}`, ...deepClone(create) };
        workingState.wallets.push(next);
        return deepClone(next);
      }),
    },
    userInteractiveChoiceUnlock: {
      findUnique: jest.fn(async ({ where }: any) => {
        const row = workingState.unlocks.find(
          (item) =>
            item.userId === where.userId_choiceId.userId &&
            item.choiceId === where.userId_choiceId.choiceId,
        ) || null;
        return row ? cloneRecord(row) : null;
      }),
      create: jest.fn(async ({ data }: any) => {
        callCounts.unlockCreate += 1;
        const next = {
          id: `unlock-${workingState.unlocks.length + 1}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...deepClone(data),
        };
        const duplicate = workingState.unlocks.find(
          (item) => item.userId === next.userId && item.choiceId === next.choiceId,
        );
        if (duplicate) {
          throw new Error("Unique constraint failed on userInteractiveChoiceUnlock");
        }
        workingState.unlocks.push(next);
        return deepClone(next);
      }),
    },
    interactiveChoiceIdempotency: {
      findUnique: jest.fn(async ({ where }: any) => {
        const row = workingState.idempotency.find(
          (item) => item.scopedKey === where.scopedKey,
        ) || null;
        return row ? cloneRecord(row) : null;
      }),
      findFirst: jest.fn(async ({ where, orderBy }: any) => {
        const sorted = [...workingState.idempotency].sort((left, right) => {
          if (orderBy?.[0]?.updatedAt === "desc") {
            return String(right.updatedAt || "").localeCompare(String(left.updatedAt || ""));
          }
          if (orderBy?.[0]?.createdAt === "desc") {
            return String(right.createdAt || "").localeCompare(String(left.createdAt || ""));
          }
          return 0;
        });
        const row = sorted.find((item) => {
          if (where.operation && item.operation !== where.operation) return false;
          if (where.userId && item.userId !== where.userId) return false;
          if (where.storyId && item.storyId !== where.storyId) return false;
          if (where.fromNodeId && item.fromNodeId !== where.fromNodeId) return false;
          if (where.choiceId && item.choiceId !== where.choiceId) return false;
          if (where.requestKey && item.requestKey !== where.requestKey) return false;
          if (where.state && item.state !== where.state) return false;
          if (where.expiresAt?.gt) {
            return new Date(item.expiresAt).getTime() > new Date(where.expiresAt.gt).getTime();
          }
          return true;
        }) || null;
        return row ? cloneRecord(row) : null;
      }),
      upsert: jest.fn(async ({ where, update, create }: any) => {
        const existing = workingState.idempotency.find(
          (item) => item.scopedKey === where.scopedKey,
        );
        if (existing) {
          Object.assign(existing, deepClone(update), {
            updatedAt: new Date().toISOString(),
          });
          return deepClone(existing);
        }
        const next = {
          id: `idem-${workingState.idempotency.length + 1}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...deepClone(create),
        };
        workingState.idempotency.push(next);
        return deepClone(next);
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const existing = workingState.idempotency.find(
          (item) => item.scopedKey === where.scopedKey,
        );
        if (!existing) {
          throw new Error("interactive choice idempotency record not found");
        }
        Object.assign(existing, deepClone(data), {
          updatedAt: new Date().toISOString(),
        });
        return deepClone(existing);
      }),
    },
  });

  const prisma = {
    interactiveStory: {
      findFirst: jest.fn(async ({ where }: any) => {
        const record = findStory(where || {});
        return record ? deepClone(record) : null;
      }),
      findMany: jest.fn(async ({ where }: any) => {
        return state.stories
          .filter((story) => {
            if (where?.isPublished !== undefined && story.isPublished !== where.isPublished) {
              return false;
            }
            return true;
          })
          .map((story) => deepClone(story));
      }),
    },
    userStoryProgress: {
      findUnique: jest.fn(async ({ where }: any) =>
        deepClone(
          findProgress(state, where.userId_storyId.userId, where.userId_storyId.storyId),
        ),
      ),
      findMany: jest.fn(async ({ where }: any) =>
        state.progress
          .filter(
            (row) =>
              row.userId === where.userId &&
              (!where.storyId?.in || where.storyId.in.includes(row.storyId)),
          )
          .map((row) => deepClone(row)),
      ),
    },
    userStoryState: {
      findUnique: jest.fn(async ({ where }: any) =>
        deepClone(
          findStoryState(state, where.userId_storyId.userId, where.userId_storyId.storyId),
        ),
      ),
      findMany: jest.fn(async ({ where }: any) =>
        state.states
          .filter(
            (row) =>
              row.userId === where.userId &&
              (!where.storyId?.in || where.storyId.in.includes(row.storyId)),
          )
          .map((row) => deepClone(row)),
      ),
    },
    wallet: {
      findUnique: jest.fn(async ({ where }: any) => {
        const row = state.wallets.find((item) => item.userId === where.userId) || null;
        return row ? cloneRecord(row) : null;
      }),
    },
    subscription: {
      findUnique: jest.fn(async ({ where }: any) => {
        const row = state.subscriptions.find((item) => item.userId === where.userId) || null;
        return row ? cloneRecord(row) : null;
      }),
    },
    userInteractiveChoiceUnlock: {
      findMany: jest.fn(async ({ where }: any) =>
        state.unlocks
          .filter(
            (row) =>
              row.userId === where.userId &&
              (!where.storyId || row.storyId === where.storyId),
          )
          .map((row) => deepClone(row)),
      ),
    },
    interactiveChoiceIdempotency: {
      findUnique: jest.fn(async ({ where }: any) => {
        const row = state.idempotency.find((item) => item.scopedKey === where.scopedKey) || null;
        return row ? cloneRecord(row) : null;
      }),
      findFirst: jest.fn(async ({ where, orderBy }: any) => {
        const sorted = [...state.idempotency].sort((left, right) => {
          if (orderBy?.[0]?.createdAt === "desc") {
            return String(right.createdAt || "").localeCompare(String(left.createdAt || ""));
          }
          return 0;
        });
        const row = sorted.find((item) => {
          if (where.operation && item.operation !== where.operation) return false;
          if (where.userId && item.userId !== where.userId) return false;
          if (where.storyId && item.storyId !== where.storyId) return false;
          if (where.choiceId && item.choiceId !== where.choiceId) return false;
          if (where.requestKey && item.requestKey !== where.requestKey) return false;
          if (where.state && item.state !== where.state) return false;
          if (where.expiresAt?.gt) {
            return new Date(item.expiresAt).getTime() > new Date(where.expiresAt.gt).getTime();
          }
          return true;
        }) || null;
        return row ? deepClone(row) : null;
      }),
    },
    $transaction: jest.fn(async (callback: any) => {
      let releaseQueue: (() => void) | undefined;
      const nextQueue = new Promise<void>((resolve) => {
        releaseQueue = resolve;
      });
      const previousQueue = transactionQueue;
      transactionQueue = nextQueue;
      await previousQueue;

      const workingState = deepClone(state);
      const tx = createTx(workingState);
      try {
        const result = await callback(tx);
        state = workingState;
        if (releaseQueue) {
          releaseQueue();
        }
        return result;
      } catch (error) {
        if (releaseQueue) {
          releaseQueue();
        }
        throw error;
      }
    }),
    __setState(nextState: Partial<FakeDbState>) {
      state = createInitialState(nextState);
    },
    __getState() {
      return deepClone(state);
    },
    __setFailNextProgressUpsert() {
      failNextProgressUpsert = true;
    },
    __getCallCounts() {
      return { ...callCounts };
    },
  };

  return prisma;
}

describe("InteractiveStoriesService", () => {
  let prisma: ReturnType<typeof createFakePrisma>;
  let service: InteractiveStoriesService;
  const originalTokenUnlockEnv = process.env.INTERACTIVE_TOKEN_UNLOCK_ENABLED;

  beforeEach(() => {
    process.env.INTERACTIVE_TOKEN_UNLOCK_ENABLED = "";
    prisma = createFakePrisma();
    service = new InteractiveStoriesService(prisma as unknown as PrismaService);
  });

  afterAll(() => {
    if (typeof originalTokenUnlockEnv === "undefined") {
      delete process.env.INTERACTIVE_TOKEN_UNLOCK_ENABLED;
      return;
    }
    process.env.INTERACTIVE_TOKEN_UNLOCK_ENABLED = originalTokenUnlockEnv;
  });

  it("returns SSR-safe published snapshot detail and hides unapproved nodes from counts", async () => {
    prisma.__setState({
      stories: [
        createPublishedSnapshotFixture({
          targetNodeStatus: "approved",
        }),
      ],
    });

    const result = await service.getStoryBySlug("solar-wind-first-contact", {
      includeAdult: false,
    });

    expect(result?.title).toBe("Solar Wind");
    expect(result?.nodeCount).toBe(2);
    expect(result?.endingsCount).toBe(1);
  });

  it("builds public start progress with readable fallback choice descriptions", async () => {
    const result = await service.getPublicStartProgress("solar-wind-first-contact", {
      includeAdult: false,
    });

    expect(result?.node.title).toBe("Relay Entrance");
    expect(result?.node.content).toBe("Fallback start text.");
    expect(result?.node.choices).toHaveLength(2);
    expect(result?.node.choices[0].description).toBe("Leads to Scan Results.");
    expect(result?.node.choices[1].description).toBe("Leads to Scan Results.");
  });

  it("blocks public choice submission when target node is not approved", async () => {
    prisma.__setState({
      stories: [
        createPublishedSnapshotFixture({
          targetNodeStatus: "draft",
        }),
      ],
      progress: [
        {
          id: "progress-1",
          userId: "user-1",
          storyId: "story-1",
          currentNodeId: "story-1-node-1",
          lastGeneratedText: "Fallback start text.",
        },
      ],
      states: [
        {
          id: "state-1",
          userId: "user-1",
          storyId: "story-1",
          state: { trust: 0, clues: 0, flags: [] },
          flags: [],
        },
      ],
    });

    const result = await service.submitChoice(
      {
        storySlug: "solar-wind-first-contact",
        userId: "user-1",
        choiceId: "story-1-choice-1",
        idempotencyKey: "req-1",
      },
      { includeAdult: false },
    );

    expect(result).toEqual({
      ok: false,
      reason: "TARGET_NODE_NOT_AVAILABLE",
    });
  });

  it("returns request in progress for an active scoped processing record without side effects", async () => {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    prisma.__setState({
      idempotency: [
        {
          id: "idem-processing-1",
          scopedKey:
            "interactive_choice_submit:user-1:story-1:story-1-node-1:story-1-choice-1:req-processing",
          operation: "interactive_choice_submit",
          userId: "user-1",
          storyId: "story-1",
          fromNodeId: "story-1-node-1",
          choiceId: "story-1-choice-1",
          requestKey: "req-processing",
          state: "processing",
          responseJson: null,
          expiresAt,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    const result = await service.submitChoice(
      {
        storySlug: "solar-wind-first-contact",
        userId: "user-1",
        choiceId: "story-1-choice-1",
        idempotencyKey: "req-processing",
      },
      { includeAdult: false },
    );

    expect(result).toEqual({
      ok: false,
      reason: "REQUEST_IN_PROGRESS",
    });

    const persisted = prisma.__getState();
    const calls = prisma.__getCallCounts();
    expect(persisted.progress).toHaveLength(0);
    expect(persisted.choiceLogs).toHaveLength(0);
    expect(persisted.unlocks).toHaveLength(0);
    expect(calls.progressUpsert).toBe(0);
    expect(calls.choiceLogCreate).toBe(0);
    expect(calls.unlockCreate).toBe(0);
  });

  it("replays identical response for the same request key after the first completion", async () => {
    const first = await service.submitChoice(
      {
        storySlug: "solar-wind-first-contact",
        userId: "user-1",
        choiceId: "story-1-choice-1",
        idempotencyKey: "idem-1",
      },
      { includeAdult: false },
    );

    expect(first.ok).toBe(true);

    const second = await service.submitChoice(
      {
        storySlug: "solar-wind-first-contact",
        userId: "user-1",
        choiceId: "story-1-choice-1",
        idempotencyKey: "idem-1",
      },
      { includeAdult: false },
    );

    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.replay).toBe(true);
      expect(second.progress.node.id).toBe("story-1-node-2");
    }
  });

  it("keeps the same request key isolated across different stories", async () => {
    prisma.__setState({
      stories: [
        createPublishedSnapshotFixture({
          storyId: "story-a",
          slug: "story-a",
          title: "Story A",
          seriesId: "series-a",
        }),
        createPublishedSnapshotFixture({
          storyId: "story-b",
          slug: "story-b",
          title: "Story B",
          seriesId: "series-b",
        }),
      ],
    });

    const first = await service.submitChoice(
      {
        storySlug: "story-a",
        userId: "user-1",
        choiceId: "story-a-choice-1",
        idempotencyKey: "shared-request-key",
      },
      { includeAdult: false },
    );
    const second = await service.submitChoice(
      {
        storySlug: "story-b",
        userId: "user-1",
        choiceId: "story-b-choice-1",
        idempotencyKey: "shared-request-key",
      },
      { includeAdult: false },
    );

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.progress.story.slug).toBe("story-b");
    }

    const persisted = prisma.__getState().idempotency;
    expect(persisted).toHaveLength(2);
    expect(
      persisted.map((item) => item.storyId).sort(),
    ).toEqual(["story-a", "story-b"]);
  });

  it("rolls back token charge side effects when progress update fails", async () => {
    process.env.INTERACTIVE_TOKEN_UNLOCK_ENABLED = "1";
    prisma.__setState({
      wallets: [
        {
          id: "wallet-user-1",
          userId: "user-1",
          paidPts: 50,
          bonusPts: 0,
          plan: "free",
        },
      ],
    });
    prisma.__setFailNextProgressUpsert();

    await expect(
      service.submitChoice(
        {
          storySlug: "solar-wind-first-contact",
          userId: "user-1",
          choiceId: "story-1-choice-token",
          idempotencyKey: "rollback-choice",
        },
        { includeAdult: false },
      ),
    ).rejects.toThrow("progress update failed");

    const persisted = prisma.__getState();
    expect(persisted.wallets[0].paidPts).toBe(50);
    expect(persisted.unlocks).toHaveLength(0);
    expect(persisted.choiceLogs).toHaveLength(0);
    expect(persisted.progress).toHaveLength(0);
    expect(persisted.idempotency).toHaveLength(0);
  });

  it("keeps token choice locked behind coming soon when token unlock is disabled", async () => {
    prisma.__setState({
      wallets: [
        {
          id: "wallet-user-1",
          userId: "user-1",
          paidPts: 50,
          bonusPts: 0,
          plan: "free",
        },
      ],
    });

    const result = await service.submitChoice(
      {
        storySlug: "solar-wind-first-contact",
        userId: "user-1",
        choiceId: "story-1-choice-token",
        idempotencyKey: "token-coming-soon",
      },
      { includeAdult: false },
    );

    expect(result).toEqual({
      ok: false,
      reason: "TOKEN_UNLOCK_COMING_SOON",
    });

    const persisted = prisma.__getState();
    const calls = prisma.__getCallCounts();
    expect(persisted.wallets[0].paidPts).toBe(50);
    expect(persisted.unlocks).toHaveLength(0);
    expect(persisted.choiceLogs).toHaveLength(0);
    expect(persisted.idempotency).toHaveLength(0);
    expect(calls.walletUpsert).toBe(0);
    expect(calls.unlockCreate).toBe(0);
  });

  it("concurrent same-key token submits execute side effects once and return a replay", async () => {
    process.env.INTERACTIVE_TOKEN_UNLOCK_ENABLED = "1";
    prisma.__setState({
      wallets: [
        {
          id: "wallet-user-1",
          userId: "user-1",
          paidPts: 50,
          bonusPts: 0,
          plan: "free",
        },
      ],
    });

    const [first, second] = await Promise.all([
      service.submitChoice(
        {
          storySlug: "solar-wind-first-contact",
          userId: "user-1",
          choiceId: "story-1-choice-token",
          idempotencyKey: "same-key",
        },
        { includeAdult: false },
      ),
      service.submitChoice(
        {
          storySlug: "solar-wind-first-contact",
          userId: "user-1",
          choiceId: "story-1-choice-token",
          idempotencyKey: "same-key",
        },
        { includeAdult: false },
      ),
    ]);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);

    const persisted = prisma.__getState();
    const calls = prisma.__getCallCounts();
    expect(persisted.wallets[0].paidPts).toBe(20);
    expect(persisted.unlocks).toHaveLength(1);
    expect(persisted.choiceLogs).toHaveLength(1);
    expect(persisted.idempotency).toHaveLength(1);
    expect(calls.walletUpsert).toBe(1);
    expect(calls.choiceLogCreate).toBe(1);
    if (second.ok) {
      expect(second.replay).toBe(true);
    }
  });

  it("concurrent different-key token submits still charge once because unlock persists inside the same transaction flow", async () => {
    process.env.INTERACTIVE_TOKEN_UNLOCK_ENABLED = "1";
    prisma.__setState({
      wallets: [
        {
          id: "wallet-user-1",
          userId: "user-1",
          paidPts: 50,
          bonusPts: 0,
          plan: "free",
        },
      ],
    });

    const [first, second] = await Promise.all([
      service.submitChoice(
        {
          storySlug: "solar-wind-first-contact",
          userId: "user-1",
          choiceId: "story-1-choice-token",
          idempotencyKey: "different-key-a",
        },
        { includeAdult: false },
      ),
      service.submitChoice(
        {
          storySlug: "solar-wind-first-contact",
          userId: "user-1",
          choiceId: "story-1-choice-token",
          idempotencyKey: "different-key-b",
        },
        { includeAdult: false },
      ),
    ]);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);

    const persisted = prisma.__getState();
    const calls = prisma.__getCallCounts();
    expect(persisted.wallets[0].paidPts).toBe(20);
    expect(persisted.unlocks).toHaveLength(1);
    expect(persisted.choiceLogs).toHaveLength(1);
    expect(persisted.idempotency).toHaveLength(2);
    expect(calls.walletUpsert).toBe(1);
    expect(calls.unlockCreate).toBe(1);
    if (second.ok) {
      expect(second.replay).toBe(true);
    }
  });
});
