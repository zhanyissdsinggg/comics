"use client";

import Link from "next/link";
import { ArrowRight, Clock3, Flame, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  storefrontHomeInteractiveCardClass,
  storefrontHomeSearchPillClass,
  storefrontHomeSectionEyebrowClass,
} from "../../common/StorefrontPagePrimitives";
import { resolveDisplayImageUrl } from "../../../lib/fallbackImage";
import { trackEvent } from "../../../lib/trackEvent";
import {
  buildGenreLabel,
  buildHomeUpdatedLabel,
  buildLatestInstallmentLabel,
} from "../landingUtils";
import GenreChip from "./GenreChip";

function buildCoverAlt(series, sourceSection, position) {
  const title = String(series?.title || "").trim() || "Untitled";
  const section = String(sourceSection || "home story").replace(/[_-]+/g, " ");
  return `Cover image for ${title} in ${section} position ${position || 1}`;
}

export default function StoryMiniCard({
  series,
  href,
  summary = "",
  eyebrow = "",
  badge = "",
  badgeTone = "accent",
  ctaLabel = "Open Story",
  sourceSection = "",
  position = 0,
  compact = false,
  showAction = true,
  metaItems = null,
  trailingIcon: TrailingIcon = Flame,
  variant = "default",
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
  const genreLine = eyebrow || buildGenreLabel(series, compact ? 1 : 2) || "Reader pick";
  const footerItems =
    Array.isArray(metaItems) && metaItems.length > 0
      ? metaItems
      : [
          {
            icon: Clock3,
            label: buildHomeUpdatedLabel(series, position),
          },
          {
            icon: Sparkles,
            label: buildLatestInstallmentLabel(series),
          },
        ].filter((item) => item.label);

  if (variant === "rail") {
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
        <article
          className={cn(
            storefrontHomeInteractiveCardClass,
            "flex h-[132px] min-h-[132px] gap-3 rounded-[20px] p-3",
            className,
          )}
        >
          <div className="relative h-[102px] w-[76px] shrink-0 overflow-hidden rounded-[15px] border border-[rgba(255,255,255,0.08)]">
            <img
              src={coverUrl}
              alt={buildCoverAlt(series, sourceSection, position)}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              style={{ objectPosition: coverPosition }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02)_0%,transparent_36%,rgba(0,0,0,0.34)_100%)]" />
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="min-w-0">
              <p className={cn(storefrontHomeSectionEyebrowClass, "line-clamp-1")}>
                {genreLine}
              </p>
              <h3 className="mt-1 truncate text-[14px] font-black leading-[1.1] tracking-[-0.03em] text-[color:var(--gush-home-text-primary)]">
                {series.title}
              </h3>
            </div>

            <p className="mt-2 line-clamp-2 text-[12px] leading-[1.45] text-[rgba(255,255,255,0.58)]">
              {summary || "A punchy opener, strong art, and the kind of cliffhanger people send to friends."}
            </p>

            <div className="mt-auto flex items-center justify-between gap-3 pt-3">
              <div className="flex min-w-0 items-center gap-2 text-[11px] text-[color:var(--gush-home-text-muted)]">
                <Flame className="size-3.5 shrink-0 text-[#fb923c]" />
                <span className="truncate text-[12px] text-[rgba(255,255,255,0.62)]">
                  Hot tonight
                </span>
              </div>
              {TrailingIcon ? (
                <TrailingIcon className="size-4 shrink-0 text-[#fdba74] transition-transform duration-200 group-hover:translate-x-0.5" />
              ) : null}
            </div>
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
      <article
        className={cn(
          storefrontHomeInteractiveCardClass,
          "flex min-h-[158px] gap-3 p-3.5 sm:p-4",
          className,
        )}
      >
        <div className="relative w-[90px] shrink-0 overflow-hidden rounded-[20px] border border-[rgba(255,255,255,0.08)] sm:w-[104px]">
          <img
            src={coverUrl}
            alt={buildCoverAlt(series, sourceSection, position)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            style={{ objectPosition: coverPosition }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          {badge ? (
            <GenreChip
              label={badge}
              tone={badgeTone}
              className="absolute left-2 top-2"
            />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={cn(storefrontHomeSectionEyebrowClass, "line-clamp-1")}>
                {genreLine}
              </p>
              <h3 className="mt-1 line-clamp-2 text-[1.08rem] font-semibold leading-[1.04] tracking-[-0.04em] text-[color:var(--gush-home-text-primary)]">
                {series.title}
              </h3>
            </div>
            {TrailingIcon ? (
              <TrailingIcon className="mt-0.5 size-4 shrink-0 text-[#f9a8d4]" />
            ) : null}
          </div>

          <p className="mt-2 line-clamp-2 text-sm leading-[1.68] text-[color:var(--gush-home-text-secondary)]">
            {summary || "Open it once, and your evening is probably gone."}
          </p>

          {footerItems.length > 0 ? (
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[12px] text-[color:var(--gush-home-text-muted)]">
              {footerItems.map((item) => {
                const Icon = item.icon;
                return (
                  <span key={`${item.label}-${item.icon?.name || "meta"}`} className="inline-flex items-center gap-1">
                    {Icon ? <Icon className="size-3.5" /> : null}
                    {item.label}
                  </span>
                );
              })}
            </div>
          ) : null}

          {showAction && ctaLabel ? (
            <div
              className={cn(
                storefrontHomeSearchPillClass,
                "mt-4 inline-flex min-h-[44px] px-3.5 py-0 text-white group-hover:text-white",
              )}
            >
              <ArrowRight className="size-3.5" />
              {ctaLabel}
            </div>
          ) : null}
        </div>
      </article>
    </Link>
  );
}
