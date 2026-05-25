import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { Request } from "express";
import { ContentCacheInvalidationService } from "../../../common/cache/content-cache-invalidation.service";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { buildPublicAssetUrl } from "../../../common/utils/public-asset-url";
import { InteractiveAiService } from "../../interactive-stories/interactive-ai.service";
import { validateInteractiveStoryGraph } from "../../interactive-stories/interactive-story-validation";
import { RequireAdminPermissions } from "../decorators/admin-permissions.decorator";
import { AdminAuthGuard } from "../guards/admin-auth.guard";
import { AdminPermission } from "../permissions/admin-permissions";

type AdminStoryInput = {
  slug?: string;
  title?: string;
  description?: string | null;
  coverImage?: string | null;
  genre?: string | null;
  targetAudience?: string | null;
  contentMode?: string | null;
  status?: string | null;
  baseContext?: string | null;
  seriesId?: string | null;
  initialNodeId?: string | null;
  initialState?: Record<string, unknown> | null;
  isPublished?: boolean;
  aiEnabled?: boolean;
};

type AdminNodeInput = {
  nodeKey?: string;
  title?: string;
  body?: string | null;
  imageUrl?: string | null;
  endingType?: string | null;
  orderIndex?: number;
  baseContext?: string | null;
  basePrompt?: string | null;
  fallbackText?: string | null;
  requiredFlags?: string[];
  blockedFlags?: string[];
  stateEffects?: Record<string, unknown> | null;
  sortOrder?: number;
  isEnding?: boolean;
  aiEnabled?: boolean;
  generatedByAI?: boolean;
  reviewStatus?: string | null;
  editorNotes?: string | null;
};

type AdminChoiceInput = {
  choiceKey?: string;
  label?: string;
  description?: string | null;
  targetNodeId?: string | null;
  requiresPremium?: boolean;
  requiresTokens?: number;
  orderIndex?: number;
  requiredFlags?: string[];
  blockedFlags?: string[];
  stateEffects?: Record<string, unknown> | null;
  sortOrder?: number;
};

type StoryImportPayload = {
  story?: AdminStoryInput & { id?: string };
  nodes?: Array<
    AdminNodeInput & {
      nodeKey: string;
      choices?: Array<
        AdminChoiceInput & {
          choiceKey: string;
          targetNodeKey?: string | null;
        }
      >;
    }
  >;
};

type GenerateNodeInput = {
  fromNodeId?: string;
  choiceId?: string;
  desiredLength?: number;
  editorNotes?: string | null;
};

type GenerateStoryboardInput = {
  choiceId?: string;
  desiredPanelCount?: number;
};

type GeneratePanelsInput = {
  regenerate?: boolean;
  panelNumbers?: number[];
};

type UpdatePanelReviewInput = {
  finalImageUrl?: string | null;
};

type StoryNodePanelContext = {
  id: string;
  storyId: string;
  nodeKey: string;
  title: string;
  body: string | null;
  fallbackText: string | null;
  baseContext: string | null;
  story: {
    id: string;
    title: string;
    genre: string | null;
    targetAudience: string | null;
    contentMode: string;
    seriesId: string | null;
  };
  targetedBy: Array<{
    id: string;
    choiceKey: string;
    label: string;
    description: string | null;
  }>;
  panels: Array<{
    id: string;
    storyId: string;
    nodeId: string;
    panelNumber: number;
    promptJson: Prisma.JsonValue;
    imageUrl: string | null;
    finalImageUrl: string | null;
    dialogue: string | null;
    reviewStatus: string;
    provider: string | null;
    model: string | null;
    seed: number | null;
    createdAt?: Date;
    updatedAt?: Date;
  }>;
};

const STORY_LIST_SELECT: Record<string, any> = {
  id: true,
  slug: true,
  title: true,
  description: true,
  coverImage: true,
  genre: true,
  targetAudience: true,
  contentMode: true,
  status: true,
  seriesId: true,
  initialNodeId: true,
  isPublished: true,
  aiEnabled: true,
  updatedAt: true,
  createdAt: true,
  series: {
    select: {
      id: true,
      title: true,
      type: true,
    },
  },
  _count: {
    select: {
      nodes: true,
      progress: true,
      generationLogs: true,
    },
  },
};

const STORY_DETAIL_SELECT: Record<string, any> = {
  ...STORY_LIST_SELECT,
  baseContext: true,
  initialState: true,
  targetAudience: true,
  generationLogs: {
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      userId: true,
      storyId: true,
      nodeId: true,
      choiceId: true,
      status: true,
      contentMode: true,
      generationType: true,
      provider: true,
      model: true,
      prompt: true,
      response: true,
      responseJson: true,
      safetyNotes: true,
      reviewStatus: true,
      errorMessage: true,
      latencyMs: true,
      createdAt: true,
      node: {
        select: {
          id: true,
          nodeKey: true,
          title: true,
        },
      },
      choice: {
        select: {
          id: true,
          nodeId: true,
          choiceKey: true,
          label: true,
          node: {
            select: {
              id: true,
              nodeKey: true,
              title: true,
            },
          },
        },
      },
    },
  },
  nodes: {
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      storyId: true,
      nodeKey: true,
      title: true,
      body: true,
      imageUrl: true,
      endingType: true,
      orderIndex: true,
      baseContext: true,
      basePrompt: true,
      fallbackText: true,
      requiredFlags: true,
      blockedFlags: true,
      stateEffects: true,
      sortOrder: true,
      isEnding: true,
      aiEnabled: true,
      generatedByAI: true,
      reviewStatus: true,
      editorNotes: true,
      createdAt: true,
      updatedAt: true,
      choices: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          nodeId: true,
          targetNodeId: true,
          choiceKey: true,
          label: true,
          description: true,
          requiresPremium: true,
          requiresTokens: true,
          orderIndex: true,
          requiredFlags: true,
          blockedFlags: true,
          stateEffects: true,
          sortOrder: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      panels: {
        orderBy: [{ panelNumber: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          storyId: true,
          nodeId: true,
          panelNumber: true,
          promptJson: true,
          imageUrl: true,
          finalImageUrl: true,
          dialogue: true,
          reviewStatus: true,
          provider: true,
          model: true,
          seed: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      _count: {
        select: {
          progress: true,
          generationLogs: true,
        },
      },
    },
  },
};

function normalizeText(value: unknown): string {
  return String(value || "").trim();
}

function normalizeNullableText(value: unknown): string | null {
  const text = normalizeText(value);
  return text || null;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return [
    ...new Set(
      value
        .map((item) => normalizeText(item))
        .filter(Boolean),
    ),
  ];
}

function normalizeJsonObject(value: unknown): Prisma.InputJsonValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Prisma.InputJsonValue;
}

function normalizeContentMode(value: unknown): "normal" | "adult" {
  return normalizeText(value).toLowerCase() === "adult" ? "adult" : "normal";
}

function normalizeStoryStatus(value: unknown, isPublished = false): string {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === "published" || normalized === "draft") {
    return normalized;
  }
  return isPublished ? "published" : "draft";
}

function normalizeReviewStatus(
  value: unknown,
  fallback: "draft" | "pending_review" | "approved" | "rejected" = "draft",
): "draft" | "pending_review" | "approved" | "rejected" {
  const normalized = normalizeText(value).toLowerCase();
  if (
    normalized === "draft"
    || normalized === "pending_review"
    || normalized === "approved"
    || normalized === "rejected"
  ) {
    return normalized;
  }
  return fallback;
}

function normalizeIntegerArray(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return [
    ...new Set(
      value
        .map((item) => Number.parseInt(String(item), 10))
        .filter((item) => Number.isFinite(item) && item > 0),
    ),
  ];
}

@Controller("admin/interactive-stories")
@UseGuards(AdminAuthGuard)
@RequireAdminPermissions(AdminPermission.INTERACTIVE_STORY_READ)
export class AdminInteractiveStoriesController {
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

  private async assertSeriesExists(seriesId: string | null | undefined) {
    const normalizedSeriesId = normalizeText(seriesId);
    if (!normalizedSeriesId) {
      return null;
    }
    const series = await this.prisma.series.findUnique({
      where: { id: normalizedSeriesId },
      select: { id: true },
    });
    if (!series) {
      throw new BadRequestException("seriesId does not exist");
    }
    return normalizedSeriesId;
  }

  private async assertInitialNodeBelongsToStory(
    storyId: string,
    initialNodeId: string | null | undefined,
  ): Promise<string | null> {
    const normalizedInitialNodeId = normalizeText(initialNodeId);
    if (!normalizedInitialNodeId) {
      return null;
    }

    const node = await this.prisma.interactiveStoryNode.findFirst({
      where: {
        id: normalizedInitialNodeId,
        storyId,
      },
      select: { id: true },
    });

    if (!node) {
      throw new BadRequestException("initialNodeId does not belong to this story");
    }
    return normalizedInitialNodeId;
  }

  private async loadStoryWithGraph(storyId: string) {
    const normalizedStoryId = normalizeText(storyId);
    if (!normalizedStoryId) {
      return null;
    }
    return this.prisma.interactiveStory.findUnique({
      where: { id: normalizedStoryId },
      select: STORY_DETAIL_SELECT,
    });
  }

  private async getStoryValidation(storyId: string) {
    const story = await this.loadStoryWithGraph(storyId);
    if (!story) {
      throw new NotFoundException("Interactive story not found");
    }
    return {
      story,
      validation: validateInteractiveStoryGraph(story as any),
    };
  }

  private async assertPublishReady(storyId: string) {
    const { validation } = await this.getStoryValidation(storyId);
    if (!validation.ok) {
      throw new BadRequestException({
        message: "Interactive story is not publish-ready",
        validation,
      });
    }
  }

  private buildDraftNodeKey(storySlug: string, fromNodeKey: string, choiceKey: string) {
    const base = [
      normalizeText(storySlug).toLowerCase(),
      normalizeText(fromNodeKey).toLowerCase(),
      normalizeText(choiceKey).toLowerCase(),
      "ai-draft",
      Date.now().toString(36),
    ]
      .join("-")
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^-+|-+$/g, "");

    return base.slice(0, 80) || `ai-draft-${Date.now().toString(36)}`;
  }

  private summarizeNodeBody(value: unknown) {
    return normalizeText(String(value || "").slice(0, 500));
  }

  private async loadStoryNodeForGeneration(
    storyId: string,
    fromNodeId: string,
    choiceId: string,
  ) {
    const node = await this.prisma.interactiveStoryNode.findFirst({
      where: {
        id: normalizeText(fromNodeId),
        storyId,
      },
      include: {
        story: {
          select: {
            id: true,
            slug: true,
            title: true,
            genre: true,
            targetAudience: true,
            contentMode: true,
            baseContext: true,
            seriesId: true,
          },
        },
        choices: {
          where: { id: normalizeText(choiceId) },
          orderBy: [{ orderIndex: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    if (!node) {
      throw new NotFoundException("Interactive node not found");
    }

    const selectedChoice = Array.isArray(node.choices) ? node.choices[0] : null;
    if (!selectedChoice) {
      throw new BadRequestException("choiceId does not belong to fromNodeId");
    }

    return {
      node,
      selectedChoice,
    };
  }

  private async loadPreviousNodesForGeneration(
    storyId: string,
    fromNodeId: string,
  ) {
    const nodes = await this.prisma.interactiveStoryNode.findMany({
      where: { storyId },
      orderBy: [{ orderIndex: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        nodeKey: true,
        title: true,
        body: true,
        baseContext: true,
      },
    });

    const targetIndex = nodes.findIndex((item) => item.id === fromNodeId);
    const slice = targetIndex >= 0 ? nodes.slice(0, targetIndex + 1) : nodes.slice(0, 1);
    return slice.slice(-5).map((item) => ({
      id: item.id,
      key: item.nodeKey,
      title: item.title,
      body: this.summarizeNodeBody(item.body || item.baseContext),
    }));
  }

  private async syncNodeReviewStatus(nodeId: string, reviewStatus: string) {
    const normalizedNodeId = normalizeText(nodeId);
    if (!normalizedNodeId) {
      return;
    }
    await this.prisma.storyGenerationLog.updateMany({
      where: {
        nodeId: normalizedNodeId,
        generationType: "admin_next_node_draft",
      },
      data: {
        reviewStatus: normalizeReviewStatus(reviewStatus),
      },
    });
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
    const dir = this.getInteractiveUploadsDir();
    const safeStoryId = normalizeText(storyId).replace(/[^a-zA-Z0-9_-]+/g, "-");
    const safeNodeId = normalizeText(nodeId).replace(/[^a-zA-Z0-9_-]+/g, "-");
    const safeMode = normalizeContentMode(contentMode);
    const filename = `${safeMode}-${safeStoryId}-${safeNodeId}-panel-${panelNumber}-${Date.now()}.png`;
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, Buffer.from(imageBase64, "base64"));
    return buildPublicAssetUrl(req, `/uploads/interactive-panels/${filename}`);
  }

  private buildPanelPromptJson(
    panel: {
      panelNumber: number;
      character: string;
      scene: string;
      camera: string;
      emotion: string;
      action: string;
      style: string;
      dialogue: string;
    },
    prompt: string,
    safetyNotes: string,
  ): Prisma.InputJsonValue {
    return {
      panelNumber: panel.panelNumber,
      character: panel.character,
      scene: panel.scene,
      camera: panel.camera,
      emotion: panel.emotion,
      action: panel.action,
      style: panel.style,
      dialogue: panel.dialogue,
      generationPrompt: prompt,
      safetyNotes,
      textOverlay: {
        enabled: true,
        renderInImage: false,
      },
    } as Prisma.InputJsonValue;
  }

  private async loadStoryNodeForPanels(
    storyId: string,
    nodeId: string,
  ): Promise<StoryNodePanelContext> {
    const normalizedStoryId = normalizeText(storyId);
    const normalizedNodeId = normalizeText(nodeId);
    const node = await this.prisma.interactiveStoryNode.findFirst({
      where: {
        id: normalizedNodeId,
        storyId: normalizedStoryId,
      },
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
        targetedBy: {
          select: {
            id: true,
            choiceKey: true,
            label: true,
            description: true,
          },
          orderBy: [{ createdAt: "asc" }],
          take: 1,
        },
        panels: {
          orderBy: [{ panelNumber: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    if (!node) {
      throw new NotFoundException("Interactive node not found");
    }

    return node as StoryNodePanelContext;
  }

  private toStoryCreateData(input: AdminStoryInput): Prisma.InteractiveStoryCreateInput {
    const slug = normalizeText(input?.slug);
    const title = normalizeText(input?.title);
    if (!slug || !title) {
      throw new BadRequestException("story.slug and story.title are required");
    }

    return {
      slug,
      title,
      description: normalizeNullableText(input?.description),
      coverImage: normalizeNullableText(input?.coverImage),
      genre: normalizeNullableText(input?.genre),
      targetAudience: normalizeNullableText(input?.targetAudience),
      contentMode: normalizeContentMode(input?.contentMode),
      status: normalizeStoryStatus(input?.status, Boolean(input?.isPublished)),
      baseContext: normalizeNullableText(input?.baseContext),
      initialState: normalizeJsonObject(input?.initialState),
      isPublished: Boolean(input?.isPublished),
      aiEnabled: input?.aiEnabled !== false,
    };
  }

  private toStoryUpdateData(input: AdminStoryInput): Prisma.InteractiveStoryUpdateInput {
    const data: Prisma.InteractiveStoryUpdateInput = {};

    if (Object.prototype.hasOwnProperty.call(input || {}, "slug")) {
      const slug = normalizeText(input?.slug);
      if (!slug) {
        throw new BadRequestException("story.slug cannot be empty");
      }
      data.slug = slug;
    }
    if (Object.prototype.hasOwnProperty.call(input || {}, "title")) {
      const title = normalizeText(input?.title);
      if (!title) {
        throw new BadRequestException("story.title cannot be empty");
      }
      data.title = title;
    }
    if (Object.prototype.hasOwnProperty.call(input || {}, "description")) {
      data.description = normalizeNullableText(input?.description);
    }
    if (Object.prototype.hasOwnProperty.call(input || {}, "coverImage")) {
      data.coverImage = normalizeNullableText(input?.coverImage);
    }
    if (Object.prototype.hasOwnProperty.call(input || {}, "genre")) {
      data.genre = normalizeNullableText(input?.genre);
    }
    if (Object.prototype.hasOwnProperty.call(input || {}, "targetAudience")) {
      data.targetAudience = normalizeNullableText(input?.targetAudience);
    }
    if (Object.prototype.hasOwnProperty.call(input || {}, "contentMode")) {
      data.contentMode = normalizeContentMode(input?.contentMode);
    }
    if (Object.prototype.hasOwnProperty.call(input || {}, "status")) {
      data.status = normalizeStoryStatus(
        input?.status,
        Object.prototype.hasOwnProperty.call(input || {}, "isPublished")
          ? Boolean(input?.isPublished)
          : false,
      );
    }
    if (Object.prototype.hasOwnProperty.call(input || {}, "baseContext")) {
      data.baseContext = normalizeNullableText(input?.baseContext);
    }
    if (Object.prototype.hasOwnProperty.call(input || {}, "initialState")) {
      data.initialState = normalizeJsonObject(input?.initialState);
    }
    if (Object.prototype.hasOwnProperty.call(input || {}, "isPublished")) {
      data.isPublished = Boolean(input?.isPublished);
    }
    if (Object.prototype.hasOwnProperty.call(input || {}, "aiEnabled")) {
      data.aiEnabled = Boolean(input?.aiEnabled);
    }

    return data;
  }

  private toNodeCreateData(storyId: string, input: AdminNodeInput): Prisma.InteractiveStoryNodeCreateInput {
    const nodeKey = normalizeText(input?.nodeKey);
    const title = normalizeText(input?.title);
    if (!nodeKey || !title) {
      throw new BadRequestException("node.nodeKey and node.title are required");
    }

    return {
      story: { connect: { id: storyId } },
      nodeKey,
      title,
      body: normalizeNullableText(input?.body),
      imageUrl: normalizeNullableText(input?.imageUrl),
      endingType: normalizeNullableText(input?.endingType),
      orderIndex: Number.isFinite(Number(input?.orderIndex))
        ? Number(input?.orderIndex)
        : Number.isFinite(Number(input?.sortOrder))
          ? Number(input?.sortOrder)
          : 0,
      baseContext: normalizeNullableText(input?.baseContext),
      basePrompt: normalizeNullableText(input?.basePrompt),
      fallbackText: normalizeNullableText(input?.fallbackText),
      requiredFlags: normalizeStringArray(input?.requiredFlags),
      blockedFlags: normalizeStringArray(input?.blockedFlags),
      stateEffects: normalizeJsonObject(input?.stateEffects),
      sortOrder: Number.isFinite(Number(input?.sortOrder))
        ? Number(input?.sortOrder)
        : 0,
      isEnding: Boolean(input?.isEnding),
      aiEnabled: input?.aiEnabled !== false,
      generatedByAI: Boolean(input?.generatedByAI),
      reviewStatus: normalizeReviewStatus(
        input?.reviewStatus,
        input?.generatedByAI ? "draft" : "approved",
      ),
      editorNotes: normalizeNullableText(input?.editorNotes),
    };
  }

  private toNodeUpdateData(input: AdminNodeInput): Prisma.InteractiveStoryNodeUpdateInput {
    const data: Prisma.InteractiveStoryNodeUpdateInput = {};

    if (Object.prototype.hasOwnProperty.call(input || {}, "nodeKey")) {
      const nodeKey = normalizeText(input?.nodeKey);
      if (!nodeKey) {
        throw new BadRequestException("node.nodeKey cannot be empty");
      }
      data.nodeKey = nodeKey;
    }
    if (Object.prototype.hasOwnProperty.call(input || {}, "title")) {
      const title = normalizeText(input?.title);
      if (!title) {
        throw new BadRequestException("node.title cannot be empty");
      }
      data.title = title;
    }
    if (Object.prototype.hasOwnProperty.call(input || {}, "body")) {
      data.body = normalizeNullableText(input?.body);
    }
    if (Object.prototype.hasOwnProperty.call(input || {}, "imageUrl")) {
      data.imageUrl = normalizeNullableText(input?.imageUrl);
    }
    if (Object.prototype.hasOwnProperty.call(input || {}, "endingType")) {
      data.endingType = normalizeNullableText(input?.endingType);
    }
    if (Object.prototype.hasOwnProperty.call(input || {}, "orderIndex")) {
      data.orderIndex = Number.isFinite(Number(input?.orderIndex))
        ? Number(input?.orderIndex)
        : 0;
    }
    if (Object.prototype.hasOwnProperty.call(input || {}, "baseContext")) {
      data.baseContext = normalizeNullableText(input?.baseContext);
    }
    if (Object.prototype.hasOwnProperty.call(input || {}, "basePrompt")) {
      data.basePrompt = normalizeNullableText(input?.basePrompt);
    }
    if (Object.prototype.hasOwnProperty.call(input || {}, "fallbackText")) {
      data.fallbackText = normalizeNullableText(input?.fallbackText);
    }
    if (Object.prototype.hasOwnProperty.call(input || {}, "requiredFlags")) {
      data.requiredFlags = normalizeStringArray(input?.requiredFlags);
    }
    if (Object.prototype.hasOwnProperty.call(input || {}, "blockedFlags")) {
      data.blockedFlags = normalizeStringArray(input?.blockedFlags);
    }
    if (Object.prototype.hasOwnProperty.call(input || {}, "stateEffects")) {
      data.stateEffects = normalizeJsonObject(input?.stateEffects);
    }
    if (Object.prototype.hasOwnProperty.call(input || {}, "sortOrder")) {
      data.sortOrder = Number.isFinite(Number(input?.sortOrder))
        ? Number(input?.sortOrder)
        : 0;
    }
    if (Object.prototype.hasOwnProperty.call(input || {}, "isEnding")) {
      data.isEnding = Boolean(input?.isEnding);
    }
    if (Object.prototype.hasOwnProperty.call(input || {}, "aiEnabled")) {
      data.aiEnabled = Boolean(input?.aiEnabled);
    }
    if (Object.prototype.hasOwnProperty.call(input || {}, "generatedByAI")) {
      data.generatedByAI = Boolean(input?.generatedByAI);
    }
    if (Object.prototype.hasOwnProperty.call(input || {}, "reviewStatus")) {
      data.reviewStatus = normalizeReviewStatus(input?.reviewStatus);
    }
    if (Object.prototype.hasOwnProperty.call(input || {}, "editorNotes")) {
      data.editorNotes = normalizeNullableText(input?.editorNotes);
    }

    return data;
  }

  private toChoiceCreateData(nodeId: string, input: AdminChoiceInput): Prisma.InteractiveStoryChoiceCreateInput {
    const choiceKey = normalizeText(input?.choiceKey);
    const label = normalizeText(input?.label);
    if (!choiceKey || !label) {
      throw new BadRequestException("choice.choiceKey and choice.label are required");
    }

    const targetNodeId = normalizeNullableText(input?.targetNodeId);

    return {
      node: { connect: { id: nodeId } },
      targetNode: targetNodeId ? { connect: { id: targetNodeId } } : undefined,
      choiceKey,
      label,
      description: normalizeNullableText(input?.description),
      requiresPremium: Boolean(input?.requiresPremium),
      requiresTokens: Number.isFinite(Number(input?.requiresTokens))
        ? Number(input?.requiresTokens)
        : 0,
      orderIndex: Number.isFinite(Number(input?.orderIndex))
        ? Number(input?.orderIndex)
        : Number.isFinite(Number(input?.sortOrder))
          ? Number(input?.sortOrder)
          : 0,
      requiredFlags: normalizeStringArray(input?.requiredFlags),
      blockedFlags: normalizeStringArray(input?.blockedFlags),
      stateEffects: normalizeJsonObject(input?.stateEffects),
      sortOrder: Number.isFinite(Number(input?.sortOrder))
        ? Number(input?.sortOrder)
        : 0,
    };
  }

  private toChoiceUpdateData(input: AdminChoiceInput): Prisma.InteractiveStoryChoiceUpdateInput {
    const data: Prisma.InteractiveStoryChoiceUpdateInput = {};
    if (Object.prototype.hasOwnProperty.call(input || {}, "choiceKey")) {
      const choiceKey = normalizeText(input?.choiceKey);
      if (!choiceKey) {
        throw new BadRequestException("choice.choiceKey cannot be empty");
      }
      data.choiceKey = choiceKey;
    }
    if (Object.prototype.hasOwnProperty.call(input || {}, "label")) {
      const label = normalizeText(input?.label);
      if (!label) {
        throw new BadRequestException("choice.label cannot be empty");
      }
      data.label = label;
    }
    if (Object.prototype.hasOwnProperty.call(input || {}, "description")) {
      data.description = normalizeNullableText(input?.description);
    }
    if (Object.prototype.hasOwnProperty.call(input || {}, "requiresPremium")) {
      data.requiresPremium = Boolean(input?.requiresPremium);
    }
    if (Object.prototype.hasOwnProperty.call(input || {}, "requiresTokens")) {
      data.requiresTokens = Number.isFinite(Number(input?.requiresTokens))
        ? Number(input?.requiresTokens)
        : 0;
    }
    if (Object.prototype.hasOwnProperty.call(input || {}, "orderIndex")) {
      data.orderIndex = Number.isFinite(Number(input?.orderIndex))
        ? Number(input?.orderIndex)
        : 0;
    }
    if (Object.prototype.hasOwnProperty.call(input || {}, "targetNodeId")) {
      const targetNodeId = normalizeNullableText(input?.targetNodeId);
      data.targetNode = targetNodeId
        ? { connect: { id: targetNodeId } }
        : { disconnect: true };
    }
    if (Object.prototype.hasOwnProperty.call(input || {}, "requiredFlags")) {
      data.requiredFlags = normalizeStringArray(input?.requiredFlags);
    }
    if (Object.prototype.hasOwnProperty.call(input || {}, "blockedFlags")) {
      data.blockedFlags = normalizeStringArray(input?.blockedFlags);
    }
    if (Object.prototype.hasOwnProperty.call(input || {}, "stateEffects")) {
      data.stateEffects = normalizeJsonObject(input?.stateEffects);
    }
    if (Object.prototype.hasOwnProperty.call(input || {}, "sortOrder")) {
      data.sortOrder = Number.isFinite(Number(input?.sortOrder))
        ? Number(input?.sortOrder)
        : 0;
    }
    return data;
  }

  @Get()
  async list(
    @Query("search") searchRaw?: string,
    @Query("seriesId") seriesIdRaw?: string,
    @Query("published") publishedRaw?: string,
    @Query("page") pageRaw?: string,
    @Query("pageSize") pageSizeRaw?: string,
  ) {
    const search = normalizeText(searchRaw);
    const seriesId = normalizeText(seriesIdRaw);
    const published = normalizeText(publishedRaw);
    const page = Math.max(1, Number.parseInt(String(pageRaw || "1"), 10) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, Number.parseInt(String(pageSizeRaw || "20"), 10) || 20),
    );

    const where: Prisma.InteractiveStoryWhereInput = {};
    if (search) {
      where.OR = [
        { id: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
      ];
    }
    if (seriesId) {
      where.seriesId = seriesId;
    }
    if (published === "true") {
      where.isPublished = true;
    } else if (published === "false") {
      where.isPublished = false;
    }

    const [stories, total] = await Promise.all([
      this.prisma.interactiveStory.findMany({
        where,
        select: STORY_LIST_SELECT,
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.interactiveStory.count({ where }),
    ]);

    return {
      stories,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  @Post("import")
  @RequireAdminPermissions(AdminPermission.INTERACTIVE_STORY_CREATE)
  async importStory(
    @Body() body: { payload?: StoryImportPayload; mode?: "create" | "replace" },
  ) {
    const mode = body?.mode === "replace" ? "replace" : "create";
    const payload = body?.payload || {};
    const storyInput = payload?.story || {};
    const nodesInput = Array.isArray(payload?.nodes) ? payload.nodes : [];

    if (nodesInput.length === 0) {
      throw new BadRequestException("payload.nodes cannot be empty");
    }

    const slug = normalizeText(storyInput?.slug);
    const title = normalizeText(storyInput?.title);
    if (!slug || !title) {
      throw new BadRequestException("payload.story.slug and payload.story.title are required");
    }

    const seriesId = await this.assertSeriesExists(storyInput?.seriesId ?? null);

    const result = await this.prisma.$transaction(async (tx) => {
      let storyId = normalizeText(storyInput?.id || "");
      let existingStory = storyId
        ? await tx.interactiveStory.findUnique({ where: { id: storyId }, select: { id: true } })
        : null;

      if (!existingStory) {
        existingStory = await tx.interactiveStory.findUnique({
          where: { slug },
          select: { id: true },
        });
      }

      if (mode === "replace") {
        if (!existingStory) {
          throw new BadRequestException("replace mode requires existing story id or slug");
        }
        storyId = existingStory.id;
        await tx.interactiveStory.update({
          where: { id: storyId },
          data: {
            slug,
            title,
            description: normalizeNullableText(storyInput?.description),
            coverImage: normalizeNullableText(storyInput?.coverImage),
            genre: normalizeNullableText(storyInput?.genre),
            targetAudience: normalizeNullableText(storyInput?.targetAudience),
            contentMode: normalizeContentMode(storyInput?.contentMode),
            status: normalizeStoryStatus(storyInput?.status, false),
            baseContext: normalizeNullableText(storyInput?.baseContext),
            initialState: normalizeJsonObject(storyInput?.initialState),
            isPublished: false,
            aiEnabled: storyInput?.aiEnabled !== false,
            series: seriesId ? { connect: { id: seriesId } } : { disconnect: true },
          },
        });
        await tx.interactiveStoryNode.deleteMany({ where: { storyId } });
      } else {
        if (existingStory) {
          throw new ConflictException("Story already exists, use replace mode");
        }
        const created = await tx.interactiveStory.create({
          data: {
            slug,
            title,
            description: normalizeNullableText(storyInput?.description),
            coverImage: normalizeNullableText(storyInput?.coverImage),
            genre: normalizeNullableText(storyInput?.genre),
            targetAudience: normalizeNullableText(storyInput?.targetAudience),
            contentMode: normalizeContentMode(storyInput?.contentMode),
            status: normalizeStoryStatus(storyInput?.status, false),
            baseContext: normalizeNullableText(storyInput?.baseContext),
            initialState: normalizeJsonObject(storyInput?.initialState),
            isPublished: false,
            aiEnabled: storyInput?.aiEnabled !== false,
            series: seriesId ? { connect: { id: seriesId } } : undefined,
          },
          select: { id: true },
        });
        storyId = created.id;
      }

      const nodeKeyToId = new Map<string, string>();
      for (let index = 0; index < nodesInput.length; index += 1) {
        const node = nodesInput[index];
        const nodeKey = normalizeText(node?.nodeKey);
        const nodeTitle = normalizeText(node?.title);
        if (!nodeKey || !nodeTitle) {
          throw new BadRequestException(`node.nodeKey and node.title are required at index ${index}`);
        }
        if (nodeKeyToId.has(nodeKey)) {
          throw new BadRequestException(`Duplicated nodeKey in import payload: ${nodeKey}`);
        }

        const createdNode = await tx.interactiveStoryNode.create({
          data: {
            storyId,
            nodeKey,
            title: nodeTitle,
            body: normalizeNullableText((node as AdminNodeInput)?.body),
            imageUrl: normalizeNullableText((node as AdminNodeInput)?.imageUrl),
            endingType: normalizeNullableText((node as AdminNodeInput)?.endingType),
            orderIndex: Number.isFinite(Number((node as AdminNodeInput)?.orderIndex))
              ? Number((node as AdminNodeInput)?.orderIndex)
              : Number.isFinite(Number(node?.sortOrder))
                ? Number(node?.sortOrder)
                : index,
            baseContext: normalizeNullableText(node?.baseContext),
            basePrompt: normalizeNullableText(node?.basePrompt),
            fallbackText: normalizeNullableText(node?.fallbackText),
            requiredFlags: normalizeStringArray(node?.requiredFlags),
            blockedFlags: normalizeStringArray(node?.blockedFlags),
            stateEffects: normalizeJsonObject(node?.stateEffects),
            sortOrder: Number.isFinite(Number(node?.sortOrder))
              ? Number(node?.sortOrder)
              : index,
            isEnding: Boolean(node?.isEnding),
            aiEnabled: node?.aiEnabled !== false,
            generatedByAI: Boolean((node as AdminNodeInput)?.generatedByAI),
            reviewStatus: normalizeReviewStatus(
              (node as AdminNodeInput)?.reviewStatus,
              (node as AdminNodeInput)?.generatedByAI ? "draft" : "approved",
            ),
            editorNotes: normalizeNullableText((node as AdminNodeInput)?.editorNotes),
          },
          select: { id: true, nodeKey: true },
        });

        nodeKeyToId.set(createdNode.nodeKey, createdNode.id);
      }

      for (const node of nodesInput) {
        const nodeKey = normalizeText(node?.nodeKey);
        const sourceNodeId = nodeKeyToId.get(nodeKey);
        const choices = Array.isArray(node?.choices) ? node.choices : [];

        for (let choiceIndex = 0; choiceIndex < choices.length; choiceIndex += 1) {
          const choice = choices[choiceIndex];
          const choiceKey = normalizeText(choice?.choiceKey);
          const label = normalizeText(choice?.label);
          if (!choiceKey || !label) {
            throw new BadRequestException(
              `choice.choiceKey and choice.label are required at node ${nodeKey}`,
            );
          }
          const targetNodeKey = normalizeText(
            (choice as any)?.targetNodeKey || "",
          );
          const targetNodeId = normalizeNullableText(choice?.targetNodeId)
            || (targetNodeKey ? nodeKeyToId.get(targetNodeKey) || null : null);
          if (targetNodeKey && !targetNodeId) {
            throw new BadRequestException(
              `targetNodeKey not found in payload: ${targetNodeKey}`,
            );
          }

          await tx.interactiveStoryChoice.create({
            data: {
              nodeId: sourceNodeId || "",
              targetNodeId,
              choiceKey,
              label,
              description: normalizeNullableText(choice?.description),
              requiresPremium: Boolean((choice as AdminChoiceInput)?.requiresPremium),
              requiresTokens: Number.isFinite(Number((choice as AdminChoiceInput)?.requiresTokens))
                ? Number((choice as AdminChoiceInput)?.requiresTokens)
                : 0,
              orderIndex: Number.isFinite(Number((choice as AdminChoiceInput)?.orderIndex))
                ? Number((choice as AdminChoiceInput)?.orderIndex)
                : Number.isFinite(Number(choice?.sortOrder))
                  ? Number(choice?.sortOrder)
                  : choiceIndex,
              requiredFlags: normalizeStringArray(choice?.requiredFlags),
              blockedFlags: normalizeStringArray(choice?.blockedFlags),
              stateEffects: normalizeJsonObject(choice?.stateEffects),
              sortOrder: Number.isFinite(Number(choice?.sortOrder))
                ? Number(choice?.sortOrder)
                : choiceIndex,
            },
          });
        }
      }

      const initialNodeId =
        normalizeNullableText(storyInput?.initialNodeId)
        || nodeKeyToId.get(normalizeText(storyInput?.initialNodeId || ""))
        || nodeKeyToId.get(normalizeText(nodesInput[0]?.nodeKey || ""));

      await tx.interactiveStory.update({
        where: { id: storyId },
        data: {
          initialNodeId: initialNodeId || null,
          isPublished: false,
        },
      });

      return { storyId };
    });

    const { story, validation } = await this.getStoryValidation(result.storyId);
    await this.invalidateSeriesContent([normalizeNullableText((story as any).seriesId)]);
    return {
      story,
      validation,
      mode,
    };
  }

  @Get(":id/validation")
  async validate(@Param("id") id: string) {
    const { story, validation } = await this.getStoryValidation(id);
    return { storyId: story.id, validation };
  }

  @Get(":id/export")
  async export(@Param("id") id: string) {
    const { story, validation } = await this.getStoryValidation(id);
    const payload = {
      story: {
        id: story.id,
        slug: story.slug,
        title: story.title,
        description: story.description,
        coverImage: story.coverImage,
        genre: story.genre,
        targetAudience: story.targetAudience,
        contentMode: story.contentMode,
        status: story.status,
        seriesId: story.seriesId,
        baseContext: story.baseContext,
        initialNodeId: story.initialNodeId,
        initialState: story.initialState,
        isPublished: story.isPublished,
        aiEnabled: story.aiEnabled,
      },
      nodes: ((story as any).nodes || []).map((node: any) => ({
        nodeKey: node.nodeKey,
        title: node.title,
        body: node.body,
        imageUrl: node.imageUrl,
        endingType: node.endingType,
        orderIndex: node.orderIndex,
        baseContext: node.baseContext,
        basePrompt: node.basePrompt,
        fallbackText: node.fallbackText,
        requiredFlags: node.requiredFlags,
        blockedFlags: node.blockedFlags,
        stateEffects: node.stateEffects,
        sortOrder: node.sortOrder,
        isEnding: node.isEnding,
        aiEnabled: node.aiEnabled,
        generatedByAI: node.generatedByAI,
        reviewStatus: node.reviewStatus,
        editorNotes: node.editorNotes,
        panels: (node.panels || []).map((panel: any) => ({
          panelNumber: panel.panelNumber,
          promptJson: panel.promptJson,
          imageUrl: panel.imageUrl,
          finalImageUrl: panel.finalImageUrl,
          dialogue: panel.dialogue,
          reviewStatus: panel.reviewStatus,
          provider: panel.provider,
          model: panel.model,
          seed: panel.seed,
        })),
        choices: (node.choices || []).map((choice: any) => ({
          choiceKey: choice.choiceKey,
          label: choice.label,
          description: choice.description,
          requiresPremium: choice.requiresPremium,
          requiresTokens: choice.requiresTokens,
          orderIndex: choice.orderIndex,
          requiredFlags: choice.requiredFlags,
          blockedFlags: choice.blockedFlags,
          stateEffects: choice.stateEffects,
          sortOrder: choice.sortOrder,
          targetNodeId: choice.targetNodeId,
        })),
      })),
    };
    return { payload, validation };
  }

  @Get(":id")
  async detail(@Param("id") id: string) {
    const story = await this.prisma.interactiveStory.findUnique({
      where: { id: normalizeText(id) },
      select: STORY_DETAIL_SELECT,
    });
    if (!story) {
      throw new NotFoundException("Interactive story not found");
    }
    return { story };
  }

  @Post()
  @RequireAdminPermissions(AdminPermission.INTERACTIVE_STORY_CREATE)
  async create(@Body() body: { story?: AdminStoryInput }) {
    const input = body?.story || {};
    const createData = this.toStoryCreateData(input);
    const seriesId = await this.assertSeriesExists(input.seriesId ?? null);

    try {
      const created = await this.prisma.interactiveStory.create({
        data: {
          ...createData,
          series: seriesId ? { connect: { id: seriesId } } : undefined,
        },
        select: STORY_DETAIL_SELECT,
      });
      await this.invalidateSeriesContent([seriesId]);
      return { story: created };
    } catch (error: any) {
      if (error?.code === "P2002") {
        throw new ConflictException("Story slug already exists");
      }
      throw error;
    }
  }

  @Patch(":id")
  @RequireAdminPermissions(AdminPermission.INTERACTIVE_STORY_UPDATE)
  async update(@Param("id") id: string, @Body() body: { story?: AdminStoryInput }) {
    const storyId = normalizeText(id);
    const existing = await this.prisma.interactiveStory.findUnique({
      where: { id: storyId },
      select: {
        id: true,
        seriesId: true,
      },
    });
    if (!existing) {
      throw new NotFoundException("Interactive story not found");
    }

    const input = body?.story || {};
    const updateData = this.toStoryUpdateData(input);

    if (Object.prototype.hasOwnProperty.call(input || {}, "seriesId")) {
      const seriesId = await this.assertSeriesExists(input.seriesId ?? null);
      updateData.series = seriesId
        ? { connect: { id: seriesId } }
        : { disconnect: true };
    }

    if (Object.prototype.hasOwnProperty.call(input || {}, "initialNodeId")) {
      const initialNodeId = await this.assertInitialNodeBelongsToStory(
        storyId,
        input.initialNodeId ?? null,
      );
      updateData.initialNodeId = initialNodeId;
    }

    if (Object.prototype.hasOwnProperty.call(input || {}, "isPublished")) {
      const publishRequested = Boolean(input?.isPublished);
      if (publishRequested) {
        await this.assertPublishReady(storyId);
      }
    }

    try {
      const story = await this.prisma.interactiveStory.update({
        where: { id: storyId },
        data: updateData,
        select: STORY_DETAIL_SELECT,
      });
      await this.invalidateSeriesContent([
        normalizeNullableText(existing.seriesId),
        normalizeNullableText((story as any).seriesId),
      ]);
      return { story };
    } catch (error: any) {
      if (error?.code === "P2002") {
        throw new ConflictException("Story slug already exists");
      }
      throw error;
    }
  }

  @Delete(":id")
  @RequireAdminPermissions(AdminPermission.INTERACTIVE_STORY_DELETE)
  async remove(@Param("id") id: string) {
    const storyId = normalizeText(id);
    const existing = await this.prisma.interactiveStory.findUnique({
      where: { id: storyId },
      select: { id: true, seriesId: true },
    });
    if (!existing) {
      throw new NotFoundException("Interactive story not found");
    }

    await this.prisma.interactiveStory.delete({ where: { id: storyId } });
    await this.invalidateSeriesContent([existing.seriesId]);
    return { ok: true };
  }

  @Post(":id/publish")
  @RequireAdminPermissions(AdminPermission.INTERACTIVE_STORY_UPDATE)
  async publish(
    @Param("id") id: string,
    @Body() body: { publish?: boolean },
  ) {
    const storyId = normalizeText(id);
    const publish = body?.publish !== false;
    const existing = await this.prisma.interactiveStory.findUnique({
      where: { id: storyId },
      select: { id: true, seriesId: true },
    });
    if (!existing) {
      throw new NotFoundException("Interactive story not found");
    }

    if (publish) {
      await this.assertPublishReady(storyId);
    }

    const story = await this.prisma.interactiveStory.update({
      where: { id: storyId },
      data: { isPublished: publish },
      select: STORY_DETAIL_SELECT,
    });
    await this.invalidateSeriesContent([
      normalizeNullableText((story as any).seriesId),
      normalizeNullableText(existing.seriesId),
    ]);
    return { story };
  }

  @Post(":id/nodes")
  @RequireAdminPermissions(AdminPermission.INTERACTIVE_STORY_UPDATE)
  async createNode(
    @Param("id") id: string,
    @Body() body: { node?: AdminNodeInput; setAsInitial?: boolean },
  ) {
    const storyId = normalizeText(id);
    const story = await this.prisma.interactiveStory.findUnique({
      where: { id: storyId },
      select: { id: true, seriesId: true },
    });
    if (!story) {
      throw new NotFoundException("Interactive story not found");
    }

    try {
      const node = await this.prisma.interactiveStoryNode.create({
        data: this.toNodeCreateData(storyId, body?.node || {}),
        include: {
          choices: {
            orderBy: { sortOrder: "asc" },
          },
        },
      });

      if (body?.setAsInitial) {
        await this.prisma.interactiveStory.update({
          where: { id: storyId },
          data: { initialNodeId: node.id },
        });
      }

      await this.invalidateSeriesContent([story.seriesId]);
      return { node };
    } catch (error: any) {
      if (error?.code === "P2002") {
        throw new ConflictException("Node key already exists in this story");
      }
      throw error;
    }
  }

  @Post(":id/generate-node")
  @RequireAdminPermissions(AdminPermission.INTERACTIVE_STORY_UPDATE)
  async generateNode(
    @Param("id") id: string,
    @Body() body: { input?: GenerateNodeInput },
  ) {
    const storyId = normalizeText(id);
    const story = await this.prisma.interactiveStory.findUnique({
      where: { id: storyId },
      select: {
        id: true,
        slug: true,
        title: true,
        genre: true,
        targetAudience: true,
        contentMode: true,
        baseContext: true,
        seriesId: true,
      },
    });
    if (!story) {
      throw new NotFoundException("Interactive story not found");
    }

    const input = body?.input || {};
    const fromNodeId = normalizeText(input.fromNodeId);
    const choiceId = normalizeText(input.choiceId);
    if (!fromNodeId || !choiceId) {
      throw new BadRequestException("input.fromNodeId and input.choiceId are required");
    }

    const { node, selectedChoice } = await this.loadStoryNodeForGeneration(
      storyId,
      fromNodeId,
      choiceId,
    );
    const previousNodes = await this.loadPreviousNodesForGeneration(storyId, fromNodeId);
    const desiredLength = Number.isFinite(Number(input.desiredLength))
      ? Number(input.desiredLength)
      : 220;
    const editorNotes = normalizeNullableText(input.editorNotes);

    const aiResult = await this.interactiveAiService.generateDraftNode({
      story: {
        id: story.id,
        title: story.title,
        genre: normalizeText(story.genre),
        targetAudience:
          normalizeText(story.targetAudience)
          || (normalizeText(story.contentMode) === "adult"
            ? "Adults 18+"
            : "Teens 13-17"),
        contentMode: normalizeContentMode(story.contentMode),
        baseContext: normalizeText(story.baseContext),
      },
      currentNode: {
        id: node.id,
        key: normalizeText(node.nodeKey),
        title: normalizeText(node.title),
        body: normalizeText(node.body || node.fallbackText || node.baseContext),
        baseContext: normalizeText(node.baseContext),
        basePrompt: normalizeText(node.basePrompt),
      },
      selectedChoice: {
        id: selectedChoice.id,
        key: normalizeText(selectedChoice.choiceKey),
        label: normalizeText(selectedChoice.label),
        description: normalizeText(selectedChoice.description),
      },
      previousNodes,
      desiredLength,
    });

    const createdAt = new Date();

    if (aiResult.status !== "success") {
      const log = await this.prisma.storyGenerationLog.create({
        data: {
          storyId: story.id,
          nodeId: node.id,
          choiceId: selectedChoice.id,
          status: aiResult.status,
          contentMode: normalizeContentMode(story.contentMode),
          generationType: "admin_next_node_draft",
          provider: aiResult.provider,
          model: aiResult.model,
          prompt: aiResult.prompt,
          response: aiResult.rawResponse,
          responseJson: aiResult.responseJson as Prisma.InputJsonValue | undefined,
          safetyNotes: aiResult.safetyNotes || null,
          reviewStatus: "rejected",
          errorMessage: aiResult.errorMessage,
          latencyMs: aiResult.latencyMs,
          createdAt,
        },
      });

      throw new BadRequestException({
        message: "AI draft generation failed",
        logId: log.id,
        error: aiResult.errorMessage || "unknown-ai-error",
      });
    }

    const nextNodeKey = this.buildDraftNodeKey(
      story.slug,
      node.nodeKey,
      selectedChoice.choiceKey,
    );

    const result = await this.prisma.$transaction(async (tx) => {
      const createdNode = await tx.interactiveStoryNode.create({
        data: {
          storyId: story.id,
          nodeKey: nextNodeKey,
          title: aiResult.title,
          body: aiResult.body,
          imageUrl: null,
          endingType: null,
          orderIndex: Number(node.orderIndex || node.sortOrder || 0) + 1,
          baseContext: aiResult.body,
          basePrompt: normalizeText(node.basePrompt),
          fallbackText: aiResult.body,
          requiredFlags: [],
          blockedFlags: [],
          stateEffects: {},
          sortOrder: Number(node.sortOrder || node.orderIndex || 0) + 1,
          isEnding: false,
          aiEnabled: true,
          generatedByAI: true,
          reviewStatus: "pending_review",
          editorNotes,
          createdAt,
          updatedAt: createdAt,
        },
        select: { id: true },
      });

      for (let index = 0; index < aiResult.choices.length; index += 1) {
        const choice = aiResult.choices[index];
        await tx.interactiveStoryChoice.create({
          data: {
            nodeId: createdNode.id,
            choiceKey: `ai-choice-${index + 1}`,
            label: choice.label,
            description: choice.description || null,
            targetNodeId: null,
            requiresPremium: false,
            requiresTokens: 0,
            orderIndex: index,
            requiredFlags: [],
            blockedFlags: [],
            stateEffects: {},
            sortOrder: index,
          },
        });
      }

      const log = await tx.storyGenerationLog.create({
        data: {
          storyId: story.id,
          nodeId: createdNode.id,
          choiceId: selectedChoice.id,
          status: aiResult.status,
          contentMode: normalizeContentMode(story.contentMode),
          generationType: "admin_next_node_draft",
          provider: aiResult.provider,
          model: aiResult.model,
          prompt: aiResult.prompt,
          response: aiResult.rawResponse,
          responseJson: (aiResult.responseJson || undefined) as Prisma.InputJsonValue | undefined,
          safetyNotes: aiResult.safetyNotes || null,
          reviewStatus: "pending_review",
          errorMessage: aiResult.errorMessage,
          latencyMs: aiResult.latencyMs,
          createdAt,
        },
      });

      const hydratedNode = await tx.interactiveStoryNode.findUnique({
        where: { id: createdNode.id },
        include: {
          choices: {
            orderBy: [{ orderIndex: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
          },
        },
      });

      return {
        node: hydratedNode,
        log,
      };
    });

    await this.invalidateSeriesContent([story.seriesId]);
    const refreshedStory = await this.loadStoryWithGraph(story.id);

    return {
      generatedNode: result.node,
      generationLog: result.log,
      story: refreshedStory,
      linkedToChoice: false,
    };
  }

  @Patch("nodes/:nodeId")
  @RequireAdminPermissions(AdminPermission.INTERACTIVE_STORY_UPDATE)
  async updateNode(
    @Param("nodeId") nodeIdParam: string,
    @Body() body: { node?: AdminNodeInput; setAsInitial?: boolean },
  ) {
    const nodeId = normalizeText(nodeIdParam);
    const existingNode = await this.prisma.interactiveStoryNode.findUnique({
      where: { id: nodeId },
      select: {
        id: true,
        storyId: true,
        story: {
          select: {
            seriesId: true,
          },
        },
      },
    });
    if (!existingNode) {
      throw new NotFoundException("Interactive node not found");
    }

    try {
      const node = await this.prisma.interactiveStoryNode.update({
        where: { id: nodeId },
        data: this.toNodeUpdateData(body?.node || {}),
        include: {
          choices: {
            orderBy: { sortOrder: "asc" },
          },
        },
      });

      if (Object.prototype.hasOwnProperty.call(body || {}, "setAsInitial")) {
        await this.prisma.interactiveStory.update({
          where: { id: existingNode.storyId },
          data: {
            initialNodeId: body?.setAsInitial ? node.id : null,
          },
        });
      }

      if (Object.prototype.hasOwnProperty.call(body?.node || {}, "reviewStatus")) {
        await this.syncNodeReviewStatus(nodeId, body?.node?.reviewStatus || "draft");
      }

      await this.invalidateSeriesContent([existingNode.story.seriesId]);
      return { node };
    } catch (error: any) {
      if (error?.code === "P2002") {
        throw new ConflictException("Node key already exists in this story");
      }
      throw error;
    }
  }

  @Post(":id/nodes/:nodeId/storyboard")
  @RequireAdminPermissions(AdminPermission.INTERACTIVE_STORY_UPDATE)
  async generateStoryboard(
    @Param("id") id: string,
    @Param("nodeId") nodeIdParam: string,
    @Body() body: { input?: GenerateStoryboardInput },
  ) {
    const storyId = normalizeText(id);
    const nodeId = normalizeText(nodeIdParam);
    const node = await this.loadStoryNodeForPanels(storyId, nodeId);
    const previousNodes = await this.loadPreviousNodesForGeneration(storyId, nodeId);
    const sourceChoice = Array.isArray(node.targetedBy) ? node.targetedBy[0] || null : null;
    const desiredPanelCount = Number.isFinite(Number(body?.input?.desiredPanelCount))
      ? Number(body?.input?.desiredPanelCount)
      : 3;

    const aiResult = await this.interactiveAiService.generateStoryboard({
      story: {
        id: node.story.id,
        title: node.story.title,
        genre: normalizeText(node.story.genre),
        targetAudience:
          normalizeText(node.story.targetAudience)
          || (normalizeContentMode(node.story.contentMode) === "adult"
            ? "Adults 18+"
            : "Teens 13-17"),
        contentMode: normalizeContentMode(node.story.contentMode),
      },
      node: {
        id: node.id,
        key: node.nodeKey,
        title: node.title,
        body: normalizeText(node.body || node.fallbackText || node.baseContext),
      },
      previousNodes,
      selectedChoice: sourceChoice
        ? {
            id: sourceChoice.id,
            key: normalizeText(sourceChoice.choiceKey),
            label: normalizeText(sourceChoice.label),
            description: normalizeText(sourceChoice.description),
          }
        : null,
      desiredPanelCount,
    });

    if (aiResult.status !== "success") {
      throw new BadRequestException({
        message: "Storyboard generation failed",
        error: aiResult.errorMessage || "invalid-storyboard-json",
      });
    }

    const panels = aiResult.panels.map((panel) => ({
      panelNumber: panel.panelNumber,
      promptJson: this.buildPanelPromptJson(panel, aiResult.prompt, aiResult.safetyNotes),
      dialogue: panel.dialogue || null,
      reviewStatus: "draft",
      provider: aiResult.provider,
      model: aiResult.model,
      seed: null,
    }));

    return {
      storyboard: {
        panels,
        safetyNotes: aiResult.safetyNotes,
      },
    };
  }

  @Post(":id/nodes/:nodeId/generate-panels")
  @RequireAdminPermissions(AdminPermission.INTERACTIVE_STORY_UPDATE)
  async generatePanels(
    @Param("id") id: string,
    @Param("nodeId") nodeIdParam: string,
    @Body() body: { input?: GeneratePanelsInput },
    @Req() req: Request,
  ) {
    const storyId = normalizeText(id);
    const nodeId = normalizeText(nodeIdParam);
    const regenerate = body?.input?.regenerate === true;
    const requestedPanelNumbers = normalizeIntegerArray(body?.input?.panelNumbers);
    const node = await this.loadStoryNodeForPanels(storyId, nodeId);

    const existingPanels = Array.isArray(node.panels) ? node.panels : [];
    if (existingPanels.length === 0) {
      throw new BadRequestException("Generate storyboard first before generating panels");
    }

    const targetPanels = existingPanels.filter((panel) => {
      if (requestedPanelNumbers.length > 0 && !requestedPanelNumbers.includes(panel.panelNumber)) {
        return false;
      }
      if (regenerate) {
        return true;
      }
      return !normalizeText(panel.imageUrl);
    });

    if (targetPanels.length === 0) {
      return { panels: existingPanels };
    }

    const updatedPanels = [];
    for (const panel of targetPanels) {
      const promptJsonValue =
        panel.promptJson && typeof panel.promptJson === "object" && !Array.isArray(panel.promptJson)
          ? (panel.promptJson as Record<string, unknown>)
          : {};
      const seed = this.buildPanelSeed();
      const aiResult = await this.interactiveAiService.generatePanelImage({
        story: {
          id: node.story.id,
          title: node.story.title,
          genre: normalizeText(node.story.genre),
          targetAudience:
            normalizeText(node.story.targetAudience)
            || (normalizeContentMode(node.story.contentMode) === "adult"
              ? "Adults 18+"
              : "Teens 13-17"),
          contentMode: normalizeContentMode(node.story.contentMode),
        },
        node: {
          id: node.id,
          key: node.nodeKey,
          title: node.title,
          body: normalizeText(node.body || node.fallbackText || node.baseContext),
        },
        panel: {
          panelNumber: Number(promptJsonValue.panelNumber || panel.panelNumber),
          character: normalizeText(promptJsonValue.character),
          scene: normalizeText(promptJsonValue.scene),
          camera: normalizeText(promptJsonValue.camera),
          emotion: normalizeText(promptJsonValue.emotion),
          action: normalizeText(promptJsonValue.action),
          style: normalizeText(promptJsonValue.style),
          dialogue: normalizeText(promptJsonValue.dialogue || panel.dialogue),
        },
        promptJson: promptJsonValue,
        seed,
      });

      if (aiResult.status !== "success") {
        throw new BadRequestException({
          message: "Panel image generation failed",
          panelId: panel.id,
          error: aiResult.errorMessage || "panel-image-generation-failed",
        });
      }

      const imageUrl = await this.savePanelImageAsset(
        req,
        normalizeContentMode(node.story.contentMode),
        node.storyId,
        node.id,
        panel.panelNumber,
        aiResult.imageBase64,
      );

      const nextPromptJson = {
        ...promptJsonValue,
        imagePrompt: aiResult.prompt,
        revisedPrompt: aiResult.revisedPrompt,
        seed,
      } as Prisma.InputJsonValue;

      const savedPanel = await (this.prisma as any).interactivePanel.upsert({
        where: {
          nodeId_panelNumber: {
            nodeId: node.id,
            panelNumber: panel.panelNumber,
          },
        },
        update: {
          promptJson: nextPromptJson,
          imageUrl,
          dialogue: normalizeNullableText(promptJsonValue.dialogue || panel.dialogue),
          reviewStatus: "pending_review",
          provider: aiResult.provider,
          model: aiResult.model,
          seed,
        },
        create: {
          storyId: node.storyId,
          nodeId: node.id,
          panelNumber: panel.panelNumber,
          promptJson: nextPromptJson,
          imageUrl,
          dialogue: normalizeNullableText(promptJsonValue.dialogue || panel.dialogue),
          reviewStatus: "pending_review",
          provider: aiResult.provider,
          model: aiResult.model,
          seed,
        },
      });

      updatedPanels.push(savedPanel);
    }

    await this.invalidateSeriesContent([node.story.seriesId]);
    const refreshedStory = await this.loadStoryWithGraph(node.storyId);
    return {
      panels: updatedPanels,
      story: refreshedStory,
    };
  }

  @Delete("nodes/:nodeId")
  @RequireAdminPermissions(AdminPermission.INTERACTIVE_STORY_DELETE)
  async removeNode(@Param("nodeId") nodeIdParam: string) {
    const nodeId = normalizeText(nodeIdParam);
    const existingNode = await this.prisma.interactiveStoryNode.findUnique({
      where: { id: nodeId },
      select: {
        id: true,
        storyId: true,
        story: {
          select: {
            seriesId: true,
            initialNodeId: true,
          },
        },
      },
    });
    if (!existingNode) {
      throw new NotFoundException("Interactive node not found");
    }

    const replacementNode = await this.prisma.interactiveStoryNode.findFirst({
      where: {
        storyId: existingNode.storyId,
        id: { not: nodeId },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });

    const affectedProgressCount = await this.prisma.userStoryProgress.count({
      where: {
        storyId: existingNode.storyId,
        currentNodeId: nodeId,
      },
    });
    if (affectedProgressCount > 0 && !replacementNode?.id) {
      throw new BadRequestException(
        "Cannot delete the only node while user progress still points to it",
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.interactiveStoryChoice.updateMany({
        where: { targetNodeId: nodeId },
        data: { targetNodeId: replacementNode?.id || null },
      });
      await tx.userStoryProgress.updateMany({
        where: {
          storyId: existingNode.storyId,
          currentNodeId: nodeId,
        },
        data: { currentNodeId: replacementNode?.id || nodeId },
      });
      await tx.interactiveStoryNode.delete({
        where: { id: nodeId },
      });

      if (existingNode.story.initialNodeId === nodeId) {
        await tx.interactiveStory.update({
          where: { id: existingNode.storyId },
          data: { initialNodeId: replacementNode?.id || null },
        });
      }
    });

    await this.invalidateSeriesContent([existingNode.story.seriesId]);
    return { ok: true };
  }

  @Post("nodes/:nodeId/choices")
  @RequireAdminPermissions(AdminPermission.INTERACTIVE_STORY_UPDATE)
  async createChoice(
    @Param("nodeId") nodeIdParam: string,
    @Body() body: { choice?: AdminChoiceInput },
  ) {
    const nodeId = normalizeText(nodeIdParam);
    const node = await this.prisma.interactiveStoryNode.findUnique({
      where: { id: nodeId },
      select: {
        id: true,
        storyId: true,
        story: {
          select: { seriesId: true },
        },
      },
    });
    if (!node) {
      throw new NotFoundException("Interactive node not found");
    }

    const targetNodeId = normalizeNullableText(body?.choice?.targetNodeId);
    if (targetNodeId) {
      const targetNode = await this.prisma.interactiveStoryNode.findFirst({
        where: {
          id: targetNodeId,
          storyId: node.storyId,
        },
        select: { id: true },
      });
      if (!targetNode) {
        throw new BadRequestException("targetNodeId must belong to the same story");
      }
    }

    try {
      const choice = await this.prisma.interactiveStoryChoice.create({
        data: this.toChoiceCreateData(nodeId, body?.choice || {}),
      });
      await this.invalidateSeriesContent([node.story.seriesId]);
      return { choice };
    } catch (error: any) {
      if (error?.code === "P2002") {
        throw new ConflictException("Choice key already exists in this node");
      }
      throw error;
    }
  }

  @Patch("choices/:choiceId")
  @RequireAdminPermissions(AdminPermission.INTERACTIVE_STORY_UPDATE)
  async updateChoice(
    @Param("choiceId") choiceIdParam: string,
    @Body() body: { choice?: AdminChoiceInput },
  ) {
    const choiceId = normalizeText(choiceIdParam);
    const existingChoice = await this.prisma.interactiveStoryChoice.findUnique({
      where: { id: choiceId },
      select: {
        id: true,
        nodeId: true,
        node: {
          select: {
            storyId: true,
            story: { select: { seriesId: true } },
          },
        },
      },
    });
    if (!existingChoice) {
      throw new NotFoundException("Interactive choice not found");
    }

    const targetNodeId = normalizeNullableText(body?.choice?.targetNodeId);
    if (
      Object.prototype.hasOwnProperty.call(body?.choice || {}, "targetNodeId")
      && targetNodeId
    ) {
      const targetNode = await this.prisma.interactiveStoryNode.findFirst({
        where: {
          id: targetNodeId,
          storyId: existingChoice.node.storyId,
        },
        select: {
          id: true,
          generatedByAI: true,
          reviewStatus: true,
        },
      });
      if (!targetNode) {
        throw new BadRequestException("targetNodeId must belong to the same story");
      }
      if (
        targetNode.generatedByAI
        && normalizeReviewStatus(targetNode.reviewStatus, "draft") !== "approved"
      ) {
        throw new BadRequestException(
          "Cannot attach a choice to an AI-generated node until it is approved",
        );
      }
    }

    try {
      const choice = await this.prisma.interactiveStoryChoice.update({
        where: { id: choiceId },
        data: this.toChoiceUpdateData(body?.choice || {}),
      });
      await this.invalidateSeriesContent([existingChoice.node.story.seriesId]);
      return { choice };
    } catch (error: any) {
      if (error?.code === "P2002") {
        throw new ConflictException("Choice key already exists in this node");
      }
      throw error;
    }
  }

  @Delete("choices/:choiceId")
  @RequireAdminPermissions(AdminPermission.INTERACTIVE_STORY_DELETE)
  async removeChoice(@Param("choiceId") choiceIdParam: string) {
    const choiceId = normalizeText(choiceIdParam);
    const existingChoice = await this.prisma.interactiveStoryChoice.findUnique({
      where: { id: choiceId },
      select: {
        id: true,
        node: {
          select: {
            story: {
              select: { seriesId: true },
            },
          },
        },
      },
    });
    if (!existingChoice) {
      throw new NotFoundException("Interactive choice not found");
    }

    await this.prisma.interactiveStoryChoice.delete({
      where: { id: choiceId },
    });
    await this.invalidateSeriesContent([existingChoice.node.story.seriesId]);
    return { ok: true };
  }

}
