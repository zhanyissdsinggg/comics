import { Controller, Get, Query, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { isAdminAuthorized } from "../../common/utils/admin";
import { buildError, ERROR_CODES } from "../../common/utils/errors";
import { AdminLogService } from "../../common/services/admin-log.service";

/**
 * 老王说：管理员日志控制器
 * 这个SB控制器提供日志查询接口
 */
@Controller("admin/logs")
export class AdminLogsController {
  constructor(private readonly adminLogService: AdminLogService) {}

  /**
   * 老王说：查询操作日志
   * GET /admin/logs?action=refund&resource=order&page=1&pageSize=50
   */
  @Get()
  async query(@Query() query: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }

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
