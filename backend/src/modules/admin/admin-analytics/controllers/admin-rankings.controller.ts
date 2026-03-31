import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { StatsService } from "../../../../common/services/stats.service";
import { RequireAdminPermissions } from "../../decorators/admin-permissions.decorator";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";
import { AdminPermission } from "../../permissions/admin-permissions";

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
@UseGuards(AdminAuthGuard)
@RequireAdminPermissions(AdminPermission.ANALYTICS_READ)
export class AdminRankingsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  async list(
    @Query("range") range: string,
    @Query("type") type: string,
    @Query("limit") limit: string
  ) {
    const { from, to } = getRange(range);
    const size = Number(limit || 10);
    const list = await this.statsService.getTopSeries(from, to, type || "all", size);
    return { range: range || "day", from, to, list };
  }
}
