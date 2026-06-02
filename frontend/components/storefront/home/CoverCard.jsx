"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import {
  storefrontBadgeClass,
  storefrontSoftCardClass,
} from "../../common/StorefrontPagePrimitives";
import { resolveDisplayImageUrl } from "../../../lib/fallbackImage";
import { trackEvent } from "../../../lib/trackEvent";
import {
  buildCreatorLabel,
  buildGenreLabel,
  buildLatestInstallmentLabel,
  buildStatusLabel,
  buildUpdatedLabel,
} from "../landingUtils";
import GenreChip from "./GenreChip";

function buildCoverAlt(series) {
  const title = String(series?.title || "").trim() || "Untitled";
  return `Cover image for ${title}`;
}

function buildRatingLabel(series) {
  const numeric = Number(series?.ratingAvg || series?.rating || 0);
  return numeric > 0 ? numeric.toFixed(1) : "";
}

export default function CoverCard({
  series,
  href,
  badge = "",
  actionLabel = "",
  sourceSection = "",
  position = 0,
}) {
  if (!series) {
    return null;
  }

  const coverUrl = resolveDisplayImageUrl(series?.coverUrl, {
    kind: "cover",
    adult: series?.adult || series?.isAdult,
  });
  const rating = buildRatingLabel(series);
  const creator = buildCreatorLabel(series);
  const genreLabel = buildGenreLabel(series, 2);
  const statusLabel = buildStatusLabel(series);

  return (
    <Link
      href={href}
      className="group block w-[calc(50vw-1rem)] min-w-[148px] max-w-[214px] shrink-0 scroll-snap-item sm:w-[190px] md:w-[214px]"
      onClick={() => {
        if (sourceSection) {
          trackEvent("story_click", {
            seriesId: series?.id,
            sourceSection,
            position,
          });
        }
      }}
    >
      <article className="space-y-3">
        <div className={`relative aspect-[0.72] overflow-hidden rounded-[26px] shadow-[0_18px_44px_rgba(0,0,0,0.34)] transition-all duration-200 group-hover:-translate-y-1.5 group-hover:border-white/18 group-hover:shadow-[0_26px_60px_rgba(0,0,0,0.4)] ${storefrontSoftCardClass} p-0`}>
          <img
            src={coverUrl}
            alt={buildCoverAlt(series)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,8,15,0.08)_0%,rgba(7,8,17,0.18)_28%,rgba(7,8,17,0.84)_100%)]" />

          <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-2">
            {badge ? <GenreChip label={badge} tone="accent" /> : <span />}
            {rating ? (
              <span className={`${storefrontBadgeClass} gap-1 bg-[rgba(8,10,18,0.78)] text-white/86`}>
                <Star className="size-3 fill-current text-[var(--gush-gold)]" />
                {rating}
              </span>
            ) : null}
          </div>

          <div className="absolute inset-x-0 bottom-0 p-3.5">
            {genreLabel ? (
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/54">
                {genreLabel}
              </p>
            ) : null}
            <h3 className="mt-1 line-clamp-2 text-[1.12rem] font-semibold leading-[1.04] tracking-[-0.03em] text-white">
              {series.title}
            </h3>
            <p className="mt-2 text-xs text-white/58">
              {actionLabel || buildLatestInstallmentLabel(series)}
            </p>
          </div>
        </div>

        <div className="space-y-1 px-1">
          <p className="line-clamp-1 text-xs text-white/64">
            {[creator, statusLabel].filter(Boolean).join(" / ")}
          </p>
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/42">
            {buildUpdatedLabel(series)}
          </p>
        </div>
      </article>
    </Link>
  );
}
