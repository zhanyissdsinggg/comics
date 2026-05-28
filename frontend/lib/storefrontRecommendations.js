import { STOREFRONT_TERMS } from "./storefrontCopy";

const HOME_RAIL_PRESETS = {
  following: {
    eyebrow: STOREFRONT_TERMS.readingDesk,
    title: "New from your follows",
    reason: "Fresh updates from the series already living on your shelf.",
    href: "/library",
    ctaLabel: "Open Library",
  },
  continue: {
    eyebrow: STOREFRONT_TERMS.readingDesk,
    title: "Pick up where you left off",
    reason: "The fastest route back into the stories you already started.",
    href: "/library",
    ctaLabel: "Resume reading",
  },
  "because-you-read": {
    eyebrow: "Reader match",
    title: "More like your recent reads",
    reason: "Pulled from the stories and genres you opened most recently.",
    href: "/search",
    ctaLabel: "Explore more",
  },
  trending: {
    eyebrow: "Top now",
    title: "Readers are opening these now",
    reason: "The strongest current pull across the catalog.",
    href: "/rankings?type=popular&window=week",
    ctaLabel: "View chart",
  },
  new: {
    eyebrow: "Fresh drop",
    title: "Just landed",
    reason:
      "New launches and fresh returns worth catching before they get crowded.",
    href: "/rankings?type=new&window=all",
    ctaLabel: "See new titles",
  },
  completed: {
    eyebrow: STOREFRONT_TERMS.bingeReady,
    title: "Finished and bingeable",
    reason:
      "Completed runs for readers who do not want to wait between chapters.",
    href: "/search?status=Completed&sort=popular",
    ctaLabel: "Browse finished",
  },
  ttf: {
    eyebrow: STOREFRONT_TERMS.freeStart,
    title: "Easy first clicks",
    reason:
      "Free-start reads that make it easier to test a story before you commit.",
    href: "/rankings?type=ttf&window=all",
    ctaLabel: "Browse free starts",
  },
  adult: {
    eyebrow: "18+ picks",
    title: "18+ After Hours",
    reason: "Mature reads surfaced inside the 18+ catalog.",
    href: "/adult",
    ctaLabel: "18+",
  },
  history: {
    eyebrow: STOREFRONT_TERMS.readingDesk,
    title: "Recent reading",
    reason: "The last episodes you opened, kept easy to find.",
    href: "/library",
    ctaLabel: "History",
  },
  starter: {
    eyebrow: STOREFRONT_TERMS.startHere,
    title: "Top Picks",
    reason: "High-confidence first picks for building a new reading list.",
    href: "/rankings?type=popular&window=all",
    ctaLabel: "View chart",
  },
  "ai-recommended": {
    eyebrow: "Tailored picks",
    title: "Picked for you",
    reason: "Personalized from your recent reading signals and ratings.",
    href: "/search",
    ctaLabel: "Keep exploring",
  },
  recommended: {
    eyebrow: "More to try",
    title: "More to try next",
    reason: "Genre overlap and reading behavior point toward these next.",
    href: "/search",
    ctaLabel: "Explore more",
  },
};

export function buildHomeRail({
  id,
  items,
  title,
  reason,
  href,
  ctaLabel,
  eyebrow,
}) {
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
