import { PrismaService } from "../../common/prisma/prisma.service";
import { InteractiveStoriesService } from "./interactive-stories.service";

function createStoryFixture(overrides: Record<string, unknown> = {}) {
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
          },
          {
            id: "choice-locked",
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
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      idempotencyKey: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    service = new InteractiveStoriesService(prisma as unknown as PrismaService);
  });

  it("initializes user progress on first interactive entry", async () => {
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
    expect(result?.node.choices).toHaveLength(2);
    expect(result?.state.trust).toBe(0);
  });

  it("submits a choice without calling AI and persists fallback node content", async () => {
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
    prisma.userStoryChoiceLog.findFirst.mockResolvedValue(null);
    prisma.idempotencyKey.findUnique.mockResolvedValue(null);
    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback({
        userStoryProgress: { upsert: prisma.userStoryProgress.upsert },
        userStoryState: { upsert: prisma.userStoryState.upsert },
        userStoryChoiceLog: { create: prisma.userStoryChoiceLog.create },
      }),
    );

    const result = await service.submitChoice(
      {
        storySlug: "solar-wind-first-contact",
        userId: "user-1",
        choiceId: "choice-1",
        idempotencyKey: "idem-1",
      },
      { includeAdult: false },
    );

    expect(prisma.userStoryProgress.upsert).toHaveBeenCalled();
    expect(prisma.userStoryState.upsert).toHaveBeenCalled();
    expect(prisma.userStoryChoiceLog.create).toHaveBeenCalled();
    expect(prisma.idempotencyKey.upsert).toHaveBeenCalled();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.progress.node.id).toBe("node-2");
      expect(result.progress.node.content).toBe("Fallback next text.");
      expect(result.progress.state.trust).toBe(1);
      expect(result.progress.state.clues).toBe(1);
    }
  });

  it("blocks locked premium choices for public submit", async () => {
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

    const result = await service.submitChoice(
      {
        storySlug: "solar-wind-first-contact",
        userId: "user-1",
        choiceId: "choice-locked",
      },
      { includeAdult: false },
    );

    expect(result).toEqual({
      ok: false,
      reason: "CHOICE_LOCKED",
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

  it("blocks duplicate choice submits within protection window", async () => {
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
    prisma.userStoryChoiceLog.findFirst.mockResolvedValue({ id: "recent-log" });

    const result = await service.submitChoice(
      {
        storySlug: "solar-wind-first-contact",
        userId: "user-1",
        choiceId: "choice-1",
        idempotencyKey: "idem-1",
      },
      { includeAdult: false },
    );

    expect(result).toEqual({
      ok: false,
      reason: "DUPLICATE_SUBMIT",
    });
  });
});
