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
      title: "Easy to try before you spend.",
      description:
        freeEpisodeCount > 0
          ? `${freeEpisodeCount} free episode${
              freeEpisodeCount === 1 ? "" : "s"
            } give new readers a simple way to try the story before unlocking more.`
          : "This title has the kind of low-friction start that works well for first-time readers.",
      heroNote: isHot
        ? "Hot title with an easy free start."
        : "Free-sample pick for first-time readers.",
      reasonLabel: "Why it works",
      reason: isHot
        ? "Free access plus visible buzz makes it easier to start reading right away."
        : "A free sample works best when a reader is still deciding what to try.",
      nextMoveLabel: "Try next",
      nextMove:
        "Keep similar free-start titles and free unlock picks nearby so one sample can turn into a longer read.",
      discoveryCta: "See free unlock picks",
      discoveryHref: "/rankings?type=ttf&window=all",
      valueLabel: "Keep reading",
      value:
        "When the free chapters run out, membership should already be easy to compare.",
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
        "Completed series are easiest to commit to when you want the whole story without waiting for updates.",
      heroNote: isHot
        ? "Popular completed series built for a binge."
        : "Finished run ready to read straight through.",
      reasonLabel: "Why it works",
      reason:
        "A finished story feels safer to invest in because the payoff is already there.",
      nextMoveLabel: "Try next",
      nextMove:
        "Compare this title with other completed series if you want a full binge instead of a one-chapter sample.",
      discoveryCta: "Browse completed series",
      discoveryHref: "/search?status=Completed&sort=popular",
      valueLabel: "Unlock value",
      value:
        "Point packs make the most sense when you know you want to keep reading for a while.",
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
      ? "Fresh launches feel best when you can jump in early and follow the release curve as it grows."
      : "Ongoing series work best when they feel worth coming back to every week.",
    heroNote: isNew
      ? "Fresh ongoing pick with early buzz."
      : "Ongoing series built for return visits.",
    reasonLabel: "Why it works",
    reason:
      "A return-worthy title needs follow, library, and membership value close to the first read so the habit can stick.",
    nextMoveLabel: "Try next",
    nextMove:
      "Use charts and latest releases to keep following this kind of series instead of dropping off between updates.",
    discoveryCta: "See weekly chart",
    discoveryHref: "/rankings?type=popular&window=week",
    valueLabel: "Best value",
    value:
      "Membership usually makes the most sense if you plan to keep coming back for new chapters.",
    valueCta: STOREFRONT_TERMS.compareMembership,
    valueKind: "subscribe",
  };
}
