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
    const renewAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    await this.prisma.subscription.upsert({
      where: { userId },
      update: { planId, active: true, startedAt: now, renewAt },
      create: { userId, planId, active: true, startedAt: now, renewAt },
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
