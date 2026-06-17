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
  EmptyShelf,
  SectionHeading,
  StorefrontPage,
  useCatalogFeed,
} from "./StorefrontScaffold";
import {
  storefrontBadgeClass,
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
    <section aria-label="Novel moods" className="-mx-4 overflow-x-auto px-4 pb-1 no-scrollbar sm:mx-0 sm:px-0">
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

      <div className="relative grid gap-7 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(300px,390px)] lg:items-center lg:p-8">
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
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href={readHref} className={`${storefrontPrimaryButtonClass} min-h-[50px] px-6 text-[#190d18]`}>
              Start Reading
              <ArrowRight className="size-4" />
            </Link>
            <Link href={buildSeriesHref(featured)} className={`${storefrontSecondaryButtonClass} min-h-[50px] px-6 text-white/84`}>
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

function NovelShelfCard({ series, badge = "", sectionName = "", position = 0 }) {
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
            <h3 className="mt-3 line-clamp-2 text-[1.08rem] font-semibold leading-tight text-white">
              {series.title}
            </h3>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/62">
              {buildCardHook(series, 82)}
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

function NovelCardGrid({ items = [], badge = "", sectionName = "" }) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((series, index) => (
        <NovelShelfCard
          key={series.id}
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

function NightstandPicks({ items = [] }) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
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
    const novelShelfBase = pickPrioritySeries(
      seriesList,
      NOVEL_SHELF_PRIORITY_TITLES,
      2,
    );
    const novelShelf = novelShelfBase.map((series) => withCoverArtwork(series));
    const novelShelfIds = new Set(
      novelShelfBase.map((series) => getSeriesId(series)),
    );
    const latestPool = excludeSeries(buildUpdatedRail(seriesList, 12), featuredIds);
    const latest = latestPool.slice(0, 6).map((series) => withCoverArtwork(series));
    const latestIds = new Set(latest.map((series) => getSeriesId(series)));
    const shelfSmall = excludeSeries(
      buildUpdatedRail(seriesList, 16),
      new Set([...featuredIds, ...novelShelfIds]),
    )
      .slice(0, 4)
      .map((series) => withCoverArtwork(series));
    const continueItems = buildContinueReadingItems(seriesList, bySeriesId).slice(0, 4);
    const continueIds = new Set(continueItems.map((series) => getSeriesId(series)));
    const shortReadPool = excludeSeries(
      buildShortReadsRail(seriesList, 10),
      new Set([...featuredIds, ...continueIds, ...latestIds]),
    );
    const fallbackShortReadPool = excludeSeries(
      buildShortReadsRail(seriesList, 10),
      new Set([...featuredIds, ...continueIds]),
    );
    const shortReads = (shortReadPool.length >= 2 ? shortReadPool : fallbackShortReadPool)
      .slice(0, 4)
      .map((series) => withCoverArtwork(series));
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
    const finishedStories = (completed.length > 0
      ? completed
      : excludeSeries(
          buildTopTen(seriesList),
          new Set([...featuredIds, ...shortReadIds]),
        )
          .slice(0, 4)
          .map((series) => withCoverArtwork(series)));
    const rankings = excludeSeries(buildTopTen(seriesList), featuredIds)
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
      ) : loading ? null : (
        <EmptyShelf
          title="Fresh novel picks are being queued"
          description="Open Search or Rankings for ready-to-read stories in this mode."
          actionHref="/search?type=novel"
        />
      )}

      <NovelMoodRail />

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
        <NovelUpdateFeed items={model.latest} />
      </section>

      {model.novelShelf.length > 0 || model.shelfSmall.length > 0 ? (
        <section className="space-y-4">
          <SectionHeading
            eyebrow="Editorial shelf"
            title="Novel Shelf"
            description="Two big reads up front, then a lighter shelf for the next tap."
            tone="channel"
          />
          {model.novelShelf.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {model.novelShelf.slice(0, 2).map((series, index) => (
                <NovelEditorialCard
                  key={series.id}
                  series={series}
                  description={
                    NOVEL_EDITORIAL_COPY[String(series?.title || "").trim()] ||
                    buildCardHook(series, 156)
                  }
                  sectionName="novels_editorial_shelf"
                  position={index + 1}
                />
              ))}
            </div>
          ) : null}
          <NovelCardGrid
            items={model.shelfSmall}
            badge="Shelf Pick"
            sectionName="novels_shelf_small"
          />
        </section>
      ) : null}

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

      {model.shortReads.length > 0 ? (
        <section className="space-y-4">
          <SectionHeading
            eyebrow="Quick reads"
            title="Short Reads for Tonight"
            description="Short enough to start now, strong enough to remember tomorrow."
            tone="channel"
          />
          <NovelCardGrid
            items={model.shortReads}
            badge="Short Read"
            sectionName="novels_short_reads"
          />
        </section>
      ) : null}

      <section className="space-y-4">
        <SectionHeading
          eyebrow="Complete arcs"
          title="Finished Stories"
          description={
            model.completed.length > 0
              ? "Full runs when waiting for the next update is not the mood."
              : "Story picks with a clean next step while completed runs rotate in."
          }
          tone="channel"
        />
        {model.finishedStories.length > 0 ? (
          <NovelCardGrid
            items={model.finishedStories}
            badge={model.completed.length > 0 ? "Finished" : "Story Pick"}
            sectionName="novels_finished"
          />
        ) : (
          <ShelfFallbackNotice text="Completed shelves rotate in as longer runs update. Open a fresh story tonight and this lane will keep changing." />
        )}
      </section>

      <NightstandPicks items={model.rankings} />
    </StorefrontPage>
  );
}
