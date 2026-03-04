import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { getBrandingConfig, setBrandingConfig } from "../../common/storage/mock-store";
import { AdminAuthGuard } from "./guards/admin-auth.guard";
import { UpdateBrandingDto } from "./dtos/admin-remaining.dto";

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
      siteLogoUrl: String(body?.siteLogoUrl || "").trim(),
      faviconUrl: String(body?.faviconUrl || "").trim(),
      homeBannerUrl: String(body?.homeBannerUrl || "").trim(),
    };
    const branding = setBrandingConfig(payload);
    return { branding };
  }
}
