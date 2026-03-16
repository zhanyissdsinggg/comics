export const STOREFRONT_TERMS = {
  startHere: "Start here",
  readingDesk: "Reading picks",
  freeStart: "Free to start",
  bingeReady: "Binge-ready",
  returnWeekly: "Return weekly",
  compareMembership: "Compare plans",
  viewPointPacks: "See point packs",
  billingSupport: "Get billing help",
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
    description:
      "A smaller pack for trying a few premium episodes without committing to a big top-up.",
    nextCta: "Browse free-to-start series",
    nextHref: "/search?sort=popular",
  },
  medium: {
    eyebrow: "Flexible pick",
    title: "Flexible pack",
    description:
      "A balanced option if you follow a few ongoing series and want room for selective unlocks.",
    nextCta: "Open library",
    nextHref: "/library",
  },
  value: {
    eyebrow: STOREFRONT_TERMS.bingeReady,
    title: "Value pack",
    description:
      "A stronger fit for binge sessions and longer premium runs.",
    nextCta: "Browse completed",
    nextHref: "/search?status=Completed&sort=popular",
  },
  premium: {
    eyebrow: "Big reader pick",
    title: "Big pack",
    description:
      "A higher-balance pack for readers moving across multiple series.",
    nextCta: "See weekly chart",
    nextHref: "/rankings?type=popular&window=week",
  },
  mega: {
    eyebrow: "Best for daily readers",
    title: "Mega pack",
    description:
      "The biggest pack for readers who unlock often and want fewer repeat top-ups.",
    nextCta: STOREFRONT_TERMS.compareMembership,
    nextHref: "/subscribe",
  },
  basic: {
    eyebrow: "Membership starter",
    title: "Basic membership",
    description:
      "A lighter recurring plan with smaller discounts and a simple daily-free routine.",
    nextCta: STOREFRONT_TERMS.viewPointPacks,
    nextHref: "/store",
  },
  pro: {
    eyebrow: "Membership regular",
    title: "Pro membership",
    description:
      "A better fit for weekly readers who want stronger discounts and more daily reading support.",
    nextCta: "Open orders",
    nextHref: "/orders",
  },
  vip: {
    eyebrow: "Membership max",
    title: "VIP membership",
    description:
      "The richest recurring perk stack for daily readers who want the smoothest path through premium chapters.",
    nextCta: STOREFRONT_TERMS.bingeReady,
    nextHref: "/search?status=Completed&sort=popular",
  },
  default: {
    eyebrow: "Recent order",
    title: "Recent purchase",
    description:
      "This purchase is active on your account, so the best next step is to jump back into reading, compare plans, or keep help close by.",
    nextCta: "Open library",
    nextHref: "/library",
  },
};

export function getCommerceJourneyGuide(packageId) {
  const normalized = String(packageId || "").trim().toLowerCase();
  return COMMERCE_JOURNEY_GUIDES[normalized] || COMMERCE_JOURNEY_GUIDES.default;
}
