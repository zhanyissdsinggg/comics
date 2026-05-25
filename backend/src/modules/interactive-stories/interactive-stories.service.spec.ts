import { PrismaService } from "../../common/prisma/prisma.service";
import { InteractiveAiService } from "./interactive-ai.service";
import { InteractiveStoriesService } from "./interactive-stories.service";

function createStoryFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "story-1",
    seriesId: "series-011",
    slug: "solar-wind-first-contact",
    title: "Solar Wind",
    description: "Interactive branch.",
    coverImage: "/covers/solar-wind.jpg",
    genre: "Sci-Fi",
    contentMode: "normal",
    status: "published",
    baseContext: "Ship enters dark relay.",
    initialNodeId: "node-1",
    initialState: { trust: 0, clues: 0, flags: [] },
    isPublished: true,
    aiEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    nodes: [
      {
        id: "node-1",
        storyId: "story-1",
        nodeKey: "relay_entrance",
        title: "Relay Entrance",
        body: "Fallback start text.",
        imageUrl: "/nodes/start.jpg",
        endingType: null,
        orderIndex: 0,
        baseContext: "The relay crackles.",
        basePrompt: "Write setup.",
        fallbackText: "Fallback start text.",
        requiredFlags: [],
        blockedFlags: [],
        stateEffects: {},
        sortOrder: 0,
        isEnding: false,
        aiEnabled: true,
        reviewStatus: "approved",
        createdAt: new Date(),
        updatedAt: new Date(),
        panels: [
          {
            id: "panel-1",
            storyId: "story-1",
            nodeId: "node-1",
            panelNumber: 1,
            promptJson: {},
            imageUrl: "/panels/start-raw.jpg",
            finalImageUrl: "/panels/start-final.jpg",
            dialogue: "Stay sharp. The relay is waking up.",
            reviewStatus: "approved",
            provider: "openai",
            model: "gpt-image-1",
            seed: 7,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: "panel-2",
            storyId: "story-1",
            nodeId: "node-1",
            panelNumber: 2,
            promptJson: {},
            imageUrl: "/panels/start-draft.jpg",
            finalImageUrl: null,
            dialogue: "This draft should never leak.",
            reviewStatus: "draft",
            provider: "openai",
            model: "gpt-image-1",
            seed: 8,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
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
            orderIndex: 0,
            requiredFlags: [],
            blockedFlags: [],
            stateEffects: { trust: 1, flags: ["scan_selected"] },
            sortOrder: 0,
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
        body: "Fallback next text.",
        imageUrl: "/nodes/scan.jpg",
        endingType: "good",
        orderIndex: 1,
        baseContext: "Signal reveals map fragment.",
        basePrompt: "Write discovery.",
        fallbackText: "Fallback next text.",
        requiredFlags: [],
        blockedFlags: [],
        stateEffects: { clues: 1 },
        sortOrder: 1,
        isEnding: true,
        aiEnabled: true,
        reviewStatus: "approved",
        createdAt: new Date(),
        updatedAt: new Date(),
        panels: [
          {
            id: "panel-3",
            storyId: "story-1",
            nodeId: "node-2",
            panelNumber: 1,
            promptJson: {},
            imageUrl: "/panels/end-raw.jpg",
            finalImageUrl: "/panels/end-final.jpg",
            dialogue: "The chamber answers with one clean tone.",
            reviewStatus: "approved",
            provider: "openai",
            model: "gpt-image-1",
            seed: 9,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        choices: [],
      },
    ],
    ...overrides,
  };
}

describe("InteractiveStoriesService", () => {
  let service: InteractiveStoriesService;
  let prisma: any;
  let interactiveAiService: { generateSegment: jest.Mock };

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
      storyGenerationLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    interactiveAiService = {
      generateSegment: jest.fn(),
    };

    service = new InteractiveStoriesService(
      prisma as unknown as PrismaService,
      interactiveAiService as unknown as InteractiveAiService,
    );
  });

  it("lists public stories for a content mode", async () => {
    prisma.interactiveStory.findMany.mockResolvedValue([
      {
        id: "story-1",
        slug: "solar-wind-first-contact",
        title: "Solar Wind",
        description: "Interactive branch.",
        coverImage: "/covers/solar-wind.jpg",
        genre: "Sci-Fi",
        contentMode: "normal",
        status: "published",
        seriesId: "series-011",
        updatedAt: new Date(),
      },
    ]);

    const result = await service.listStories("normal", "");

    expect(prisma.interactiveStory.findMany).toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0].contentMode).toBe("normal");
  });

  it("scopes list queries to the requested content mode and text filters", async () => {
    prisma.interactiveStory.findMany.mockResolvedValue([]);

    await service.listStories("adult", " velvet  after   dark ");

    expect(prisma.interactiveStory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          contentMode: "adult",
          OR: [
            { title: { contains: "velvet after dark", mode: "insensitive" } },
            { slug: { contains: "velvet after dark", mode: "insensitive" } },
            { description: { contains: "velvet after dark", mode: "insensitive" } },
            { genre: { contains: "velvet after dark", mode: "insensitive" } },
          ],
        }),
      }),
    );
  });

  it("filters series lookups by the requested content mode", async () => {
    prisma.interactiveStory.findFirst.mockResolvedValue({
      id: "story-2",
      slug: "velvet-after-dark",
      title: "Velvet After Dark",
      description: "Adults only.",
      coverImage: "/covers/velvet.jpg",
      genre: "Drama",
      contentMode: "adult",
      status: "published",
      seriesId: "series-adult",
    });

    const result = await service.getStoryBySeries("series-adult", "adult");

    expect(prisma.interactiveStory.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          seriesId: "series-adult",
          contentMode: "adult",
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        contentMode: "adult",
        slug: "velvet-after-dark",
      }),
    );
  });

  it("filters out unapproved AI draft nodes from the public graph query", async () => {
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
      pathJson: ["node-1"],
      choicesJson: [],
      lastChoiceAt: null,
      lastGeneratedText: "Fallback start text.",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prisma.userStoryState.create.mockResolvedValue({
      id: "state-1",
    });

    await service.getOrInitProgressBySlug(
      "solar-wind-first-contact",
      "user-1",
      "normal",
    );

    expect(prisma.interactiveStory.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          nodes: expect.objectContaining({
            where: {
              reviewStatus: "approved",
            },
            include: expect.objectContaining({
              panels: expect.objectContaining({
                where: {
                  reviewStatus: "approved",
                },
              }),
            }),
          }),
        }),
      }),
    );
  });

  it("returns only approved panels in public progress payloads", async () => {
    const story = createStoryFixture();
    prisma.interactiveStory.findFirst.mockResolvedValue(story);
    prisma.userStoryProgress.findUnique.mockResolvedValue({
      id: "progress-1",
      userId: "user-1",
      storyId: "story-1",
      currentNodeId: "node-1",
      lastChoiceId: null,
      pathJson: ["node-1"],
      choicesJson: [],
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

    const result = await service.getOrInitProgressBySlug(
      "solar-wind-first-contact",
      "user-1",
      "normal",
    );

    expect(result?.node.panels).toEqual([
      {
        id: "panel-1",
        panelNumber: 1,
        imageUrl: "/panels/start-final.jpg",
        dialogue: "Stay sharp. The relay is waking up.",
      },
    ]);
    expect(JSON.stringify(result?.node.panels || [])).not.toContain("draft");
    expect(JSON.stringify(result?.node.panels || [])).not.toContain("never leak");
  });

  it("filters out choices blocked by required or blocked flags in public progress", async () => {
    const baseStory = createStoryFixture();
    const story = {
      ...baseStory,
      nodes: [
        {
          ...baseStory.nodes[0],
          choices: [
            {
              ...baseStory.nodes[0].choices[0],
              id: "choice-visible",
              choiceKey: "visible_path",
              label: "Visible path",
              requiredFlags: [],
              blockedFlags: [],
            },
            {
              ...baseStory.nodes[0].choices[0],
              id: "choice-required",
              choiceKey: "needs_badge",
              label: "Needs badge",
              requiredFlags: ["badge"],
              blockedFlags: [],
            },
            {
              ...baseStory.nodes[0].choices[0],
              id: "choice-blocked",
              choiceKey: "blocked_path",
              label: "Blocked path",
              requiredFlags: [],
              blockedFlags: ["scan_selected"],
            },
          ],
        },
        baseStory.nodes[1],
      ],
    };
    prisma.interactiveStory.findFirst.mockResolvedValue(story);
    prisma.userStoryProgress.findUnique.mockResolvedValue({
      id: "progress-1",
      userId: "user-1",
      storyId: "story-1",
      currentNodeId: "node-1",
      lastChoiceId: null,
      pathJson: ["node-1"],
      choicesJson: [],
      lastChoiceAt: null,
      lastGeneratedText: "Fallback start text.",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prisma.userStoryState.findUnique.mockResolvedValue({
      id: "state-1",
      userId: "user-1",
      storyId: "story-1",
      state: { trust: 0, clues: 0, flags: ["scan_selected"] },
      flags: ["scan_selected"],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.getOrInitProgressBySlug(
      "solar-wind-first-contact",
      "user-1",
      "normal",
    );

    expect(result?.node.choices).toEqual([
      expect.objectContaining({
        id: "choice-visible",
        key: "visible_path",
      }),
    ]);
  });

  it("initializes user progress on first interactive entry with path tracking", async () => {
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
      pathJson: ["node-1"],
      choicesJson: [],
      lastChoiceAt: null,
      lastGeneratedText: "Fallback start text.",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prisma.userStoryState.create.mockResolvedValue({
      id: "state-1",
    });

    const result = await service.getOrInitProgress("story-1", "user-1");

    expect(prisma.userStoryProgress.create).toHaveBeenCalled();
    expect(result?.node.id).toBe("node-1");
    expect(result?.path).toEqual(["node-1"]);
    expect(result?.choices).toEqual([]);
  });

  it("gets progress by slug within the requested content mode", async () => {
    const story = createStoryFixture({ slug: "slug-story", contentMode: "adult" });
    prisma.interactiveStory.findFirst.mockResolvedValue(story);
    prisma.userStoryProgress.findUnique.mockResolvedValue({
      id: "progress-1",
      userId: "user-1",
      storyId: "story-1",
      currentNodeId: "node-1",
      lastChoiceId: null,
      pathJson: ["node-1"],
      choicesJson: [],
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

    const result = await service.getOrInitProgressBySlug(
      "slug-story",
      "user-1",
      "adult",
    );

    expect(prisma.interactiveStory.findFirst).toHaveBeenCalled();
    expect(result?.story.contentMode).toBe("adult");
  });

  it("builds public story summaries from approved nodes only", async () => {
    const baseStory = createStoryFixture({
      slug: "public-summary-story",
      initialNodeId: "node-hidden",
    });
    const story = {
      ...baseStory,
      nodes: [
        {
          ...baseStory.nodes[0],
          id: "node-hidden",
          nodeKey: "hidden_start",
          title: "Hidden Start",
          isEnding: false,
          reviewStatus: "draft",
        },
        {
          ...baseStory.nodes[1],
          id: "node-public-end",
          nodeKey: "public_end",
          title: "Public End",
          isEnding: true,
          reviewStatus: "approved",
        },
      ],
    };
    prisma.interactiveStory.findFirst.mockResolvedValue(story);

    const result = await service.getStoryBySlug("public-summary-story", "normal");

    expect(result).toEqual(
      expect.objectContaining({
        slug: "public-summary-story",
        startNodeKey: "public_end",
        nodeCount: 2,
        endingCount: 1,
      }),
    );
  });

  it("submits a choice, advances node, and persists merged story state plus path", async () => {
    const story = createStoryFixture();
    prisma.interactiveStory.findFirst.mockResolvedValue(story);
    prisma.userStoryProgress.findUnique.mockResolvedValue({
      id: "progress-1",
      userId: "user-1",
      storyId: "story-1",
      currentNodeId: "node-1",
      lastChoiceId: null,
      pathJson: ["node-1"],
      choicesJson: [],
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
    interactiveAiService.generateSegment.mockResolvedValue({
      content: "AI generated continuation.",
      choiceLabelOverrides: {},
      status: "success",
      provider: "openai",
      model: "gpt-4o-mini",
      prompt: "prompt",
      rawResponse: "{\"content\":\"AI generated continuation.\"}",
      errorMessage: null,
      latencyMs: 120,
    });
    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback({
        userStoryProgress: { upsert: prisma.userStoryProgress.upsert },
        userStoryState: { upsert: prisma.userStoryState.upsert },
        userStoryChoiceLog: { create: prisma.userStoryChoiceLog.create },
        storyGenerationLog: { create: prisma.storyGenerationLog.create },
      }),
    );

    const result = await service.submitChoice("story-1", "user-1", "choice-1");

    expect(prisma.userStoryProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          currentNodeId: "node-2",
          pathJson: ["node-1", "node-2"],
          choicesJson: ["choice-1"],
        }),
      }),
    );
    expect(result?.node.id).toBe("node-2");
    expect(result?.path).toEqual(["node-1", "node-2"]);
    expect(result?.choices).toEqual(["choice-1"]);
    expect(result?.state.trust).toBe(1);
    expect(result?.state.clues).toBe(1);
  });

  it("returns null when persisted current node is no longer publicly approved", async () => {
    const baseStory = createStoryFixture();
    const story = {
      ...baseStory,
      nodes: [
        {
          ...baseStory.nodes[0],
          reviewStatus: "approved",
        },
        {
          ...baseStory.nodes[1],
          reviewStatus: "rejected",
        },
      ],
    };
    prisma.interactiveStory.findFirst.mockResolvedValue(story);
    prisma.userStoryProgress.findUnique.mockResolvedValue({
      id: "progress-1",
      userId: "user-1",
      storyId: "story-1",
      currentNodeId: "node-2",
      lastChoiceId: "choice-1",
      pathJson: ["node-1", "node-2"],
      choicesJson: ["choice-1"],
      lastChoiceAt: new Date(),
      lastGeneratedText: "Should not leak.",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prisma.userStoryState.findUnique.mockResolvedValue({
      id: "state-1",
      userId: "user-1",
      storyId: "story-1",
      state: { trust: 1, clues: 1, flags: ["scan_selected"] },
      flags: ["scan_selected"],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.getOrInitProgressBySlug(
      "solar-wind-first-contact",
      "user-1",
      "normal",
    );

    expect(result).toBeNull();
  });

  it("blocks public choice traversal into a non-approved target node", async () => {
    const baseStory = createStoryFixture();
    const story = {
      ...baseStory,
      nodes: [
        baseStory.nodes[0],
        {
          ...baseStory.nodes[1],
          reviewStatus: "draft",
        },
      ],
    };
    prisma.interactiveStory.findFirst.mockResolvedValue(story);
    prisma.userStoryProgress.findUnique.mockResolvedValue({
      id: "progress-1",
      userId: "user-1",
      storyId: "story-1",
      currentNodeId: "node-1",
      lastChoiceId: null,
      pathJson: ["node-1"],
      choicesJson: [],
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

    const result = await service.submitChoiceBySlug(
      "solar-wind-first-contact",
      "user-1",
      "choice-1",
      "normal",
    );

    expect(result).toBeNull();
    expect(interactiveAiService.generateSegment).not.toHaveBeenCalled();
  });
});
