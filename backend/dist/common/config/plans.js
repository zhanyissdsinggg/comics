"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAN_CATALOG = void 0;
exports.getPlanCatalog = getPlanCatalog;
exports.getPlanById = getPlanById;
exports.PLAN_CATALOG = {
    basic: {
        id: "basic",
        discountPct: 10,
        dailyFreeUnlocks: 1,
        ttfMultiplier: 0.8,
        voucherPts: 5,
        price: 4.99,
        currency: "USD",
    },
    pro: {
        id: "pro",
        discountPct: 20,
        dailyFreeUnlocks: 2,
        ttfMultiplier: 0.6,
        voucherPts: 8,
        price: 7.99,
        currency: "USD",
    },
    vip: {
        id: "vip",
        discountPct: 30,
        dailyFreeUnlocks: 3,
        ttfMultiplier: 0.5,
        voucherPts: 10,
        price: 12.99,
        currency: "USD",
    },
};
function normalizePlan(input) {
    if (!input) {
        return null;
    }
    return {
        id: input.id,
        discountPct: Number(input.discountPct || 0),
        dailyFreeUnlocks: Number(input.dailyFreeUnlocks || 0),
        ttfMultiplier: Number(input.ttfMultiplier || 0),
        voucherPts: Number(input.voucherPts || 0),
        price: Number(input.price || 0),
        currency: input.currency || "USD",
        active: input.active !== false,
        label: input.label || "",
    };
}
async function ensurePlans(prisma) {
    const count = await prisma.subscriptionPlan.count();
    if (count > 0) {
        return;
    }
    const values = Object.values(exports.PLAN_CATALOG).map((item) => ({
        id: item.id,
        discountPct: item.discountPct,
        dailyFreeUnlocks: item.dailyFreeUnlocks,
        ttfMultiplier: item.ttfMultiplier,
        voucherPts: item.voucherPts,
        price: item.price || 0,
        currency: item.currency || "USD",
        active: true,
        label: "",
    }));
    await prisma.subscriptionPlan.createMany({ data: values, skipDuplicates: true });
}
async function getPlanCatalog(prisma) {
    if (!prisma) {
        return { ...exports.PLAN_CATALOG };
    }
    await ensurePlans(prisma);
    const rows = await prisma.subscriptionPlan.findMany();
    if (!rows.length) {
        return { ...exports.PLAN_CATALOG };
    }
    const catalog = {};
    rows.forEach((row) => {
        catalog[row.id] = normalizePlan(row);
    });
    return catalog;
}
async function getPlanById(prisma, planId) {
    if (!prisma || !planId) {
        return exports.PLAN_CATALOG[planId] || null;
    }
    await ensurePlans(prisma);
    const row = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (row) {
        return normalizePlan(row);
    }
    return exports.PLAN_CATALOG[planId] || null;
}
