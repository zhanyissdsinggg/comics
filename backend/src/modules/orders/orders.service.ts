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

  async reconcile(userId: string) {
    const cutoff = new Date(Date.now() - 15 * 60 * 1000);
    const pending = await this.prisma.order.findMany({
      where: { userId, status: ORDER_STATUS.PENDING, createdAt: { lt: cutoff } },
    });
    if (pending.length === 0) {
      return { updated: 0, orders: await this.list(userId) };
    }
    await this.prisma.order.updateMany({
      where: { userId, status: ORDER_STATUS.PENDING, createdAt: { lt: cutoff } },
      data: { status: ORDER_STATUS.TIMEOUT },
    });
    for (const order of pending) {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: "order_timeout",
          targetType: "order",
          targetId: order.id,
          payload: { reason: "RECONCILE_TIMEOUT" },
        },
      });
      const payment = await this.prisma.paymentIntent.findFirst({
        where: { orderId: order.id },
        orderBy: { createdAt: "desc" },
      });
      const nextAttemptAt = new Date(Date.now() + 30_000);
      await this.prisma.paymentRetry.upsert({
        where: { orderId: order.id },
        update: {
          userId,
          paymentId: payment?.id || null,
          status: "PENDING",
          nextAttemptAt,
          lastError: "TIMEOUT",
        },
        create: {
          userId,
          orderId: order.id,
          paymentId: payment?.id || null,
          status: "PENDING",
          nextAttemptAt,
          lastError: "TIMEOUT",
        },
      });
    }
    return { updated: pending.length, orders: await this.list(userId) };
  }
}
