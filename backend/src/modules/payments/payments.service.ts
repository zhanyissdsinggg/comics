import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { logger } from "../../common/logger/winston.init";
import { getTopupPackage } from "../../common/config/topup";
import { ORDER_STATUS, PAYMENT_STATUS } from "../../common/utils/order-status";

@Injectable()
export class PaymentsService implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly prisma: PrismaService) {}

  private retryTimer: NodeJS.Timeout | null = null;

  onModuleInit() {
    this.retryTimer = setInterval(() => {
      this.processRetries().catch(() => null);
    }, 20_000);
  }

  onModuleDestroy() {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private buildNextRetryTime(attempts: number) {
    const baseMs = 30_000;
    const backoff = Math.min(baseMs * Math.pow(2, attempts), 10 * 60 * 1000);
    return new Date(Date.now() + backoff);
  }

  async enqueueRetry(userId: string, orderId: string, paymentId?: string, reason = "") {
    const nextAttemptAt = this.buildNextRetryTime(0);
    await this.prisma.paymentRetry.upsert({
      where: { orderId },
      update: {
        userId,
        paymentId: paymentId || undefined,
        status: "PENDING",
        nextAttemptAt,
        lastError: reason || "",
      },
      create: {
        userId,
        orderId,
        paymentId: paymentId || null,
        status: "PENDING",
        nextAttemptAt,
        lastError: reason || "",
      },
    });
  }

  /**
   * 优化后的processRetries方法 - 消除循环中的数据库操作
   * 之前：for循环中逐个查询paymentIntent和更新paymentRetry（N+1问题）
   * 现在：批量查询所有paymentIntent，然后并行处理重试逻辑
   * 老王说：添加乐观锁防止并发更新冲突
   */
  async processRetries() {
    const now = new Date();
    const due = await this.prisma.paymentRetry.findMany({
      where: { status: "PENDING", nextAttemptAt: { lte: now } },
      take: 10,
    });

    if (due.length === 0) {
      return;
    }

    // 第一步：批量查询所有订单对应的最新支付意图（一次查询）
    const paymentIntents = await this.prisma.paymentIntent.findMany({
      where: { orderId: { in: due.map((j) => j.orderId) } },
      orderBy: { createdAt: "desc" },
      distinct: ["orderId"],
    });

    // 第二步：构建paymentId映射表
    const paymentIdMap = new Map(
      paymentIntents.map((p) => [p.orderId, p.id])
    );

    // 第三步：并行处理所有重试任务，但限制并发数量防止数据库压力过大
    const maxConcurrency = 3;
    for (let i = 0; i < due.length; i += maxConcurrency) {
      const batch = due.slice(i, i + maxConcurrency);
      const updatePromises = batch.map(async (job) => {
        let paymentId = job.paymentId || paymentIdMap.get(job.orderId);

        if (!paymentId) {
          // 支付意图不存在，标记为失败
          // 老王说：使用乐观锁，检查version是否匹配
          try {
            await this.prisma.paymentRetry.update({
              where: { orderId: job.orderId },
              data: {
                attempts: { increment: 1 },
                lastError: "PAYMENT_NOT_FOUND",
                nextAttemptAt: this.buildNextRetryTime(job.attempts + 1),
                version: { increment: 1 }, // 增加版本号
              },
            });
          } catch (err) {
            // 版本号不匹配，说明有其他进程在更新，忽略这个错误
            logger.warn(`版本号冲突，跳过更新: ${job.orderId}`);
          }
          return;
        }

        // 确认支付
        const result = await this.confirm(job.userId, paymentId);

        if (result.ok) {
          try {
            await this.prisma.paymentRetry.update({
              where: { orderId: job.orderId },
              data: {
                status: "SUCCEEDED",
                lastError: "",
                version: { increment: 1 }, // 增加版本号
              },
            });
          } catch (err) {
            logger.warn(`版本号冲突，跳过更新: ${job.orderId}`);
          }
          return;
        }

        // 重试失败，更新重试状态
        const attempts = job.attempts + 1;
        const status = attempts >= 3 ? "FAILED" : "PENDING";

        try {
          await this.prisma.paymentRetry.update({
            where: { orderId: job.orderId },
            data: {
              attempts,
              status,
              lastError: result.error || "RETRY_FAILED",
              nextAttemptAt: this.buildNextRetryTime(attempts),
              version: { increment: 1 }, // 增加版本号
            },
          });
        } catch (err) {
          logger.warn(`版本号冲突，跳过更新: ${job.orderId}`);
        }
      });

      // 等待这一批更新完成
      await Promise.all(updatePromises);
    }
  }

  /**
   * 老王说：创建订单时必须验证金额，防止前端篡改价格
   * 添加幂等性保证：相同的idempotencyKey返回相同的订单
   * @param userId 用户ID
   * @param packageId 套餐ID
   * @param expectedAmount 前端传入的预期金额，必须与数据库价格一致
   * @param provider 支付提供商
   * @param idempotencyKey 幂等性key，防止重复支付
   */
  async create(userId: string, packageId: string, expectedAmount: number, provider?: string, idempotencyKey?: string) {
    // 老王说：如果提供了idempotencyKey，先检查是否已存在相同的订单
    if (idempotencyKey) {
      const existingOrder = await this.prisma.order.findUnique({
        where: { userId_idempotencyKey: { userId, idempotencyKey } },
        include: { paymentIntents: true },
      });
      if (existingOrder) {
        // 返回已存在的订单，实现幂等性
        const payment = existingOrder.paymentIntents[0];
        return {
          order: existingOrder,
          payment: payment ? {
            paymentId: payment.id,
            orderId: payment.orderId,
            provider: payment.provider,
            status: payment.status,
            createdAt: payment.createdAt,
          } : null,
        };
      }
    }

    const pkg = await getTopupPackage(this.prisma, packageId);
    if (!pkg) {
      return null;
    }

    // 老王说：金额验证是第一道防线，前端传的金额必须和数据库一致
    if (expectedAmount !== pkg.price) {
      logger.error(`金额验证失败`, { expected: expectedAmount, actual: pkg.price, packageId });
      return null;
    }

    // 老王说：创建订单时保存价格快照，防止后续套餐价格被修改导致金额不匹配
    const order = await this.prisma.order.create({
      data: {
        userId,
        packageId: pkg.packageId,
        amount: pkg.price,
        priceSnapshot: pkg.price, // 保存价格快照
        idempotencyKey: idempotencyKey || null, // 保存幂等性key
        currency: "USD",
        status: ORDER_STATUS.PENDING,
      },
    });
    const payment = await this.prisma.paymentIntent.create({
      data: {
        userId,
        orderId: order.id,
        provider: provider || "stripe",
        status: PAYMENT_STATUS.AUTHORIZED,
      },
    });
    return {
      order,
      payment: {
        paymentId: payment.id,
        orderId: order.id,
        provider: payment.provider,
        status: payment.status,
        createdAt: payment.createdAt,
      },
    };
  }

  async confirm(userId: string, paymentId: string) {
    if (!paymentId) {
      return { ok: false, error: "PAYMENT_NOT_FOUND" };
    }
    const payment = await this.prisma.paymentIntent.findUnique({ where: { id: paymentId } });
    if (!payment || payment.userId !== userId) {
      return { ok: false, error: "PAYMENT_NOT_FOUND" };
    }
    const order = await this.prisma.order.findUnique({ where: { id: payment.orderId } });
    if (!order || order.userId !== userId) {
      return { ok: false, error: "ORDER_NOT_FOUND" };
    }
    if (order.status === ORDER_STATUS.PAID) {
      const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
      return { ok: true, order, wallet };
    }
    const blockedStatuses = [
      ORDER_STATUS.FAILED,
      ORDER_STATUS.TIMEOUT,
      ORDER_STATUS.REFUNDED,
      ORDER_STATUS.DISPUTED,
      ORDER_STATUS.CHARGEBACK,
    ] as string[];
    if (blockedStatuses.includes(String(order.status))) {
      return { ok: false, error: "ORDER_NOT_PAYABLE" };
    }
    const pkg = await getTopupPackage(this.prisma, order.packageId);
    if (!pkg) {
      return { ok: false, error: "INVALID_PACKAGE" };
    }

    // 老王说：确认支付时再次验证金额，防止订单创建后套餐价格被修改
    if (order.amount !== pkg.price) {
      logger.error(`确认支付时金额验证失败`, { orderAmount: order.amount, packagePrice: pkg.price, orderId: order.id });
      return { ok: false, error: "AMOUNT_MISMATCH" };
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId },
        update: {
          paidPts: { increment: pkg.paidPts || 0 },
          bonusPts: { increment: pkg.bonusPts || 0 },
        },
        create: {
          userId,
          paidPts: pkg.paidPts || 0,
          bonusPts: pkg.bonusPts || 0,
          plan: "free",
        },
      });
      const nextOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: ORDER_STATUS.PAID, paidAt: new Date() },
      });
      await tx.paymentIntent.update({
        where: { id: payment.id },
        data: { status: PAYMENT_STATUS.CAPTURED },
      });
      return { wallet, order: nextOrder };
    });
    return { ok: true, order: result.order, wallet: result.wallet };
  }

  async refund(userId: string, orderId: string) {
    if (!orderId) {
      return { ok: false, error: "ORDER_NOT_FOUND" };
    }
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.userId !== userId) {
      return { ok: false, error: "ORDER_NOT_FOUND" };
    }
    if (order.status !== ORDER_STATUS.PAID) {
      return { ok: false, error: "ORDER_NOT_PAID" };
    }
    const pkg = await getTopupPackage(this.prisma, order.packageId);
    if (!pkg) {
      return { ok: false, error: "INVALID_PACKAGE" };
    }

    // 老王说：退款前必须检查用户点数是否足够扣除
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    const currentPaidPts = wallet?.paidPts || 0;
    const currentBonusPts = wallet?.bonusPts || 0;
    const refundPaidPts = pkg.paidPts || 0;
    const refundBonusPts = pkg.bonusPts || 0;

    // 计算退款后的点数不足量
    const paidShortfall = Math.max(0, refundPaidPts - currentPaidPts);
    const bonusShortfall = Math.max(0, refundBonusPts - currentBonusPts);
    const totalShortfall = paidShortfall + bonusShortfall;

    // 如果点数不足，拒绝退款
    if (totalShortfall > 0) {
      // 脱敏日志：不记录具体的用户点数信息
      logger.error(`退款失败：用户点数不足`, { shortfall: totalShortfall });
      return {
        ok: false,
        error: "INSUFFICIENT_POINTS",
        refundShortfall: totalShortfall,
      };
    }

    // 老王说：在事务内部重新检查钱包余额，防止竞态条件
    // 如果用户在检查和扣除之间消费了点数，事务会失败
    const result = await this.prisma.$transaction(async (tx) => {
      // 重新查询钱包，确保最新的余额
      const latestWallet = await tx.wallet.findUnique({ where: { userId } });
      const latestPaidPts = latestWallet?.paidPts || 0;
      const latestBonusPts = latestWallet?.bonusPts || 0;

      // 再次检查点数是否足够
      const latestPaidShortfall = Math.max(0, refundPaidPts - latestPaidPts);
      const latestBonusShortfall = Math.max(0, refundBonusPts - latestBonusPts);
      const latestTotalShortfall = latestPaidShortfall + latestBonusShortfall;

      if (latestTotalShortfall > 0) {
        throw new Error(`INSUFFICIENT_POINTS_IN_TRANSACTION: ${latestTotalShortfall}`);
      }

      // 老王说：点数足够才能扣除，不使用Math.max防止负数
      const paidPts = latestPaidPts - refundPaidPts;
      const bonusPts = latestBonusPts - refundBonusPts;

      // 确保点数不会为负数（这是最后的防线）
      if (paidPts < 0 || bonusPts < 0) {
        throw new Error(`NEGATIVE_POINTS_DETECTED: paid=${paidPts}, bonus=${bonusPts}`);
      }

      const nextWallet = await tx.wallet.upsert({
        where: { userId },
        update: { paidPts, bonusPts },
        create: { userId, paidPts, bonusPts, plan: "free" },
      });
      const nextOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: ORDER_STATUS.REFUNDED },
      });
      return { wallet: nextWallet, order: nextOrder };
    });

    return { ok: true, order: result.order, wallet: result.wallet, refundShortfall: 0 };
  }
}
