import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { StatsService } from "../../../../common/services/stats.service";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";

@Controller("admin/stats")
@UseGuards(AdminAuthGuard)
export class AdminStatsController {
  constructor(private readonly statsService: StatsService) {}

  /**
   * 老王修改：获取Dashboard总体统计数据，支持日期范围筛选
   * GET /api/admin/stats/dashboard?from=2024-01-01&to=2024-01-31
   */
  @Get("dashboard")
  async dashboard(
    @Query("from") from: string,
    @Query("to") to: string
  ) {
    const stats = await this.statsService.getDashboardStats(from, to);
    return stats;
  }

  @Get()
  async list(
    @Query("from") from: string,
    @Query("to") to: string
  ) {
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
