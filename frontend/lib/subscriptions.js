export const SUBSCRIPTION_PLANS = {
  basic: {
    id: "basic",
    title: "Basic",
    discountPct: 10,
    dailyFreeUnlocks: 1,
    ttfMultiplier: 0.8,
    voucherPts: 2,
    price: 4.99,
    currency: "USD",
  },
  pro: {
    id: "pro",
    title: "Pro",
    discountPct: 20,
    dailyFreeUnlocks: 2,
    ttfMultiplier: 0.6,
    voucherPts: 3,
    price: 7.99,
    currency: "USD",
  },
  vip: {
    id: "vip",
    title: "VIP",
    discountPct: 30,
    dailyFreeUnlocks: 3,
    ttfMultiplier: 0.5,
    voucherPts: 5,
    price: 12.99,
    currency: "USD",
  },
};

let dynamicCatalog = null;

export function setPlanCatalog(plans) {
  if (!plans || typeof plans !== "object") {
    return;
  }
  dynamicCatalog = plans;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem("mn_plan_catalog", JSON.stringify(plans));
    } catch (err) {
      // ignore storage errors
    }
  }
}

export function getPlanCatalog() {
  if (dynamicCatalog) {
    return dynamicCatalog;
  }
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem("mn_plan_catalog");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          dynamicCatalog = parsed;
          return dynamicCatalog;
        }
      }
    } catch (err) {
      // ignore
    }
  }
  return SUBSCRIPTION_PLANS;
}

export function getPlan(planId) {
  const catalog = getPlanCatalog();
  return catalog[planId] || null;
}
