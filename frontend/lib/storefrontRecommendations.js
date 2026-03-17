import { STOREFRONT_TERMS } from "./storefrontCopy";

const HOME_RAIL_PRESETS = {
  following: {
    eyebrow: STOREFRONT_TERMS.readingDesk,
    title: "From Your Library",
    reason: "Recent updates from the series you already care about.",
    href: "/library",
    ctaLabel: "Open Library",
  },
  continue: {
    eyebrow: STOREFRONT_TERMS.readingDesk,
    title: "Keep Reading",
    reason: "Jump back into the chapters you already started.",
    href: "/library",
    ctaLabel: "Resume Reading",
  },
  "because-you-read": {
    eyebrow: "Reader match",
    title: "More Like What You Read",
    reason: "Built from the titles you opened most recently.",
    href: "/search",
    ctaLabel: "Explore More",
  },
  trending: {
    eyebrow: "Top now",
    title: "Trending Now",
    reason: "Popular titles readers are opening right now.",
    href: "/rankings?type=popular&window=week",
    ctaLabel: "View Chart",
  },
  new: {
    eyebrow: "Fresh drop",
    title: "New This Week",
    reason: "New launches and recent returns worth catching early.",
    href: "/rankings?type=new&window=all",
    ctaLabel: "See New Titles",
  },
  completed: {
    eyebrow: STOREFRONT_TERMS.bingeReady,
    title: "Completed Series",
    reason: "Finished runs ready for long-session reading.",
    href: "/search?status=Completed&sort=popular",
    ctaLabel: "Browse Completed",
  },
  ttf: {
    eyebrow: STOREFRONT_TERMS.freeStart,
    title: "Start Free",
    reason: "Free-entry reads that make the first click easier.",
    href: "/rankings?type=ttf&window=all",
    ctaLabel: "Browse Free Chapters",
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
    title: "Start Here",
    reason: "High-confidence entry points for building a new reading list.",
    href: "/rankings?type=popular&window=all",
    ctaLabel: "View Best Sellers",
  },
  "ai-recommended": {
    eyebrow: "Tailored picks",
    title: "Picked for You",
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
