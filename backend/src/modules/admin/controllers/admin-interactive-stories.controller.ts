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
  UseGuards,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { ContentCacheInvalidationService } from "../../../common/cache/content-cache-invalidation.service";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { RequireAdminPermissions } from "../decorators/admin-permissions.decorator";
import { AdminAuthGuard } from "../guards/admin-auth.guard";
import { AdminPermission } from "../permissions/admin-permissions";

type AdminStoryInput = {
  slug?: string;
  title?: string;
  description?: string | null;
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
  baseContext?: string | null;
  basePrompt?: string | null;
  fallbackText?: string | null;
  requiredFlags?: string[];
  blockedFlags?: string[];
  stateEffects?: Record<string, unknown> | null;
  sortOrder?: number;
  isEnding?: boolean;
  aiEnabled?: boolean;
};

type AdminChoiceInput = {
  choiceKey?: string;
  label?: string;
  description?: string | null;
  targetNodeId?: string | null;
  requiredFlags?: string[];
  blockedFlags?: string[];
  stateEffects?: Record<string, unknown> | null;
  sortOrder?: number;
};

const STORY_LIST_SELECT = {
  id: true,
  slug: true,
  title: true,
  description: true,
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
} as const;

const STORY_DETAIL_SELECT = {
  ...STORY_LIST_SELECT,
  baseContext: true,
  initialState: true,
  nodes: {
    orderBy: { sortOrder: "asc" as const },
    select: {
      id: true,
      storyId: true,
      nodeKey: true,
      title: true,
      baseContext: true,
      basePrompt: true,
      fallbackText: true,
      requiredFlags: true,
      blockedFlags: true,
      stateEffects: true,
      sortOrder: true,
      isEnding: true,
      aiEnabled: true,
      createdAt: true,
      updatedAt: true,
      choices: {
        orderBy: { sortOrder: "asc" as const },
        select: {
          id: true,
          nodeId: true,
          targetNodeId: true,
          choiceKey: true,
          label: true,
          description: true,
          requiredFlags: true,
          blockedFlags: true,
          stateEffects: true,
          sortOrder: true,
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
} as const;

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

@Controller("admin/interactive-stories")
@UseGuards(AdminAuthGuard)
@RequireAdminPermissions(AdminPermission.INTERACTIVE_STORY_READ)
export class AdminInteractiveStoriesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contentCacheInvalidation: ContentCacheInvalidationService,
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

    try {
      const story = await this.prisma.interactiveStory.update({
        where: { id: storyId },
        data: updateData,
        select: STORY_DETAIL_SELECT,
      });
      await this.invalidateSeriesContent([existing.seriesId, story.seriesId]);
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

      await this.invalidateSeriesContent([existingNode.story.seriesId]);
      return { node };
    } catch (error: any) {
      if (error?.code === "P2002") {
        throw new ConflictException("Node key already exists in this story");
      }
      throw error;
    }
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
        select: { id: true },
      });
      if (!targetNode) {
        throw new BadRequestException("targetNodeId must belong to the same story");
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
