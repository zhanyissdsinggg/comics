import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { getTopupPackage } from "../../common/config/topup";
import { ORDER_STATUS } from "../../common/utils/order-status";

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getWallet(userId: string) {
    const existing = await this.prisma.wallet.findUnique({ where: { userId } });
    if (existing) {
      return existing;
    }
    return this.prisma.wallet.create({
      data: { userId, paidPts: 0, bonusPts: 0, plan: "free" },
    });
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
