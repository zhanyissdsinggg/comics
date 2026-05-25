import { JwtService } from "@nestjs/jwt";
import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ContentCacheInvalidationService } from "../../../common/cache/content-cache-invalidation.service";
import { resetAppConfigForTests } from "../../../common/config/app-config";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { checkRateLimit } from "../../../common/storage/limits";
import { InteractiveAiService } from "../../interactive-stories/interactive-ai.service";
import { AdminAuthGuard } from "../guards/admin-auth.guard";
import { AdminInteractiveStoriesController } from "./admin-interactive-stories.controller";

jest.mock("../../../common/storage/limits", () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ ok: true, retryAfterSec: 0 }),
}));

describe("AdminInteractiveStoriesController", () => {
  let controller: AdminInteractiveStoriesController;
  let prisma: Record<string, any>;
  let cacheInvalidation: { invalidateSeriesContent: jest.Mock };
  let interactiveAiService: { generateDraftNode: jest.Mock };

  beforeEach(async () => {
    process.env.ADMIN_CONTENT_GENERATOR_ENABLED = "1";
    process.env.REDIS_URL = "";
    resetAppConfigForTests();
    prisma = {
      series: {
        findUnique: jest.fn().mockResolvedValue({ id: "series-011", adult: false }),
      },
      interactiveStory: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({
          id: "story-1",
          slug: "test-story",
          title: "Test Story",
          seriesId: "series-011",
          contentMode: "NORMAL",
          targetAudience: "US teens",
          nodes: [],
        }),
        create: jest.fn().mockResolvedValue({
          id: "story-1",
          slug: "test-story",
          title: "Test Story",
          seriesId: "series-011",
          contentMode: "NORMAL",
          targetAudience: "US teens",
          nodes: [],
        }),
      },
      interactiveStoryNode: {
        create: jest.fn().mockResolvedValue({
          id: "node-1",
          storyId: "story-1",
          nodeKey: "start",
          title: "Start",
          generatedByAI: false,
          reviewStatus: "approved",
          editorNotes: null,
          choices: [],
        }),
        findUnique: jest.fn().mockResolvedValue({
          id: "node-draft",
          choices: [],
        }),
      },
      interactiveStoryChoice: {
        create: jest.fn().mockResolvedValue({ id: "choice-generated" }),
      },
      storyGenerationLog: {
        create: jest.fn().mockResolvedValue({ id: "log-1" }),
      },
    };

    cacheInvalidation = {
      invalidateSeriesContent: jest.fn().mockResolvedValue(undefined),
    };
    interactiveAiService = {
      generateDraftNode: jest.fn().mockResolvedValue({
        ok: true,
        status: "success",
        provider: "openai",
        model: "gpt-5.4",
        prompt: "prompt",
        rawResponse: "{\"title\":\"Draft\"}",
        errorMessage: null,
        latencyMs: 120,
        draft: {
          title: "Draft Node",
          body: "Draft body",
          choices: [
            { label: "Option A", description: "A" },
            { label: "Option B", description: "B" },
          ],
          safetyNotes: "safe",
        },
      }),
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
        {
          provide: ContentCacheInvalidationService,
          useValue: cacheInvalidation,
        },
        {
          provide: InteractiveAiService,
          useValue: interactiveAiService,
        },
      ],
    });

    builder.overrideGuard(AdminAuthGuard).useValue({ canActivate: () => true });

    const module: TestingModule = await builder.compile();
    controller = module.get(AdminInteractiveStoriesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.ADMIN_CONTENT_GENERATOR_ENABLED;
    delete process.env.REDIS_URL;
    resetAppConfigForTests();
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
          choices: [
            { choiceKey: "c1", targetNodeId: "node-2" },
            { choiceKey: "c2", targetNodeId: "node-2" },
          ],
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

  it("blocks publish when validation has errors", async () => {
    prisma.interactiveStory.findUnique
      .mockResolvedValueOnce({
        id: "story-1",
        seriesId: "series-011",
      });
    prisma.interactiveStory.findUnique.mockResolvedValueOnce({
      id: "story-1",
      seriesId: "series-011",
      slug: "test-story",
      title: "Test Story",
      description: null,
      baseContext: null,
      contentMode: "NORMAL",
      targetAudience: "US teens",
      initialNodeId: "missing-node",
      initialState: {},
      isPublished: false,
      aiEnabled: true,
      series: null,
      _count: { nodes: 0, progress: 0, generationLogs: 0 },
      nodes: [
        {
          id: "node-1",
          nodeKey: "start",
          title: "Start",
          baseContext: null,
          basePrompt: null,
          fallbackText: null,
          generatedByAI: false,
          reviewStatus: "draft",
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
              choiceKey: "c1",
              label: "Branch",
              description: null,
              requiresPremium: false,
              requiresTokens: 0,
              unlockLabel: null,
              requiredFlags: [],
              blockedFlags: [],
              stateEffects: {},
              sortOrder: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: "choice-2",
              nodeId: "node-1",
              targetNodeId: "node-2",
              choiceKey: "c2",
              label: "Branch two",
              description: null,
              requiresPremium: false,
              requiresTokens: 0,
              unlockLabel: null,
              requiredFlags: [],
              blockedFlags: [],
              stateEffects: {},
              sortOrder: 10,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          _count: { progress: 0, generationLogs: 0 },
        },
        {
          id: "node-2",
          nodeKey: "end",
          title: "End",
          baseContext: null,
          basePrompt: null,
          fallbackText: null,
          generatedByAI: false,
          reviewStatus: "pending_review",
          editorNotes: null,
          requiredFlags: [],
          blockedFlags: [],
          stateEffects: {},
          sortOrder: 10,
          isEnding: true,
          aiEnabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          choices: [],
          _count: { progress: 0, generationLogs: 0 },
        },
      ],
    });

    await expect(
      controller.publish("story-1", {
        publish: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.interactiveStory.update).not.toHaveBeenCalled();
  });

  it("rejects NORMAL story linked to adult series", async () => {
    prisma.series.findUnique.mockResolvedValueOnce({ id: "series-adult", adult: true });

    await expect(
      controller.create({
        story: {
          slug: "bad-story",
          title: "Bad Story",
          seriesId: "series-adult",
          contentMode: "NORMAL",
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("creates admin AI draft node in pending review", async () => {
    prisma.interactiveStory.findUnique.mockResolvedValueOnce({
      id: "story-1",
      title: "Test Story",
      seriesId: "series-011",
      contentMode: "NORMAL",
      targetAudience: "US teens",
      baseContext: "Base context",
      aiEnabled: true,
      series: { genres: ["Fantasy"] },
      nodes: [
        {
          id: "node-1",
          nodeKey: "start",
          title: "Start",
          baseContext: "Base node",
          fallbackText: "Fallback node",
          aiEnabled: true,
          sortOrder: 10,
          choices: [
            { id: "choice-1", label: "Go", description: "Go now" },
          ],
        },
      ],
    });

    const result = await controller.generateNodeDraft(
      "story-1",
      {
        fromNodeId: "node-1",
        choiceId: "choice-1",
        desiredLength: 180,
      },
      { headers: {}, user: { sub: "admin-1" } } as any,
    );

    expect(interactiveAiService.generateDraftNode).toHaveBeenCalled();
    expect(prisma.interactiveStoryNode.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          generatedByAI: true,
          reviewStatus: "pending_review",
        }),
      }),
    );
    expect(result.generation.ok).toBe(true);
  });

  it("blocks admin AI draft generation when rate limited", async () => {
    (checkRateLimit as jest.Mock).mockResolvedValueOnce({
      ok: false,
      retryAfterSec: 42,
    });

    await expect(
      controller.generateNodeDraft(
        "story-1",
        {
          fromNodeId: "node-1",
          choiceId: "choice-1",
          desiredLength: 180,
        },
        { headers: {}, user: { sub: "admin-1" } } as any,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
