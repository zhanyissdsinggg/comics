"use client";

import Link from "next/link";
import { ArrowRight, BookOpenCheck, Sparkles, Star } from "lucide-react";
import {
  storefrontHomeGlassCardClass,
  storefrontHomeInteractiveCardClass,
  storefrontHomeSearchPillClass,
} from "../../common/StorefrontPagePrimitives";
import { resolveDisplayImageUrl } from "../../../lib/fallbackImage";
import { trackEvent } from "../../../lib/trackEvent";
import {
  buildCardHook,
  buildCreatorLabel,
  buildGenreLabel,
  buildStatusLabel,
  buildUpdatedLabel,
} from "../landingUtils";
import GenreChip from "./GenreChip";
import SectionHeader from "./SectionHeader";

function buildRatingLabel(series) {
  const value = Number(series?.ratingAvg || series?.rating || 0);
  return value > 0 ? value.toFixed(1) : "4.8";
}

function CompletedCard({ series, position, featured = false }) {
  if (!series) {
    return null;
  }

  const coverUrl = resolveDisplayImageUrl(series?.coverUrl, {
    kind: "cover",
    adult: series?.adult || series?.isAdult,
  });
  const coverPosition =
    String(series?.homeCoverArtwork?.position || "").trim() || "center 18%";
  const creator = buildCreatorLabel(series);

  return (
    <Link
      href={`/series/${series.id}`}
      className="group block"
      onClick={() =>
        trackEvent("story_click", {
          seriesId: series?.id,
          sourceSection: featured ? "home_completed_lead" : "home_completed_secondary",
          position,
        })
      }
    >
      <article
        className={`${storefrontHomeInteractiveCardClass} flex h-full min-h-[148px] gap-3 rounded-[22px] p-3`}
      >
        <div className={`relative shrink-0 overflow-hidden rounded-[18px] border border-[rgba(255,255,255,0.08)] ${featured ? "w-[104px]" : "w-[92px]"}`}>
          <div className="aspect-[3/4] h-full w-full">
            <img
              src={coverUrl}
              alt={`Cover image for ${series.title}`}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              style={{ objectPosition: coverPosition }}
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <GenreChip
                label="Completed"
                tone="accent"
                className="min-h-[22px] px-2.5 py-0 text-[10px]"
              />
              <h3 className={`mt-2 line-clamp-2 font-black leading-[1.06] tracking-[-0.03em] text-[color:var(--gush-home-text-primary)] ${featured ? "text-[1.05rem]" : "text-[14px]"}`}>
                {series.title}
              </h3>
            </div>
            <ArrowRight className="mt-1 size-4 shrink-0 text-[#f9a8d4] transition-transform duration-200 group-hover:translate-x-0.5" />
          </div>

          <p className="mt-2 line-clamp-2 text-[12px] leading-[1.45] text-[rgba(255,255,255,0.58)]">
            {buildCardHook(series, featured ? 92 : 76) ||
              "Finished story, no waiting, just keep going until your sleep schedule loses."}
          </p>

          <div className="mt-3 flex items-center gap-3 text-[12px] text-[color:var(--gush-home-text-muted)]">
            <span className="inline-flex items-center gap-1">
              <Star className="size-3.5 fill-current text-[var(--gush-warning)]" />
              {buildRatingLabel(series)}
            </span>
            <span className="truncate">
              {creator || buildGenreLabel(series, 1) || buildStatusLabel(series)}
            </span>
          </div>

          <div className="mt-auto flex items-center justify-between gap-3 pt-3">
            <span className="truncate text-[11px] uppercase tracking-[0.14em] text-[color:var(--gush-home-text-muted)]">
              {buildUpdatedLabel(series)}
            </span>
            <span className={`${storefrontHomeSearchPillClass} min-h-[34px] px-3 text-xs text-white`}>
              Start Binge
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

export default function CompletedBingeSection({ lead = null, items = [] }) {
  if (!lead && !items.length) {
    return null;
  }

  const leadSeries = lead || items[0];
  const supporting = lead ? items : items.slice(1);

  return (
    <section className="space-y-4">
      <SectionHeader
        title="Binge-worthy Completed"
        description="Whole stories, zero waiting"
        actionLabel="View All"
        actionHref="/search?status=completed"
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,1fr)]">
        {leadSeries ? (
          <div className={`${storefrontHomeGlassCardClass} rounded-[24px] p-3 sm:p-4`}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--gush-home-text-muted)]">
                <BookOpenCheck className="size-4 text-[var(--gush-warning)]" />
                Ready to binge
              </div>
              <div className="inline-flex items-center gap-1 text-[11px] text-[rgba(255,255,255,0.62)]">
                <Sparkles className="size-3.5 text-[#f472b6]" />
                Whole stories
              </div>
            </div>
            <CompletedCard series={leadSeries} position={1} featured />
          </div>
        ) : null}

        {supporting.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {supporting.slice(0, 4).map((series, index) => (
              <CompletedCard
                key={series.id}
                series={series}
                position={index + 2}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
