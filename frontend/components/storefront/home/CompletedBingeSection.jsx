"use client";

import Link from "next/link";
import { ArrowRight, BookOpenCheck, Clock3 } from "lucide-react";
import {
  storefrontAccentChipClass,
  storefrontSoftCardClass,
} from "../../common/StorefrontPagePrimitives";
import { resolveDisplayImageUrl } from "../../../lib/fallbackImage";
import { trackEvent } from "../../../lib/trackEvent";
import {
  buildGenreLabel,
  buildStatusLabel,
  buildUpdatedLabel,
} from "../landingUtils";
import GenreChip from "./GenreChip";
import SectionHeader from "./SectionHeader";

function CompletedMiniCard({ series, position }) {
  if (!series) {
    return null;
  }

  const imageUrl = resolveDisplayImageUrl(series?.coverUrl, {
    kind: "cover",
    adult: series?.adult || series?.isAdult,
  });

  return (
    <Link
      href={`/series/${series.id}`}
      className={`group flex items-center gap-3 p-3 transition-all duration-200 hover:-translate-y-1 hover:border-white/18 hover:bg-[rgba(255,255,255,0.075)] ${storefrontSoftCardClass}`}
      onClick={() =>
        trackEvent("story_click", {
          seriesId: series?.id,
          sourceSection: "home_completed_secondary",
          position,
        })
      }
    >
      <div className="relative h-[92px] w-[72px] shrink-0 overflow-hidden rounded-[18px] border border-white/10">
        <img
          src={imageUrl}
          alt={`Cover image for ${series.title}`}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/46">
          {buildGenreLabel(series, 2) || "Completed"}
        </p>
        <h3 className="mt-1 line-clamp-2 text-base font-semibold leading-[1.08] tracking-[-0.03em] text-white">
          {series.title}
        </h3>
        <p className="mt-2 text-sm text-white/58">
          {[buildStatusLabel(series), buildUpdatedLabel(series)]
            .filter(Boolean)
            .join(" / ")}
        </p>
      </div>
    </Link>
  );
}

export default function CompletedBingeSection({ lead = null, items = [] }) {
  if (!lead && !items.length) {
    return null;
  }

  const leadSeries = lead || items[0];
  const supporting = lead ? items : items.slice(1);
  const imageUrl = resolveDisplayImageUrl(
    leadSeries?.bannerUrl || leadSeries?.coverUrl,
    {
      kind: leadSeries?.bannerUrl ? "banner" : "cover",
      adult: leadSeries?.adult || leadSeries?.isAdult,
    },
  );

  return (
    <section className="space-y-4">
      <SectionHeader
        title="Binge-worthy Completed"
        description="Whole stories, zero waiting"
        actionLabel="View All"
        actionHref="/search?status=completed"
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        {leadSeries ? (
          <Link
            href={`/series/${leadSeries.id}`}
            className="group relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0b0e16] p-5 shadow-[0_24px_72px_rgba(0,0,0,0.34)] transition-all duration-200 hover:-translate-y-1 hover:border-white/18"
            onClick={() =>
              trackEvent("story_click", {
                seriesId: leadSeries?.id,
                sourceSection: "home_completed_lead",
                position: 1,
              })
            }
          >
            <div className="absolute inset-0">
              <img
                src={imageUrl}
                alt={`Artwork for ${leadSeries.title}`}
                className="h-full w-full object-cover opacity-32 transition-transform duration-700 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(8,10,18,0.94)_0%,rgba(8,10,18,0.74)_48%,rgba(8,10,18,0.9)_100%)]" />
            </div>
            <div className="relative flex h-full flex-col justify-between gap-8">
              <div className="space-y-3">
                <GenreChip label="Completed" tone="accent" />
                <h3 className="max-w-[10ch] font-display text-[2.2rem] font-semibold leading-[0.95] tracking-[-0.06em] text-white sm:text-[2.8rem]">
                  {leadSeries.title}
                </h3>
                <p className="max-w-[28rem] text-sm leading-7 text-white/68">
                  Whole story energy. No waiting, no weekly cliffhanger debt, just open it and disappear for a while.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 text-sm text-white/72">
                <span className={`${storefrontAccentChipClass} px-4 text-white/82`}>
                  <BookOpenCheck className="size-4" />
                  Read Full Series
                </span>
                <span className={`${storefrontSoftCardClass} inline-flex min-h-[44px] items-center gap-2 px-4 py-0 text-white/78`}>
                  <Clock3 className="size-4" />
                  {buildGenreLabel(leadSeries, 2) || "Completed"}
                </span>
                <span className={`${storefrontSoftCardClass} inline-flex min-h-[44px] items-center gap-2 px-4 py-0 text-white/78`}>
                  <ArrowRight className="size-4" />
                  {buildStatusLabel(leadSeries)}
                </span>
              </div>
            </div>
          </Link>
        ) : null}

        {supporting.length > 0 ? (
          <div className="grid gap-3">
            {supporting.slice(0, 4).map((series, index) => (
              <CompletedMiniCard
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
