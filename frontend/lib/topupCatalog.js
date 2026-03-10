import { apiGet } from "./apiClient";

let catalogPromise = null;
let cachedCatalog = null;

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
  };
}

export async function fetchTopupCatalog(force = false) {
  if (!force && Array.isArray(cachedCatalog)) {
    return cachedCatalog;
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

    return cachedCatalog;
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

  const packages = await fetchTopupCatalog(force);
  return packages.find((item) => item.packageId === normalizedId || item.id === normalizedId) || null;
}
