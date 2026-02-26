import { Body, Controller, Get, Post, Req, Res } from "@nestjs/common";
import { RewardsService } from "./rewards.service";
import { Request, Response } from "express";
import { getUserIdFromRequest } from "../../common/utils/auth";
import { buildError, ERROR_CODES } from "../../common/utils/errors";
import { PrismaService } from "../../common/prisma/prisma.service";

const STREAK_REWARDS = [10, 12, 14, 16, 18, 20, 30];
const MAKEUP_COST = 5;

@Controller("rewards")
export class RewardsController {
  constructor(
    private readonly rewardsService: RewardsService,
    private readonly prisma: PrismaService
  ) {}

  @Get()
  async getState(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }
    const state = await this.rewardsService.getState(userId);
    const rewardPts = STREAK_REWARDS[Math.max(0, Math.min(state.streakCount - 1, STREAK_REWARDS.length - 1))] || 0;
    return { ...state, rewardPts };
  }

  @Post("checkin")
  async checkIn(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }
    const result = await this.rewardsService.checkIn(userId);
    if (!result.ok) {
      res.status(400);
      return buildError(result.error || ERROR_CODES.INTERNAL, { state: result.state });
    }
    const rewardPts = STREAK_REWARDS[Math.max(0, Math.min(result.state.streakCount - 1, STREAK_REWARDS.length - 1))] || 0;
    const wallet = await this.prisma.wallet.upsert({
      where: { userId },
      update: { bonusPts: { increment: rewardPts } },
      create: { userId, paidPts: 0, bonusPts: rewardPts, plan: "free" },
    });
    return { ok: true, rewardPts, wallet, state: result.state };
  }

  @Post("makeup")
  async makeUp(@Body() _body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if ((wallet?.paidPts || 0) < MAKEUP_COST) {
      res.status(402);
      return buildError(ERROR_CODES.INSUFFICIENT_POINTS, {
        shortfallPts: MAKEUP_COST - (wallet?.paidPts || 0),
      });
    }
    const result = await this.rewardsService.makeUp(userId);
    if (!result.ok) {
      res.status(400);
      return buildError(result.error || ERROR_CODES.INTERNAL);
    }
    const nextWallet = await this.prisma.wallet.update({
      where: { userId },
      data: { paidPts: { decrement: MAKEUP_COST } },
    });
    return { ok: true, wallet: nextWallet, state: result.state };
  }
}
