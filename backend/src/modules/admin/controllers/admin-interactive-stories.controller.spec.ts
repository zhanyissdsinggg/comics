import { JwtService } from "@nestjs/jwt";
import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ContentCacheInvalidationService } from "../../../common/cache/content-cache-invalidation.service";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { AdminAuthGuard } from "../guards/admin-auth.guard";
import { AdminInteractiveStoriesController } from "./admin-interactive-stories.controller";

describe("AdminInteractiveStoriesController", () => {
  let controller: AdminInteractiveStoriesController;
  let prisma: Record<string, any>;
  let cacheInvalidation: { invalidateSeriesContent: jest.Mock };

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
          seriesId: "series-011",
          nodes: [],
        }),
        create: jest.fn().mockResolvedValue({
          id: "story-1",
          slug: "test-story",
          title: "Test Story",
          seriesId: "series-011",
          nodes: [],
        }),
      },
      interactiveStoryNode: {
        create: jest.fn().mockResolvedValue({
          id: "node-1",
          storyId: "story-1",
          nodeKey: "start",
          title: "Start",
          choices: [],
        }),
      },
    };

    cacheInvalidation = {
      invalidateSeriesContent: jest.fn().mockResolvedValue(undefined),
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
});
