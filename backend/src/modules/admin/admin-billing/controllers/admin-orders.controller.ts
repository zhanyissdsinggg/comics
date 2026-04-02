import {
  BadRequestException,
  Body,
  ConflictException,
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
import { PrismaService } from "../../../../common/prisma/prisma.service";
import { AdminLogService } from "../../../../common/services/admin-log.service";
import {
  buildAdminVisibleOrderWhere,
  readIncludeTestDataFlag,
} from "../../../../common/utils/admin-visible-data";
import { getIdempotencyRecord, setIdempotencyRecord } from "../../../../common/storage/limits";
import { normalizeUsStorefrontCurrencyCode } from "../../../../common/utils/currency";
import { isDemoBillingEnabled } from "../../../../common/utils/billing-mode";
import { ORDER_STATUS } from "../../../../common/utils/order-status";
import {
  buildPaginationResult,
  calculateOffset,
  parsePaginationParams,
} from "../../../../common/utils/pagination";
import { RequireAdminPermissions } from "../../decorators/admin-permissions.decorator";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";
import { AdminPermission } from "../../permissions/admin-permissions";
import { CreateOrderDto } from "../dtos/admin-billing.dto";

type OrderListRow = Record<string, unknown> & {
  id?: string;
  orderId?: string;
  order_id?: string;
  userId?: string;
  idempotencyKey?: string | null;
  amount?: number;
  currency?: string;
  status?: string;
  createdAt?: Date;
};

type AdjustResponse = {
  wallet: {
    userId: string;
    paidPts: number;
    bonusPts: number;
    plan?: string;
  };
};

function resolveOrderId(order: OrderListRow): string {
  const explicitOrderId = typeof order.orderId === "string" ? order.orderId.trim() : "";
  if (explicitOrderId) {
    return explicitOrderId;
  }
  const snakeCaseOrderId =
    typeof order.order_id === "string" ? order.order_id.trim() : "";
  if (snakeCaseOrderId) {
    return snakeCaseOrderId;
  }
  return "";
}

function normalizeOrderRecord<T extends Record<string, unknown>>(order: T): T & { currency: string; orderId: string } {
  return {
    ...order,
    currency: normalizeUsStorefrontCurrencyCode(order?.currency),
    orderId: resolveOrderId(order),
  };
}

function readSortOrder(value: unknown): "asc" | "desc" {
  return String(value || "desc").trim().toLowerCase() === "asc" ? "asc" : "desc";
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
@RequireAdminPermissions(AdminPermission.ORDER_READ)
export class AdminOrdersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminLogService: AdminLogService,
  ) {}

  @Get()
  async list(@Req() req: Request) {
    const { page, pageSize } = parsePaginationParams(req.query);
    const offset = calculateOffset(page, pageSize);
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const includeTestData = readIncludeTestDataFlag(req.query.includeTestData);
    const sortBy = typeof req.query.sortBy === "string" ? req.query.sortBy.trim() : "createdAt";
    const sortOrder = readSortOrder(req.query.sortOrder);
    const status = typeof req.query.status === "string" ? req.query.status.trim() : "";
    const baseWhere = {
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { id: { contains: search, mode: "insensitive" as const } },
              { userId: { contains: search, mode: "insensitive" as const } },
              { idempotencyKey: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const where = buildAdminVisibleOrderWhere(baseWhere, includeTestData);
    const orderBy =
      sortBy === "amount"
        ? { amount: sortOrder }
        : sortBy === "status"
          ? { status: sortOrder }
          : { createdAt: sortOrder };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        select: {
          id: true,
          userId: true,
          idempotencyKey: true,
          amount: true,
          currency: true,
          status: true,
          createdAt: true,
        },
        orderBy,
        take: pageSize,
        skip: offset,
      }),
      this.prisma.order.count({ where }),
    ]);

    return buildPaginationResult(
      orders.map((order) => normalizeOrderRecord(order)),
      total,
      page,
      pageSize,
    );
  }

  @Post("refund")
  @RequireAdminPermissions(AdminPermission.ORDER_REFUND)
  async refund(@Body() body: CreateOrderDto, @Req() req: Request) {
    if (!isDemoBillingEnabled()) {
      throw new ConflictException(
        "Secure billing is required. Demo refund mutations are disabled outside demo mode.",
      );
    }

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
      order: normalizeOrderRecord(next.nextOrder),
      wallet: next.nextWallet,
    };
  }

  @Post("refund/:id")
  @RequireAdminPermissions(AdminPermission.ORDER_REFUND)
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
  @RequireAdminPermissions(AdminPermission.ORDER_UPDATE)
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
  @RequireAdminPermissions(AdminPermission.ORDER_DELETE)
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
