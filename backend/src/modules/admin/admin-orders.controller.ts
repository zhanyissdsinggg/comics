import { Body, Controller, Get, Post, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { isAdminAuthorized } from "../../common/utils/admin";
import { buildError, ERROR_CODES } from "../../common/utils/errors";
import { PrismaService } from "../../common/prisma/prisma.service";
import { getTopupPackage } from "../../common/config/topup";

@Controller("admin/orders")
export class AdminOrdersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    const orders = await this.prisma.order.findMany({
      orderBy: { createdAt: "desc" },
    });
    return {
      orders: orders.map((order: any) => ({
        ...order,
        orderId: order.id,
      })),
    };
  }

  @Post("refund")
  async refund(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req, body)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    const userId = body?.userId;
    const orderId = body?.orderId;
    if (!userId || !orderId) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
    }
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.userId !== userId) {
      res.status(404);
      return buildError(ERROR_CODES.NOT_FOUND);
    }
    if (order.status !== "PAID") {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
    }
    const pkg = await getTopupPackage(this.prisma, order.packageId);
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });

    // 老王注释：修复退款逻辑漏洞 - 验证余额是否足够
    const currentPaidPts = wallet?.paidPts || 0;
    const currentBonusPts = wallet?.bonusPts || 0;
    const refundPaidPts = pkg?.paidPts || 0;
    const refundBonusPts = pkg?.bonusPts || 0;

    // 验证余额是否足够退款
    if (currentPaidPts < refundPaidPts || currentBonusPts < refundBonusPts) {
      res.status(400);
      return buildError({
        code: "INSUFFICIENT_BALANCE",
        message: `余额不足，无法退款。当前：paid=${currentPaidPts}, bonus=${currentBonusPts}，需要：paid=${refundPaidPts}, bonus=${refundBonusPts}`,
      });
    }

    const paidPts = currentPaidPts - refundPaidPts;
    const bonusPts = currentBonusPts - refundBonusPts;

    const next = await this.prisma.$transaction(async (tx) => {
      const nextWallet = await tx.wallet.upsert({
        where: { userId },
        update: { paidPts, bonusPts },
        create: { userId, paidPts, bonusPts, plan: "free" },
      });
      const nextOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: "REFUNDED" },
      });
      return { nextWallet, nextOrder };
    });
    return {
      ok: true,
      order: { ...next.nextOrder, orderId: next.nextOrder.id },
      wallet: next.nextWallet,
    };
  }

  @Post("adjust")
  async adjust(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req, body)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    const userId = body?.userId;
    if (!userId) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
    }

    // 老王注释：修复负数补点漏洞 - 添加严格验证
    const paidDelta = Number(body?.paidDelta || 0);
    const bonusDelta = Number(body?.bonusDelta || 0);

    // 验证不能为负数
    if (paidDelta < 0 || bonusDelta < 0) {
      res.status(400);
      return buildError({ code: "NEGATIVE_DELTA", message: "补点数量不能为负数" });
    }

    // 验证单次补点上限（防止误操作）
    if (paidDelta > 10000 || bonusDelta > 10000) {
      res.status(400);
      return buildError({ code: "DELTA_TOO_LARGE", message: "单次补点不能超过10000" });
    }

    const wallet = await this.prisma.wallet.upsert({
      where: { userId },
      update: {
        paidPts: { increment: paidDelta },
        bonusPts: { increment: bonusDelta },
      },
      create: { userId, paidPts: paidDelta, bonusPts: bonusDelta, plan: "free" },
    });
    return { wallet };
  }
}
