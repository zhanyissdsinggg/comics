import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AdminLogService } from "../../common/services/admin-log.service";
import { AdminAuthGuard } from "./guards/admin-auth.guard";

/**
 * 老王说：管理员日志控制器
 * 这个SB控制器提供日志查询接口
 */
@Controller("admin/logs")
@UseGuards(AdminAuthGuard)
export class AdminLogsController {
  constructor(private readonly adminLogService: AdminLogService) {}

  /**
   * 老王说：查询操作日志
   * GET /admin/logs?action=refund&resource=order&page=1&pageSize=50
   */
  @Get()
  async query(@Query() query: any) {
    const filters: any = {};

    if (query.action) {
      filters.action = query.action;
    }

    if (query.resource) {
      filters.resource = query.resource;
    }

    if (query.adminId) {
      filters.adminId = query.adminId;
    }

    if (query.startDate) {
      filters.startDate = new Date(query.startDate);
    }

    if (query.endDate) {
      filters.endDate = new Date(query.endDate);
    }

    const page = parseInt(query.page) || 1;
    const pageSize = parseInt(query.pageSize) || 50;

    const result = await this.adminLogService.query(filters, page, pageSize);

    return result;
  }
}
