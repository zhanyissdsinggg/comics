export interface SubscriptionPlanConfig {
  id: string;
  discountPct: number;
  dailyFreeUnlocks: number;
  ttfMultiplier: number;
  voucherPts: number;
  price: number;
  currency: string;
  active: boolean;
  label: string;
}

type PersistedSubscriptionPlan = {
  id: string;
  discountPct: number;
  dailyFreeUnlocks: number;
  ttfMultiplier: number;
  voucherPts: number;
  price: number;
  currency: string;
  active: boolean;
  label: string;
};

interface SubscriptionPlanStore {
  count(): Promise<number>;
  createMany(args: { data: PersistedSubscriptionPlan[]; skipDuplicates?: boolean }): Promise<unknown>;
  findMany(): Promise<unknown[]>;
  findUnique(args: { where: { id: string } }): Promise<unknown>;
}

type SubscriptionPlanPrismaLike = unknown;

export const PLAN_CATALOG: Record<string, SubscriptionPlanConfig> = {
  basic: {
    id: "basic",
    discountPct: 10,
    dailyFreeUnlocks: 1,
    ttfMultiplier: 0.8,
    voucherPts: 5,
    price: 4.99,
    currency: "USD",
    active: true,
    label: "",
  },
  pro: {
    id: "pro",
    discountPct: 20,
    dailyFreeUnlocks: 2,
    ttfMultiplier: 0.6,
    voucherPts: 8,
    price: 7.99,
    currency: "USD",
    active: true,
    label: "",
  },
  vip: {
    id: "vip",
    discountPct: 30,
    dailyFreeUnlocks: 3,
    ttfMultiplier: 0.5,
    voucherPts: 10,
    price: 12.99,
    currency: "USD",
    active: true,
    label: "",
  },
};

const PLAN_CATALOG_CACHE_MS = 60_000;
let planCatalogCache: { expiresAt: number; catalog: Record<string, SubscriptionPlanConfig> } | null =
  null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getSubscriptionPlanStore(prisma: SubscriptionPlanPrismaLike): SubscriptionPlanStore | null {
  if (!isRecord(prisma) || !isRecord(prisma.subscriptionPlan)) {
    return null;
  }

  const store = prisma.subscriptionPlan as Partial<SubscriptionPlanStore>;
  if (
    typeof store.count !== "function" ||
    typeof store.createMany !== "function" ||
    typeof store.findMany !== "function" ||
    typeof store.findUnique !== "function"
  ) {
    return null;
  }

  return store as SubscriptionPlanStore;
}

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizePlan(input: unknown): SubscriptionPlanConfig | null {
  if (!isRecord(input) || typeof input.id !== "string" || !input.id) {
    return null;
  }

  return {
    id: input.id,
    discountPct: toNumber(input.discountPct),
    dailyFreeUnlocks: toNumber(input.dailyFreeUnlocks),
    ttfMultiplier: toNumber(input.ttfMultiplier),
    voucherPts: toNumber(input.voucherPts),
    price: toNumber(input.price),
    currency: typeof input.currency === "string" && input.currency ? input.currency : "USD",
    active: input.active !== false,
    label: typeof input.label === "string" ? input.label : "",
  };
}

async function ensurePlans(prisma: SubscriptionPlanPrismaLike): Promise<void> {
  const store = getSubscriptionPlanStore(prisma);
  if (!store) {
    return;
  }

  try {
    const count = await store.count();
    if (count > 0) {
      return;
    }

    const values: PersistedSubscriptionPlan[] = Object.values(PLAN_CATALOG).map((item) => ({
      id: item.id,
      discountPct: item.discountPct,
      dailyFreeUnlocks: item.dailyFreeUnlocks,
      ttfMultiplier: item.ttfMultiplier,
      voucherPts: item.voucherPts,
      price: item.price,
      currency: item.currency,
      active: item.active,
      label: item.label,
    }));
    await store.createMany({ data: values, skipDuplicates: true });
  } catch {
    // Fall back to static catalog when table access is unavailable.
  }
}

export async function getPlanCatalog(
  prisma: SubscriptionPlanPrismaLike,
): Promise<Record<string, SubscriptionPlanConfig>> {
  if (planCatalogCache && planCatalogCache.expiresAt > Date.now()) {
    return { ...planCatalogCache.catalog };
  }

  const store = getSubscriptionPlanStore(prisma);
  if (!store) {
    return { ...PLAN_CATALOG };
  }

  try {
    await ensurePlans(prisma);
    const rows = await store.findMany();
    const catalog = rows.reduce<Record<string, SubscriptionPlanConfig>>((acc, row) => {
      const normalized = normalizePlan(row);
      if (normalized) {
        acc[normalized.id] = normalized;
      }
      return acc;
    }, {});
    if (Object.keys(catalog).length > 0) {
      planCatalogCache = {
        catalog,
        expiresAt: Date.now() + PLAN_CATALOG_CACHE_MS,
      };
      return catalog;
    }
  } catch {
    // Fall back below.
  }

  planCatalogCache = {
    catalog: { ...PLAN_CATALOG },
    expiresAt: Date.now() + PLAN_CATALOG_CACHE_MS,
  };

  return { ...planCatalogCache.catalog };
}

export async function getPlanById(
  prisma: SubscriptionPlanPrismaLike,
  planId: string,
): Promise<SubscriptionPlanConfig | null> {
  const normalizedId = String(planId || "").trim();
  if (!normalizedId) {
    return null;
  }

  const store = getSubscriptionPlanStore(prisma);
  if (store) {
    try {
      await ensurePlans(prisma);
      const row = await store.findUnique({ where: { id: normalizedId } });
      const normalized = normalizePlan(row);
      if (normalized) {
        return normalized;
      }
    } catch {
      // Fall back below.
    }
  }

  return PLAN_CATALOG[normalizedId] || null;
}
