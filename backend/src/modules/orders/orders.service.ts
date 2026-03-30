import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { logger } from "../../common/logger/winston.init";
import { normalizeUsStorefrontCurrencyCode } from "../../common/utils/currency";
import { ORDER_STATUS } from "../../common/utils/order-status";

type RawOrderRow = {
  id?: string;
  userId?: string;
  packageId?: string;
  amount?: number | string | bigint;
  currency?: string;
  status?: string;
  priceSnapshot?: number | string | bigint | null;
  idempotencyKey?: string | null;
  paidAt?: Date | string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
};

function toNumber(value: number | string | bigint | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeRawOrder(order: RawOrderRow) {
  return {
    id: String(order.id || ""),
    userId: String(order.userId || ""),
    packageId: String(order.packageId || ""),
    amount: toNumber(order.amount),
    currency: normalizeUsStorefrontCurrencyCode(order.currency),
    status: String(order.status || ""),
    priceSnapshot: toNumber(order.priceSnapshot),
    idempotencyKey: order.idempotencyKey ? String(order.idempotencyKey) : null,
    paidAt: toDate(order.paidAt),
    createdAt: toDate(order.createdAt) || new Date(0),
    updatedAt: toDate(order.updatedAt) || new Date(0),
  };
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private async listWithFallback(userId: string) {
    try {
      return await this.prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
    } catch (error: unknown) {
      logger.warn("[orders] prisma list failed, fallback to raw sql", {
        userId,
        message: error instanceof Error ? error.message : String(error),
      });
      const rows = await this.prisma.$queryRaw<RawOrderRow[]>`
        SELECT *
        FROM "orders"
        WHERE "userId" = ${userId}
        ORDER BY "createdAt" DESC
      `;
      return rows.map(normalizeRawOrder);
    }
  }

  private async listPendingWithFallback(userId: string, cutoff: Date) {
    try {
      return await this.prisma.order.findMany({
        where: { userId, status: ORDER_STATUS.PENDING, createdAt: { lt: cutoff } },
      });
    } catch (error: unknown) {
      logger.warn("[orders] prisma pending query failed, fallback to raw sql", {
        userId,
        message: error instanceof Error ? error.message : String(error),
      });
      const rows = await this.prisma.$queryRaw<RawOrderRow[]>`
        SELECT *
        FROM "orders"
        WHERE "userId" = ${userId}
          AND "status" = ${ORDER_STATUS.PENDING}
          AND "createdAt" < ${cutoff}
      `;
      return rows.map(normalizeRawOrder);
    }
  }

  async list(userId: string) {
    return this.listWithFallback(userId);
  }

  async reconcile(userId: string) {
    const cutoff = new Date(Date.now() - 15 * 60 * 1000);
    const pending = await this.listPendingWithFallback(userId, cutoff);

    if (pending.length === 0) {
      return { updated: 0, orders: await this.list(userId) };
    }

    await this.prisma.order.updateMany({
      where: { userId, status: ORDER_STATUS.PENDING, createdAt: { lt: cutoff } },
      data: { status: ORDER_STATUS.TIMEOUT },
    });

    const auditLogs = pending.map((order) => ({
      userId,
      action: "order_timeout",
      resource: "order",
      targetType: "order",
      targetId: order.id,
      payload: JSON.stringify({ reason: "RECONCILE_TIMEOUT" }),
    }));

    await this.prisma.auditLog.createMany({ data: auditLogs });

    const paymentIntents = await this.prisma.paymentIntent.findMany({
      where: { orderId: { in: pending.map((order) => order.id) } },
      orderBy: { createdAt: "desc" },
      distinct: ["orderId"],
    });

    const nextAttemptAt = new Date(Date.now() + 30_000);
    const paymentRetries = pending.map((order) => {
      const payment = paymentIntents.find((intent) => intent.orderId === order.id);
      return {
        userId,
        orderId: order.id,
        paymentId: payment?.id || null,
        status: "PENDING",
        nextAttemptAt,
        lastError: "TIMEOUT",
      };
    });

    await Promise.all(
      paymentRetries.map((retry) =>
        this.prisma.paymentRetry.upsert({
          where: { orderId: retry.orderId },
          update: retry,
          create: retry,
        }),
      ),
    );

    return { updated: pending.length, orders: await this.list(userId) };
  }
}
