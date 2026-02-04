import { Body, Controller, Get, Post, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { isAdminAuthorized } from "../../common/utils/admin";
import { buildError, ERROR_CODES } from "../../common/utils/errors";
import { PrismaService } from "../../common/prisma/prisma.service";

@Controller("admin/regions")
export class AdminRegionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getConfig(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    const config = await this.prisma.regionConfig.findUnique({ where: { key: "default" } });
    return { config: config?.payload || { countryCodes: [], lengthRules: {} } };
  }

  @Post()
  async save(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req, body)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    const countryCodes = Array.isArray(body?.countryCodes) ? body.countryCodes : [];
    const lengthRules = body?.lengthRules || {};
    const payload = {
      countryCodes: countryCodes
        .map((item: any) => ({
          code: String(item.code || "").trim(),
          label: String(item.label || "").trim(),
        }))
        .filter((item: any) => item.code),
      lengthRules,
      updatedAt: new Date().toISOString(),
    };
    const config = await this.prisma.regionConfig.upsert({
      where: { key: "default" },
      update: { payload },
      create: { key: "default", payload },
    });
    return { config: config.payload };
  }
}
