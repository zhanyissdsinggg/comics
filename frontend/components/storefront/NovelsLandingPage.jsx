"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Clock3,
  Library,
  Moon,
  Sparkles,
  Star,
} from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { useProgressStore } from "../../store/useProgressStore";
import { resolveDisplayImageUrl } from "../../lib/fallbackImage";
import { trackEvent } from "../../lib/trackEvent";
import { withHomeArtwork } from "../../lib/homeArtwork";
import { siteMaterialImages } from "../../lib/siteMaterialAssets";
import {
  CuratedEditorialModule,
  EmptyShelf,
  SectionHeading,
  StorefrontSectionLoadingGrid,
  StorefrontPage,
  useCatalogFeed,
} from "./StorefrontScaffold";
import {
  storefrontBadgeClass,
  StorefrontNoCoverCard,
  storefrontChipClass,
  storefrontInfoCardClass,
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../common/StorefrontPagePrimitives";
import {
  buildCardHook,
  buildCompletedRail,
  buildContinueReadingItems,
  buildGenreLabel,
  buildLatestInstallmentLabel,
  buildReadHref,
  buildReadingTimeLabel,
  buildSeriesHref,
  buildShortReadsRail,
  buildStatusLabel,
  buildTopTen,
  buildUpdatedLabel,
  buildUpdatedRail,
  pickFeaturedSeries,
} from "./landingUtils";

const FEATURED_NOVEL_TITLES = ["Solar Wind"];
const NOVEL_SHELF_PRIORITY_TITLES = ["Solar Wind", "Neon Nights"];
const NOVEL_MOOD_CHIPS = [
  "Dark Mystery",
  "Slow-Burn Romance",
  "Space Adventure",
  "School Drama",
  "Quick Reads",
  "Completed",
  "One More Chapter",
];
const NOVEL_FEATURED_HOOKS = {
  "Solar Wind":
    "A salvage crew follows a signal that feels older than the station waiting for it.",
};
const NOVEL_EDITORIAL_COPY = {
  "Solar Wind":
    "The relay storm is waking up, the station wants the cargo, and the crew already knows something on the other side is choosing them back.",
  "Neon Nights":
    "A missing singer, a glitching city, and a courier moving through the dark like she already knows the wrong answer is the only way in.",
};
const CURATED_SHELF_COPY = {
  "Solar Wind":
    "A signal in deep space keeps tugging the crew back toward the one route they should have left alone.",
  "Neon Nights":
    "A noir trail of clubs, glitches, and missing names keeps every next chapter feeling like a bad idea worth following.",
};
const FINISHED_STORY_FALLBACK = {
  title: "Moonlight Sonata",
  genre: "Romance / Drama",
  hook:
    "A quiet romance with one final performance, one last letter, and a clean ending worth reading tonight.",
};
const FINISHED_STORY_CTA_LABEL = "Start Full Story";
const FINISHED_STORY_STATUS_LABEL = "Completed";

function normalizeValue(value) {
  return String(value || "").trim().toLowerCase();
}

function getSeriesId(series) {
  return String(series?.id || "").trim();
}

function getCoverUrl(series) {
  return resolveDisplayImageUrl(series?.coverUrl, {
    kind: "cover",
    adult: series?.adult || series?.isAdult,
  });
}

function pickPrioritySeries(seriesList = [], titles = [], limit = 1) {
  const safeList = Array.isArray(seriesList) ? seriesList : [];
  const selected = [];
  const seenIds = new Set();

  titles.forEach((title) => {
    const match = safeList.find(
      (series) => normalizeValue(series?.title) === normalizeValue(title),
    );
    const seriesId = getSeriesId(match);
    if (!match || !seriesId || seenIds.has(seriesId)) {
      return;
    }
    seenIds.add(seriesId);
    selected.push(match);
  });

  if (selected.length >= limit) {
    return selected.slice(0, limit);
  }

  safeList.forEach((series) => {
    if (selected.length >= limit) {
      return;
    }
    const seriesId = getSeriesId(series);
    if (!seriesId || seenIds.has(seriesId)) {
      return;
    }
    seenIds.add(seriesId);
    selected.push(series);
  });

  return selected.slice(0, limit);
}

function excludeSeries(seriesList = [], excludedIds = new Set()) {
  const safeIds = excludedIds instanceof Set ? excludedIds : new Set();
  return (Array.isArray(seriesList) ? seriesList : []).filter((series) => {
    const seriesId = getSeriesId(series);
    return seriesId && !safeIds.has(seriesId);
  });
}

function withCoverArtwork(series) {
  return series ? withHomeArtwork(series, "cover") : series;
}

function NovelMoodRail() {
  return (
    <section aria-label="Novel moods" className="space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-white">Read by Mood</p>
        <p className="text-sm leading-6 text-white/58">
          Slide into a shelf that fits tonight.
        </p>
      </div>
      <div className="-mx-4 overflow-x-auto px-4 pb-1 no-scrollbar sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-2.5">
          {NOVEL_MOOD_CHIPS.map((chip, index) => (
            <Link
              key={chip}
              href={`/search?type=novel&q=${encodeURIComponent(chip)}`}
              className={`min-h-[44px] px-4 text-sm ${
                index === 0
                  ? "inline-flex shrink-0 items-center gap-2 rounded-full border border-fuchsia-200/24 bg-fuchsia-300/[0.12] font-semibold text-fuchsia-50 shadow-[0_16px_34px_rgba(236,72,153,0.18)]"
                  : `${storefrontChipClass} shrink-0 text-white/76`
              }`}
            >
              {index === 0 ? <Moon className="size-4" /> : null}
              {chip}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function StackedCoverDeck({ featured, items = [] }) {
  const covers = [featured, ...items]
    .filter(Boolean)
    .filter((series, index, list) => {
      const seriesId = getSeriesId(series);
      return seriesId && list.findIndex((item) => getSeriesId(item) === seriesId) === index;
    })
    .slice(0, 3);

  if (covers.length === 0) {
    return null;
  }

  return (
    <div className="relative mx-auto h-[328px] w-full max-w-[330px] sm:h-[380px]">
      {covers.map((series, index) => {
        const offsetClass =
          index === 0
            ? "left-[15%] top-0 z-30 rotate-0 scale-100"
            : index === 1
              ? "left-[2%] top-10 z-20 -rotate-[7deg] scale-[0.84] opacity-88"
              : "left-[34%] top-12 z-10 rotate-[8deg] scale-[0.8] opacity-78";
        return (
          <Link
            key={`${series.id}-${index}`}
            href={buildSeriesHref(series)}
            className={`absolute block w-[62%] rounded-[26px] border border-white/12 bg-black/30 shadow-[0_28px_70px_rgba(0,0,0,0.46)] transition-transform duration-200 hover:-translate-y-1 ${offsetClass}`}
            aria-label={`Open ${series.title}`}
          >
            <div className="aspect-[3/4] overflow-hidden rounded-[25px]">
              <img src={getCoverUrl(series)} alt="" aria-hidden="true" role="presentation" className="h-full w-full object-cover" />
            </div>
          </Link>
        );
      })}
      <div className="absolute bottom-2 left-4 right-4 z-40 rounded-[24px] border border-white/10 bg-[rgba(8,10,19,0.72)] p-3 shadow-[0_22px_56px_rgba(0,0,0,0.38)] backdrop-blur-xl">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/58">
          <BookOpen className="size-3.5 text-fuchsia-100" />
          Serialized shelf
        </div>
        <p className="mt-1 text-sm font-semibold text-white">
          {covers.length} late-night picks ready.
        </p>
      </div>
    </div>
  );
}

function NovelHero({ featured, hook = "", stackItems = [] }) {
  if (!featured) {
    return null;
  }

  const genreLabel = buildGenreLabel(featured, 2) || "Late-night novel";
  const readHref = buildReadHref(featured);

  return (
    <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[rgba(9,11,20,0.96)] shadow-[0_34px_110px_rgba(0,0,0,0.42)]">
      <div className="absolute inset-0" aria-hidden="true">
        <img
          src={siteMaterialImages.novelsFeaturedHero}
          alt=""
          aria-hidden="true"
          role="presentation"
          className="h-full w-full object-cover object-[right_center] opacity-70"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(56,189,248,0.2),transparent_24%),radial-gradient(circle_at_80%_30%,rgba(236,72,153,0.16),transparent_28%),linear-gradient(90deg,rgba(7,10,19,0.98)_0%,rgba(9,11,21,0.9)_46%,rgba(7,10,19,0.66)_100%)]" />
      </div>

      <div className="relative grid gap-6 p-5 pb-[calc(var(--gush-mobile-bottom-nav-height)+1.35rem)] sm:gap-7 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(300px,390px)] lg:items-center lg:p-8">
        <div className="max-w-[760px]">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`${storefrontBadgeClass} min-h-[34px] px-3 text-white/70`}>
              Late-night shelf
            </span>
            <span className="inline-flex min-h-[34px] items-center gap-2 rounded-full border border-cyan-100/14 bg-cyan-100/8 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-50/80">
              <Clock3 className="size-3.5" />
              {buildReadingTimeLabel(featured)}
            </span>
          </div>
          <h1 className="mt-5 max-w-[12ch] font-display text-[3rem] font-semibold leading-[0.9] tracking-[-0.055em] text-white sm:text-[4.8rem]">
            Start a story that keeps pulling you back.
          </h1>
          <p className="mt-5 max-w-[38rem] text-base leading-7 text-white/72 sm:text-lg">
            {hook || buildCardHook(featured, 150)}
          </p>
          <div className="mt-6 grid gap-3 rounded-[26px] border border-white/10 bg-[rgba(255,255,255,0.045)] p-4 backdrop-blur-xl sm:max-w-[620px] sm:grid-cols-3">
            {[
              ["Featured", featured.title],
              ["Mood", genreLabel],
              ["Status", buildStatusLabel(featured)],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/42">
                  {label}
                </p>
                <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-white">
                  {value}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-7 sm:flex sm:flex-row sm:flex-wrap">
            <Link
              href={readHref}
              className={`${storefrontPrimaryButtonClass} min-h-[50px] min-w-0 justify-center px-4 text-[#190d18] sm:px-6`}
            >
              Start Reading
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href={buildSeriesHref(featured)}
              className={`${storefrontSecondaryButtonClass} min-h-[50px] min-w-0 justify-center px-4 text-white/84 sm:px-6`}
            >
              View Series
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>

        <StackedCoverDeck featured={featured} items={stackItems} />
      </div>
    </section>
  );
}

function NovelEditorialCard({ series, description = "", sectionName = "", position = 0 }) {
  if (!series) {
    return null;
  }

  const href = buildSeriesHref(series);
  const coverUrl = getCoverUrl(series);

  return (
    <Link
      href={href}
      aria-label={String(series?.title || "").trim() || "Open novel"}
      onClick={() => {
        if (sectionName) {
          trackEvent("story_click", {
            seriesId: series?.id,
            sourceSection: sectionName,
            position,
          });
        }
      }}
      className="group block"
    >
      <article className="relative min-h-[300px] overflow-hidden rounded-[30px] border border-white/10 bg-[rgba(255,255,255,0.04)] shadow-[var(--gush-shadow-card)] transition-all duration-200 group-hover:-translate-y-1.5 group-hover:border-[rgba(236,72,153,0.28)] group-hover:shadow-[0_28px_90px_rgba(0,0,0,0.36)]">
        <div className="absolute inset-0" aria-hidden="true">
          <img src={coverUrl} alt="" aria-hidden="true" role="presentation" className="h-full w-full object-cover opacity-58 transition-transform duration-500 group-hover:scale-[1.04]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(56,189,248,0.16),transparent_18%),radial-gradient(circle_at_82%_18%,rgba(236,72,153,0.18),transparent_20%),linear-gradient(180deg,rgba(7,10,19,0.24)_0%,rgba(7,10,19,0.58)_34%,rgba(7,10,19,0.92)_100%)]" />
        </div>
        <div className="relative flex min-h-[300px] flex-col justify-end gap-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`${storefrontBadgeClass} text-white/72`}>
              {buildGenreLabel(series, 2) || "Novel"}
            </span>
            <span className="inline-flex min-h-[30px] items-center rounded-full border border-white/10 bg-[rgba(255,255,255,0.05)] px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/72">
              {buildUpdatedLabel(series)}
            </span>
          </div>
          <div>
            <h3 className="max-w-[18ch] font-display text-[2rem] font-semibold leading-[0.94] tracking-[-0.045em] text-white">
              {series.title}
            </h3>
            <p className="mt-3 line-clamp-3 max-w-[32rem] text-[0.95rem] leading-7 text-white/70">
              {description || buildCardHook(series, 156)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex min-h-[34px] items-center rounded-full border border-white/10 bg-[rgba(255,255,255,0.06)] px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/72">
              {buildReadingTimeLabel(series)}
            </span>
            <span className="inline-flex min-h-[34px] items-center rounded-full border border-white/10 bg-[rgba(255,255,255,0.06)] px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/72">
              {buildStatusLabel(series)}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

function NovelUpdateFeed({ items = [] }) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.slice(0, 6).map((series, index) => (
        <Link
          key={`${series.id}-${index}`}
          href={buildSeriesHref(series)}
          onClick={() =>
            trackEvent("story_click", {
              seriesId: series?.id,
              sourceSection: "novels_latest_feed",
              position: index + 1,
            })
          }
          className="group grid grid-cols-[74px_minmax(0,1fr)_auto] items-center gap-3 rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.035)] p-3 transition-all duration-150 hover:-translate-y-0.5 hover:border-fuchsia-200/24 hover:bg-white/[0.07]"
        >
          <div className="aspect-[3/4] overflow-hidden rounded-[18px] border border-white/10">
            <img src={getCoverUrl(series)} alt="" aria-hidden="true" role="presentation" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/46">
              {buildLatestInstallmentLabel(series)}
            </p>
            <h3 className="mt-1 truncate text-[1.04rem] font-semibold text-white">
              {series.title}
            </h3>
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-white/62">
              {buildCardHook(series, 88)}
            </p>
          </div>
          <ArrowRight className="size-4 text-white/52 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-fuchsia-100" />
        </Link>
      ))}
    </div>
  );
}

function NovelShelfCard({
  series,
  badge = "",
  titleOverride = "",
  kicker = "",
  description = "",
  sectionName = "",
  position = 0,
}) {
  if (!series) {
    return null;
  }

  return (
    <Link
      href={buildSeriesHref(series)}
      onClick={() => {
        if (sectionName) {
          trackEvent("story_click", {
            seriesId: series?.id,
            sourceSection: sectionName,
            position,
          });
        }
      }}
      className="group block"
    >
      <article className="grid min-h-[174px] grid-cols-[96px_minmax(0,1fr)] gap-4 rounded-[26px] border border-white/10 bg-[rgba(255,255,255,0.035)] p-3.5 transition-all duration-150 hover:-translate-y-0.5 hover:border-cyan-200/24 hover:bg-white/[0.065]">
        <div className="aspect-[3/4] overflow-hidden rounded-[20px] border border-white/10">
          <img src={getCoverUrl(series)} alt="" aria-hidden="true" role="presentation" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        </div>
        <div className="flex min-w-0 flex-col justify-between py-1">
          <div>
            <span className="inline-flex min-h-[28px] items-center rounded-full border border-white/10 bg-white/[0.055] px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/62">
              {badge || buildGenreLabel(series, 1) || "Novel"}
            </span>
            {kicker ? (
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/42">
                {kicker}
              </p>
            ) : null}
            <h3 className="mt-3 line-clamp-2 text-[1.08rem] font-semibold leading-tight text-white">
              {titleOverride || series.title}
            </h3>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/62">
              {description || buildCardHook(series, 82)}
            </p>
          </div>
          <p className="mt-3 text-sm font-semibold text-fuchsia-100">
            {buildReadingTimeLabel(series)} read
          </p>
        </div>
      </article>
    </Link>
  );
}

function NovelCardGrid({
  items = [],
  badge = "",
  sectionName = "",
  gridClassName = "sm:grid-cols-2 xl:grid-cols-4",
}) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    <div className={`grid gap-3 ${gridClassName}`}>
      {items.map((series, index) => (
        <NovelShelfCard
          key={`${series.id}-${index}`}
          series={series}
          badge={badge}
          sectionName={sectionName}
          position={index + 1}
        />
      ))}
    </div>
  );
}

function ShelfFallbackNotice({ text }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.03)] p-4 text-sm leading-6 text-white/60">
      {text}
    </div>
  );
}

function CompactShelfPlaceholder({
  title,
  description,
  label,
}) {
  return (
    <StorefrontNoCoverCard
      title={title}
      description={description}
      label={label}
      compact
      className="shadow-none"
    />
  );
}

function FinishedStoryCard({ series, position = 0, titleOverride = "", genreOverride = "", hookOverride = "" }) {
  if (!series) {
    return null;
  }

  const href = buildReadHref(series);

  return (
    <Link
      href={href}
      onClick={() =>
        trackEvent("story_click", {
          seriesId: series?.id,
          sourceSection: "novels_finished",
          position,
        })
      }
      className="group block"
    >
      <article className="grid min-h-[218px] gap-4 rounded-[28px] border border-white/10 bg-[rgba(255,255,255,0.035)] p-4 transition-all duration-150 hover:-translate-y-0.5 hover:border-fuchsia-200/24 hover:bg-white/[0.06] sm:grid-cols-[108px_minmax(0,1fr)] sm:items-center">
        <div className="aspect-[3/4] overflow-hidden rounded-[22px] border border-white/10">
          <img
            src={getCoverUrl(series)}
            alt=""
            aria-hidden="true"
            role="presentation"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`${storefrontBadgeClass} px-3 py-1.5 text-white/70`}>
              {genreOverride || buildGenreLabel(series, 2) || "Novel"}
            </span>
            <span className={`${storefrontBadgeClass} px-3 py-1.5 text-fuchsia-100`}>
              {FINISHED_STORY_STATUS_LABEL}
            </span>
          </div>
          <h3 className="mt-3 text-[1.22rem] font-semibold tracking-[-0.03em] text-white">
            {titleOverride || series.title}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/62">
            {hookOverride || buildCardHook(series, 112)}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-white/74">
              {buildReadingTimeLabel(series)} read
            </span>
            <span className="text-sm font-semibold text-white/74">
              Full run tonight
            </span>
          </div>
          <div className={`mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-fuchsia-200/24 bg-fuchsia-300/[0.12] px-4 text-sm font-semibold text-fuchsia-50 transition-colors duration-150 group-hover:border-fuchsia-200/34 group-hover:bg-fuchsia-300/[0.16]`}>
            {FINISHED_STORY_CTA_LABEL}
            <ArrowRight className="size-4" />
          </div>
        </div>
      </article>
    </Link>
  );
}

function FeaturedFinishedStoryFallback() {
  return (
    <article className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(145deg,rgba(24,17,35,0.98)_0%,rgba(10,11,20,0.98)_56%,rgba(21,15,31,0.98)_100%)] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.32)] sm:p-6">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,214,163,0.18),transparent_24%),radial-gradient(circle_at_82%_16%,rgba(255,79,154,0.16),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))]"
      />
      <div className="relative grid gap-5 sm:grid-cols-[124px_minmax(0,1fr)] sm:items-center">
        <StorefrontNoCoverCard
          title={FINISHED_STORY_FALLBACK.title}
          description={FINISHED_STORY_FALLBACK.hook}
          label="Featured completed novel"
          compact
          className="min-h-[192px] rounded-[24px] border-white/12 shadow-none"
        />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`${storefrontBadgeClass} px-3 py-1.5 text-white/70`}>
              {FINISHED_STORY_FALLBACK.genre}
            </span>
            <span className={`${storefrontBadgeClass} px-3 py-1.5 text-fuchsia-100`}>
              {FINISHED_STORY_STATUS_LABEL}
            </span>
          </div>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/48">
            Featured Completed Novel
          </p>
          <h3 className="mt-2 font-display text-[2rem] font-semibold leading-[0.96] tracking-[-0.05em] text-white">
            {FINISHED_STORY_FALLBACK.title}
          </h3>
          <p className="mt-3 max-w-[34rem] text-sm leading-7 text-white/66">
            {FINISHED_STORY_FALLBACK.hook}
          </p>
          <div
            className={`mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-fuchsia-200/24 bg-fuchsia-300/[0.12] px-4 text-sm font-semibold text-fuchsia-50`}
          >
            {FINISHED_STORY_CTA_LABEL}
            <ArrowRight className="size-4" />
          </div>
        </div>
      </div>
    </article>
  );
}

function NightstandPicks({ items = [] }) {
  if (!Array.isArray(items) || items.length === 0) {
    return (
      <section className="space-y-4">
        <SectionHeading
          eyebrow="Nightstand Picks"
          title="Readers Keep Opening"
          description="A smaller reading signal board, kept tight on purpose."
          tone="channel"
        />
        <ShelfFallbackNotice text="A tight set of late-night picks can still feel definitive when the shelf stays selective." />
      </section>
    );
  }

  if (items.length <= 2) {
    return (
      <section className="space-y-4">
        <SectionHeading
          eyebrow="Nightstand Picks"
          title="Readers Keep Opening"
          description="Soft signals from the stories readers come back to after dark."
          tone="channel"
        />
        <CuratedEditorialModule
          items={items}
          sectionName="novels_nightstand_picks"
          actionLabel="Open Story"
          variant="Novel"
        />
      </section>
    );
  }

  return (
    <section className={`${storefrontInfoCardClass} overflow-hidden p-4 sm:p-5`}>
      <SectionHeading
        eyebrow="Nightstand Picks"
        title="Readers Keep Opening"
        description="Soft signals from the stories readers come back to after dark."
        tone="channel"
      />
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {items.slice(0, 4).map((series, index) => (
          <Link
            key={`${series.id}-${index}`}
            href={buildSeriesHref(series)}
            className="group grid grid-cols-[54px_minmax(0,1fr)_auto] items-center gap-3 rounded-[22px] border border-white/10 bg-white/[0.035] p-3 transition-all duration-150 hover:border-fuchsia-200/22 hover:bg-white/[0.07]"
          >
            <div className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white/76">
              <Star className="size-4" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-white">
                {series.title}
              </h3>
              <p className="truncate text-sm text-white/58">
                {[buildGenreLabel(series, 2), buildStatusLabel(series)]
                  .filter(Boolean)
                  .join(" / ")}
              </p>
            </div>
            <ArrowRight className="size-4 text-white/48 group-hover:text-fuchsia-100" />
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function NovelsLandingPage({
  initialSeries = [],
  initialReady = false,
  initialIncludeAdult = false,
}) {
  const { seriesList, loading } = useCatalogFeed({
    initialSeries,
    initialReady,
    initialIncludeAdult,
    type: "novel",
  });
  const { isSignedIn } = useAuthStore();
  const { bySeriesId, loadProgress } = useProgressStore();

  useEffect(() => {
    trackEvent("home_view", {
      contentType: "novel",
      sourceSection: "novels_page",
    });
  }, []);

  useEffect(() => {
    if (isSignedIn) {
      void loadProgress();
    }
  }, [isSignedIn, loadProgress]);

  const model = useMemo(() => {
    const featuredBase =
      pickPrioritySeries(seriesList, FEATURED_NOVEL_TITLES, 1)[0] ||
      pickFeaturedSeries(seriesList);
    const featured = withCoverArtwork(featuredBase);
    const featuredId = getSeriesId(featuredBase);
    const featuredIds = new Set(featuredId ? [featuredId] : []);
    const novelShelfPool = excludeSeries(seriesList, featuredIds);
    const novelShelfBase = pickPrioritySeries(
      novelShelfPool,
      NOVEL_SHELF_PRIORITY_TITLES,
      2,
    );
    const novelShelf = novelShelfBase.map((series) => withCoverArtwork(series));
    const novelShelfIds = new Set(
      novelShelfBase.map((series) => getSeriesId(series)),
    );
    const latestPool = excludeSeries(
      buildUpdatedRail(seriesList, 12),
      new Set([...featuredIds, ...novelShelfIds]),
    );
    const latest = latestPool.slice(0, 6).map((series) => withCoverArtwork(series));
    const latestIds = new Set(latest.map((series) => getSeriesId(series)));
    const shelfExcludedIds = new Set([...featuredIds, ...latestIds, ...novelShelfIds]);
    const shelfSmallSeed = [
      ...excludeSeries(buildUpdatedRail(seriesList, 16), shelfExcludedIds),
      ...excludeSeries(buildShortReadsRail(seriesList, 12), shelfExcludedIds),
      ...excludeSeries(buildTopTen(seriesList), shelfExcludedIds),
    ].filter(Boolean);
    const shelfSmallUnique = shelfSmallSeed.filter((series, index, list) => {
      const seriesId = getSeriesId(series);
      return seriesId && list.findIndex((item) => getSeriesId(item) === seriesId) === index;
    });
    const shelfSmall = shelfSmallUnique
      .slice(0, 4)
      .map((series) => withCoverArtwork(series));
    const continueItems = buildContinueReadingItems(seriesList, bySeriesId).slice(0, 4);
    const continueIds = new Set(continueItems.map((series) => getSeriesId(series)));
    const shortReadPool = excludeSeries(
      buildShortReadsRail(seriesList, 10),
      new Set([...featuredIds, ...continueIds, ...latestIds, ...novelShelfIds]),
    );
    const shortReads = shortReadPool.slice(0, 4).map((series) => withCoverArtwork(series));
    const shortReadIds = new Set(shortReads.map((series) => getSeriesId(series)));
    const completed = excludeSeries(
      buildCompletedRail(seriesList, 8),
      new Set([
        ...featuredIds,
        ...continueIds,
        ...latestIds,
        ...shortReadIds,
      ]),
    )
      .slice(0, 4)
      .map((series) => withCoverArtwork(series));
    const finishedStories = completed.slice(0, 3);
    const rankings = excludeSeries(
      buildTopTen(seriesList),
      new Set([...featuredIds, ...latestIds, ...novelShelfIds, ...shortReadIds]),
    )
      .slice(0, 4)
      .map((series) => withCoverArtwork(series));

    return {
      featured,
      featuredHook:
        NOVEL_FEATURED_HOOKS[String(featuredBase?.title || "").trim()] || "",
      latest,
      novelShelf,
      shelfSmall,
      continueItems,
      shortReads,
      completed,
      finishedStories,
      rankings,
    };
  }, [bySeriesId, seriesList]);

  const showContinueReading = isSignedIn && model.continueItems.length > 0;
  const isSmallLibrary = seriesList.length <= 2;
  const showLatestSection = model.latest.length > 0 || !isSmallLibrary;
  const showShortReadsSection = model.shortReads.length > 0 || !isSmallLibrary;
  const showNightstandSection = model.rankings.length > 0 || !isSmallLibrary;

  return (
    <StorefrontPage
      accentClass="from-[rgba(103,232,249,0.14)] via-[rgba(255,255,255,0.035)] to-[rgba(255,79,154,0.1)]"
      contentClassName="space-y-9 lg:space-y-11"
    >
      {model.featured ? (
        <NovelHero
          featured={model.featured}
          hook={model.featuredHook}
          stackItems={[...model.novelShelf, ...model.latest].slice(0, 3)}
        />
      ) : loading ? (
        <StorefrontSectionLoadingGrid count={2} />
      ) : (
        <EmptyShelf
          title="A shorter shelf, chosen on purpose."
          description="Open Search or Rankings to move from tonight's lead novel into another story without losing the quieter pace."
          actionHref="/search?type=novel"
        />
      )}

      <NovelMoodRail />

      {showLatestSection ? (
        <section className="space-y-4">
          <SectionHeading
            eyebrow="Fresh serials"
            title="Latest Chapters"
            description="Compact chapter drops for quick late-night catch-up."
            tone="channel"
            action={
              <Link
                href="/search?type=novel&sort=latest"
                className={`inline-flex min-h-[44px] items-center gap-2 px-4 text-sm font-medium text-white/78 ${storefrontSecondaryButtonClass}`}
              >
                <Sparkles className="size-4" />
                Fresh updates
              </Link>
            }
          />
          {model.latest.length > 0 ? (
            <NovelUpdateFeed items={model.latest} />
          ) : (
            <ShelfFallbackNotice text="Tonight's shelf is leaning on finished pacing over fresh-drop noise." />
          )}
        </section>
      ) : null}

      <section className="space-y-4">
        <SectionHeading
          eyebrow="Editorial shelf"
          title="Novel Shelf"
          description="A quieter shelf for the next story you open tonight."
          tone="channel"
        />
        <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045)_0%,rgba(255,255,255,0.02)_100%)] p-4 shadow-[var(--gush-shadow-panel)] sm:p-5">
          {model.novelShelf.length > 0 ? (
            <div
              className={`grid gap-4 ${
                model.novelShelf.length === 1 ? "grid-cols-1" : "lg:grid-cols-2"
              }`}
            >
              {model.novelShelf.slice(0, 2).map((series, index) => (
                <NovelEditorialCard
                  key={series.id}
                  series={series}
                  description={
                    CURATED_SHELF_COPY[String(series?.title || "").trim()] ||
                    NOVEL_EDITORIAL_COPY[String(series?.title || "").trim()] ||
                    buildCardHook(series, 156)
                  }
                  sectionName="novels_editorial_shelf"
                  position={index + 1}
                />
              ))}
            </div>
          ) : null}
          {model.novelShelf.length > 0 && model.shelfSmall.length > 0 ? (
            <div
              aria-hidden="true"
              className="my-4 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent)]"
            />
          ) : null}
          {model.shelfSmall.length > 0 ? (
            <NovelCardGrid
              items={model.shelfSmall}
              badge="Shelf Pick"
              sectionName="novels_shelf_small"
            />
          ) : null}
          {model.novelShelf.length === 0 && model.shelfSmall.length === 0 ? (
            <CompactShelfPlaceholder
              title="A smaller shelf can still feel intentional."
              description="One or two strong editorial picks read better here than a padded row of filler cards."
              label="Curated shelf"
            />
          ) : null}
        </div>
      </section>

      {showContinueReading ? (
        <section className="space-y-4">
          <SectionHeading
            eyebrow="Keep Reading"
            title="Pick up tonight"
            description="Resume the stories already on your shelf."
            tone="channel"
            action={
              <Link
                href="/library"
                className={`inline-flex min-h-[44px] items-center gap-2 px-4 text-sm font-medium text-white/78 ${storefrontSecondaryButtonClass}`}
              >
                <Library className="size-4" />
                Open Library
              </Link>
            }
          />
          <NovelCardGrid
            items={model.continueItems}
            badge="Resume"
            sectionName="novels_continue_reading"
          />
        </section>
      ) : null}

      {showShortReadsSection ? (
        <section className="space-y-4">
          <SectionHeading
            eyebrow="Quick reads"
            title="Short Reads for Tonight"
            description="Short enough to start now, strong enough to remember tomorrow."
            tone="channel"
          />
          {model.shortReads.length > 0 ? (
            model.shortReads.length <= 2 ? (
              <CuratedEditorialModule
                items={model.shortReads}
                sectionName="novels_short_reads"
                actionLabel="Start Tonight"
                variant="Novel"
              />
            ) : (
              <NovelCardGrid
                items={model.shortReads}
                badge="Short Read"
                sectionName="novels_short_reads"
              />
            )
          ) : (
            <ShelfFallbackNotice text="The shelf is staying focused on longer pulls tonight, not quick samplers." />
          )}
        </section>
      ) : null}

      <section className="space-y-4">
        <SectionHeading
          eyebrow="Complete arcs"
          title="Finished Stories"
          description="No waiting, no cliffhanger gap — start and finish the full run tonight."
          tone="channel"
        />
        {model.finishedStories.length > 0 ? (
          <div
            className={`grid gap-3 ${
              model.finishedStories.length >= 3 ? "lg:grid-cols-3" : "lg:grid-cols-2"
            }`}
          >
            {model.finishedStories.slice(0, 3).map((series, index) => (
              <FinishedStoryCard
                key={`${series.id}-${index}`}
                series={series}
                position={index + 1}
              />
            ))}
          </div>
        ) : (
          <FeaturedFinishedStoryFallback />
        )}
      </section>

      {showNightstandSection ? <NightstandPicks items={model.rankings} /> : null}
    </StorefrontPage>
  );
}


