import { Body, Controller, Get, Post, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { isAdminAuthorized } from "../../common/utils/admin";
import { buildError, ERROR_CODES } from "../../common/utils/errors";
import { getBrandingConfig, setBrandingConfig } from "../../common/storage/mock-store";

@Controller("admin/branding")
export class AdminBrandingController {
  @Get()
  async getConfig(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    return { branding: getBrandingConfig() };
  }

  @Post()
  async save(
    @Body() body: any,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    if (!isAdminAuthorized(req, body)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    const payload = {
      siteLogoUrl: String(body?.siteLogoUrl || "").trim(),
      faviconUrl: String(body?.faviconUrl || "").trim(),
      homeBannerUrl: String(body?.homeBannerUrl || "").trim(),
    };
    const branding = setBrandingConfig(payload);
    return { branding };
  }
}
