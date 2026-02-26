import { Body, Controller, Post, Req, Res } from "@nestjs/common";
import { RatingsService } from "./ratings.service";
import { Request, Response } from "express";
import { getUserIdFromRequest } from "../../common/utils/auth";
import { buildError, ERROR_CODES } from "../../common/utils/errors";

@Controller("ratings")
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post()
  async setRating(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }
    const seriesId = body?.seriesId;
    const value = Number(body?.rating || 0);
    if (!seriesId || !value) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
    }
    const result = await this.ratingsService.setRating(seriesId, userId, value);
    return { rating: result.rating, count: result.count };
  }
}
