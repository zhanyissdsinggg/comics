import { STOREFRONT_TERMS } from "./storefrontCopy";

const HOME_RAIL_PRESETS = {
  following: {
    eyebrow: STOREFRONT_TERMS.readingDesk,
    title: "Fresh From Your Library",
    reason: "New episodes from series you already chose to follow.",
    href: "/library",
    ctaLabel: "Open Library",
  },
  continue: {
    eyebrow: STOREFRONT_TERMS.readingDesk,
    title: "Pick Up Where You Left Off",
    reason: "Unlocked episodes waiting in your recent reading list.",
    href: "/library",
    ctaLabel: "Resume Reading",
  },
  "because-you-read": {
    eyebrow: "Reader match",
    title: "Because You Read",
    reason: "Built from the title you touched most recently.",
    href: "/search",
    ctaLabel: "Explore More",
  },
  trending: {
    eyebrow: "Top now",
    title: "What Readers Are Unlocking",
    reason: "Popular titles readers are opening right now.",
    href: "/rankings?type=popular&window=week",
    ctaLabel: "View Chart",
  },
  new: {
    eyebrow: "Fresh drop",
    title: "Fresh This Week",
    reason: "New launches and recent returns worth catching early.",
    href: "/rankings?type=new&window=all",
    ctaLabel: "See New Titles",
  },
  completed: {
    eyebrow: STOREFRONT_TERMS.bingeReady,
    title: "Completed Binge Picks",
    reason: "Finished series ready for long-session reading.",
    href: "/search?status=Completed&sort=popular",
    ctaLabel: "Browse Completed",
  },
  ttf: {
    eyebrow: STOREFRONT_TERMS.freeStart,
    title: "Free Unlock Picks",
    reason: "Timed free unlocks worth checking before you top up.",
    href: "/rankings?type=ttf&window=all",
    ctaLabel: "View Free Unlocks",
  },
  adult: {
    eyebrow: "18+ picks",
    title: "18+ After Hours",
    reason: "Mature titles surfaced inside the 18+ catalog.",
    href: "/adult",
    ctaLabel: "Open 18+ page",
  },
  history: {
    eyebrow: STOREFRONT_TERMS.readingDesk,
    title: "Resume Recent Sessions",
    reason: "Jump back into the last episode you opened.",
    href: "/library",
    ctaLabel: "Open History",
  },
  starter: {
    eyebrow: STOREFRONT_TERMS.startHere,
    title: "Best First Clicks",
    reason: "High-confidence entry points for building a new reading list.",
    href: "/rankings?type=popular&window=all",
    ctaLabel: "View Best Sellers",
  },
  "ai-recommended": {
    eyebrow: "Tailored picks",
    title: "Tailored Picks",
    reason: "Personalized from your recent reading signals and ratings.",
    href: "/search",
    ctaLabel: "Keep Exploring",
  },
  recommended: {
    eyebrow: "More to try",
    title: "More To Try",
    reason: "Genre overlap and reading behavior point to these next.",
    href: "/search",
    ctaLabel: "Explore More",
  },
};

export function buildHomeRail({ id, items, title, reason, href, ctaLabel, eyebrow }) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  const preset = HOME_RAIL_PRESETS[id] || {};

  return {
    id,
    items,
    eyebrow: eyebrow || preset.eyebrow || "",
    title: title || preset.title || "",
    reason: reason || preset.reason || "",
    href: href || preset.href || "/search",
    ctaLabel: ctaLabel || preset.ctaLabel || "See All",
  };
}
