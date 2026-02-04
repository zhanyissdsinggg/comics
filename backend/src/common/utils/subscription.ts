import { PrismaService } from "../prisma/prisma.service";
import { getPlanCatalog } from "../config/plans";

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function buildPlanPerks(prisma: PrismaService, planId: string) {
  const catalog = await getPlanCatalog(prisma);
  const plan = catalog[planId];
  if (!plan) {
    return null;
  }
  return {
    discountPct: plan.discountPct,
    dailyFreeUnlocks: plan.dailyFreeUnlocks,
    ttfMultiplier: plan.ttfMultiplier,
    voucherPts: plan.voucherPts,
  };
}

export async function getSubscriptionPayload(prisma: PrismaService, userId: string) {
  const subscription = await prisma.subscription.findUnique({ where: { userId } });
  if (!subscription || !subscription.active) {
    return null;
  }
  const perks = await buildPlanPerks(prisma, subscription.planId);
  if (!perks) {
    return null;
  }
  return {
    active: true,
    planId: subscription.planId,
    startedAt: subscription.startedAt,
    renewAt: subscription.renewAt,
    perks,
  };
}

export async function getSubscriptionUsage(prisma: PrismaService, userId: string) {
  const dateKey = getTodayKey();
  const usage = await prisma.subscriptionUsage.upsert({
    where: { userId_dateKey: { userId, dateKey } },
    update: {},
    create: { userId, dateKey, used: 0 },
  });
  return usage;
}

export async function markDailyUnlockUsed(prisma: PrismaService, userId: string) {
  const dateKey = getTodayKey();
  return prisma.subscriptionUsage.upsert({
    where: { userId_dateKey: { userId, dateKey } },
    update: { used: { increment: 1 } },
    create: { userId, dateKey, used: 1 },
  });
}

export async function getSubscriptionVoucherUsage(prisma: PrismaService, userId: string) {
  const dateKey = getTodayKey();
  return prisma.subscriptionVoucherUsage.upsert({
    where: { userId_dateKey: { userId, dateKey } },
    update: {},
    create: { userId, dateKey, used: false },
  });
}

export async function markSubscriptionVoucherUsed(prisma: PrismaService, userId: string) {
  const dateKey = getTodayKey();
  return prisma.subscriptionVoucherUsage.upsert({
    where: { userId_dateKey: { userId, dateKey } },
    update: { used: true },
    create: { userId, dateKey, used: true },
  });
}

export async function getSubscriptionVoucher(
  prisma: PrismaService,
  userId: string,
  subscription: any
) {
  if (!subscription?.active || !subscription?.perks?.voucherPts) {
    return null;
  }
  const usage = await getSubscriptionVoucherUsage(prisma, userId);
  if (usage.used) {
    return null;
  }
  const value = Number(subscription.perks.voucherPts || 0);
  if (!value) {
    return null;
  }
  return {
    id: `SUB_VOUCHER_${subscription.planId}`,
    code: `SUB${value}`,
    type: "DISCOUNT_PTS",
    value,
    remainingUses: 1,
    label: `Subscriber ${value} POINTS`,
    source: "subscription",
  };
}

export async function buildWalletSnapshot(prisma: PrismaService, userId: string, wallet: any) {
  const subscription = await getSubscriptionPayload(prisma, userId);
  if (!subscription) {
    return {
      ...wallet,
      plan: wallet?.plan || "free",
      subscription: null,
      subscriptionUsage: null,
      subscriptionVoucher: null,
    };
  }
  const usage = await getSubscriptionUsage(prisma, userId);
  const dailyLimit = subscription.perks?.dailyFreeUnlocks || 0;
  const remaining = Math.max(0, dailyLimit - (usage?.used || 0));
  const voucher = await getSubscriptionVoucher(prisma, userId, subscription);
  return {
    ...wallet,
    plan: subscription.planId,
    subscription,
    subscriptionUsage: {
      used: usage.used,
      remaining,
      dateKey: usage.dateKey,
      dailyFreeUnlocks: dailyLimit,
    },
    subscriptionVoucher: voucher ? { ...voucher } : null,
  };
}
