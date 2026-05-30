"use client";

import Link from "next/link";
import { Clock3, Flame, Play, Sparkles } from "lucide-react";
import { resolveDisplayImageUrl } from "../../../lib/fallbackImage";
import { trackEvent } from "../../../lib/trackEvent";
import {
  buildGenreLabel,
  buildLatestInstallmentLabel,
  buildUpdatedLabel,
} from "../landingUtils";
import GenreChip from "./GenreChip";

function buildCoverAlt(series) {
  const title = String(series?.title || "").trim() || "Untitled";
  return `Cover image for ${title}`;
}

export default function StoryCard({
  series,
  href,
  summary = "",
  badge = "",
  ctaLabel = "Open Story",
  sourceSection = "",
  position = 0,
  compact = false,
}) {
  if (!series) {
    return null;
  }

  const coverUrl = resolveDisplayImageUrl(series?.coverUrl, {
    kind: "cover",
    adult: series?.adult || series?.isAdult,
  });
  const genreLine = buildGenreLabel(series, compact ? 1 : 2) || "Reader pick";

  return (
    <Link
      href={href}
      className={`group block shrink-0 scroll-snap-item ${compact ? "w-[82vw] max-w-[360px]" : "w-full"}`}
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
      <article className="flex min-h-[154px] gap-3 rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-3.5 shadow-[0_22px_54px_rgba(0,0,0,0.24)] backdrop-blur-xl transition-all duration-200 group-hover:-translate-y-1.5 group-hover:border-white/18 group-hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] group-hover:shadow-[0_28px_64px_rgba(0,0,0,0.3)]">
        <div className="relative w-[90px] shrink-0 overflow-hidden rounded-[22px] border border-white/10 sm:w-[104px]">
          <img
            src={coverUrl}
            alt={buildCoverAlt(series)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
          {badge ? (
            <GenreChip
              label={badge}
              tone="accent"
              className="absolute left-2 top-2"
            />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="line-clamp-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/48">
                {genreLine}
              </p>
              <h3 className="mt-1 line-clamp-2 text-[1.08rem] font-semibold leading-[1.04] tracking-[-0.04em] text-white">
                {series.title}
              </h3>
            </div>
            <Flame className="mt-0.5 size-4 shrink-0 text-[var(--gush-warning)]" />
          </div>

          <p className="mt-2 line-clamp-2 text-sm leading-[1.68] text-white/62">
            {summary || "Open it once, and you're probably reading one more chapter."}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[12px] text-white/56">
            <span className="inline-flex items-center gap-1">
              <Clock3 className="size-3.5" />
              {buildUpdatedLabel(series)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Sparkles className="size-3.5" />
              {buildLatestInstallmentLabel(series)}
            </span>
          </div>

          <div className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 text-sm font-medium text-white/82 shadow-[0_14px_28px_rgba(8,6,20,0.16)] backdrop-blur-xl transition-all duration-200 group-hover:bg-[rgba(255,92,164,0.14)] group-hover:text-white">
            <Play className="size-4" />
            {ctaLabel}
          </div>
        </div>
      </article>
    </Link>
  );
}
