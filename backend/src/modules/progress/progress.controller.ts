import { Body, Controller, Get, Post, Req, Res } from "@nestjs/common";
import { ProgressService } from "./progress.service";
import { Request, Response } from "express";
import { getUserIdFromRequest } from "../../common/utils/auth";
import { buildError, ERROR_CODES } from "../../common/utils/errors";

@Controller("progress")
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get()
  async list(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }
    return { progress: await this.progressService.getProgress(userId) };
  }

  @Post("update")
  async update(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }
    const seriesId = body?.seriesId;
    if (!seriesId) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
    }
    const progress = await this.progressService.update(userId, seriesId, body);
    return { progress };
  }
}
