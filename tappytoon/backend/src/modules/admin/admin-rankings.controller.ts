import { Controller, Get, Query, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { isAdminAuthorized } from "../../common/utils/admin";
import { buildError, ERROR_CODES } from "../../common/utils/errors";
import { StatsService } from "../../common/services/stats.service";

function getRange(range?: string) {
  const today = new Date();
  const end = today.toISOString().slice(0, 10);
  if (range === "week") {
    const start = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    return { from: start, to: end };
  }
  if (range === "month") {
    const start = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    return { from: start, to: end };
  }
  return { from: end, to: end };
}

@Controller("admin/rankings")
export class AdminRankingsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  async list(
    @Query("range") range: string,
    @Query("type") type: string,
    @Query("limit") limit: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    if (!isAdminAuthorized(req)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    const { from, to } = getRange(range);
    const size = Number(limit || 10);
    const list = await this.statsService.getTopSeries(from, to, type || "all", size);
    return { range: range || "day", from, to, list };
  }
}
