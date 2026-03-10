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
import { Prisma } from "@prisma/client";
import { Request } from "express";
import { getTopupPackage } from "../../../../common/config/topup";
import { logger } from "../../../../common/logger/winston.init";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import { AdminLogService } from "../../../../common/services/admin-log.service";
import { getIdempotencyRecord, setIdempotencyRecord } from "../../../../common/storage/limits";
import { ORDER_STATUS } from "../../../../common/utils/order-status";
import {
  buildPaginationResult,
  calculateOffset,
  parsePaginationParams,
} from "../../../../common/utils/pagination";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";
import { CreateOrderDto } from "../dtos/admin-billing.dto";

type RawOrderRow = Record<string, unknown> & {
  id?: string;
  orderId?: string;
  order_id?: string;
};

type AdjustResponse = {
  wallet: {
    userId: string;
    paidPts: number;
    bonusPts: number;
    plan?: string;
  };
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function resolveOrderId(order: RawOrderRow): string {
  if (typeof order.id === "string" && order.id) {
    return order.id;
  }
  if (typeof order.orderId === "string" && order.orderId) {
    return order.orderId;
  }
  if (typeof order.order_id === "string" && order.order_id) {
    return order.order_id;
  }
  return "";
}

function readIdempotencyKey(body: CreateOrderDto, req: Request): string | null {
  const headerValue = req.headers["idempotency-key"] || req.headers["x-idempotency-key"];
  const rawValue = body?.idempotencyKey || headerValue;
  if (Array.isArray(rawValue)) {
    return rawValue[0] ? String(rawValue[0]) : null;
  }
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return null;
  }
  return String(rawValue);
}

function buildAdjustIdempotencyKey(key: string): string {
  return `admin-adjust:${key}`;
}

@Controller("admin/orders")
@UseGuards(AdminAuthGuard)
export class AdminOrdersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminLogService: AdminLogService,
  ) {}

  @Get()
  async list(@Req() req: Request) {
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
        orders.map((order) => ({
          ...order,
          orderId: order.id,
        })),
        total,
        page,
        pageSize,
      );
    } catch (error: unknown) {
      logger.warn("[admin-orders] prisma query failed, fallback to raw sql", {
        message: getErrorMessage(error),
      });

      const [rawOrders, totalRows] = await Promise.all([
        this.prisma.$queryRaw<RawOrderRow[]>`SELECT * FROM "orders" LIMIT ${pageSize} OFFSET ${offset}`,
        this.prisma.$queryRaw<Array<{ count: number | bigint | string }>>`SELECT COUNT(*)::int AS count FROM "orders"`,
      ]);
      const total = Number(totalRows?.[0]?.count || 0);
      const normalized = rawOrders.map((order) => ({
        ...order,
        orderId: resolveOrderId(order),
      }));
      return buildPaginationResult(normalized, total, page, pageSize);
    }
  }

  @Post("refund")
  async refund(@Body() body: CreateOrderDto, @Req() req: Request) {
    const userId = body?.userId;
    const orderId = body?.orderId;
    if (!userId || !orderId) {
      throw new BadRequestException("userId and orderId are required.");
    }

    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.userId !== userId) {
      throw new NotFoundException("Order not found.");
    }
    if (order.status !== ORDER_STATUS.PAID) {
      throw new BadRequestException("Only paid orders can be refunded.");
    }

    const pkg = await getTopupPackage(this.prisma, order.packageId);
    if (!pkg) {
      throw new BadRequestException("Order package config not found.");
    }

    const refundPaidPts = pkg?.paidPts || 0;
    const refundBonusPts = pkg?.bonusPts || 0;

    const next = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const currentOrder = await tx.order.findUnique({ where: { id: orderId } });
      if (!currentOrder || currentOrder.userId !== userId) {
        throw new NotFoundException("Order not found.");
      }
      if (currentOrder.status !== ORDER_STATUS.PAID) {
        throw new BadRequestException("Only paid orders can be refunded.");
      }

      const currentWallet = await tx.wallet.findUnique({ where: { userId } });
      const currentPaidPts = currentWallet?.paidPts || 0;
      const currentBonusPts = currentWallet?.bonusPts || 0;
      if (currentPaidPts < refundPaidPts || currentBonusPts < refundBonusPts) {
        throw new BadRequestException(
          `Insufficient balance to refund order. Current paid=${currentPaidPts}, bonus=${currentBonusPts}; required paid=${refundPaidPts}, bonus=${refundBonusPts}.`,
        );
      }

      const walletUpdate = await tx.wallet.updateMany({
        where: {
          userId,
          paidPts: { gte: refundPaidPts },
          bonusPts: { gte: refundBonusPts },
        },
        data: {
          paidPts: { decrement: refundPaidPts },
          bonusPts: { decrement: refundBonusPts },
        },
      });
      if (walletUpdate.count === 0) {
        throw new BadRequestException("Wallet balance changed during refund. Please retry.");
      }

      const orderUpdate = await tx.order.updateMany({
        where: {
          id: orderId,
          userId,
          status: ORDER_STATUS.PAID,
        },
        data: { status: ORDER_STATUS.REFUNDED },
      });
      if (orderUpdate.count === 0) {
        throw new BadRequestException("Order is no longer refundable.");
      }

      const nextWallet = await tx.wallet.findUnique({ where: { userId } });
      const nextOrder = await tx.order.findUnique({ where: { id: orderId } });
      if (!nextWallet || !nextOrder) {
        throw new NotFoundException("Refund state could not be reloaded.");
      }

      return {
        currentPaidPts,
        currentBonusPts,
        nextWallet,
        nextOrder,
      };
    });

    await this.adminLogService.log(
      "refund",
      "order",
      orderId,
      {
        userId,
        orderId,
        before: {
          paidPts: next.currentPaidPts,
          bonusPts: next.currentBonusPts,
          orderStatus: ORDER_STATUS.PAID,
        },
        after: {
          paidPts: next.nextWallet.paidPts,
          bonusPts: next.nextWallet.bonusPts,
          orderStatus: ORDER_STATUS.REFUNDED,
        },
        refundAmount: { paidPts: refundPaidPts, bonusPts: refundBonusPts },
      },
      req,
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
    @Req() req: Request,
  ) {
    return this.refund(
      {
        ...body,
        orderId,
      },
      req,
    );
  }

  @Post("adjust")
  async adjust(@Body() body: CreateOrderDto, @Req() req: Request) {
    const userId = body?.userId;
    if (!userId) {
      throw new BadRequestException("userId is required.");
    }

    const idempotencyKey = readIdempotencyKey(body, req);
    if (idempotencyKey) {
      const cached = await getIdempotencyRecord(
        this.prisma,
        userId,
        buildAdjustIdempotencyKey(idempotencyKey),
      );
      if (cached?.body) {
        return cached.body as AdjustResponse;
      }
    }

    const paidDelta = Number(body?.paidDelta || 0);
    const bonusDelta = Number(body?.bonusDelta || 0);

    if (paidDelta < 0 || bonusDelta < 0) {
      throw new BadRequestException("Balance adjustments cannot be negative.");
    }
    if (paidDelta > 10000 || bonusDelta > 10000) {
      throw new BadRequestException("Single balance adjustments cannot exceed 10000.");
    }

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

    const responseBody: AdjustResponse = { wallet };
    if (idempotencyKey) {
      await setIdempotencyRecord(
        this.prisma,
        userId,
        buildAdjustIdempotencyKey(idempotencyKey),
        {
          status: 200,
          body: responseBody,
        },
      );
    }

    await this.adminLogService.log(
      "adjust",
      "wallet",
      userId,
      {
        userId,
        before: { paidPts: beforePaidPts, bonusPts: beforeBonusPts },
        after: { paidPts: wallet.paidPts, bonusPts: wallet.bonusPts },
        delta: { paidPts: paidDelta, bonusPts: bonusDelta },
        idempotencyKey,
      },
      req,
    );

    return responseBody;
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    if (!id) {
      throw new BadRequestException("Missing orderId parameter.");
    }
    const existing = await this.prisma.order.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Order not found.");
    }
    const order = await this.prisma.order.update({
      where: { id },
      data: { status: ORDER_STATUS.FAILED },
    });
    return { ok: true, order };
  }
}