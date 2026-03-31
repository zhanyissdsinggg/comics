import { Controller, Get, UseGuards } from "@nestjs/common";
import { AdminCreatorsService } from "../admin-content/services/admin-creators.service";
import { RequireAdminPermissions } from "../decorators/admin-permissions.decorator";
import { AdminAuthGuard } from "../guards/admin-auth.guard";
import { AdminPermission } from "../permissions/admin-permissions";

@Controller("admin/creators")
@UseGuards(AdminAuthGuard)
@RequireAdminPermissions(AdminPermission.CREATOR_READ)
export class AdminCreatorsController {
  constructor(private readonly adminCreatorsService: AdminCreatorsService) {}

  @Get("audit")
  async audit() {
    return {
      audit: await this.adminCreatorsService.getAudit(),
    };
  }
}
