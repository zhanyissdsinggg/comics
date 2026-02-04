import { Body, Controller, Get, Post, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { PrismaService } from "../../common/prisma/prisma.service";
import { getUserIdFromRequest } from "../../common/utils/auth";
import { buildError, ERROR_CODES } from "../../common/utils/errors";

@Controller("preferences")
export class PreferencesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getPreferences(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }
    const existing = await this.prisma.userPreference.findUnique({ where: { userId } });
    return {
      preferences: existing?.payload || {
        notifyNewEpisode: true,
        notifyTtfReady: true,
        notifyPromo: true,
      },
    };
  }

  @Post()
  async save(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }
    const payload = body?.preferences || {};
    const saved = await this.prisma.userPreference.upsert({
      where: { userId },
      update: { payload },
      create: { userId, payload },
    });
    return { preferences: saved.payload };
  }
}
