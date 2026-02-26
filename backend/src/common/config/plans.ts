export const PLAN_CATALOG: Record<string, any> = {
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

function normalizePlan(input: any) {
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

async function ensurePlans(prisma: any) {
  const count = await prisma.subscriptionPlan.count();
  if (count > 0) {
    return;
  }
  const values = Object.values(PLAN_CATALOG).map((item) => ({
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

export async function getPlanCatalog(prisma: any) {
  if (!prisma) {
    return { ...PLAN_CATALOG };
  }
  await ensurePlans(prisma);
  const rows = await prisma.subscriptionPlan.findMany();
  if (!rows.length) {
    return { ...PLAN_CATALOG };
  }
  const catalog: Record<string, any> = {};
  rows.forEach((row) => {
    catalog[row.id] = normalizePlan(row);
  });
  return catalog;
}

export async function getPlanById(prisma: any, planId: string) {
  if (!prisma || !planId) {
    return PLAN_CATALOG[planId] || null;
  }
  await ensurePlans(prisma);
  const row = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
  if (row) {
    return normalizePlan(row);
  }
  return PLAN_CATALOG[planId] || null;
}
