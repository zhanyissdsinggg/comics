import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { getPlanById } from "../../common/config/plans";
import { getSubscriptionPayload } from "../../common/utils/subscription";

@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  async subscribe(userId: string, planId: string) {
    const plan = await getPlanById(this.prisma, planId);
    if (!plan || plan.active === false) {
      return null;
    }
    const now = new Date();
    // 老王说：renewAt是续期检查日期（第29天），expiresAt是实际过期日期（第30天）
    // 这样系统可以在过期前一天检查是否需要续期
    const renewAt = new Date(now.getTime() + 29 * 24 * 60 * 60 * 1000); // 29天后检查续期
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30天后过期
    await this.prisma.subscription.upsert({
      where: { userId },
      update: { planId, active: true, startedAt: now, renewAt, expiresAt },
      create: { userId, planId, active: true, startedAt: now, renewAt, expiresAt },
    });
    await this.prisma.wallet.upsert({
      where: { userId },
      update: { plan: planId },
      create: { userId, paidPts: 0, bonusPts: 0, plan: planId },
    });
    return getSubscriptionPayload(this.prisma, userId);
  }

  async cancel(userId: string) {
    await this.prisma.subscription.updateMany({
      where: { userId },
      data: { active: false },
    });
    await this.prisma.wallet.upsert({
      where: { userId },
      update: { plan: "free" },
      create: { userId, paidPts: 0, bonusPts: 0, plan: "free" },
    });
    return null;
  }
}
