import { JwtService } from "@nestjs/jwt";
import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ContentCacheInvalidationService } from "../../../common/cache/content-cache-invalidation.service";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { InteractiveAiService } from "../../interactive-stories/interactive-ai.service";
import { AdminAuthGuard } from "../guards/admin-auth.guard";
import { AdminInteractivePanelsController } from "./admin-interactive-panels.controller";

describe("AdminInteractivePanelsController", () => {
  let controller: AdminInteractivePanelsController;
  let prisma: Record<string, any>;
  let cacheInvalidation: { invalidateSeriesContent: jest.Mock };
  let interactiveAiService: { generatePanelImage: jest.Mock };

  beforeEach(async () => {
    prisma = {
      interactivePanel: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    cacheInvalidation = {
      invalidateSeriesContent: jest.fn().mockResolvedValue(undefined),
    };
    interactiveAiService = {
      generatePanelImage: jest.fn(),
    };

    const builder = Test.createTestingModule({
      controllers: [AdminInteractivePanelsController],
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
    controller = module.get(AdminInteractivePanelsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("approves a reviewed panel and copies final image url", async () => {
    prisma.interactivePanel.findUnique.mockResolvedValueOnce({
      id: "panel-1",
      storyId: "story-1",
      imageUrl: "/uploads/interactive-panels/panel-1.png",
      story: {
        seriesId: "series-011",
      },
    });
    prisma.interactivePanel.update.mockResolvedValueOnce({
      id: "panel-1",
      reviewStatus: "approved",
      finalImageUrl: "/uploads/interactive-panels/panel-1.png",
    });

    const result = await controller.approvePanel("panel-1", { panel: {} });

    expect(prisma.interactivePanel.update).toHaveBeenCalledWith({
      where: { id: "panel-1" },
      data: {
        reviewStatus: "approved",
        finalImageUrl: "/uploads/interactive-panels/panel-1.png",
      },
    });
    expect(result.panel.reviewStatus).toBe("approved");
  });

  it("approves a reviewed panel with an explicit published asset url", async () => {
    prisma.interactivePanel.findUnique.mockResolvedValueOnce({
      id: "panel-2",
      storyId: "story-1",
      imageUrl: "/uploads/interactive-panels/panel-2-draft.png",
      story: {
        seriesId: "series-011",
      },
    });
    prisma.interactivePanel.update.mockResolvedValueOnce({
      id: "panel-2",
      reviewStatus: "approved",
      finalImageUrl: "https://cdn.gush.test/final/panel-2.png",
    });

    const result = await controller.approvePanel("panel-2", {
      panel: {
        finalImageUrl: "https://cdn.gush.test/final/panel-2.png",
      },
    });

    expect(prisma.interactivePanel.update).toHaveBeenCalledWith({
      where: { id: "panel-2" },
      data: {
        reviewStatus: "approved",
        finalImageUrl: "https://cdn.gush.test/final/panel-2.png",
      },
    });
    expect(result.panel.finalImageUrl).toBe(
      "https://cdn.gush.test/final/panel-2.png",
    );
  });

  it("rejects a panel and clears the final image", async () => {
    prisma.interactivePanel.findUnique.mockResolvedValueOnce({
      id: "panel-1",
      storyId: "story-1",
      story: {
        seriesId: "series-011",
      },
    });
    prisma.interactivePanel.update.mockResolvedValueOnce({
      id: "panel-1",
      reviewStatus: "rejected",
      finalImageUrl: null,
    });

    const result = await controller.rejectPanel("panel-1");

    expect(result.panel.reviewStatus).toBe("rejected");
    expect(prisma.interactivePanel.update).toHaveBeenCalled();
  });

  it("rejects invalid publish asset urls during approve", async () => {
    prisma.interactivePanel.findUnique.mockResolvedValueOnce({
      id: "panel-3",
      storyId: "story-1",
      imageUrl: "/uploads/interactive-panels/normal/panel-3-draft.png",
      story: {
        seriesId: "series-011",
      },
    });

    await expect(
      controller.approvePanel("panel-3", {
        panel: {
          finalImageUrl: "javascript:alert(1)",
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.interactivePanel.update).not.toHaveBeenCalled();
  });

  it("rejects approve when no image asset exists", async () => {
    prisma.interactivePanel.findUnique.mockResolvedValueOnce({
      id: "panel-4",
      storyId: "story-1",
      imageUrl: null,
      story: {
        seriesId: "series-011",
      },
    });

    await expect(
      controller.approvePanel("panel-4", { panel: {} }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.interactivePanel.update).not.toHaveBeenCalled();
  });
});
