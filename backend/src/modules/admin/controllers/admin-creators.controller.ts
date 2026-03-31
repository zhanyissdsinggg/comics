import { Controller, Get, UseGuards } from "@nestjs/common";
import { AdminCreatorsService } from "../admin-content/services/admin-creators.service";
import { AdminAuthGuard } from "../guards/admin-auth.guard";

@Controller("admin/creators")
@UseGuards(AdminAuthGuard)
export class AdminCreatorsController {
  constructor(private readonly adminCreatorsService: AdminCreatorsService) {}

  @Get("audit")
  async audit() {
    return {
      audit: await this.adminCreatorsService.getAudit(),
    };
  }
}
