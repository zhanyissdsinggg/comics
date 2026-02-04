import { Body, Controller, Delete, Get, Post, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { getUserIdFromRequest } from "../../common/utils/auth";
import { buildError, ERROR_CODES } from "../../common/utils/errors";
import { ReadingService } from "./reading.service";

@Controller()
export class ReadingController {
  constructor(private readonly readingService: ReadingService) {}

  @Get("bookmarks")
  async getBookmarks(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }
    return { bookmarks: await this.readingService.getBookmarks(userId) };
  }

  @Post("bookmarks")
  async addBookmark(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }
    const seriesId = body?.seriesId;
    const entry = body?.bookmark || body?.entry || {};
    if (!seriesId || !entry?.episodeId) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
    }
    return { bookmarks: await this.readingService.addBookmark(userId, seriesId, entry) };
  }

  @Delete("bookmarks")
  async removeBookmark(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }
    const seriesId = body?.seriesId;
    const bookmarkId = body?.bookmarkId;
    if (!seriesId || !bookmarkId) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
    }
    return { bookmarks: await this.readingService.removeBookmark(userId, seriesId, bookmarkId) };
  }

  @Get("history")
  async getHistory(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }
    return { history: await this.readingService.getHistory(userId) };
  }

  @Post("history")
  async addHistory(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }
    if (!body?.seriesId || !body?.episodeId) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
    }
    return { history: await this.readingService.addHistory(userId, body) };
  }
}
