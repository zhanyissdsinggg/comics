"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { buildPathWithAttribution } from "../../lib/paymentAttribution";
import { getStorefrontCampaign } from "../../lib/storefrontCampaigns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
  const genreLabel =
    Array.isArray(series?.genres) && series.genres.length > 0
      ? series.genres.slice(0, 2).join(" / ")
      : "Editorially adjacent";

  return `${genreLabel} / ${ratingLabel}`;
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
  appearance = "default",
}) {
  const router = useRouter();
  const campaign = useMemo(() => getStorefrontCampaign(series), [series]);
  const isLight = appearance === "light";
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
        accentClass: isLight
          ? "border-black/6 bg-white/84 hover:border-black/10 hover:bg-white"
          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]",
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
        accentClass: isLight
          ? "border-black/6 bg-[#f8f9fc] hover:border-black/10 hover:bg-white"
          : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/[0.05]",
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
          isLight
            ? "border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.06)] hover:border-[rgba(47,107,255,0.2)] hover:bg-[rgba(47,107,255,0.08)]"
            : "border-emerald-400/25 bg-emerald-400/[0.08] hover:border-emerald-300/45 hover:bg-emerald-400/[0.12]",
      });
    }

    return nextCards;
  }, [campaign, entryPoint, includeValueCard, isLight, leadSimilar, returnTo, router, series?.id, sourcePath]);

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
    <div className={cn("grid gap-3", gridClassName, className)}>
      {cards.map((card) => (
        <Card
          key={card.id}
          className={cn(
            "rounded-[22px] border py-0 shadow-none transition-transform duration-300 hover:-translate-y-0.5",
            card.accentClass,
          )}
        >
          <CardContent className={cn(compact ? "p-4" : "p-5")}>
            <Badge
              variant="outline"
              className={cn(
                "w-fit rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-current",
                isLight ? "border-black/8 bg-white/82" : "border-white/10 bg-black/20",
              )}
            >
              {card.eyebrow}
            </Badge>
            <h3
              className={cn(
                "mt-4 font-semibold leading-tight",
                isLight ? "text-slate-950" : "text-white",
                compact ? "text-base" : "text-lg",
              )}
            >
              {card.title}
            </h3>
            {!compact ? (
              <p className={cn("mt-3 text-sm leading-6", isLight ? "text-slate-600" : "text-neutral-200/90")}>
                {card.description}
              </p>
            ) : null}
            {card.meta ? (
              <p className={cn("mt-3 text-[11px] uppercase tracking-[0.18em]", isLight ? "text-slate-500" : "text-neutral-500")}>
                {card.meta}
              </p>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              onClick={card.onClick}
              className={cn(
                "justify-start gap-2 px-0 text-sm font-semibold hover:bg-transparent",
                isLight ? "text-slate-900 hover:text-[var(--gush-accent,#2f6bff)]" : "text-white hover:text-emerald-200",
                compact ? "mt-3 h-8" : "mt-4 h-9",
              )}
            >
              {card.cta}
              <ArrowUpRight className="size-4" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
