export const STOREFRONT_TERMS = {
  startHere: "First picks",
  readingDesk: "Reading picks",
  freeStart: "Free to start",
  bingeReady: "Binge-ready",
  returnWeekly: "Return weekly",
  compareMembership: "Plans",
  viewPointPacks: "Point packs",
  billingSupport: "Support",
  readerBenefits: "Why join",
};

export function getReadingCadenceLabel(status) {
  return String(status || "").toLowerCase() === "completed"
    ? STOREFRONT_TERMS.bingeReady
    : STOREFRONT_TERMS.returnWeekly;
}

const COMMERCE_JOURNEY_GUIDES = {
  starter: {
    eyebrow: STOREFRONT_TERMS.freeStart,
    title: "Starter pack",
    description: "Try a few locked chapters.",
    nextCta: "Browse free-to-start series",
    nextHref: "/search?sort=popular",
  },
  medium: {
    eyebrow: "Flexible pick",
    title: "Flexible pack",
    description: "A balanced pick for regular reading.",
    nextCta: "Open library",
    nextHref: "/library",
  },
  value: {
    eyebrow: STOREFRONT_TERMS.bingeReady,
    title: "Value pack",
    description: "Built for longer runs.",
    nextCta: "Browse completed",
    nextHref: "/search?status=Completed&sort=popular",
  },
  premium: {
    eyebrow: "Big reader pick",
    title: "Big pack",
    description: "For multi-series reading.",
    nextCta: "See weekly chart",
    nextHref: "/rankings?type=popular&window=week",
  },
  mega: {
    eyebrow: "Best for daily readers",
    title: "Mega pack",
    description: "For daily unlocks.",
    nextCta: STOREFRONT_TERMS.compareMembership,
    nextHref: "/subscribe",
  },
  basic: {
    eyebrow: "Membership starter",
    title: "Basic membership",
    description: "A lighter monthly plan.",
    nextCta: STOREFRONT_TERMS.viewPointPacks,
    nextHref: "/store",
  },
  pro: {
    eyebrow: "Membership regular",
    title: "Pro membership",
    description: "A stronger fit for weekly readers.",
    nextCta: "Open library",
    nextHref: "/library",
  },
  vip: {
    eyebrow: "Membership max",
    title: "VIP membership",
    description: "Best for daily readers.",
    nextCta: STOREFRONT_TERMS.bingeReady,
    nextHref: "/search?status=Completed&sort=popular",
  },
  default: {
    eyebrow: "Recent order",
    title: "Recent purchase",
    description: "Already on your account.",
    nextCta: "Open library",
    nextHref: "/library",
  },
};

export function getCommerceJourneyGuide(packageId) {
  const normalized = String(packageId || "")
    .trim()
    .toLowerCase();
  return COMMERCE_JOURNEY_GUIDES[normalized] || COMMERCE_JOURNEY_GUIDES.default;
}
