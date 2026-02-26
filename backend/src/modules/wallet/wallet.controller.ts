import { Body, Controller, Get, Post, Req, Res } from "@nestjs/common";
import { WalletService } from "./wallet.service";
import { Request, Response } from "express";
import { getUserIdFromRequest } from "../../common/utils/auth";
import { buildError, ERROR_CODES } from "../../common/utils/errors";
import { checkRateLimit, getIdempotencyRecord, setIdempotencyRecord } from "../../common/storage/limits";
import { buildWalletSnapshot } from "../../common/utils/subscription";
import { StatsService } from "../../common/services/stats.service";
import { PrismaService } from "../../common/prisma/prisma.service";

@Controller("wallet")
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly statsService: StatsService,
    private readonly prisma: PrismaService
  ) {}

  @Get()
  async getWallet(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }
    const wallet = await this.walletService.getWallet(userId);
    return { wallet: await buildWalletSnapshot(this.prisma, userId, wallet) };
  }

  @Post("topup")
  async topup(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }
    const idempotencyKey = body?.idempotencyKey || req.headers["idempotency-key"];
    if (idempotencyKey) {
      const cached = await getIdempotencyRecord(this.prisma, userId, String(idempotencyKey));
      if (cached) {
        res.status(cached.status || 200);
        return cached.body;
      }
    }
    const rate = await checkRateLimit(this.prisma, userId, "wallet_topup", 10, 60);
    if (!rate.ok) {
      res.status(429);
      const body = buildError(ERROR_CODES.RATE_LIMITED, { retryAfterSec: rate.retryAfterSec });
      if (idempotencyKey) {
        await setIdempotencyRecord(this.prisma, userId, String(idempotencyKey), {
          status: 429,
          body,
        });
      }
      return body;
    }
    const packageId = body?.packageId || body?.id;
    const result = await this.walletService.topup(userId, packageId);
    if (!result.ok) {
      res.status(result.status || 400);
      const body = buildError(result.error || ERROR_CODES.INTERNAL);
      if (idempotencyKey) {
        await setIdempotencyRecord(this.prisma, userId, String(idempotencyKey), {
          status: result.status || 400,
          body,
        });
      }
      return body;
    }
    const responseBody = {
      ok: true,
      wallet: await buildWalletSnapshot(this.prisma, userId, result.wallet),
      order: result.order ? { ...result.order, orderId: result.order.id } : null,
    };
    await this.statsService.recordPaidOrder();
    if (idempotencyKey) {
      await setIdempotencyRecord(this.prisma, userId, String(idempotencyKey), {
        status: 200,
        body: responseBody,
      });
    }
    return responseBody;
  }
}
