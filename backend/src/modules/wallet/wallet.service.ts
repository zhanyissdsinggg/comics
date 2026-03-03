import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { getTopupPackage } from "../../common/config/topup";
import { ORDER_STATUS } from "../../common/utils/order-status";

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getWallet(userId: string) {
    // 老王说：使用upsert确保原子性，防止并发竞态条件
    // 如果钱包不存在则创建，存在则返回，一次操作完成
    const wallet = await this.prisma.wallet.upsert({
      where: { userId },
      update: {}, // 如果存在则不更新
      create: { userId, paidPts: 0, bonusPts: 0, plan: "free" },
    });
    return wallet;
  }

  async topup(userId: string, packageId: string) {
    const pkg = await getTopupPackage(this.prisma, packageId);
    if (!pkg) {
      return { ok: false, status: 400, error: "INVALID_PACKAGE" };
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
      const order = await tx.order.create({
        data: {
          userId,
          packageId: pkg.packageId,
          amount: pkg.price,
          priceSnapshot: pkg.price,
          currency: "USD",
          status: ORDER_STATUS.PAID,
          paidAt: new Date(),
        },
      });
      return { wallet, order };
    });
    return { ok: true, wallet: result.wallet, order: result.order };
  }
}
