import { STOREFRONT_TERMS } from "./storefrontCopy";

function getSeriesBadges(series) {
  return [series?.badge, ...(Array.isArray(series?.badges) ? series.badges : [])]
    .filter(Boolean)
    .map((badge) => String(badge).trim().toUpperCase());
}

export function getStorefrontCampaign(series) {
  const freeEpisodeCount = Number(series?.freeEpisodeCount || 0);
  const hasFreeEpisodes = freeEpisodeCount > 0 || Boolean(series?.hasFreeEpisodes);
  const isCompleted = String(series?.status || "").trim().toLowerCase() === "completed";
  const badges = getSeriesBadges(series);
  const isHot = badges.includes("HOT");
  const isNew = badges.includes("NEW");

  if (hasFreeEpisodes) {
    return {
      id: "free-start",
      eyebrow: STOREFRONT_TERMS.freeStart,
      title: "Easy to try first.",
      description:
        freeEpisodeCount > 0
          ? `${freeEpisodeCount} free chapter${
              freeEpisodeCount === 1 ? "" : "s"
            } let you try the story before you spend points.`
          : "This title is easy to sample first.",
      heroNote: isHot
        ? "Hot title with a free start."
        : "Good first pick.",
      reasonLabel: "Why read",
      reason: isHot
        ? "Free chapters plus buzz make it easy to jump in."
        : "A free sample helps when you're still picking your next read.",
      nextMoveLabel: "Try next",
      nextMove:
        "Keep nearby free-start titles ready for when you want another quick pick.",
      discoveryCta: "See free unlock picks",
      discoveryHref: "/rankings?type=ttf&window=all",
      valueLabel: "Then what",
      value: "If you keep going, compare plans or grab points.",
      valueCta: STOREFRONT_TERMS.compareMembership,
      valueKind: "subscribe",
    };
  }

  if (isCompleted) {
    return {
      id: "binge-ready",
      eyebrow: STOREFRONT_TERMS.bingeReady,
      title: "Ready for a full binge.",
      description:
        "Completed series are best when you want the full story without waiting.",
      heroNote: isHot
        ? "Popular completed series built for a binge."
        : "Finished run ready to read straight through.",
      reasonLabel: "Why read",
      reason:
        "The ending is already there, so you can read straight through.",
      nextMoveLabel: "Try next",
      nextMove:
        "Browse other finished series if you want another full read.",
      discoveryCta: "Browse completed series",
      discoveryHref: "/search?status=Completed&sort=popular",
      valueLabel: "Best pick",
      value: "Point packs work best when you know you want more chapters.",
      valueCta: STOREFRONT_TERMS.viewPointPacks,
      valueKind: "store",
    };
  }

  return {
    id: "return-weekly",
    eyebrow: STOREFRONT_TERMS.returnWeekly,
    title: isNew
      ? "Catch this one early."
      : "Easy to follow week after week.",
    description: isNew
      ? "Jump in early and follow new updates as they land."
      : "Ongoing series work best when they're worth checking back on every week.",
    heroNote: isNew
      ? "Fresh ongoing pick with early buzz."
      : "Ongoing series built for return visits.",
    reasonLabel: "Why read",
    reason:
      "A good weekly read gives you a reason to come back for the next chapter.",
    nextMoveLabel: "Try next",
    nextMove:
      "Use charts and new releases to keep up between updates.",
    discoveryCta: "See this week's chart",
    discoveryHref: "/rankings?type=popular&window=week",
    valueLabel: "Best fit",
    value: "Plans usually make more sense if you read new chapters every week.",
    valueCta: STOREFRONT_TERMS.compareMembership,
    valueKind: "subscribe",
  };
}
