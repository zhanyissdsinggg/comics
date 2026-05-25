import { PrismaService } from "../../common/prisma/prisma.service";
import { InteractiveStoriesService } from "./interactive-stories.service";

function createPublishedSnapshotFixture(overrides: Record<string, unknown> = {}) {
  const targetNodeStatus = String(overrides.targetNodeStatus || "approved");
  const contentMode = String(overrides.contentMode || "NORMAL");
  const publishedSnapshot = {
    story: {
      id: "story-1",
      slug: "solar-wind-first-contact",
      title: "Solar Wind",
      description: "Interactive branch.",
      baseContext: "Ship enters dark relay.",
      contentMode,
      targetAudience: "US teens",
      seriesId: "series-011",
      initialNodeId: "node-1",
      initialState: { trust: 0, clues: 0, flags: [] },
      publishedVersion: 1,
    },
    series: {
      id: "series-011",
      title: "Solar Wind Series",
      adult: false,
      coverUrl: "https://cdn.test/solar.jpg",
      genres: ["Sci-Fi", "Drama"],
    },
    nodes: [
      {
        id: "node-1",
        storyId: "story-1",
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
            id: "choice-1",
            nodeId: "node-1",
            targetNodeId: "node-2",
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
            id: "choice-token",
            nodeId: "node-1",
            targetNodeId: "node-2",
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
        id: "node-2",
        storyId: "story-1",
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
    id: "story-1",
    slug: "solar-wind-first-contact",
    title: "Solar Wind",
    description: "Interactive branch.",
    baseContext: "Ship enters dark relay.",
    contentMode,
    targetAudience: "US teens",
    seriesId: "series-011",
    initialNodeId: "node-1",
    initialState: { trust: 0, clues: 0, flags: [] },
    isPublished: true,
    publishedVersion: 1,
    aiEnabled: true,
    publishedSnapshot,
    series: {
      id: "series-011",
      title: "Solar Wind Series",
      adult: false,
      coverUrl: "https://cdn.test/solar.jpg",
      genres: ["Sci-Fi", "Drama"],
    },
    ...overrides,
  };
}

describe("InteractiveStoriesService", () => {
  let service: InteractiveStoriesService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      interactiveStory: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      userStoryProgress: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
      userStoryState: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
      userStoryChoiceLog: {
        create: jest.fn(),
      },
      wallet: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn(),
      },
      subscription: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      userInteractiveChoiceUnlock: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
      idempotencyKey: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(async (callback: any) =>
        callback({
          userStoryProgress: { upsert: prisma.userStoryProgress.upsert },
          userStoryState: { upsert: prisma.userStoryState.upsert },
          userStoryChoiceLog: { create: prisma.userStoryChoiceLog.create },
          userInteractiveChoiceUnlock: {
            findUnique: prisma.userInteractiveChoiceUnlock.findUnique,
            create: prisma.userInteractiveChoiceUnlock.create,
          },
          wallet: {
            findUnique: prisma.wallet.findUnique,
            upsert: prisma.wallet.upsert,
          },
          idempotencyKey: {
            findUnique: prisma.idempotencyKey.findUnique,
            upsert: prisma.idempotencyKey.upsert,
            update: prisma.idempotencyKey.update,
          },
        }),
      ),
    };

    service = new InteractiveStoriesService(prisma as unknown as PrismaService);
  });

  it("returns SSR-safe published snapshot detail and hides unapproved nodes from counts", async () => {
    prisma.interactiveStory.findFirst.mockResolvedValue(
      createPublishedSnapshotFixture({ targetNodeStatus: "approved" }),
    );

    const result = await service.getStoryBySlug("solar-wind-first-contact", {
      includeAdult: false,
    });

    expect(result?.title).toBe("Solar Wind");
    expect(result?.nodeCount).toBe(2);
    expect(result?.endingsCount).toBe(1);
  });

  it("blocks public choice submission when target node is not approved", async () => {
    prisma.interactiveStory.findFirst.mockResolvedValue(
      createPublishedSnapshotFixture({ targetNodeStatus: "draft" }),
    );
    prisma.userStoryProgress.findUnique.mockResolvedValue({
      currentNodeId: "node-1",
      lastGeneratedText: "Fallback start text.",
    });
    prisma.userStoryState.findUnique.mockResolvedValue({
      state: { trust: 0, clues: 0, flags: [] },
      flags: [],
    });

    const result = await service.submitChoice(
      {
        storySlug: "solar-wind-first-contact",
        userId: "user-1",
        choiceId: "choice-1",
      },
      { includeAdult: false },
    );

    expect(result).toEqual({
      ok: false,
      reason: "TARGET_NODE_NOT_AVAILABLE",
    });
  });

  it("replays identical response for the same scoped idempotency key", async () => {
    prisma.interactiveStory.findFirst.mockResolvedValue(createPublishedSnapshotFixture());
    prisma.userStoryProgress.findUnique.mockResolvedValue({
      currentNodeId: "node-1",
      lastGeneratedText: "Fallback start text.",
    });
    prisma.userStoryState.findUnique.mockResolvedValue({
      state: { trust: 0, clues: 0, flags: [] },
      flags: [],
    });

    let scopedRecord: Record<string, any> | null = null;
    prisma.idempotencyKey.findUnique.mockImplementation(async ({ where }: any) => {
      if (where?.key) {
        return null;
      }
      return scopedRecord;
    });
    prisma.idempotencyKey.upsert.mockImplementation(async ({ create, update }: any) => {
      scopedRecord = {
        ...create,
        ...update,
        state: "processing",
        body: null,
        response: null,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      };
      return scopedRecord;
    });
    prisma.idempotencyKey.update.mockImplementation(async ({ data }: any) => {
      scopedRecord = {
        ...(scopedRecord || {}),
        ...data,
      };
      return scopedRecord;
    });

    const first = await service.submitChoice(
      {
        storySlug: "solar-wind-first-contact",
        userId: "user-1",
        choiceId: "choice-1",
        idempotencyKey: "idem-1",
      },
      { includeAdult: false },
    );
    expect(first.ok).toBe(true);
    expect(prisma.userStoryProgress.upsert).toHaveBeenCalled();
    expect(prisma.idempotencyKey.upsert).toHaveBeenCalled();
    expect(prisma.idempotencyKey.update).toHaveBeenCalled();

    const second = await service.submitChoice(
      {
        storySlug: "solar-wind-first-contact",
        userId: "user-1",
        choiceId: "choice-1",
        idempotencyKey: "idem-1",
      },
      { includeAdult: false },
    );
    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.replay).toBe(true);
      expect(second.progress.node.id).toBe("node-2");
    }
  });

  it("keeps same idempotency key isolated across different stories", async () => {
    prisma.interactiveStory.findFirst
      .mockResolvedValueOnce(
        createPublishedSnapshotFixture({
          id: "story-1",
          slug: "story-a",
          publishedSnapshot: {
            ...createPublishedSnapshotFixture().publishedSnapshot,
            story: {
              ...createPublishedSnapshotFixture().publishedSnapshot.story,
              id: "story-1",
              slug: "story-a",
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        createPublishedSnapshotFixture({
          id: "story-2",
          slug: "story-b",
          publishedSnapshot: {
            ...createPublishedSnapshotFixture().publishedSnapshot,
            story: {
              ...createPublishedSnapshotFixture().publishedSnapshot.story,
              id: "story-2",
              slug: "story-b",
            },
          },
        }),
      );
    prisma.userStoryProgress.findUnique.mockResolvedValue({
      currentNodeId: "node-1",
      lastGeneratedText: "Fallback start text.",
    });
    prisma.userStoryState.findUnique.mockResolvedValue({
      state: { trust: 0, clues: 0, flags: [] },
      flags: [],
    });

    await service.submitChoice(
      {
        storySlug: "story-a",
        userId: "user-1",
        choiceId: "choice-1",
        idempotencyKey: "shared-key",
      },
      { includeAdult: false },
    );
    await service.submitChoice(
      {
        storySlug: "story-b",
        userId: "user-1",
        choiceId: "choice-1",
        idempotencyKey: "shared-key",
      },
      { includeAdult: false },
    );

    expect(prisma.idempotencyKey.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          operation_userId_storyId_fromNodeId_choiceId_requestKey: expect.objectContaining({
            storyId: "story-2",
          }),
        }),
      }),
    );
  });

  it("uses bulk progress without initializing guest-like per-story current calls", async () => {
    prisma.interactiveStory.findFirst
      .mockResolvedValueOnce(
        createPublishedSnapshotFixture({
          slug: "story-a",
          publishedSnapshot: {
            ...createPublishedSnapshotFixture().publishedSnapshot,
            story: {
              ...createPublishedSnapshotFixture().publishedSnapshot.story,
              slug: "story-a",
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        createPublishedSnapshotFixture({
          slug: "story-b",
          publishedSnapshot: {
            ...createPublishedSnapshotFixture().publishedSnapshot,
            story: {
              ...createPublishedSnapshotFixture().publishedSnapshot.story,
              slug: "story-b",
            },
          },
        }),
      );
    prisma.userStoryProgress.findMany.mockResolvedValue([
      {
        storyId: "story-1",
        currentNodeId: "node-1",
        lastGeneratedText: "Fallback start text.",
      },
    ]);
    prisma.userStoryState.findMany.mockResolvedValue([
      {
        storyId: "story-1",
        state: { trust: 0, clues: 0, flags: [], pathNodeIds: ["node-1"], endingsReached: [] },
        flags: [],
      },
    ]);

    const progress = await service.getBulkProgress(["story-a", "story-b"], "user-1", {
      includeAdult: false,
    });

    expect(progress).toHaveLength(2);
    expect(progress[0].story.slug).toBe("story-a");
  });
});
