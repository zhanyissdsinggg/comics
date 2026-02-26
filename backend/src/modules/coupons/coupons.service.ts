import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";

const COUPON_CATALOG = {
  HOLIDAY10: {
    id: "HOLIDAY10",
    code: "HOLIDAY10",
    type: "DISCOUNT_PCT",
    value: 10,
    remainingUses: 1,
    label: "Holiday 10% OFF",
  },
  WELCOME5: {
    id: "WELCOME5",
    code: "WELCOME5",
    type: "DISCOUNT_PTS",
    value: 5,
    remainingUses: 1,
    label: "Welcome 5 POINTS",
  },
};

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureCatalog() {
    const count = await this.prisma.coupon.count();
    if (count > 0) {
      return;
    }
    await this.prisma.coupon.createMany({
      data: Object.values(COUPON_CATALOG),
    });
  }

  async list(userId: string) {
    await this.ensureCatalog();
    const claimed = await this.prisma.userCoupon.findMany({
      where: { userId },
      include: { coupon: true },
      orderBy: { claimedAt: "desc" },
    });
    return claimed.map((item) => ({
      ...item.coupon,
      claimedAt: item.claimedAt,
    }));
  }

  async claim(userId: string, code: string) {
    await this.ensureCatalog();
    const key = String(code || "").trim().toUpperCase();
    const coupon = await this.prisma.coupon.findUnique({ where: { code: key } });
    if (!coupon) {
      return { ok: false, message: "Invalid coupon." };
    }
    const existing = await this.prisma.userCoupon.findUnique({
      where: { userId_couponId: { userId, couponId: coupon.id } },
    });
    if (existing) {
      return { ok: true, coupons: await this.list(userId) };
    }
    if ((coupon.remainingUses || 0) <= 0) {
      return { ok: false, message: "Coupon exhausted." };
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.userCoupon.create({
        data: { userId, couponId: coupon.id },
      });
      await tx.coupon.update({
        where: { id: coupon.id },
        data: { remainingUses: { decrement: 1 } },
      });
    });
    return { ok: true, coupons: await this.list(userId) };
  }
}
