import { Body, Controller, Get, Post, Req, Res } from "@nestjs/common";
import { MissionsService } from "./missions.service";
import { Request, Response } from "express";
import { getUserIdFromRequest } from "../../common/utils/auth";
import { buildError, ERROR_CODES } from "../../common/utils/errors";
import { PrismaService } from "../../common/prisma/prisma.service";

@Controller("missions")
export class MissionsController {
  constructor(
    private readonly missionsService: MissionsService,
    private readonly prisma: PrismaService
  ) {}

  @Get()
  async list(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }
    const state = await this.missionsService.list(userId);
    return { daily: state.daily, weekly: state.weekly };
  }

  @Post("report")
  async report(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }
    const eventType = body?.eventType;
    if (!eventType) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
    }
    const state = await this.missionsService.report(userId, eventType);
    return { daily: state.daily, weekly: state.weekly };
  }

  @Post("claim")
  async claim(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }
    const missionId = body?.missionId;
    if (!missionId) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
    }
    const result = await this.missionsService.claim(userId, missionId);
    if (!result.ok) {
      res.status(400);
      return buildError(result.error || ERROR_CODES.INTERNAL);
    }
    const wallet = await this.prisma.wallet.upsert({
      where: { userId },
      update: { bonusPts: { increment: result.reward } },
      create: { userId, paidPts: 0, bonusPts: result.reward, plan: "free" },
    });
    return {
      ok: true,
      reward: result.reward,
      wallet,
      daily: result.state.daily,
      weekly: result.state.weekly,
    };
  }
}
