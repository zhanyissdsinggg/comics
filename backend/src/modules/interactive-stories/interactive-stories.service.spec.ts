import { PrismaService } from "../../common/prisma/prisma.service";
import { InteractiveAiService } from "./interactive-ai.service";
import { InteractiveStoriesService } from "./interactive-stories.service";

function createStoryFixture() {
  return {
    id: "story-1",
    seriesId: "series-011",
    slug: "solar-wind-first-contact",
    title: "Solar Wind",
    description: "Interactive branch.",
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
        baseContext: "Signal reveals map fragment.",
        basePrompt: "Write discovery.",
        fallbackText: "Fallback next text.",
        requiredFlags: [],
        blockedFlags: [],
        stateEffects: { clues: 1 },
        sortOrder: 1,
        isEnding: false,
        aiEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        choices: [
          {
            id: "choice-2",
            nodeId: "node-2",
            targetNodeId: "node-2",
            choiceKey: "continue",
            label: "Continue",
            description: null,
            requiredFlags: [],
            blockedFlags: [],
            stateEffects: {},
            sortOrder: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      },
    ],
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
    prisma.userStoryState.create.mockResolvedValue({
      id: "state-1",
    });

    const result = await service.getOrInitProgress("story-1", "user-1");

    expect(prisma.userStoryProgress.create).toHaveBeenCalled();
    expect(prisma.userStoryState.create).toHaveBeenCalled();
    expect(result?.node.id).toBe("node-1");
    expect(result?.node.choices).toHaveLength(1);
    expect(result?.state.trust).toBe(0);
  });

  it("submits a choice, advances node, and persists merged story state", async () => {
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

    expect(interactiveAiService.generateSegment).toHaveBeenCalled();
    expect(prisma.userStoryProgress.upsert).toHaveBeenCalled();
    expect(prisma.userStoryState.upsert).toHaveBeenCalled();
    expect(prisma.userStoryChoiceLog.create).toHaveBeenCalled();
    expect(prisma.storyGenerationLog.create).toHaveBeenCalled();
    expect(result?.node.id).toBe("node-2");
    expect(result?.node.content).toBe("AI generated continuation.");
    expect(result?.state.trust).toBe(1);
    expect(result?.state.clues).toBe(1);
    expect(Array.isArray(result?.flags)).toBe(true);
    expect(result?.flags).toContain("scan_selected");
  });

  it("returns fallback node text when ai generation fails", async () => {
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
    interactiveAiService.generateSegment.mockResolvedValue({
      content: "Fallback next text.",
      choiceLabelOverrides: {},
      status: "fallback",
      provider: "openai",
      model: "gpt-4o-mini",
      prompt: "prompt",
      rawResponse: "",
      errorMessage: "timeout",
      latencyMs: 8000,
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

    expect(result?.node.content).toBe("Fallback next text.");
    expect(prisma.storyGenerationLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "fallback",
          errorMessage: "timeout",
        }),
      }),
    );
  });
});
