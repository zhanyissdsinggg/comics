import { Body, Controller, Get, Post, Req, Res } from "@nestjs/common";
import { FollowService } from "./follow.service";
import { Request, Response } from "express";
import { getUserIdFromRequest } from "../../common/utils/auth";
import { buildError, ERROR_CODES } from "../../common/utils/errors";

@Controller("follow")
export class FollowController {
  constructor(private readonly followService: FollowService) {}

  @Get()
  async list(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }
    return { followedSeriesIds: await this.followService.list(userId) };
  }

  @Post()
  async update(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }
    const seriesId = body?.seriesId;
    const action = body?.action || "FOLLOW";
    if (!seriesId) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
    }
    const followedSeriesIds = await this.followService.update(userId, seriesId, action);
    return { followedSeriesIds };
  }
}
