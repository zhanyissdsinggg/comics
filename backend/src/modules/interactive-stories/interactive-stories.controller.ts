import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { parseBool, resolveAdultGateContext } from "../../common/utils/adult-gate";
import { getUserIdFromRequest } from "../../common/utils/auth";
import { buildError, ERROR_CODES } from "../../common/utils/errors";
import { PrismaService } from "../../common/prisma/prisma.service";
import { InteractiveStoriesService } from "./interactive-stories.service";

type PublicContentMode = "normal" | "adult";

function normalizeText(value: unknown): string {
  return String(value || "").trim();
}

function resolveRequestedMode(req: Request): PublicContentMode {
  const adultParam = parseBool(String(req.query?.adult || ""));
  return adultParam === true ? "adult" : "normal";
}

@Controller("interactive-stories")
export class InteractiveStoriesController {
  constructor(
    private readonly interactiveStoriesService: InteractiveStoriesService,
    private readonly prisma: PrismaService,
  ) {}

  private async enforceAdultMode(req: Request, res: Response): Promise<boolean> {
    const gate = await resolveAdultGateContext(this.prisma, req);
    if (gate.ok) {
      return true;
    }

    res.status(403);
    res.json(buildError(ERROR_CODES.ADULT_GATED, { reason: gate.reason }));
    return false;
  }

  private async ensureModeAllowed(
    req: Request,
    res: Response,
    contentMode: PublicContentMode,
  ): Promise<boolean> {
    if (contentMode !== "adult") {
      return true;
    }
    return this.enforceAdultMode(req, res);
  }

  @Get()
  async listStories(
    @Query("q") query: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const contentMode = resolveRequestedMode(req);
    const allowed = await this.ensureModeAllowed(req, res, contentMode);
    if (!allowed) {
      return;
    }

    const stories = await this.interactiveStoriesService.listStories(contentMode, query || "");
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

    const contentMode = resolveRequestedMode(req);
    const allowed = await this.ensureModeAllowed(req, res, contentMode);
    if (!allowed) {
      return;
    }

    const story = await this.interactiveStoriesService.getStoryBySeries(
      normalizedSeriesId,
      contentMode,
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

    const contentMode = resolveRequestedMode(req);
    const allowed = await this.ensureModeAllowed(req, res, contentMode);
    if (!allowed) {
      return;
    }

    const story = await this.interactiveStoriesService.getStoryBySlug(
      normalizedSlug,
      contentMode,
    );
    if (!story) {
      res.status(404);
      return buildError(ERROR_CODES.NOT_FOUND);
    }

    return { story };
  }

  @Get("slug/:slug/current")
  async getCurrentBySlug(
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

    const contentMode = resolveRequestedMode(req);
    const allowed = await this.ensureModeAllowed(req, res, contentMode);
    if (!allowed) {
      return;
    }

    const progress = await this.interactiveStoriesService.getOrInitProgressBySlug(
      normalizedSlug,
      userId,
      contentMode,
    );
    if (!progress) {
      res.status(404);
      return buildError(ERROR_CODES.NOT_FOUND);
    }

    return { progress };
  }

  @Post("slug/:slug/choose")
  async chooseBySlug(
    @Param("slug") slug: string,
    @Body() body: { choiceId?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const normalizedSlug = normalizeText(slug);
    const normalizedChoiceId = normalizeText(body?.choiceId || "");
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

    const contentMode = resolveRequestedMode(req);
    const allowed = await this.ensureModeAllowed(req, res, contentMode);
    if (!allowed) {
      return;
    }

    const progress = await this.interactiveStoriesService.submitChoiceBySlug(
      normalizedSlug,
      userId,
      normalizedChoiceId,
      contentMode,
    );
    if (!progress) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST, {
        message: "Invalid or unavailable choice for current node",
      });
    }

    return { progress };
  }

  @Get(":storyId")
  async getStory(
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

    const contentMode = resolveRequestedMode(req);
    const allowed = await this.ensureModeAllowed(req, res, contentMode);
    if (!allowed) {
      return;
    }

    const story = await this.interactiveStoriesService.getStory(
      normalizedStoryId,
      contentMode,
    );
    if (!story) {
      res.status(404);
      return buildError(ERROR_CODES.NOT_FOUND);
    }

    return { story };
  }

  @Get(":storyId/progress")
  async getProgress(
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

    const contentMode = resolveRequestedMode(req);
    const allowed = await this.ensureModeAllowed(req, res, contentMode);
    if (!allowed) {
      return;
    }

    const progress = await this.interactiveStoriesService.getOrInitProgress(
      normalizedStoryId,
      userId,
      contentMode,
    );
    if (!progress) {
      res.status(404);
      return buildError(ERROR_CODES.NOT_FOUND);
    }

    return { progress };
  }

  @Post(":storyId/choice")
  async submitChoice(
    @Param("storyId") storyId: string,
    @Body() body: { choiceId?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const normalizedStoryId = normalizeText(storyId);
    const normalizedChoiceId = normalizeText(body?.choiceId || "");
    if (!normalizedStoryId || !normalizedChoiceId) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST, {
        message: "storyId and choiceId are required",
      });
    }

    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }

    const contentMode = resolveRequestedMode(req);
    const allowed = await this.ensureModeAllowed(req, res, contentMode);
    if (!allowed) {
      return;
    }

    const story = await this.interactiveStoriesService.getStory(
      normalizedStoryId,
      contentMode,
    );
    if (!story) {
      res.status(404);
      return buildError(ERROR_CODES.NOT_FOUND);
    }

    const progress = await this.interactiveStoriesService.submitChoice(
      normalizedStoryId,
      userId,
      normalizedChoiceId,
      contentMode,
    );
    if (!progress) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST, {
        message: "Invalid or unavailable choice for current node",
      });
    }

    return { progress };
  }
}
