import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { ORDER_STATUS } from "../../common/utils/order-status";

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  private async listPending(userId: string, cutoff: Date) {
    return this.prisma.order.findMany({
      where: { userId, status: ORDER_STATUS.PENDING, createdAt: { lt: cutoff } },
    });
  }

  async reconcile(userId: string) {
    const cutoff = new Date(Date.now() - 15 * 60 * 1000);
    const pending = await this.listPending(userId, cutoff);

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
