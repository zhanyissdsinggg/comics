import { getCommerceJourneyGuide, STOREFRONT_TERMS } from "./storefrontCopy";

const STORAGE_KEY = "mn_commerce_success";
const TTL_MS = 20 * 60 * 1000;

function normalizePath(path) {
  if (!path) {
    return "/";
  }

  try {
    const base =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "https://example.com";
    const url = new URL(String(path), base);
    const pathname = url.pathname || "/";
    return pathname !== "/" ? pathname.replace(/\/+$/, "") : "/";
  } catch {
    return String(path) !== "/" ? String(path).replace(/\/+$/, "") : "/";
  }
}

function createTargetAction(targetPath) {
  if (targetPath.startsWith("/read/")) {
    return { label: "Keep reading", href: targetPath };
  }
  if (targetPath.startsWith("/series/")) {
    return { label: "Return to series", href: targetPath };
  }
  if (targetPath.startsWith("/library")) {
    return { label: "Open library", href: targetPath };
  }
  if (targetPath.startsWith("/search")) {
    return { label: "Return to search", href: targetPath };
  }
  if (targetPath.startsWith("/rankings")) {
    return { label: "Return to rankings", href: targetPath };
  }
  if (targetPath.startsWith("/account")) {
    return { label: "Open account", href: targetPath };
  }
  if (targetPath.startsWith("/orders")) {
    return { label: "View orders", href: targetPath };
  }
  if (targetPath.startsWith("/support")) {
    return { label: "Open support", href: targetPath };
  }
  return { label: "Open home", href: "/" };
}

export function persistCommerceSuccess(payload) {
  if (typeof window === "undefined" || !payload || typeof payload !== "object") {
    return;
  }

  const record = {
    ...payload,
    targetPath: normalizePath(payload.targetPath || payload.returnTo || "/"),
    createdAt: Date.now(),
  };

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // ignore storage failures
  }
}

export function consumeCommerceSuccessForPath(pathname) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }

    if (Date.now() - Number(parsed.createdAt || 0) > TTL_MS) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }

    if (normalizePath(pathname) !== normalizePath(parsed.targetPath)) {
      return null;
    }

    window.sessionStorage.removeItem(STORAGE_KEY);
    return parsed;
  } catch {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function getCommerceSuccessPresentation(payload) {
  if (!payload) {
    return null;
  }

  const targetPath = normalizePath(payload.targetPath || payload.returnTo || "/");
  const targetAction = createTargetAction(targetPath);

  if (payload.kind === "subscribe") {
    const planId = String(payload.planId || "").trim().toLowerCase();
    const guide = getCommerceJourneyGuide(planId);
    return {
      eyebrow: "Membership active",
      title: `${payload.planTitle || guide.title || "Membership"} is now active`,
      description:
        "Your recurring perks are active now, so the next step should take you back to reading instead of leaving you on a purchase screen.",
      metaItems: [
        payload.planTitle || "Membership",
        "Discounts + daily free reads",
        payload.orderId ? `Receipt ${payload.orderId}` : "Orders keeps the receipt trail",
      ],
      primaryAction: { label: guide.nextCta, href: guide.nextHref },
      secondaryAction:
        guide.nextHref === "/orders"
          ? { label: "Open library", href: "/library" }
          : { label: "View orders", href: "/orders" },
    };
  }

  const guide = getCommerceJourneyGuide(payload.packageId);
  const paidPts = Number(payload.paidPts || 0);
  const bonusPts = Number(payload.bonusPts || 0);
  const totalPts = paidPts + bonusPts;

  return {
    eyebrow: guide.eyebrow || STOREFRONT_TERMS.freeStart,
    title: `${totalPts.toLocaleString()} points added to your wallet`,
    description:
      "Your wallet is ready, so the site should point you back to something worth reading instead of leaving you on a receipt screen.",
    metaItems: [
      `${paidPts.toLocaleString()} paid pts`,
      `${bonusPts.toLocaleString()} bonus pts`,
      payload.orderId ? `Receipt ${payload.orderId}` : "Wallet synced",
    ],
    primaryAction: { label: guide.nextCta, href: guide.nextHref },
    secondaryAction:
      guide.nextHref === "/orders"
        ? targetAction
        : { label: "View orders", href: "/orders" },
  };
}
