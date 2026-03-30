import { normalizeUsStorefrontCurrencyCode } from "../utils/currency";

export interface TopupPackageConfig {
  packageId: string;
  paidPts: number;
  bonusPts: number;
  price: number;
  currency: string;
  active: boolean;
  label: string;
  tags: string[];
}

type PersistedTopupPackage = {
  id: string;
  name: string;
  amount: number;
  paidPts: number;
  bonusPts: number;
  price: number;
  currency: string;
  active: boolean;
  label: string;
  tags: string[];
};

interface TopupPackageStore {
  count(): Promise<number>;
  createMany(args: { data: PersistedTopupPackage[]; skipDuplicates?: boolean }): Promise<unknown>;
  findUnique(args: { where: { id: string } }): Promise<unknown>;
  findMany(args: { orderBy: { price: "asc" } }): Promise<unknown[]>;
}

type TopupPrismaLike = unknown;

export const TOPUP_PACKAGES: Record<string, TopupPackageConfig> = {
  starter: { packageId: "starter", paidPts: 50, bonusPts: 5, price: 3.99, currency: "USD", active: true, label: "", tags: [] },
  medium: { packageId: "medium", paidPts: 100, bonusPts: 15, price: 7.99, currency: "USD", active: true, label: "", tags: [] },
  value: { packageId: "value", paidPts: 200, bonusPts: 40, price: 14.99, currency: "USD", active: true, label: "", tags: [] },
  mega: { packageId: "mega", paidPts: 500, bonusPts: 120, price: 29.99, currency: "USD", active: true, label: "", tags: [] },
  premium: { packageId: "premium", paidPts: 300, bonusPts: 60, price: 19.99, currency: "USD", active: true, label: "", tags: [] },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getTopupPackageStore(prisma: TopupPrismaLike): TopupPackageStore | null {
  if (!isRecord(prisma) || !isRecord(prisma.topupPackage)) {
    return null;
  }

  const store = prisma.topupPackage as Partial<TopupPackageStore>;
  if (
    typeof store.count !== "function" ||
    typeof store.createMany !== "function" ||
    typeof store.findUnique !== "function" ||
    typeof store.findMany !== "function"
  ) {
    return null;
  }

  return store as TopupPackageStore;
}

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizePackage(input: unknown): TopupPackageConfig | null {
  if (!isRecord(input)) {
    return null;
  }

  const packageId = String(input.packageId ?? input.id ?? "").trim();
  if (!packageId) {
    return null;
  }

  return {
    packageId,
    paidPts: toNumber(input.paidPts),
    bonusPts: toNumber(input.bonusPts),
    price: toNumber(input.price),
    currency: normalizeUsStorefrontCurrencyCode(input.currency),
    active: input.active !== false,
    label: typeof input.label === "string" ? input.label : "",
    tags: toStringList(input.tags),
  };
}

async function ensureTopupPackages(prisma: TopupPrismaLike): Promise<void> {
  const store = getTopupPackageStore(prisma);
  if (!store) {
    return;
  }

  try {
    const count = await store.count();
    if (count > 0) {
      return;
    }

    const values: PersistedTopupPackage[] = Object.values(TOPUP_PACKAGES).map((item) => ({
      id: item.packageId,
      name: item.label || item.packageId,
      amount: item.paidPts + item.bonusPts,
      paidPts: item.paidPts,
      bonusPts: item.bonusPts,
      price: item.price,
      currency: item.currency,
      active: item.active,
      label: item.label,
      tags: item.tags,
    }));
    await store.createMany({ data: values, skipDuplicates: true });
  } catch {
    // Fall back to static config when table access is unavailable.
  }
}

export async function getTopupPackage(
  prisma: TopupPrismaLike,
  packageId: string,
): Promise<TopupPackageConfig | null> {
  const normalizedId = String(packageId || "").trim();
  if (!normalizedId) {
    return null;
  }

  const store = getTopupPackageStore(prisma);
  if (store) {
    try {
      await ensureTopupPackages(prisma);
      const found = await store.findUnique({ where: { id: normalizedId } });
      const normalized = normalizePackage(found);
      if (normalized) {
        return normalized;
      }
    } catch {
      // Fall back below.
    }
  }

  return normalizePackage(TOPUP_PACKAGES[normalizedId]);
}

export async function listTopupPackages(prisma: TopupPrismaLike): Promise<TopupPackageConfig[]> {
  const store = getTopupPackageStore(prisma);
  if (!store) {
    return Object.values(TOPUP_PACKAGES);
  }

  try {
    await ensureTopupPackages(prisma);
    const rows = await store.findMany({ orderBy: { price: "asc" } });
    const normalized = rows
      .map((row) => normalizePackage(row))
      .filter((item): item is TopupPackageConfig => item !== null);
    if (normalized.length > 0) {
      return normalized;
    }
  } catch {
    // Fall back below.
  }

  return Object.values(TOPUP_PACKAGES);
}
