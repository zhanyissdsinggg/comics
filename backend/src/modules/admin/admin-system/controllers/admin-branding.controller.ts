import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { getBrandingConfig, setBrandingConfig } from "../../../../common/storage/mock-store";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";
import { UpdateBrandingDto } from "../dtos/admin-system.dto";

@Controller("admin/branding")
@UseGuards(AdminAuthGuard)
export class AdminBrandingController {
  @Get()
  async getConfig() {
    return { branding: getBrandingConfig() };
  }

  @Post()
  async save(
    @Body() body: UpdateBrandingDto
  ) {
    const payload = {
      siteLogoUrl: String(body?.branding?.siteLogoUrl || "").trim(),
      faviconUrl: String(body?.branding?.faviconUrl || "").trim(),
      homeBannerUrl: String(body?.branding?.homeBannerUrl || "").trim(),
    };
    const branding = setBrandingConfig(payload);
    return { branding };
  }
}
