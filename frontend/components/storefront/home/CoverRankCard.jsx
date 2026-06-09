"use client";

import Link from "next/link";
import { Flame, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  storefrontHomeInteractiveCardClass,
  storefrontHomeSectionEyebrowClass,
} from "../../common/StorefrontPagePrimitives";
import { resolveDisplayImageUrl } from "../../../lib/fallbackImage";
import { trackEvent } from "../../../lib/trackEvent";
import {
  buildCreatorLabel,
  buildGenreLabel,
  buildHomeUpdatedLabel,
  buildStatusLabel,
} from "../landingUtils";

function buildCoverAlt(series, sourceSection, position) {
  const title = String(series?.title || "").trim() || "Untitled";
  const section = String(sourceSection || "home ranking").replace(/[_-]+/g, " ");
  return `Cover image for ${title} in ${section} position ${position || 1}`;
}

function buildRatingLabel(series) {
  const numeric = Number(series?.ratingAvg || series?.rating || 0);
  return numeric > 0 ? numeric.toFixed(1) : "";
}

function buildBadgeClass(rank) {
  if (rank === 1) {
    return "border-[rgba(253,186,116,0.5)] bg-[linear-gradient(135deg,#fb923c_0%,#ec4899_100%)] text-white shadow-[0_16px_32px_rgba(249,115,22,0.28)]";
  }

  if (rank === 2) {
    return "border-[rgba(244,114,182,0.42)] bg-[linear-gradient(135deg,#ec4899_0%,#7c3aed_100%)] text-white shadow-[0_16px_32px_rgba(236,72,153,0.24)]";
  }

  if (rank === 3) {
    return "border-[rgba(167,139,250,0.42)] bg-[linear-gradient(135deg,#8b5cf6_0%,#6d28d9_100%)] text-white shadow-[0_16px_32px_rgba(109,40,217,0.24)]";
  }

  return "border-white/12 bg-[rgba(7,10,19,0.76)] text-white shadow-[0_16px_28px_rgba(3,6,18,0.26)]";
}

function buildHeatLabel(rank, rating) {
  if (rank === 1) {
    return "Burning up";
  }

  if (rank === 2) {
    return "Going fast";
  }

  if (rating) {
    return `${rating} rating`;
  }

  return "Hot tonight";
}

export default function CoverRankCard({
  series,
  href,
  badge = "",
  rank = 0,
  actionLabel = "",
  sourceSection = "",
  position = 0,
  compact = false,
  className = "",
}) {
  if (!series) {
    return null;
  }

  const coverUrl = resolveDisplayImageUrl(series?.coverUrl, {
    kind: "cover",
    adult: series?.adult || series?.isAdult,
  });
  const coverPosition =
    String(series?.homeCoverArtwork?.position || "").trim() || "center 18%";
  const rating = buildRatingLabel(series);
  const creator = buildCreatorLabel(series);
  const genreLabel = buildGenreLabel(series, 1);
  const statusLabel = buildStatusLabel(series);
  const resolvedRank = Number(rank || position || 0);
  const resolvedBadge = badge || String(resolvedRank || position || "");

  if (compact) {
    return (
      <Link
        href={href}
        className="group block"
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
        <article
          className={cn(
            storefrontHomeInteractiveCardClass,
            "grid grid-cols-[34px_58px_minmax(0,1fr)] items-center gap-3 p-3",
            className,
          )}
        >
          <span className="text-center font-display text-[1.4rem] font-semibold text-[color:var(--gush-home-text-secondary)]">
            {rank || position}
          </span>
          <div className="aspect-[0.74] overflow-hidden rounded-[16px] border border-[rgba(255,255,255,0.08)]">
            <img
              src={coverUrl}
              alt={buildCoverAlt(series, sourceSection, position)}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              style={{ objectPosition: coverPosition }}
            />
          </div>
          <div className="min-w-0">
            <p className={cn(storefrontHomeSectionEyebrowClass, "line-clamp-1")}>
              {genreLabel || "Series"}
            </p>
            <h3 className="mt-1 truncate text-sm font-semibold text-[color:var(--gush-home-text-primary)]">
              {series.title}
            </h3>
            <p className="truncate text-xs text-[color:var(--gush-home-text-muted)]">
              {statusLabel || creator || "Open now"}
            </p>
          </div>
        </article>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="group block w-full shrink-0 scroll-snap-item"
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
      <article className={cn("space-y-3", className)}>
        <div
          className={cn(
            storefrontHomeInteractiveCardClass,
            "relative aspect-[3/4] overflow-hidden rounded-[22px] border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] p-0 group-hover:border-[rgba(236,72,153,0.40)] group-hover:shadow-[0_0_42px_rgba(236,72,153,0.14),0_28px_68px_rgba(3,6,18,0.46)]",
          )}
        >
          <img
            src={coverUrl}
            alt={buildCoverAlt(series, sourceSection, position)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.045]"
            style={{ objectPosition: coverPosition }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,8,15,0.04)_0%,rgba(7,8,17,0.08)_34%,rgba(7,8,17,0.28)_100%)]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[34%] bg-[linear-gradient(180deg,rgba(7,10,19,0)_0%,rgba(7,10,19,0.18)_42%,rgba(7,10,19,0.82)_100%)]" />

          <span
            className={cn(
              "absolute left-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-[11px] border text-[13px] font-black tracking-[-0.03em] backdrop-blur-xl",
              buildBadgeClass(resolvedRank),
            )}
          >
            {resolvedBadge}
          </span>
        </div>

        <div className="space-y-2 px-1">
          <h3 className="truncate text-[14px] font-black leading-[1.08] tracking-[-0.03em] text-[color:var(--gush-home-text-primary)]">
            {series.title}
          </h3>
          <div className="flex items-center justify-between gap-3 text-[12px] text-[color:var(--gush-home-text-muted)]">
            <span className="min-w-0 truncate">
              {genreLabel || creator || statusLabel || "Series"}
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 text-[rgba(255,255,255,0.62)]">
              <Flame className="size-3.5 text-[#fb923c]" />
              {buildHeatLabel(resolvedRank, rating)}
            </span>
          </div>
          {actionLabel ? (
            <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--gush-home-text-muted)]">
              {actionLabel}
            </p>
          ) : (
            <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--gush-home-text-muted)]">
              {buildHomeUpdatedLabel(series, position)}
            </p>
          )}
        </div>
      </article>
    </Link>
  );
}
