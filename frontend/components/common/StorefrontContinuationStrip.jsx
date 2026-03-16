"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { buildPathWithAttribution } from "../../lib/paymentAttribution";
import { getStorefrontCampaign } from "../../lib/storefrontCampaigns";

function getDiscoveryLaneTitle(campaignId) {
  if (campaignId === "free-start") {
    return "Keep browsing with free-start picks.";
  }
  if (campaignId === "binge-ready") {
    return "Keep going with completed series.";
  }
  return "Keep reading with one easy next step.";
}

function getSimilarDescription(series) {
  const rating = Number(series?.rating);
  const ratingLabel = Number.isFinite(rating) ? `${rating.toFixed(1)} rating` : "Fresh pick";
  const genreLabel = Array.isArray(series?.genres) && series.genres.length > 0
    ? series.genres.slice(0, 2).join(" | ")
    : "Editorially adjacent";

  return `${genreLabel} | ${ratingLabel}`;
}

export default function StorefrontContinuationStrip({
  series,
  similarItems = [],
  sourcePath = "/",
  returnTo = sourcePath,
  entryPoint = "SERIES_CONTINUE",
  includeValueCard = true,
  className = "",
  compact = false,
}) {
  const router = useRouter();
  const campaign = useMemo(() => getStorefrontCampaign(series), [series]);
  const leadSimilar = useMemo(
    () => similarItems.find((item) => item?.id && item.id !== series?.id) || null,
    [similarItems, series?.id],
  );

  const cards = useMemo(() => {
    if (!campaign || !series?.id) {
      return [];
    }

    const nextCards = [
      {
        id: "discovery",
        eyebrow: campaign.eyebrow,
        title: getDiscoveryLaneTitle(campaign.id),
        description: campaign.nextMove,
        cta: campaign.discoveryCta,
        onClick: () => router.push(campaign.discoveryHref),
        accentClass:
          "border-white/10 bg-white/[0.04] text-neutral-100 hover:border-white/20 hover:bg-white/[0.08]",
      },
    ];

    if (leadSimilar) {
      nextCards.push({
        id: "similar",
        eyebrow: "Switch title",
        title: `Try ${leadSimilar.title} next.`,
        description:
          "Move into a nearby series without starting over, then decide whether you want to stay focused or branch out.",
        cta: "Open similar pick",
        onClick: () => router.push(`/series/${leadSimilar.id}`),
        meta: getSimilarDescription(leadSimilar),
        accentClass:
          "border-white/10 bg-black/20 text-neutral-100 hover:border-white/20 hover:bg-white/[0.06]",
      });
    }

    if (includeValueCard) {
      nextCards.push({
        id: "value",
        eyebrow: "Plans & points",
        title: "See your best payment option before you unlock more.",
        description: campaign.value,
        cta: campaign.valueCta,
        onClick: () => {
          const attribution = {
            entryPoint,
            campaignId: campaign.id,
            sourcePath,
            sourceSeriesId: series.id,
            returnTo,
          };

          if (campaign.valueKind === "store") {
            router.push(buildPathWithAttribution("/store", attribution, { focus: "auto" }));
            return;
          }

          router.push(buildPathWithAttribution("/subscribe", attribution));
        },
        accentClass:
          "border-emerald-400/30 bg-emerald-400/10 text-emerald-200 hover:border-emerald-300/50 hover:bg-emerald-400/15",
      });
    }

    return nextCards;
  }, [campaign, entryPoint, includeValueCard, leadSimilar, returnTo, router, series?.id, sourcePath]);

  if (cards.length === 0) {
    return null;
  }

  const gridClassName =
    cards.length >= 3
      ? "lg:grid-cols-3"
      : cards.length === 2
        ? "sm:grid-cols-2"
        : "";

  return (
    <div className={`grid gap-3 ${gridClassName} ${className}`.trim()}>
      {cards.map((card) => (
        <button
          key={card.id}
          type="button"
          onClick={card.onClick}
          className={`group rounded-[22px] border px-4 text-left transition-all duration-300 hover:-translate-y-0.5 ${
            compact ? "py-4" : "py-5"
          } ${card.accentClass}`}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-current opacity-75">
            {card.eyebrow}
          </p>
          <h3 className={`${compact ? "mt-3 text-base" : "mt-4 text-lg"} font-semibold leading-tight text-white`}>
            {card.title}
          </h3>
          <p className={`${compact ? "mt-2 text-xs leading-6" : "mt-3 text-sm leading-7"} text-neutral-300`}>
            {card.description}
          </p>
          {card.meta ? (
            <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-neutral-500">{card.meta}</p>
          ) : null}
          <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-current">
            <span>{card.cta}</span>
            <span
              aria-hidden="true"
              className="transition-transform duration-300 group-hover:translate-x-1"
            >
              &gt;
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
