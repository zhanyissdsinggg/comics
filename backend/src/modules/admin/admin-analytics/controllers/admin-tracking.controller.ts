import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { RequireAdminPermissions } from "../../decorators/admin-permissions.decorator";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";
import { AdminPermission } from "../../permissions/admin-permissions";
import { UpdateTrackingDto, TrackingValuesInput } from "../dtos/admin-analytics.dto";
import { ConfigService } from "../../services/config.service";

type TrackingConfig = {
  values: TrackingValuesInput;
  updatedAt: string | null;
};

const DEFAULT_TRACKING_CONFIG: TrackingConfig = {
  values: {},
  updatedAt: null,
};

@Controller("admin/tracking")
@UseGuards(AdminAuthGuard)
@RequireAdminPermissions(AdminPermission.TRACKING_CONFIG)
export class AdminTrackingController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  async getConfig() {
    return { config: await this.configService.getConfig("default", DEFAULT_TRACKING_CONFIG) };
  }

  @Post()
  @RequireAdminPermissions(AdminPermission.TRACKING_CONFIG)
  async save(@Body() body: UpdateTrackingDto) {
    const values = body.values || body.tracking || {};
    const payload: TrackingConfig = { values, updatedAt: new Date().toISOString() };
    return { config: await this.configService.setConfig("default", payload) };
  }
}
