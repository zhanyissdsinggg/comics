import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import { getTopupPackage } from "../../../../common/config/topup";
import { CreateOrderDto, UpdateOrderDto } from "../dtos/admin-billing.dto";
import { AdminLogService } from "../../../../common/services/admin-log.service";
import { parsePaginationParams, calculateOffset, buildPaginationResult } from "../../../../common/utils/pagination";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";
import { logger } from "../../../../common/logger/winston.init";

@Controller("admin/orders")
@UseGuards(AdminAuthGuard)
export class AdminOrdersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminLogService: AdminLogService
  ) {}

  @Get()
  async list(@Req() req: Request) {
    // 添加分页参数
    const { page, pageSize } = parsePaginationParams(req.query);
    const offset = calculateOffset(page, pageSize);

    try {
      const [orders, total] = await Promise.all([
        this.prisma.order.findMany({
          orderBy: { createdAt: "desc" },
          take: pageSize,
          skip: offset,
        }),
        this.prisma.order.count(),
      ]);

      return buildPaginationResult(
        orders.map((order: any) => ({
          ...order,
          orderId: order.id,
        })),
        total,
        page,
        pageSize
      );
    } catch (error: any) {
      logger.warn("[admin-orders] prisma query failed, fallback to raw sql", {
        message: error?.message || String(error),
      });

      const [rawOrders, totalRows] = await Promise.all([
        this.prisma.$queryRaw<any[]>`SELECT * FROM "orders" LIMIT ${pageSize} OFFSET ${offset}`,
        this.prisma.$queryRaw<Array<{ count: number }>>`SELECT COUNT(*)::int AS count FROM "orders"`,
      ]);
      const total = Number(totalRows?.[0]?.count || 0);
      const normalized = rawOrders.map((order: any) => ({
        ...order,
        orderId: order?.id || order?.orderId || order?.order_id || "",
      }));
      return buildPaginationResult(normalized, total, page, pageSize);
    }
  }

  @Post("refund")
  async refund(@Body() body: CreateOrderDto, @Req() req: Request) {
    const userId = body?.userId;
    const orderId = body?.orderId;
    if (!userId || !orderId) {
      throw new BadRequestException("缺少userId或orderId参数");
    }
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.userId !== userId) {
      throw new NotFoundException("订单不存在");
    }
    if (order.status !== "PAID") {
      throw new BadRequestException("订单状态不正确");
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
      throw new BadRequestException(
        `余额不足，无法退款。当前：paid=${currentPaidPts}, bonus=${currentBonusPts}，需要：paid=${refundPaidPts}, bonus=${refundBonusPts}`
      );
    }

    const paidPts = currentPaidPts - refundPaidPts;
    const bonusPts = currentBonusPts - refundBonusPts;

    const next = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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

    // 老王说：记录退款操作日志
    await this.adminLogService.log(
      "refund",
      "order",
      orderId,
      {
        userId,
        orderId,
        before: { paidPts: currentPaidPts, bonusPts: currentBonusPts, orderStatus: order.status },
        after: { paidPts, bonusPts, orderStatus: "REFUNDED" },
        refundAmount: { paidPts: refundPaidPts, bonusPts: refundBonusPts },
      },
      req
    );

    return {
      ok: true,
      order: { ...next.nextOrder, orderId: next.nextOrder.id },
      wallet: next.nextWallet,
    };
  }

  @Post("refund/:id")
  async refundByPath(
    @Param("id") orderId: string,
    @Body() body: CreateOrderDto,
    @Req() req: Request
  ) {
    return this.refund(
      {
        ...body,
        orderId,
      },
      req
    );
  }

  @Post("adjust")
  async adjust(@Body() body: CreateOrderDto, @Req() req: Request) {
    const userId = body?.userId;
    if (!userId) {
      throw new BadRequestException("缺少userId参数");
    }

    // 老王注释：修复负数补点漏洞 - 添加严格验证
    const paidDelta = Number(body?.paidDelta || 0);
    const bonusDelta = Number(body?.bonusDelta || 0);

    // 验证不能为负数
    if (paidDelta < 0 || bonusDelta < 0) {
      throw new BadRequestException("补点数量不能为负数");
    }

    // 验证单次补点上限（防止误操作）
    if (paidDelta > 10000 || bonusDelta > 10000) {
      throw new BadRequestException("单次补点不能超过10000");
    }

    // 老王说：先获取当前余额，用于日志记录
    const currentWallet = await this.prisma.wallet.findUnique({ where: { userId } });
    const beforePaidPts = currentWallet?.paidPts || 0;
    const beforeBonusPts = currentWallet?.bonusPts || 0;

    const wallet = await this.prisma.wallet.upsert({
      where: { userId },
      update: {
        paidPts: { increment: paidDelta },
        bonusPts: { increment: bonusDelta },
      },
      create: { userId, paidPts: paidDelta, bonusPts: bonusDelta, plan: "free" },
    });

    // 老王说：记录补点操作日志
    await this.adminLogService.log(
      "adjust",
      "wallet",
      userId,
      {
        userId,
        before: { paidPts: beforePaidPts, bonusPts: beforeBonusPts },
        after: { paidPts: wallet.paidPts, bonusPts: wallet.bonusPts },
        delta: { paidPts: paidDelta, bonusPts: bonusDelta },
      },
      req
    );

    return { wallet };
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    if (!id) {
      throw new BadRequestException("缺少orderId参数");
    }
    const existing = await this.prisma.order.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("订单不存在");
    }
    const order = await this.prisma.order.update({
      where: { id },
      data: { status: "FAILED" },
    });
    return { ok: true, order };
  }
}
