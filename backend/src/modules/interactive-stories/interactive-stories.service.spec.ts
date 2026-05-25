import { PrismaService } from "../../common/prisma/prisma.service";
import { InteractiveStoriesService } from "./interactive-stories.service";

function createStoryFixture(overrides: Record<string, unknown> = {}) {
  const node2ReviewStatus = String(overrides.node2ReviewStatus || "approved");
  return {
    id: "story-1",
    seriesId: "series-011",
    slug: "solar-wind-first-contact",
    title: "Solar Wind",
    description: "Interactive branch.",
    baseContext: "Ship enters dark relay.",
    contentMode: "NORMAL",
    initialNodeId: "node-1",
    initialState: { trust: 0, clues: 0, flags: [] },
    isPublished: true,
    aiEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
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
        createdAt: new Date(),
        updatedAt: new Date(),
        choices: [
          {
            id: "choice-1",
            nodeId: "node-1",
            targetNodeId: "node-2",
            choiceKey: "scan_signal",
            label: "Run a deep scan.",
            description: null,
            requiresPremium: false,
            requiresTokens: 0,
            unlockLabel: null,
            requiredFlags: [],
            blockedFlags: [],
            stateEffects: { trust: 1, flags: ["scan_selected"] },
            sortOrder: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            targetNode: {
              id: "node-2",
              reviewStatus: node2ReviewStatus,
            },
          },
          {
            id: "choice-premium",
            nodeId: "node-1",
            targetNodeId: "node-2",
            choiceKey: "vip_route",
            label: "Take the premium route.",
            description: null,
            requiresPremium: true,
            requiresTokens: 0,
            unlockLabel: "Premium choice",
            requiredFlags: [],
            blockedFlags: [],
            stateEffects: {},
            sortOrder: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
            targetNode: {
              id: "node-2",
              reviewStatus: node2ReviewStatus,
            },
          },
          {
            id: "choice-token",
            nodeId: "node-1",
            targetNodeId: "node-2",
            choiceKey: "token_route",
            label: "Spend tokens.",
            description: null,
            requiresPremium: false,
            requiresTokens: 30,
            unlockLabel: "30 tokens",
            requiredFlags: [],
            blockedFlags: [],
            stateEffects: {},
            sortOrder: 2,
            createdAt: new Date(),
            updatedAt: new Date(),
            targetNode: {
              id: "node-2",
              reviewStatus: node2ReviewStatus,
            },
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
        reviewStatus: node2ReviewStatus,
        editorNotes: null,
        requiredFlags: [],
        blockedFlags: [],
        stateEffects: { clues: 1 },
        sortOrder: 1,
        isEnding: true,
        aiEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        choices: [],
      },
      {
        id: "node-3",
        storyId: "story-1",
        nodeKey: "draft_branch",
        title: "Draft Branch",
        baseContext: "This is still under review.",
        basePrompt: "Write draft.",
        fallbackText: "Draft text.",
        generatedByAI: true,
        reviewStatus: "draft",
        editorNotes: null,
        requiredFlags: [],
        blockedFlags: [],
        stateEffects: {},
        sortOrder: 2,
        isEnding: true,
        aiEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        choices: [],
      },
    ],
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
        create: jest.fn(),
        upsert: jest.fn(),
      },
      userStoryState: {
        findUnique: jest.fn(),
        create: jest.fn(),
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
        upsert: jest.fn(),
      },
      idempotencyKey: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    service = new InteractiveStoriesService(prisma as unknown as PrismaService);
  });

  it("initializes user progress on first interactive entry and only returns approved choices", async () => {
    const story = createStoryFixture();
    prisma.interactiveStory.findFirst.mockResolvedValue(story);
    prisma.userStoryProgress.findUnique.mockResolvedValue(null);
    prisma.userStoryState.findUnique.mockResolvedValue(null);
    prisma.userStoryProgress.create.mockResolvedValue({
      id: "progress-1",
      userId: "user-1",
      storyId: "story-1",
      currentNodeId: "node-1",
      lastChoiceId: null,
      lastChoiceAt: null,
      lastGeneratedText: "Fallback start text.",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prisma.userStoryState.create.mockResolvedValue({ id: "state-1" });

    const result = await service.getOrInitProgress("solar-wind-first-contact", "user-1", {
      includeAdult: false,
    });

    expect(prisma.userStoryProgress.create).toHaveBeenCalled();
    expect(prisma.userStoryState.create).toHaveBeenCalled();
    expect(result?.node.id).toBe("node-1");
    expect(result?.node.choices).toHaveLength(3);
    expect(result?.state.trust).toBe(0);
  });

  it("hides draft target nodes from public story detail counts", async () => {
    const story = createStoryFixture();
    prisma.interactiveStory.findFirst.mockResolvedValue(story);

    const result = await service.getStoryBySlug("solar-wind-first-contact", {
      includeAdult: false,
    });

    expect(result?.nodeCount).toBe(2);
    expect(result?.endingsCount).toBe(1);
  });

  it("submits a choice and replays the same response for matching idempotency key", async () => {
    const story = createStoryFixture();
    prisma.interactiveStory.findFirst.mockResolvedValue(story);
    prisma.userStoryProgress.findUnique.mockResolvedValue({
      id: "progress-1",
      userId: "user-1",
      storyId: "story-1",
      currentNodeId: "node-1",
      lastChoiceId: null,
      lastChoiceAt: null,
      lastGeneratedText: "Fallback start text.",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prisma.userStoryState.findUnique.mockResolvedValue({
      id: "state-1",
      userId: "user-1",
      storyId: "story-1",
      state: { trust: 0, clues: 0, flags: [] },
      flags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prisma.idempotencyKey.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
      response: JSON.stringify({
        progress: {
          story: { id: "story-1", slug: "solar-wind-first-contact", title: "Solar Wind", description: "", contentMode: "NORMAL", seriesId: "series-011" },
          state: { trust: 1, clues: 1, flags: ["scan_selected"], pathNodeIds: ["node-1", "node-2"], endingsReached: ["node-2"] },
          flags: ["scan_selected"],
          currentDepth: 2,
          endingsReached: 1,
          path: [{ nodeId: "node-1", nodeKey: "relay_entrance", title: "Relay Entrance", isEnding: false }, { nodeId: "node-2", nodeKey: "scan_results", title: "Scan Results", isEnding: true }],
          node: { id: "node-2", key: "scan_results", title: "Scan Results", content: "Fallback next text.", isEnding: true, reviewStatus: "approved", choices: [] },
        },
      }),
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback({
        userStoryProgress: { upsert: prisma.userStoryProgress.upsert },
        userStoryState: { upsert: prisma.userStoryState.upsert },
        userStoryChoiceLog: { create: prisma.userStoryChoiceLog.create },
      }),
    );

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
    expect(prisma.idempotencyKey.upsert).toHaveBeenCalled();

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

  it("blocks draft target node when public user submits a choice", async () => {
    const story = createStoryFixture({ node2ReviewStatus: "draft" });
    prisma.interactiveStory.findFirst.mockResolvedValue(story);
    prisma.userStoryProgress.findUnique.mockResolvedValue({
      id: "progress-1",
      userId: "user-1",
      storyId: "story-1",
      currentNodeId: "node-1",
      lastGeneratedText: "Fallback start text.",
    });
    prisma.userStoryState.findUnique.mockResolvedValue({
      id: "state-1",
      userId: "user-1",
      storyId: "story-1",
      state: { trust: 0, clues: 0, flags: [] },
      flags: [],
    });
    prisma.idempotencyKey.findUnique.mockResolvedValue(null);

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

  it("rejects premium choice unlock for users without active subscription", async () => {
    const story = createStoryFixture();
    prisma.interactiveStory.findFirst.mockResolvedValue(story);
    prisma.userStoryProgress.findUnique.mockResolvedValue({
      id: "progress-1",
      userId: "user-1",
      storyId: "story-1",
      currentNodeId: "node-1",
      lastGeneratedText: "Fallback start text.",
    });
    prisma.userStoryState.findUnique.mockResolvedValue({
      id: "state-1",
      userId: "user-1",
      storyId: "story-1",
      state: { trust: 0, clues: 0, flags: [] },
      flags: [],
    });

    const result = await service.unlockChoice(
      {
        storySlug: "solar-wind-first-contact",
        userId: "user-1",
        choiceId: "choice-premium",
      },
      { includeAdult: false },
    );

    expect(result).toEqual({
      ok: false,
      reason: "PREMIUM_REQUIRED",
    });
  });

  it("rejects token choice unlock for users without enough balance", async () => {
    const story = createStoryFixture();
    prisma.interactiveStory.findFirst.mockResolvedValue(story);
    prisma.userStoryProgress.findUnique.mockResolvedValue({
      id: "progress-1",
      userId: "user-1",
      storyId: "story-1",
      currentNodeId: "node-1",
      lastGeneratedText: "Fallback start text.",
    });
    prisma.userStoryState.findUnique.mockResolvedValue({
      id: "state-1",
      userId: "user-1",
      storyId: "story-1",
      state: { trust: 0, clues: 0, flags: [] },
      flags: [],
    });
    prisma.wallet.findUnique.mockResolvedValue({
      userId: "user-1",
      paidPts: 10,
      bonusPts: 5,
      plan: "free",
    });

    const result = await service.unlockChoice(
      {
        storySlug: "solar-wind-first-contact",
        userId: "user-1",
        choiceId: "choice-token",
      },
      { includeAdult: false },
    );

    expect(result).toEqual({
      ok: false,
      reason: "TOKENS_REQUIRED",
    });
  });

  it("rejects normal-mode access to adult interactive stories", async () => {
    prisma.interactiveStory.findFirst.mockResolvedValue(null);

    const result = await service.getStoryBySlug("adult-story", {
      includeAdult: false,
    });

    expect(result).toBeNull();
    expect(prisma.interactiveStory.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          slug: "adult-story",
          contentMode: "NORMAL",
        }),
      }),
    );
  });

  it("rejects adult-mode access to normal interactive stories", async () => {
    prisma.interactiveStory.findFirst.mockResolvedValue(null);

    const result = await service.getStoryBySlug("normal-story", {
      includeAdult: true,
    });

    expect(result).toBeNull();
    expect(prisma.interactiveStory.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          slug: "normal-story",
          contentMode: "ADULT",
        }),
      }),
    );
  });
});
