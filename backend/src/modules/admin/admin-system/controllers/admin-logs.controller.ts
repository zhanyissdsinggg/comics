import {
  BadRequestException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { AdminLogService } from "../../../../common/services/admin-log.service";
import { RequireAdminPermissions } from "../../decorators/admin-permissions.decorator";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";
import { AdminPermission } from "../../permissions/admin-permissions";

@Controller("admin/logs")
@UseGuards(AdminAuthGuard)
@RequireAdminPermissions(AdminPermission.SYSTEM_LOGS)
export class AdminLogsController {
  constructor(private readonly adminLogService: AdminLogService) {}

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

    const page = parseInt(query.page, 10) || 1;
    const pageSize = parseInt(query.pageSize, 10) || 50;

    return this.adminLogService.query(filters, page, pageSize);
  }

  @Delete(":id")
  @RequireAdminPermissions(AdminPermission.SYSTEM_LOGS)
  async remove(@Param("id") id: string, @Req() req: Request) {
    if (!id) {
      throw new BadRequestException("Missing log ID");
    }

    await this.adminLogService.log(
      "audit_log_delete_blocked",
      "admin_log",
      id,
      { reason: "append_only" },
      req,
    );

    throw new ForbiddenException("Audit logs are append-only and cannot be deleted.");
  }
}
