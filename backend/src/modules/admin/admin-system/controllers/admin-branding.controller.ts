import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBody } from "@nestjs/swagger";
import { ConfigService } from "../../services/config.service";
import { RequireAdminPermissions } from "../../decorators/admin-permissions.decorator";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";
import { AdminPermission } from "../../permissions/admin-permissions";
import {
  BrandingPayloadInput,
  UpdateBrandingDto,
} from "../dtos/admin-system.dto";
import {
  BRANDING_CONFIG_KEY,
  DEFAULT_BRANDING_CONFIG,
  buildBrandingPayload,
  normalizeBrandingConfig,
} from "../../../branding/branding.config";

type BrandingSaveBody = UpdateBrandingDto & BrandingPayloadInput;

@Controller("admin/branding")
@UseGuards(AdminAuthGuard)
@RequireAdminPermissions(AdminPermission.SYSTEM_CONFIG)
export class AdminBrandingController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  async getConfig() {
    const stored = await this.configService.getConfig(
      BRANDING_CONFIG_KEY,
      DEFAULT_BRANDING_CONFIG,
    );
    return {
      branding: normalizeBrandingConfig(stored),
    };
  }

  @Post()
  @ApiBody({ type: UpdateBrandingDto, required: false })
  @RequireAdminPermissions(AdminPermission.SYSTEM_CONFIG)
  async save(@Body() body: BrandingSaveBody) {
    const source = body?.branding || body;
    const branding = buildBrandingPayload(source);
    await this.configService.setConfig(BRANDING_CONFIG_KEY, branding);
    return { branding };
  }
}
