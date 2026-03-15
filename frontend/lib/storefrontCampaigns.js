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
      title: "Built to convert a cold visit into chapter one.",
      description:
        freeEpisodeCount > 0
          ? `${freeEpisodeCount} free episode${
              freeEpisodeCount === 1 ? "" : "s"
            } make this the kind of title that can pull a new reader into the first premium decision without forcing an immediate spend.`
          : "This title has the low-friction shape that works best when a new reader still needs a clean first click.",
      heroNote: isHot
        ? "Hot title with a low-friction first-chapter path."
        : "Low-friction sampling lane for first-time readers.",
      reasonLabel: "Why it fits",
      reason: isHot
        ? "Free access plus visible momentum lowers bounce risk on the first visit."
        : "Sample-friendly series work best when discovery still feels tentative.",
      nextMoveLabel: "Editorial next move",
      nextMove:
        "Keep similar free-start titles and the unlock chart close by so curiosity turns into a reading run instead of a one-click exit.",
      discoveryCta: "Open free unlock chart",
      discoveryHref: "/rankings?type=ttf&window=all",
      valueLabel: "Value path",
      value:
        "When the free path ends, membership should already be visible so the reader never hits a dead stop.",
      valueCta: STOREFRONT_TERMS.compareMembership,
      valueKind: "subscribe",
    };
  }

  if (isCompleted) {
    return {
      id: "binge-ready",
      eyebrow: STOREFRONT_TERMS.bingeReady,
      title: "Built for long-session reading without release gaps.",
      description:
        "Completed runs convert when readers want depth, payoff, and fewer interruptions between unlock decisions.",
      heroNote: isHot
        ? "Hot completed series built for binge momentum."
        : "Finished run ready for a longer reading session.",
      reasonLabel: "Why it fits",
      reason:
        "Complete availability makes it easier to justify deeper wallet use because the payoff path is already visible.",
      nextMoveLabel: "Editorial next move",
      nextMove:
        "Compare this title against the completed shelf so the reader can commit to a longer binge instead of stalling after one sample.",
      discoveryCta: "Browse completed desk",
      discoveryHref: "/search?status=Completed&sort=popular",
      valueLabel: "Value path",
      value:
        "Binge readers respond best when point-pack value stays close to the title page and the next unlock feels obvious.",
      valueCta: STOREFRONT_TERMS.viewPointPacks,
      valueKind: "store",
    };
  }

  return {
    id: "return-weekly",
    eyebrow: STOREFRONT_TERMS.returnWeekly,
    title: isNew
      ? "Built for readers who want to catch a live release curve early."
      : "Built for readers who come back on a weekly rhythm.",
    description: isNew
      ? "Fresh launches and active ongoing series work best when the next return visit is already part of the pitch."
      : "Ongoing series convert best when the site frames them as a habit, not a one-off click.",
    heroNote: isNew
      ? "Fresh ongoing lane with live-release momentum."
      : "Ongoing lane designed for return visits.",
    reasonLabel: "Why it fits",
    reason:
      "A return-worthy title needs library, follow, and membership value close to the first read so the habit forms early.",
    nextMoveLabel: "Editorial next move",
    nextMove:
      "Use charts and latest-release browse to keep readers inside the live-release conversation instead of losing them between updates.",
    discoveryCta: "Open weekly chart",
    discoveryHref: "/rankings?type=popular&window=week",
    valueLabel: "Value path",
    value:
      "Membership is the cleanest upsell when the reader expects to come back regularly and wants lower unlock friction over time.",
    valueCta: STOREFRONT_TERMS.compareMembership,
    valueKind: "subscribe",
  };
}
