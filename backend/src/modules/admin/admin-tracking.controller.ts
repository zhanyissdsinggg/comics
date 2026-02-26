import { Body, Controller, Get, Post, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { isAdminAuthorized } from "../../common/utils/admin";
import { buildError, ERROR_CODES } from "../../common/utils/errors";
import { PrismaService } from "../../common/prisma/prisma.service";

@Controller("admin/tracking")
export class AdminTrackingController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getConfig(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    const config = await this.prisma.trackingConfig.findUnique({
      where: { key: "default" },
    });
    return { config: config?.payload || { values: {}, updatedAt: null } };
  }

  @Post()
  async save(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req, body)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    const values = body?.values || {};
    const payload = { values, updatedAt: new Date().toISOString() };
    const config = await this.prisma.trackingConfig.upsert({
      where: { key: "default" },
      update: { payload },
      create: { key: "default", payload },
    });
    return { config: config.payload };
  }
}
