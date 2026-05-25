import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { resolveAdultGateContext } from "../../common/utils/adult-gate";
import { getUserIdFromRequest } from "../../common/utils/auth";
import { buildError, ERROR_CODES } from "../../common/utils/errors";
import { PrismaService } from "../../common/prisma/prisma.service";
import {
  InteractiveStoriesService,
  type StoryAccessContext,
} from "./interactive-stories.service";

function normalizeText(value: unknown): string {
  return String(value || "").trim();
}

@Controller("interactive-stories")
export class InteractiveStoriesController {
  constructor(
    private readonly interactiveStoriesService: InteractiveStoriesService,
    private readonly prisma: PrismaService,
  ) {}

  private async buildAccessContext(req: Request): Promise<StoryAccessContext> {
    const gate = await resolveAdultGateContext(this.prisma, req);
    return {
      includeAdult: gate.ok,
    };
  }

  private async resolvePublicStoryBySlug(slug: string, req: Request) {
    const access = await this.buildAccessContext(req);
    const story = await this.interactiveStoriesService.getStoryBySlug(slug, access);
    return { access, story };
  }

  @Get()
  async listStories(@Req() req: Request) {
    const access = await this.buildAccessContext(req);
    const stories = await this.interactiveStoriesService.listStories(access);
    return { stories };
  }

  @Get("by-series/:seriesId")
  async getBySeries(
    @Param("seriesId") seriesId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const normalizedSeriesId = normalizeText(seriesId);
    if (!normalizedSeriesId) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST, {
        message: "seriesId is required",
      });
    }

    const access = await this.buildAccessContext(req);
    const story = await this.interactiveStoriesService.getStoryBySeries(
      normalizedSeriesId,
      access,
    );
    if (!story) {
      res.status(404);
      return buildError(ERROR_CODES.NOT_FOUND);
    }

    return { story };
  }

  @Get("slug/:slug")
  async getStoryBySlug(
    @Param("slug") slug: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const normalizedSlug = normalizeText(slug);
    if (!normalizedSlug) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST, {
        message: "slug is required",
      });
    }

    const { story } = await this.resolvePublicStoryBySlug(normalizedSlug, req);
    if (!story) {
      res.status(404);
      return buildError(ERROR_CODES.NOT_FOUND);
    }

    return { story };
  }

  @Get("slug/:slug/current")
  async getCurrentProgress(
    @Param("slug") slug: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const normalizedSlug = normalizeText(slug);
    if (!normalizedSlug) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST, {
        message: "slug is required",
      });
    }

    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }

    const access = await this.buildAccessContext(req);
    const progress = await this.interactiveStoriesService.getOrInitProgress(
      normalizedSlug,
      userId,
      access,
    );
    if (!progress) {
      res.status(404);
      return buildError(ERROR_CODES.NOT_FOUND);
    }

    return { progress };
  }

  @Post("slug/:slug/choose")
  async submitChoiceBySlug(
    @Param("slug") slug: string,
    @Body() body: { choiceId?: string; idempotencyKey?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const normalizedSlug = normalizeText(slug);
    const normalizedChoiceId = normalizeText(body?.choiceId);
    if (!normalizedSlug || !normalizedChoiceId) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST, {
        message: "slug and choiceId are required",
      });
    }

    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }

    const access = await this.buildAccessContext(req);
    const result = await this.interactiveStoriesService.submitChoice(
      {
        storySlug: normalizedSlug,
        userId,
        choiceId: normalizedChoiceId,
        idempotencyKey: normalizeText(body?.idempotencyKey || req.headers["idempotency-key"] || ""),
      },
      access,
    );

    if (!result.ok) {
      if (result.reason === "PREMIUM_REQUIRED" || result.reason === "TOKENS_REQUIRED") {
        res.status(403);
        return buildError(ERROR_CODES.FORBIDDEN, {
          message: "Choice is locked",
          reason: result.reason,
        });
      }
      if (result.reason === "TARGET_NODE_NOT_AVAILABLE") {
        res.status(409);
        return buildError(ERROR_CODES.INVALID_REQUEST, {
          message: "Target node is not available",
          reason: result.reason,
        });
      }

      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST, {
        message: "Invalid or unavailable choice for current node",
        reason: result.reason,
      });
    }

    return { progress: result.progress, replay: Boolean(result.replay) };
  }

  @Post("slug/:slug/restart")
  async restartBySlug(
    @Param("slug") slug: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const normalizedSlug = normalizeText(slug);
    if (!normalizedSlug) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST, {
        message: "slug is required",
      });
    }

    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }

    const access = await this.buildAccessContext(req);
    const progress = await this.interactiveStoriesService.restartProgress(
      normalizedSlug,
      userId,
      access,
    );
    if (!progress) {
      res.status(404);
      return buildError(ERROR_CODES.NOT_FOUND);
    }
    return { progress };
  }

  @Post("slug/:slug/unlock-choice")
  async unlockChoiceBySlug(
    @Param("slug") slug: string,
    @Body() body: { choiceId?: string; idempotencyKey?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const normalizedSlug = normalizeText(slug);
    const normalizedChoiceId = normalizeText(body?.choiceId);
    if (!normalizedSlug || !normalizedChoiceId) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST, {
        message: "slug and choiceId are required",
      });
    }

    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }

    const access = await this.buildAccessContext(req);
    const result = await this.interactiveStoriesService.unlockChoice(
      {
        storySlug: normalizedSlug,
        userId,
        choiceId: normalizedChoiceId,
        idempotencyKey: normalizeText(body?.idempotencyKey || req.headers["idempotency-key"] || ""),
      },
      access,
    );

    if (!result.ok) {
      if (result.reason === "PREMIUM_REQUIRED" || result.reason === "TOKENS_REQUIRED") {
        res.status(403);
        return buildError(ERROR_CODES.FORBIDDEN, {
          message: "Choice unlock blocked",
          reason: result.reason,
        });
      }
      if (result.reason === "TARGET_NODE_NOT_AVAILABLE") {
        res.status(409);
        return buildError(ERROR_CODES.INVALID_REQUEST, {
          message: "Target node is not available",
          reason: result.reason,
        });
      }
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST, {
        message: "Invalid or unavailable choice for current node",
        reason: result.reason,
      });
    }

    return {
      progress: result.progress,
      unlockedChoiceId: result.unlockedChoiceId,
    };
  }

  @Get(":storyId")
  async getStoryLegacy(
    @Param("storyId") storyId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const normalizedStoryId = normalizeText(storyId);
    if (!normalizedStoryId) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST, {
        message: "storyId is required",
      });
    }

    const access = await this.buildAccessContext(req);
    const story = await this.prisma.interactiveStory.findUnique({
      where: { id: normalizedStoryId },
      select: { slug: true },
    });

    if (!story?.slug) {
      res.status(404);
      return buildError(ERROR_CODES.NOT_FOUND);
    }

    const payload = await this.interactiveStoriesService.getStoryBySlug(story.slug, access);
    if (!payload) {
      res.status(404);
      return buildError(ERROR_CODES.NOT_FOUND);
    }
    return { story: payload };
  }

  @Get(":storyId/progress")
  async getProgressLegacy(
    @Param("storyId") storyId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const normalizedStoryId = normalizeText(storyId);
    if (!normalizedStoryId) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST, {
        message: "storyId is required",
      });
    }

    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }

    const story = await this.prisma.interactiveStory.findUnique({
      where: { id: normalizedStoryId },
      select: { slug: true },
    });
    if (!story?.slug) {
      res.status(404);
      return buildError(ERROR_CODES.NOT_FOUND);
    }

    const access = await this.buildAccessContext(req);
    const progress = await this.interactiveStoriesService.getOrInitProgress(
      story.slug,
      userId,
      access,
    );
    if (!progress) {
      res.status(404);
      return buildError(ERROR_CODES.NOT_FOUND);
    }

    return { progress };
  }

  @Post(":storyId/choice")
  async submitChoiceLegacy(
    @Param("storyId") storyId: string,
    @Body() body: { choiceId?: string; idempotencyKey?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const normalizedStoryId = normalizeText(storyId);
    if (!normalizedStoryId) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST, {
        message: "storyId is required",
      });
    }

    const story = await this.prisma.interactiveStory.findUnique({
      where: { id: normalizedStoryId },
      select: { slug: true },
    });
    if (!story?.slug) {
      res.status(404);
      return buildError(ERROR_CODES.NOT_FOUND);
    }

    return this.submitChoiceBySlug(story.slug, body, req, res);
  }

  @Post(":storyId/restart")
  async restartLegacy(
    @Param("storyId") storyId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const normalizedStoryId = normalizeText(storyId);
    if (!normalizedStoryId) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST, {
        message: "storyId is required",
      });
    }

    const story = await this.prisma.interactiveStory.findUnique({
      where: { id: normalizedStoryId },
      select: { slug: true },
    });
    if (!story?.slug) {
      res.status(404);
      return buildError(ERROR_CODES.NOT_FOUND);
    }

    return this.restartBySlug(story.slug, req, res);
  }
}
