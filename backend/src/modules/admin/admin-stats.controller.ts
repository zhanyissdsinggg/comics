import { Controller, Get, Query, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { isAdminAuthorized } from "../../common/utils/admin";
import { buildError, ERROR_CODES } from "../../common/utils/errors";
import { StatsService } from "../../common/services/stats.service";

@Controller("admin/stats")
export class AdminStatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  async list(
    @Query("from") from: string,
    @Query("to") to: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    if (!isAdminAuthorized(req)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    const stats = await this.statsService.getDailyStats(from, to);
    const summary = stats.reduce(
      (acc, item) => {
        acc.totalViews += item.views;
        acc.totalRegistrations += item.registrations;
        acc.totalDau += item.dau;
        acc.totalPaidOrders += item.paidOrders || 0;
        return acc;
      },
      { totalViews: 0, totalRegistrations: 0, totalDau: 0, totalPaidOrders: 0 }
    );
    const avgDau = stats.length > 0 ? Math.round(summary.totalDau / stats.length) : 0;
    return {
      stats,
      summary: {
        totalViews: summary.totalViews,
        totalRegistrations: summary.totalRegistrations,
        avgDau,
        totalPaidOrders: summary.totalPaidOrders,
      },
    };
  }
}
