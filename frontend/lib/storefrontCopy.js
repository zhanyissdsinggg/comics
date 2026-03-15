export const STOREFRONT_TERMS = {
  startHere: "Start here",
  readingDesk: "Reading desk",
  freeStart: "Free start",
  bingeReady: "Binge-ready",
  returnWeekly: "Return weekly",
  compareMembership: "Compare membership",
  viewPointPacks: "View point packs",
  billingSupport: "Billing support",
  readerBenefits: "Reader benefits",
};

export function getReadingCadenceLabel(status) {
  return String(status || "").toLowerCase() === "completed"
    ? STOREFRONT_TERMS.bingeReady
    : STOREFRONT_TERMS.returnWeekly;
}

const COMMERCE_JOURNEY_GUIDES = {
  starter: {
    eyebrow: STOREFRONT_TERMS.freeStart,
    title: "Starter wallet load",
    description:
      "Best for first premium chapters, free-start readers, and users who want to sample paid episodes without overcommitting.",
    nextCta: "Open free-start shelf",
    nextHref: "/search?sort=popular",
  },
  medium: {
    eyebrow: "Flexible spend",
    title: "Medium wallet load",
    description:
      "A balanced top-up for readers following a few active series and wanting enough room for selective unlocks.",
    nextCta: "Open library",
    nextHref: "/library",
  },
  value: {
    eyebrow: STOREFRONT_TERMS.bingeReady,
    title: "Value wallet load",
    description:
      "Built for longer sessions, deeper unlock runs, and readers who already know they will stay inside premium chapters.",
    nextCta: "Browse completed",
    nextHref: "/search?status=Completed&sort=popular",
  },
  premium: {
    eyebrow: "Collector lane",
    title: "Premium wallet load",
    description:
      "A higher-balance pack for repeat readers who want fewer top-up interruptions while moving across multiple series.",
    nextCta: "Open weekly chart",
    nextHref: "/rankings?type=popular&window=week",
  },
  mega: {
    eyebrow: "Heavy reader lane",
    title: "Mega wallet load",
    description:
      "Best for readers treating the storefront like a primary entertainment habit and expecting high-volume unlock flexibility.",
    nextCta: "Compare membership",
    nextHref: "/subscribe",
  },
  basic: {
    eyebrow: "Member start",
    title: "Basic membership",
    description:
      "A lighter recurring plan for readers who want gentle discounts and a simple daily-free routine.",
    nextCta: STOREFRONT_TERMS.viewPointPacks,
    nextHref: "/store",
  },
  pro: {
    eyebrow: "Member regular",
    title: "Pro membership",
    description:
      "A stronger fit for weekly regulars who want meaningful unlock discounts and more daily reading support.",
    nextCta: "Open orders",
    nextHref: "/orders",
  },
  vip: {
    eyebrow: "Member binge",
    title: "VIP membership",
    description:
      "The richest recurring perk stack for daily readers who expect the shortest friction path through premium chapters.",
    nextCta: STOREFRONT_TERMS.bingeReady,
    nextHref: "/search?status=Completed&sort=popular",
  },
  default: {
    eyebrow: "Wallet activity",
    title: "Recent purchase",
    description:
      "This receipt is active on your account, so the best next move is to return to reading, compare value paths, or keep support details handy.",
    nextCta: "Open library",
    nextHref: "/library",
  },
};

export function getCommerceJourneyGuide(packageId) {
  const normalized = String(packageId || "").trim().toLowerCase();
  return COMMERCE_JOURNEY_GUIDES[normalized] || COMMERCE_JOURNEY_GUIDES.default;
}
