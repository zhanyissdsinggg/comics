"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSubscriptionPayload = getSubscriptionPayload;
exports.getSubscriptionUsage = getSubscriptionUsage;
exports.markDailyUnlockUsed = markDailyUnlockUsed;
exports.getSubscriptionVoucherUsage = getSubscriptionVoucherUsage;
exports.markSubscriptionVoucherUsed = markSubscriptionVoucherUsed;
exports.getSubscriptionVoucher = getSubscriptionVoucher;
exports.buildWalletSnapshot = buildWalletSnapshot;
const plans_1 = require("../config/plans");
function getTodayKey() {
    return new Date().toISOString().slice(0, 10);
}
async function buildPlanPerks(prisma, planId) {
    const catalog = await (0, plans_1.getPlanCatalog)(prisma);
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
async function getSubscriptionPayload(prisma, userId) {
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
async function getSubscriptionUsage(prisma, userId) {
    const dateKey = getTodayKey();
    const usage = await prisma.subscriptionUsage.upsert({
        where: { userId_dateKey: { userId, dateKey } },
        update: {},
        create: { userId, dateKey, used: 0 },
    });
    return usage;
}
async function markDailyUnlockUsed(prisma, userId) {
    const dateKey = getTodayKey();
    return prisma.subscriptionUsage.upsert({
        where: { userId_dateKey: { userId, dateKey } },
        update: { used: { increment: 1 } },
        create: { userId, dateKey, used: 1 },
    });
}
async function getSubscriptionVoucherUsage(prisma, userId) {
    const dateKey = getTodayKey();
    return prisma.subscriptionVoucherUsage.upsert({
        where: { userId_dateKey: { userId, dateKey } },
        update: {},
        create: { userId, dateKey, used: false },
    });
}
async function markSubscriptionVoucherUsed(prisma, userId) {
    const dateKey = getTodayKey();
    return prisma.subscriptionVoucherUsage.upsert({
        where: { userId_dateKey: { userId, dateKey } },
        update: { used: true },
        create: { userId, dateKey, used: true },
    });
}
async function getSubscriptionVoucher(prisma, userId, subscription) {
    var _a;
    if (!(subscription === null || subscription === void 0 ? void 0 : subscription.active) || !((_a = subscription === null || subscription === void 0 ? void 0 : subscription.perks) === null || _a === void 0 ? void 0 : _a.voucherPts)) {
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
async function buildWalletSnapshot(prisma, userId, wallet) {
    var _a;
    const subscription = await getSubscriptionPayload(prisma, userId);
    if (!subscription) {
        return {
            ...wallet,
            plan: (wallet === null || wallet === void 0 ? void 0 : wallet.plan) || "free",
            subscription: null,
            subscriptionUsage: null,
            subscriptionVoucher: null,
        };
    }
    const usage = await getSubscriptionUsage(prisma, userId);
    const dailyLimit = ((_a = subscription.perks) === null || _a === void 0 ? void 0 : _a.dailyFreeUnlocks) || 0;
    const remaining = Math.max(0, dailyLimit - ((usage === null || usage === void 0 ? void 0 : usage.used) || 0));
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
