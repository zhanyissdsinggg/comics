import { apiGet } from "./apiClient";
import { normalizeUSDisplayCurrency } from "./localization";

let catalogPromise = null;
let cachedCatalog = null;
let cachedBilling = null;

function normalizePackage(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const packageId = String(item.packageId || item.id || "").trim();
  const price = Number(item.price);
  if (!packageId || !Number.isFinite(price) || price <= 0) {
    return null;
  }

  return {
    ...item,
    packageId,
    price,
    currency: normalizeUSDisplayCurrency(item.currency),
  };
}

export async function fetchTopupCatalog(force = false) {
  const snapshot = await fetchTopupCatalogSnapshot(force);
  return snapshot.packages;
}

export async function fetchTopupCatalogSnapshot(force = false) {
  if (!force && Array.isArray(cachedCatalog)) {
    return { packages: cachedCatalog, billing: cachedBilling };
  }

  if (!force && catalogPromise) {
    return catalogPromise;
  }

  catalogPromise = (async () => {
    const response = await apiGet("/api/billing/topups");
    if (!response.ok || !Array.isArray(response.data?.packages)) {
      throw new Error(response.error || "TOPUP_CATALOG_UNAVAILABLE");
    }

    cachedCatalog = response.data.packages
      .map((item) => normalizePackage(item))
      .filter(Boolean);
    cachedBilling = response.data?.billing || null;

    return { packages: cachedCatalog, billing: cachedBilling };
  })();

  try {
    return await catalogPromise;
  } finally {
    catalogPromise = null;
  }
}

export async function getTopupPackage(packageId, force = false) {
  const normalizedId = String(packageId || "").trim();
  if (!normalizedId) {
    return null;
  }

  const { packages } = await fetchTopupCatalogSnapshot(force);
  return packages.find((item) => item.packageId === normalizedId || item.id === normalizedId) || null;
}
