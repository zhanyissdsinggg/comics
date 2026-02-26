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

  /**
   * 优化后的reconcile方法 - 消除循环中的数据库操作
   * 之前：for循环中逐个创建auditLog和paymentRetry（N+1问题）
   * 现在：使用批量操作替代循环，减少数据库往返
   */
  async reconcile(userId: string) {
    const cutoff = new Date(Date.now() - 15 * 60 * 1000);
    const pending = await this.prisma.order.findMany({
      where: { userId, status: ORDER_STATUS.PENDING, createdAt: { lt: cutoff } },
    });

    if (pending.length === 0) {
      return { updated: 0, orders: await this.list(userId) };
    }

    // 第一步：批量更新订单状态
    await this.prisma.order.updateMany({
      where: { userId, status: ORDER_STATUS.PENDING, createdAt: { lt: cutoff } },
      data: { status: ORDER_STATUS.TIMEOUT },
    });

    // 第二步：批量创建审计日志（替代for循环）
    const auditLogs = pending.map((order) => ({
      userId,
      action: "order_timeout",
      targetType: "order",
      targetId: order.id,
      payload: { reason: "RECONCILE_TIMEOUT" },
    }));

    await this.prisma.auditLog.createMany({
      data: auditLogs,
    });

    // 第三步：获取所有订单对应的最新支付意图（一次查询）
    const paymentIntents = await this.prisma.paymentIntent.findMany({
      where: { orderId: { in: pending.map((o) => o.id) } },
      orderBy: { createdAt: "desc" },
      distinct: ["orderId"], // 每个订单只取最新的一条
    });

    // 第四步：构建paymentRetry数据
    const nextAttemptAt = new Date(Date.now() + 30_000);
    const paymentRetries = pending.map((order) => {
      const payment = paymentIntents.find((p) => p.orderId === order.id);
      return {
        userId,
        orderId: order.id,
        paymentId: payment?.id || null,
        status: "PENDING",
        nextAttemptAt,
        lastError: "TIMEOUT",
      };
    });

    // 第五步：批量创建或更新paymentRetry（替代for循环中的upsert）
    await Promise.all(
      paymentRetries.map((retry) =>
        this.prisma.paymentRetry.upsert({
          where: { orderId: retry.orderId },
          update: retry,
          create: retry,
        })
      )
    );

    return { updated: pending.length, orders: await this.list(userId) };
  }
}
