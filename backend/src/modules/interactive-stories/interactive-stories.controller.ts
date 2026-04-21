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
import { checkAdultGate } from "../../common/utils/adult-gate";
import { getUserIdFromRequest } from "../../common/utils/auth";
import { buildError, ERROR_CODES } from "../../common/utils/errors";
import { PrismaService } from "../../common/prisma/prisma.service";
import { InteractiveStoriesService } from "./interactive-stories.service";

function normalizeId(value: string): string {
  return String(value || "").trim();
}

@Controller("interactive-stories")
export class InteractiveStoriesController {
  constructor(
    private readonly interactiveStoriesService: InteractiveStoriesService,
    private readonly prisma: PrismaService,
  ) {}

  private async enforceSeriesAdultGate(
    req: Request,
    res: Response,
    seriesId: string | null | undefined,
  ): Promise<boolean> {
    const normalizedSeriesId = normalizeId(seriesId || "");
    if (!normalizedSeriesId) {
      return true;
    }

    const series = await this.prisma.series.findUnique({
      where: { id: normalizedSeriesId },
      select: { adult: true },
    });

    if (!series?.adult) {
      return true;
    }

    const gate = checkAdultGate(req.cookies || {});
    if (gate.ok) {
      return true;
    }

    res.status(403);
    res.json(buildError(ERROR_CODES.ADULT_GATED, { reason: gate.reason }));
    return false;
  }

  @Get("by-series/:seriesId")
  async getBySeries(
    @Param("seriesId") seriesId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const normalizedSeriesId = normalizeId(seriesId);
    if (!normalizedSeriesId) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST, {
        message: "seriesId is required",
      });
    }

    const story = await this.interactiveStoriesService.getStoryBySeries(normalizedSeriesId);
    if (!story) {
      res.status(404);
      return buildError(ERROR_CODES.NOT_FOUND);
    }

    const gatePassed = await this.enforceSeriesAdultGate(req, res, story.seriesId);
    if (!gatePassed) {
      return;
    }

    return { story };
  }

  @Get(":storyId")
  async getStory(
    @Param("storyId") storyId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const normalizedStoryId = normalizeId(storyId);
    if (!normalizedStoryId) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST, {
        message: "storyId is required",
      });
    }

    const story = await this.interactiveStoriesService.getStory(normalizedStoryId);
    if (!story) {
      res.status(404);
      return buildError(ERROR_CODES.NOT_FOUND);
    }

    const gatePassed = await this.enforceSeriesAdultGate(req, res, story.seriesId);
    if (!gatePassed) {
      return;
    }

    return { story };
  }

  @Get(":storyId/progress")
  async getProgress(
    @Param("storyId") storyId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const normalizedStoryId = normalizeId(storyId);
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

    const story = await this.interactiveStoriesService.getStory(normalizedStoryId);
    if (!story) {
      res.status(404);
      return buildError(ERROR_CODES.NOT_FOUND);
    }

    const gatePassed = await this.enforceSeriesAdultGate(req, res, story.seriesId);
    if (!gatePassed) {
      return;
    }

    const progress = await this.interactiveStoriesService.getOrInitProgress(normalizedStoryId, userId);
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
    const normalizedStoryId = normalizeId(storyId);
    const normalizedChoiceId = normalizeId(body?.choiceId || "");
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

    const story = await this.interactiveStoriesService.getStory(normalizedStoryId);
    if (!story) {
      res.status(404);
      return buildError(ERROR_CODES.NOT_FOUND);
    }

    const gatePassed = await this.enforceSeriesAdultGate(req, res, story.seriesId);
    if (!gatePassed) {
      return;
    }

    const progress = await this.interactiveStoriesService.submitChoice(
      normalizedStoryId,
      userId,
      normalizedChoiceId,
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
