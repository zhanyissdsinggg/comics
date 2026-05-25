import {
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { Request } from "express";
import { ContentCacheInvalidationService } from "../../../common/cache/content-cache-invalidation.service";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { buildPublicAssetUrl } from "../../../common/utils/public-asset-url";
import { InteractiveAiService } from "../../interactive-stories/interactive-ai.service";
import { RequireAdminPermissions } from "../decorators/admin-permissions.decorator";
import { AdminAuthGuard } from "../guards/admin-auth.guard";
import { AdminPermission } from "../permissions/admin-permissions";

type UpdatePanelReviewInput = {
  finalImageUrl?: string | null;
};

function normalizeText(value: unknown): string {
  return String(value || "").trim();
}

function normalizeNullableText(value: unknown): string | null {
  const text = normalizeText(value);
  return text || null;
}

function normalizeContentMode(value: unknown): "normal" | "adult" {
  return normalizeText(value).toLowerCase() === "adult" ? "adult" : "normal";
}

function isValidPublicAssetUrl(value: string): boolean {
  const url = normalizeText(value);
  if (!url) {
    return false;
  }
  if (url.startsWith("/")) {
    return true;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

@Controller("admin/interactive-panels")
@UseGuards(AdminAuthGuard)
@RequireAdminPermissions(AdminPermission.INTERACTIVE_STORY_UPDATE)
export class AdminInteractivePanelsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contentCacheInvalidation: ContentCacheInvalidationService,
    private readonly interactiveAiService: InteractiveAiService,
  ) {}

  private async invalidateSeriesContent(seriesIds: Array<string | null | undefined>) {
    const validIds = [
      ...new Set(
        (Array.isArray(seriesIds) ? seriesIds : [])
          .map((item) => normalizeText(item))
          .filter(Boolean),
      ),
    ];
    if (validIds.length === 0) {
      return;
    }
    await this.contentCacheInvalidation.invalidateSeriesContent(
      validIds,
      "admin-interactive-story-change",
    );
  }

  private getInteractiveUploadsDir() {
    const fs = require("fs") as typeof import("fs");
    const path = require("path") as typeof import("path");
    const dir = path.join(process.cwd(), "public", "uploads", "interactive-panels");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  private buildPanelSeed() {
    return Math.floor(Date.now() % 2147483647);
  }

  private async savePanelImageAsset(
    req: Request | undefined,
    contentMode: "normal" | "adult",
    storyId: string,
    nodeId: string,
    panelNumber: number,
    imageBase64: string,
  ) {
    const fs = require("fs") as typeof import("fs");
    const path = require("path") as typeof import("path");
    const baseDir = this.getInteractiveUploadsDir();
    const safeStoryId = normalizeText(storyId).replace(/[^a-zA-Z0-9_-]+/g, "-");
    const safeNodeId = normalizeText(nodeId).replace(/[^a-zA-Z0-9_-]+/g, "-");
    const safeMode = normalizeContentMode(contentMode);
    const dir = path.join(baseDir, safeMode);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const filename = `${safeMode}-${safeStoryId}-${safeNodeId}-panel-${panelNumber}-${Date.now()}.png`;
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, Buffer.from(imageBase64, "base64"));
    return buildPublicAssetUrl(req, `/uploads/interactive-panels/${safeMode}/${filename}`);
  }

  private async loadPanel(panelId: string) {
    const panel = await (this.prisma as any).interactivePanel.findUnique({
      where: { id: normalizeText(panelId) },
      include: {
        story: {
          select: {
            id: true,
            title: true,
            genre: true,
            targetAudience: true,
            contentMode: true,
            seriesId: true,
          },
        },
        node: {
          select: {
            id: true,
            nodeKey: true,
            title: true,
            body: true,
            fallbackText: true,
            baseContext: true,
          },
        },
      },
    });

    if (!panel) {
      throw new NotFoundException("Interactive panel not found");
    }

    return panel;
  }

  @Post(":panelId/approve")
  async approvePanel(
    @Param("panelId") panelIdParam: string,
    @Body() body: { panel?: UpdatePanelReviewInput },
  ) {
    const panelId = normalizeText(panelIdParam);
    const existing = await this.loadPanel(panelId);

    const requestedFinalImageUrl = normalizeNullableText(body?.panel?.finalImageUrl);
    if (requestedFinalImageUrl && !isValidPublicAssetUrl(requestedFinalImageUrl)) {
      throw new BadRequestException("finalImageUrl must be a public absolute URL or root-relative asset path");
    }

    const finalImageUrl = requestedFinalImageUrl || existing.imageUrl || null;
    if (!finalImageUrl) {
      throw new BadRequestException("Cannot approve panel without a generated image asset");
    }
    const panel = await (this.prisma as any).interactivePanel.update({
      where: { id: panelId },
      data: {
        reviewStatus: "approved",
        finalImageUrl,
      },
    });

    await this.invalidateSeriesContent([existing.story.seriesId]);
    return { panel };
  }

  @Post(":panelId/reject")
  async rejectPanel(@Param("panelId") panelIdParam: string) {
    const panelId = normalizeText(panelIdParam);
    const existing = await this.loadPanel(panelId);

    const panel = await (this.prisma as any).interactivePanel.update({
      where: { id: panelId },
      data: {
        reviewStatus: "rejected",
        finalImageUrl: null,
      },
    });

    await this.invalidateSeriesContent([existing.story.seriesId]);
    return { panel };
  }

  @Post(":panelId/regenerate")
  async regeneratePanel(
    @Param("panelId") panelIdParam: string,
    @Req() req: Request,
  ) {
    const panelId = normalizeText(panelIdParam);
    const existing = await this.loadPanel(panelId);
    const promptJsonValue =
      existing.promptJson
      && typeof existing.promptJson === "object"
      && !Array.isArray(existing.promptJson)
        ? (existing.promptJson as Record<string, unknown>)
        : {};
    const seed = this.buildPanelSeed();

    const aiResult = await this.interactiveAiService.generatePanelImage({
      story: {
        id: existing.story.id,
        title: existing.story.title,
        genre: normalizeText(existing.story.genre),
        targetAudience:
          normalizeText(existing.story.targetAudience)
          || (normalizeContentMode(existing.story.contentMode) === "adult"
            ? "Adults 18+"
            : "Teens 13-17"),
        contentMode: normalizeContentMode(existing.story.contentMode),
      },
      node: {
        id: existing.node.id,
        key: existing.node.nodeKey,
        title: existing.node.title,
        body: normalizeText(existing.node.body || existing.node.fallbackText || existing.node.baseContext),
      },
      panel: {
        panelNumber: Number(promptJsonValue.panelNumber || existing.panelNumber),
        character: normalizeText(promptJsonValue.character),
        scene: normalizeText(promptJsonValue.scene),
        camera: normalizeText(promptJsonValue.camera),
        emotion: normalizeText(promptJsonValue.emotion),
        action: normalizeText(promptJsonValue.action),
        style: normalizeText(promptJsonValue.style),
        dialogue: normalizeText(promptJsonValue.dialogue || existing.dialogue),
      },
      promptJson: promptJsonValue,
      seed,
    });

    if (aiResult.status !== "success") {
      throw new BadRequestException({
        message: "Panel regeneration failed",
        error: aiResult.errorMessage || "panel-image-generation-failed",
      });
    }

    const imageUrl = await this.savePanelImageAsset(
      req,
      normalizeContentMode(existing.story.contentMode),
      existing.storyId,
      existing.nodeId,
      existing.panelNumber,
      aiResult.imageBase64,
    );

    const panel = await (this.prisma as any).interactivePanel.update({
      where: { id: panelId },
      data: {
        promptJson: {
          ...promptJsonValue,
          imagePrompt: aiResult.prompt,
          revisedPrompt: aiResult.revisedPrompt,
          seed,
        } as Prisma.InputJsonValue,
        imageUrl,
        finalImageUrl: null,
        reviewStatus: "pending_review",
        provider: aiResult.provider,
        model: aiResult.model,
        seed,
      },
    });

    await this.invalidateSeriesContent([existing.story.seriesId]);
    return { panel };
  }
}
