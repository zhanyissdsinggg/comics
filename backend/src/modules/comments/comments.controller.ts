import { Body, Controller, Get, Post, Query, Req, Res } from "@nestjs/common";
import { CommentsService } from "./comments.service";
import { Request, Response } from "express";
import { getUserIdFromRequest } from "../../common/utils/auth";
import { buildError, ERROR_CODES } from "../../common/utils/errors";

@Controller("comments")
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  async list(
    @Query("seriesId") seriesId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    if (!seriesId) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
    }
    const userId = getUserIdFromRequest(req, true);
    const comments = await this.commentsService.list(seriesId, userId);
    return { comments };
  }

  @Post()
  async create(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }
    const seriesId = body?.seriesId;
    const action = body?.action || "CREATE";
    if (!seriesId) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
    }
    if (action === "LIKE") {
      const comment = await this.commentsService.like(seriesId, body?.commentId, userId);
      if (!comment) {
        res.status(404);
        return buildError(ERROR_CODES.NOT_FOUND);
      }
      return { comment };
    }
    if (action === "REPLY") {
      const comment = await this.commentsService.reply(seriesId, body?.commentId, userId, body?.text || "");
      if (!comment) {
        res.status(404);
        return buildError(ERROR_CODES.NOT_FOUND);
      }
      return { comment };
    }
    if (!body?.text) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
    }
    const comment = await this.commentsService.add(seriesId, userId, body.text);
    return { comment };
  }
}
