import { JwtService } from "@nestjs/jwt";
import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ContentCacheInvalidationService } from "../../../common/cache/content-cache-invalidation.service";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { InteractiveAiService } from "../../interactive-stories/interactive-ai.service";
import { AdminAuthGuard } from "../guards/admin-auth.guard";
import { AdminInteractiveStoriesController } from "./admin-interactive-stories.controller";

describe("AdminInteractiveStoriesController", () => {
  let controller: AdminInteractiveStoriesController;
  let prisma: Record<string, any>;
  let cacheInvalidation: { invalidateSeriesContent: jest.Mock };
  let interactiveAiService: {
    generateDraftNode: jest.Mock;
    generateStoryboard: jest.Mock;
    generatePanelImage: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      series: {
        findUnique: jest.fn().mockResolvedValue({ id: "series-011" }),
      },
      interactiveStory: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({
          id: "story-1",
          slug: "test-story",
          title: "Test Story",
          contentMode: "normal",
          status: "draft",
          seriesId: "series-011",
          nodes: [],
        }),
        create: jest.fn().mockResolvedValue({
          id: "story-1",
          slug: "test-story",
          title: "Test Story",
          targetAudience: "Teens 13-17",
          contentMode: "normal",
          status: "draft",
          seriesId: "series-011",
          nodes: [],
        }),
      },
      interactiveStoryNode: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({
          id: "node-1",
          storyId: "story-1",
          nodeKey: "start",
          title: "Start",
          body: "Updated body",
          imageUrl: null,
          endingType: null,
          orderIndex: 0,
          generatedByAI: true,
          reviewStatus: "approved",
          editorNotes: "Reviewed by editor",
          choices: [],
        }),
        create: jest.fn().mockResolvedValue({
          id: "node-1",
          storyId: "story-1",
          nodeKey: "start",
          title: "Start",
          body: "Start body",
          imageUrl: null,
          endingType: null,
          orderIndex: 0,
          generatedByAI: false,
          reviewStatus: "approved",
          editorNotes: null,
          choices: [],
        }),
      },
      interactiveStoryChoice: {
        create: jest.fn().mockResolvedValue({
          id: "choice-generated-1",
        }),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      interactivePanel: {
        upsert: jest.fn(),
      },
      storyGenerationLog: {
        create: jest.fn().mockResolvedValue({
          id: "log-1",
        }),
        updateMany: jest.fn().mockResolvedValue({
          count: 1,
        }),
      },
      $transaction: jest.fn(),
    };

    cacheInvalidation = {
      invalidateSeriesContent: jest.fn().mockResolvedValue(undefined),
    };

    interactiveAiService = {
      generateDraftNode: jest.fn(),
      generateStoryboard: jest.fn(),
      generatePanelImage: jest.fn(),
    };

    const builder = Test.createTestingModule({
      controllers: [AdminInteractiveStoriesController],
      providers: [
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue("token"),
            verify: jest.fn().mockReturnValue({ sub: "admin", role: "admin" }),
          },
        },
        { provide: PrismaService, useValue: prisma },
        { provide: InteractiveAiService, useValue: interactiveAiService },
        {
          provide: ContentCacheInvalidationService,
          useValue: cacheInvalidation,
        },
      ],
    });

    builder.overrideGuard(AdminAuthGuard).useValue({ canActivate: () => true });

    const module: TestingModule = await builder.compile();
    controller = module.get(AdminInteractiveStoriesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("creates story and invalidates series cache", async () => {
    const result = await controller.create({
      story: {
        slug: "test-story",
        title: "Test Story",
        seriesId: "series-011",
      },
    });

    expect(prisma.interactiveStory.create).toHaveBeenCalled();
    expect(cacheInvalidation.invalidateSeriesContent).toHaveBeenCalledWith(
      ["series-011"],
      "admin-interactive-story-change",
    );
    expect(result.story.id).toBe("story-1");
  });

  it("lists stories with pagination payload", async () => {
    prisma.interactiveStory.findMany.mockResolvedValueOnce([
      {
        id: "story-1",
        slug: "test-story",
        title: "Test Story",
      },
    ]);
    prisma.interactiveStory.count.mockResolvedValueOnce(1);

    const result = await controller.list("", "", "", "1", "20");

    expect(result.stories).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
  });

  it("creates node for story and invalidates series cache", async () => {
    prisma.interactiveStory.findUnique.mockResolvedValueOnce({
      id: "story-1",
      seriesId: "series-011",
    });

    const result = await controller.createNode("story-1", {
      node: {
        nodeKey: "start",
        title: "Start Node",
      },
    });

    expect(prisma.interactiveStoryNode.create).toHaveBeenCalled();
    expect(cacheInvalidation.invalidateSeriesContent).toHaveBeenCalledWith(
      ["series-011"],
      "admin-interactive-story-change",
    );
    expect(result.node.id).toBe("node-1");
  });

  it("returns validation result for a story graph", async () => {
    prisma.interactiveStory.findUnique.mockResolvedValueOnce({
      id: "story-1",
      initialNodeId: "node-1",
      nodes: [
        {
          id: "node-1",
          nodeKey: "start",
          isEnding: false,
          choices: [{ choiceKey: "c1", targetNodeId: "node-2" }],
        },
        {
          id: "node-2",
          nodeKey: "end",
          isEnding: true,
          choices: [],
        },
      ],
    });

    const result = await controller.validate("story-1");
    expect(result.validation.ok).toBe(true);
  });

  it("blocks publish update when validation has errors", async () => {
    prisma.interactiveStory.findUnique
      .mockResolvedValueOnce({
        id: "story-1",
        seriesId: "series-011",
      })
      .mockResolvedValueOnce({
        id: "story-1",
        initialNodeId: "missing-node",
        nodes: [],
      });

    await expect(
      controller.update("story-1", {
        story: { isPublished: true },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.interactiveStory.update).not.toHaveBeenCalled();
  });

  it("generates AI draft node without linking it to the public choice", async () => {
    prisma.interactiveStory.findUnique
      .mockResolvedValueOnce({
        id: "story-1",
        slug: "test-story",
        title: "Test Story",
        genre: "Sci-Fi",
        targetAudience: "Teens 13-17",
        contentMode: "normal",
        baseContext: "A relay station goes dark.",
        seriesId: "series-011",
      })
      .mockResolvedValueOnce({
        id: "story-1",
        slug: "test-story",
        title: "Test Story",
        targetAudience: "Teens 13-17",
        contentMode: "normal",
        baseContext: "A relay station goes dark.",
        nodes: [],
        generationLogs: [],
      });
    prisma.interactiveStoryNode.findFirst.mockResolvedValueOnce({
      id: "node-1",
      storyId: "story-1",
      nodeKey: "relay_entrance",
      title: "Relay Entrance",
      body: "You arrive at the relay.",
      fallbackText: "You arrive at the relay.",
      baseContext: "Dark relay corridor.",
      basePrompt: "Keep suspense high.",
      orderIndex: 0,
      sortOrder: 0,
      story: {
        id: "story-1",
        slug: "test-story",
        title: "Test Story",
        genre: "Sci-Fi",
        targetAudience: "Teens 13-17",
        contentMode: "normal",
        baseContext: "A relay station goes dark.",
        seriesId: "series-011",
      },
      choices: [
        {
          id: "choice-1",
          choiceKey: "scan_signal",
          label: "Scan the signal",
          description: "Look deeper first.",
        },
      ],
    });
    prisma.interactiveStoryNode.findMany.mockResolvedValueOnce([
      {
        id: "node-1",
        nodeKey: "relay_entrance",
        title: "Relay Entrance",
        body: "You arrive at the relay.",
        baseContext: "Dark relay corridor.",
      },
    ]);
    interactiveAiService.generateDraftNode.mockResolvedValue({
      title: "The Hidden Echo",
      body: "A faint harmonic answers the scan from somewhere behind the wall.",
      choices: [
        { label: "Trace the echo", description: "Follow the sound source." },
        { label: "Call the crew", description: "Bring backup before moving." },
      ],
      safetyNotes: "Teen-safe suspense only.",
      responseJson: {
        title: "The Hidden Echo",
        body: "A faint harmonic answers the scan from somewhere behind the wall.",
        choices: [
          { label: "Trace the echo", description: "Follow the sound source." },
          { label: "Call the crew", description: "Bring backup before moving." },
        ],
        safety_notes: "Teen-safe suspense only.",
      },
      status: "success",
      provider: "openai",
      model: "gpt-4o-mini",
      prompt: "prompt",
      rawResponse: "{\"title\":\"The Hidden Echo\"}",
      errorMessage: null,
      latencyMs: 210,
    });
    prisma.interactiveStoryNode.create.mockResolvedValueOnce({
      id: "node-generated-1",
    });
    prisma.interactiveStoryNode.findUnique.mockResolvedValueOnce({
      id: "node-generated-1",
      storyId: "story-1",
      nodeKey: "test-story-relay-entrance-scan-signal-ai-draft-abc",
      title: "The Hidden Echo",
      body: "A faint harmonic answers the scan from somewhere behind the wall.",
      imageUrl: null,
      endingType: null,
      orderIndex: 1,
      baseContext: "A faint harmonic answers the scan from somewhere behind the wall.",
      basePrompt: "Keep suspense high.",
      fallbackText: "A faint harmonic answers the scan from somewhere behind the wall.",
      requiredFlags: [],
      blockedFlags: [],
      stateEffects: {},
      sortOrder: 1,
      isEnding: false,
      aiEnabled: true,
      generatedByAI: true,
      reviewStatus: "pending_review",
      editorNotes: "Check pacing.",
      createdAt: new Date(),
      updatedAt: new Date(),
      choices: [
        {
          id: "choice-generated-1",
          nodeId: "node-generated-1",
          targetNodeId: null,
          choiceKey: "ai-choice-1",
          label: "Trace the echo",
          description: "Follow the sound source.",
          requiresPremium: false,
          requiresTokens: 0,
          orderIndex: 0,
          requiredFlags: [],
          blockedFlags: [],
          stateEffects: {},
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });
    prisma.storyGenerationLog.create.mockResolvedValueOnce({
      id: "log-1",
      reviewStatus: "pending_review",
    });
    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback({
        interactiveStoryNode: {
          create: prisma.interactiveStoryNode.create,
          findUnique: prisma.interactiveStoryNode.findUnique,
        },
        interactiveStoryChoice: {
          create: prisma.interactiveStoryChoice.create,
        },
        storyGenerationLog: {
          create: prisma.storyGenerationLog.create,
        },
      }),
    );

    const result = await controller.generateNode("story-1", {
      input: {
        fromNodeId: "node-1",
        choiceId: "choice-1",
        desiredLength: 240,
        editorNotes: "Check pacing.",
      },
    });

    expect(interactiveAiService.generateDraftNode).toHaveBeenCalledWith(
      expect.objectContaining({
        story: expect.objectContaining({
          contentMode: "normal",
          targetAudience: "Teens 13-17",
        }),
        selectedChoice: expect.objectContaining({
          id: "choice-1",
        }),
      }),
    );
    expect(prisma.interactiveStoryChoice.create).toHaveBeenCalledTimes(2);
    expect(result.generatedNode?.reviewStatus).toBe("pending_review");
    expect(result.linkedToChoice).toBe(false);
  });

  it("records failed draft generation attempts", async () => {
    prisma.interactiveStory.findUnique.mockResolvedValueOnce({
      id: "story-1",
      slug: "test-story",
      title: "Test Story",
      genre: "Sci-Fi",
      targetAudience: "Teens 13-17",
      contentMode: "normal",
      baseContext: "A relay station goes dark.",
      seriesId: "series-011",
    });
    prisma.interactiveStoryNode.findFirst.mockResolvedValueOnce({
      id: "node-1",
      storyId: "story-1",
      nodeKey: "relay_entrance",
      title: "Relay Entrance",
      body: "You arrive at the relay.",
      fallbackText: "You arrive at the relay.",
      baseContext: "Dark relay corridor.",
      basePrompt: "Keep suspense high.",
      orderIndex: 0,
      sortOrder: 0,
      story: {
        id: "story-1",
        slug: "test-story",
        title: "Test Story",
        genre: "Sci-Fi",
        targetAudience: "Teens 13-17",
        contentMode: "normal",
        baseContext: "A relay station goes dark.",
        seriesId: "series-011",
      },
      choices: [
        {
          id: "choice-1",
          choiceKey: "scan_signal",
          label: "Scan the signal",
          description: "Look deeper first.",
        },
      ],
    });
    prisma.interactiveStoryNode.findMany.mockResolvedValueOnce([
      {
        id: "node-1",
        nodeKey: "relay_entrance",
        title: "Relay Entrance",
        body: "You arrive at the relay.",
        baseContext: "Dark relay corridor.",
      },
    ]);
    interactiveAiService.generateDraftNode.mockResolvedValue({
      title: "",
      body: "",
      choices: [],
      safetyNotes: "",
      responseJson: null,
      status: "fallback",
      provider: "openai",
      model: "gpt-4o-mini",
      prompt: "prompt",
      rawResponse: "",
      errorMessage: "invalid-draft-node-json",
      latencyMs: 120,
    });

    await expect(
      controller.generateNode("story-1", {
        input: {
          fromNodeId: "node-1",
          choiceId: "choice-1",
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.storyGenerationLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          generationType: "admin_next_node_draft",
          reviewStatus: "rejected",
          contentMode: "normal",
        }),
      }),
    );
  });

  it("syncs generation log review status when approving an AI node", async () => {
    prisma.interactiveStoryNode.findUnique.mockResolvedValueOnce({
      id: "node-1",
      storyId: "story-1",
      story: {
        seriesId: "series-011",
      },
    });

    const result = await controller.updateNode("node-1", {
      node: {
        reviewStatus: "approved",
        editorNotes: "Looks clean.",
      },
    });

    expect(prisma.interactiveStoryNode.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "node-1" },
      }),
    );
    expect(prisma.storyGenerationLog.updateMany).toHaveBeenCalledWith({
      where: {
        nodeId: "node-1",
        generationType: "admin_next_node_draft",
      },
      data: {
        reviewStatus: "approved",
      },
    });
    expect(cacheInvalidation.invalidateSeriesContent).toHaveBeenCalledWith(
      ["series-011"],
      "admin-interactive-story-change",
    );
    expect(result.node.reviewStatus).toBe("approved");
  });

  it("blocks attaching a choice to an unapproved AI node", async () => {
    prisma.interactiveStoryChoice.findUnique.mockResolvedValueOnce({
      id: "choice-1",
      nodeId: "node-1",
      node: {
        storyId: "story-1",
        story: { seriesId: "series-011" },
      },
    });
    prisma.interactiveStoryNode.findFirst.mockResolvedValueOnce({
      id: "node-ai-1",
      generatedByAI: true,
      reviewStatus: "pending_review",
    });

    await expect(
      controller.updateChoice("choice-1", {
        choice: {
          targetNodeId: "node-ai-1",
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.interactiveStoryChoice.update).not.toHaveBeenCalled();
  });

  it("allows attaching a choice to an approved AI node", async () => {
    prisma.interactiveStoryChoice.findUnique.mockResolvedValueOnce({
      id: "choice-1",
      nodeId: "node-1",
      node: {
        storyId: "story-1",
        story: { seriesId: "series-011" },
      },
    });
    prisma.interactiveStoryNode.findFirst.mockResolvedValueOnce({
      id: "node-ai-1",
      generatedByAI: true,
      reviewStatus: "approved",
    });
    prisma.interactiveStoryChoice.update.mockResolvedValueOnce({
      id: "choice-1",
      targetNodeId: "node-ai-1",
    });

    const result = await controller.updateChoice("choice-1", {
      choice: {
        targetNodeId: "node-ai-1",
      },
    });

    expect(prisma.interactiveStoryChoice.update).toHaveBeenCalledWith({
      where: { id: "choice-1" },
      data: expect.objectContaining({
        targetNode: {
          connect: {
            id: "node-ai-1",
          },
        },
      }),
    });
    expect(cacheInvalidation.invalidateSeriesContent).toHaveBeenCalledWith(
      ["series-011"],
      "admin-interactive-story-change",
    );
    expect(result.choice.targetNodeId).toBe("node-ai-1");
  });

  it("generates storyboard draft panels for a node", async () => {
    prisma.interactiveStoryNode.findFirst.mockResolvedValueOnce({
      id: "node-1",
      storyId: "story-1",
      nodeKey: "arrival",
      title: "Arrival",
      body: "The crew enters the silent station.",
      fallbackText: "The crew enters the silent station.",
      baseContext: "Silent station corridor.",
      story: {
        id: "story-1",
        title: "Test Story",
        genre: "Sci-Fi",
        targetAudience: "Teens 13-17",
        contentMode: "normal",
        seriesId: "series-011",
      },
      targetedBy: [
        {
          id: "choice-1",
          choiceKey: "scan_signal",
          label: "Scan the signal",
          description: "Look deeper first.",
        },
      ],
      panels: [],
    });
    prisma.interactiveStoryNode.findMany.mockResolvedValueOnce([
      {
        id: "node-1",
        nodeKey: "arrival",
        title: "Arrival",
        body: "The crew enters the silent station.",
        baseContext: "Silent station corridor.",
      },
    ]);
    interactiveAiService.generateStoryboard.mockResolvedValueOnce({
      panels: [
        {
          panelNumber: 1,
          character: "Rae and the crew",
          scene: "Silent station corridor with flickering lights",
          camera: "Wide establishing shot",
          emotion: "Uneasy curiosity",
          action: "The crew steps through the open blast door",
          style: "Teen sci-fi comic, clean inks, neon accents",
          dialogue: "Something feels off here.",
        },
      ],
      safetyNotes: "Teen-safe suspense only.",
      responseJson: { panels: [] },
      status: "success",
      provider: "openai",
      model: "gpt-5.4",
      prompt: "prompt",
      rawResponse: "{\"panels\":[]}",
      errorMessage: null,
      latencyMs: 300,
    });

    const result = await controller.generateStoryboard("story-1", "node-1", {
      input: { desiredPanelCount: 1 },
    });

    expect(interactiveAiService.generateStoryboard).toHaveBeenCalled();
    expect(result.storyboard.panels).toHaveLength(1);
    expect(result.storyboard.panels[0].reviewStatus).toBe("draft");
  });

  it("generates panel images into pending review state", async () => {
    prisma.interactiveStoryNode.findFirst.mockResolvedValueOnce({
      id: "node-1",
      storyId: "story-1",
      nodeKey: "arrival",
      title: "Arrival",
      body: "The crew enters the silent station.",
      fallbackText: "The crew enters the silent station.",
      baseContext: "Silent station corridor.",
      story: {
        id: "story-1",
        title: "Test Story",
        genre: "Sci-Fi",
        targetAudience: "Teens 13-17",
        contentMode: "normal",
        seriesId: "series-011",
      },
      targetedBy: [],
      panels: [
        {
          id: "panel-1",
          storyId: "story-1",
          nodeId: "node-1",
          panelNumber: 1,
          promptJson: {
            panelNumber: 1,
            character: "Rae and the crew",
            scene: "Silent station corridor with flickering lights",
            camera: "Wide establishing shot",
            emotion: "Uneasy curiosity",
            action: "The crew steps through the open blast door",
            style: "Teen sci-fi comic, clean inks, neon accents",
            dialogue: "Something feels off here.",
          },
          imageUrl: null,
          dialogue: "Something feels off here.",
          reviewStatus: "draft",
        },
      ],
    });
    interactiveAiService.generatePanelImage.mockResolvedValueOnce({
      imageBase64: "aGVsbG8=",
      revisedPrompt: "revised",
      provider: "openai",
      model: "gpt-image-1",
      prompt: "panel prompt",
      rawResponse: "{}",
      errorMessage: null,
      status: "success",
      latencyMs: 900,
    });
    prisma.interactivePanel.upsert.mockResolvedValueOnce({
      id: "panel-1",
      reviewStatus: "pending_review",
      imageUrl: "/uploads/interactive-panels/test.png",
    });
    prisma.interactiveStory.findUnique.mockResolvedValueOnce({
      id: "story-1",
      slug: "test-story",
      title: "Test Story",
      nodes: [],
      generationLogs: [],
    });

    const req = {
      protocol: "http",
      headers: { host: "localhost:4000" },
      get: (name: string) => (name === "host" ? "localhost:4000" : ""),
    } as any;

    const result = await controller.generatePanels(
      "story-1",
      "node-1",
      { input: {} },
      req,
    );

    expect(interactiveAiService.generatePanelImage).toHaveBeenCalled();
    expect(prisma.interactivePanel.upsert).toHaveBeenCalled();
    expect(result.panels[0].reviewStatus).toBe("pending_review");
  });
});
