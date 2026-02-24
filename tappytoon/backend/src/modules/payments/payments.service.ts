import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
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

  async processRetries() {
    const now = new Date();
    const due = await this.prisma.paymentRetry.findMany({
      where: { status: "PENDING", nextAttemptAt: { lte: now } },
      take: 10,
    });
    if (due.length === 0) {
      return;
    }
    for (const job of due) {
      let paymentId = job.paymentId;
      if (!paymentId) {
        const payment = await this.prisma.paymentIntent.findFirst({
          where: { orderId: job.orderId },
          orderBy: { createdAt: "desc" },
        });
        paymentId = payment?.id;
      }
      if (!paymentId) {
        await this.prisma.paymentRetry.update({
          where: { orderId: job.orderId },
          data: {
            attempts: { increment: 1 },
            lastError: "PAYMENT_NOT_FOUND",
            nextAttemptAt: this.buildNextRetryTime(job.attempts + 1),
          },
        });
        continue;
      }
      const result = await this.confirm(job.userId, paymentId);
      if (result.ok) {
        await this.prisma.paymentRetry.update({
          where: { orderId: job.orderId },
          data: { status: "SUCCEEDED", lastError: "" },
        });
        continue;
      }
      const attempts = job.attempts + 1;
      const status = attempts >= 3 ? "FAILED" : "PENDING";
      await this.prisma.paymentRetry.update({
        where: { orderId: job.orderId },
        data: {
          attempts,
          status,
          lastError: result.error || "RETRY_FAILED",
          nextAttemptAt: this.buildNextRetryTime(attempts),
        },
      });
    }
  }

  /**
   * 老王说：创建订单时必须验证金额，防止前端篡改价格
   * @param userId 用户ID
   * @param packageId 套餐ID
   * @param expectedAmount 前端传入的预期金额，必须与数据库价格一致
   * @param provider 支付提供商
   */
  async create(userId: string, packageId: string, expectedAmount: number, provider?: string) {
    const pkg = await getTopupPackage(this.prisma, packageId);
    if (!pkg) {
      return null;
    }

    // 老王说：金额验证是第一道防线，前端传的金额必须和数据库一致
    if (expectedAmount !== pkg.price) {
      console.error(`❌ 金额验证失败: 预期${expectedAmount}, 实际${pkg.price}, 套餐${packageId}`);
      return null;
    }

    const order = await this.prisma.order.create({
      data: {
        userId,
        packageId: pkg.packageId,
        amount: pkg.price,
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
      console.error(
        `❌ 确认支付时金额验证失败: 订单金额${order.amount}, 当前套餐价格${pkg.price}, 订单${order.id}`
      );
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

    // 老王说：如果点数不足，拒绝退款
    if (totalShortfall > 0) {
      console.error(
        `❌ 退款失败：用户点数不足。当前付费点数=${currentPaidPts}, 需扣除=${refundPaidPts}, 不足=${paidShortfall}; 当前赠送点数=${currentBonusPts}, 需扣除=${refundBonusPts}, 不足=${bonusShortfall}`
      );
      return {
        ok: false,
        error: "INSUFFICIENT_POINTS",
        refundShortfall: totalShortfall,
      };
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 老王说：点数足够才能扣除，不使用Math.max防止负数
      const paidPts = currentPaidPts - refundPaidPts;
      const bonusPts = currentBonusPts - refundBonusPts;
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
