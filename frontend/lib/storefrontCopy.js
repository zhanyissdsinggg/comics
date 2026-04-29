export const STOREFRONT_TERMS = {
  startHere: "Top picks",
  readingDesk: "For you",
  freeStart: "Free to start",
  bingeReady: "Binge-ready",
  returnWeekly: "Return weekly",
  compareMembership: "Plans",
  viewPointPacks: "Get points",
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
    description: "Read a few more chapters.",
    nextCta: "Top Picks",
    nextHref: "/search?sort=popular",
  },
  medium: {
    eyebrow: "Flexible pick",
    title: "Flexible pack",
    description: "Good for regular reading.",
    nextCta: "Library",
    nextHref: "/library",
  },
  value: {
    eyebrow: STOREFRONT_TERMS.bingeReady,
    title: "Value pack",
    description: "Good for longer reads.",
    nextCta: "Finished",
    nextHref: "/search?status=Completed&sort=popular",
  },
  premium: {
    eyebrow: "Big reader pick",
    title: "Big pack",
    description: "For bigger reading weeks.",
    nextCta: "Trending",
    nextHref: "/rankings?type=popular&window=week",
  },
  mega: {
    eyebrow: "Daily pick",
    title: "Mega pack",
    description: "For daily reading.",
    nextCta: STOREFRONT_TERMS.compareMembership,
    nextHref: "/subscribe",
  },
  basic: {
    eyebrow: "Plan starter",
    title: "Basic plan",
    description: "A lighter monthly plan.",
    nextCta: STOREFRONT_TERMS.viewPointPacks,
    nextHref: "/store",
  },
  pro: {
    eyebrow: "Plan regular",
    title: "Pro plan",
    description: "Better for weekly readers.",
    nextCta: "Library",
    nextHref: "/library",
  },
  vip: {
    eyebrow: "Plan max",
    title: "VIP plan",
    description: "Built for daily readers.",
    nextCta: STOREFRONT_TERMS.bingeReady,
    nextHref: "/search?status=Completed&sort=popular",
  },
  default: {
    eyebrow: "Recent order",
    title: "Recent purchase",
    description: "Already in your account.",
    nextCta: "Library",
    nextHref: "/library",
  },
};

export function getCommerceJourneyGuide(packageId) {
  const normalized = String(packageId || "")
    .trim()
    .toLowerCase();
  return COMMERCE_JOURNEY_GUIDES[normalized] || COMMERCE_JOURNEY_GUIDES.default;
}
