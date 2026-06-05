"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, Library, Sparkles } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { useProgressStore } from "../../store/useProgressStore";
import { resolveDisplayImageUrl } from "../../lib/fallbackImage";
import { trackEvent } from "../../lib/trackEvent";
import { withHomeArtwork } from "../../lib/homeArtwork";
import {
  CoverCard,
  EmptyShelf,
  RankList,
  SectionHeading,
  ShelfScroller,
  StorefrontPage,
  StoryHero,
  UpdateList,
  useCatalogFeed,
} from "./StorefrontScaffold";
import {
  storefrontBadgeClass,
  storefrontSecondaryButtonClass,
} from "../common/StorefrontPagePrimitives";
import {
  buildCardHook,
  buildCompletedRail,
  buildContinueReadingItems,
  buildGenreLabel,
  buildLatestInstallmentLabel,
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

function NovelEditorialCard({
  series,
  description = "",
  sectionName = "",
  position = 0,
}) {
  if (!series) {
    return null;
  }

  const href = buildSeriesHref(series);
  const coverUrl = resolveDisplayImageUrl(series?.coverUrl, {
    kind: "cover",
    adult: series?.adult || series?.isAdult,
  });

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
      <article className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[rgba(255,255,255,0.04)] shadow-[var(--gush-shadow-card)] transition-all duration-200 group-hover:-translate-y-1.5 group-hover:border-[rgba(236,72,153,0.28)] group-hover:shadow-[0_28px_90px_rgba(0,0,0,0.36)]">
        <div className="absolute inset-0" aria-hidden="true">
          <img
            src={coverUrl}
            alt=""
            aria-hidden="true"
            role="presentation"
            className="h-full w-full object-cover opacity-58 transition-transform duration-500 group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(56,189,248,0.16),transparent_18%),radial-gradient(circle_at_82%_18%,rgba(236,72,153,0.18),transparent_20%),linear-gradient(180deg,rgba(7,10,19,0.2)_0%,rgba(7,10,19,0.54)_24%,rgba(7,10,19,0.9)_100%)]" />
        </div>
        <div className="relative grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_116px] lg:items-end">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`${storefrontBadgeClass} text-white/72`}>
                {buildGenreLabel(series, 2) || "Novel"}
              </span>
              <span className="inline-flex min-h-[30px] items-center rounded-full border border-white/10 bg-[rgba(255,255,255,0.05)] px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/72">
                {buildUpdatedLabel(series)}
              </span>
            </div>
            <div>
              <h3 className="max-w-[18ch] font-display text-[2rem] font-semibold leading-[0.94] tracking-[-0.05em] text-white">
                {series.title}
              </h3>
              <p className="mt-3 max-w-[32rem] text-[0.95rem] leading-7 text-white/68">
                {description || buildCardHook(series, 156)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex min-h-[34px] items-center rounded-full border border-white/10 bg-[rgba(255,255,255,0.05)] px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/72">
                {buildReadingTimeLabel(series)}
              </span>
              <span className="inline-flex min-h-[34px] items-center rounded-full border border-white/10 bg-[rgba(255,255,255,0.05)] px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/72">
                {buildStatusLabel(series)}
              </span>
            </div>
            <div className="inline-flex min-h-[46px] items-center gap-2 rounded-full bg-[linear-gradient(135deg,#ec4899_0%,#7c3aed_100%)] px-5 text-sm font-semibold text-[color:var(--gush-button-text-dark)] shadow-[var(--gush-shadow-button)]">
              Open Story
              <ArrowRight className="size-4" />
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="mx-auto aspect-[3/4] w-full max-w-[116px] overflow-hidden rounded-[20px] border border-white/10 shadow-[0_22px_54px_rgba(0,0,0,0.36)]">
              <img
                src={coverUrl}
                alt=""
                aria-hidden="true"
                role="presentation"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </article>
    </Link>
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
    const novelShelfIds = new Set(novelShelfBase.map((series) => getSeriesId(series)));
    const latestPool = excludeSeries(buildUpdatedRail(seriesList, 12), featuredIds);
    const latestWithoutShelf = excludeSeries(latestPool, novelShelfIds);
    const latest = (latestWithoutShelf.length >= 2 ? latestWithoutShelf : latestPool)
      .slice(0, 4)
      .map((series) => withCoverArtwork(series));
    const latestIds = new Set(latest.map((series) => getSeriesId(series)));
    const continueItems = buildContinueReadingItems(seriesList, bySeriesId).slice(0, 6);
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
    const rankings = excludeSeries(buildTopTen(seriesList), featuredIds).slice(0, 5);

    return {
      featured,
      featuredHook:
        NOVEL_FEATURED_HOOKS[String(featuredBase?.title || "").trim()] || "",
      latest,
      novelShelf,
      continueItems,
      shortReads,
      completed,
      rankings,
    };
  }, [bySeriesId, seriesList]);

  const showContinueReading = isSignedIn && model.continueItems.length > 0;

  return (
    <StorefrontPage
      accentClass="from-[rgba(103,232,249,0.16)] via-[rgba(255,255,255,0.04)] to-[rgba(255,79,154,0.08)]"
      contentClassName="space-y-10 lg:space-y-12"
    >
      {model.featured ? (
        <StoryHero
          series={model.featured}
          eyebrow="Featured Novel"
          hook={model.featuredHook}
          primaryLabel="Start Reading"
          secondaryLabel="View Series"
          statsVariant="chips"
          theme="novel"
          featureLabel="Late-night atmosphere, clean hooks, and one more chapter energy"
          chips={(Array.isArray(model.featured?.genres) ? model.featured.genres : []).slice(
            0,
            3,
          )}
          stats={[
            {
              label: "Reading Time",
              value: buildReadingTimeLabel(model.featured),
            },
            {
              label: "Status",
              value: buildStatusLabel(model.featured),
            },
            {
              label: "Hook",
              value: buildGenreLabel(model.featured, 2) || "Novel serial",
            },
          ]}
        />
      ) : loading ? null : (
        <EmptyShelf
          title="No novels here yet"
          description="Novel picks will show up here as soon as they go live in this mode."
          actionHref="/search?type=novel"
        />
      )}

      <section className="space-y-4">
        <SectionHeading
          eyebrow="Latest Chapters"
          title="Latest Chapters"
          description="Updated today, atmosphere first, and clean serial pull for late-night reading."
          tone="channel"
          action={
            <Link
              href="/search?type=novel&sort=latest"
              className={`inline-flex min-h-[44px] items-center gap-2 px-4 text-sm font-medium text-white/78 ${storefrontSecondaryButtonClass}`}
            >
              <Sparkles className="size-4" />
              Latest drops
            </Link>
          }
        />
        <UpdateList
          items={model.latest}
          variant="novel"
          sectionName="novels_latest"
          visual="channel"
        />
      </section>

      {model.novelShelf.length > 0 ? (
        <section className="space-y-4">
          <SectionHeading
            eyebrow="Editorial Pick"
            title="Novel Shelf"
            description="Space, mystery, and late-night reads."
            tone="channel"
          />
          <div className="grid gap-4 lg:grid-cols-2">
            {model.novelShelf.map((series, index) => (
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
        </section>
      ) : null}

      {model.shortReads.length > 0 ? (
        <section className="space-y-4">
          <SectionHeading
            eyebrow="Short Reads"
            title="Short Reads"
            description="Quick-entry reads with real mood, clean pacing, and a strong stop point."
            tone="channel"
          />
          <ShelfScroller>
            {model.shortReads.map((series, index) => (
              <CoverCard
                key={series.id}
                series={series}
                href={`/series/${series.id}`}
                variant="novel"
                visual="channel"
                badge="Short Read"
                actionLabel={`${buildReadingTimeLabel(series)} read`}
                onClick={() =>
                  trackEvent("story_click", {
                    seriesId: series?.id,
                    sourceSection: "novels_short_reads",
                    position: index + 1,
                  })
                }
              />
            ))}
          </ShelfScroller>
        </section>
      ) : null}

      {showContinueReading ? (
        <section className="space-y-4">
          <SectionHeading
            eyebrow="Continue Reading"
            title="Continue Reading"
            description="Pick up exactly where you left the mood."
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
          <ShelfScroller>
            {model.continueItems.map((series, index) => (
              <CoverCard
                key={series.id}
                series={series}
                href={`/read/${series.id}/${series.resumeEpisodeId}`}
                variant="novel"
                visual="channel"
                badge="Resume"
                actionLabel="Continue Reading"
                progressPercent={series.progressPercent}
                onClick={() =>
                  trackEvent("story_click", {
                    seriesId: series?.id,
                    sourceSection: "novels_continue_reading",
                    position: index + 1,
                  })
                }
              />
            ))}
          </ShelfScroller>
        </section>
      ) : null}

      {model.completed.length > 0 ? (
        <section className="space-y-4">
          <SectionHeading
            eyebrow="Completed Novels"
            title="Completed Novels"
            description="Finished runs when you want a full story arc without waiting on the next upload."
            tone="channel"
          />
          <ShelfScroller>
            {model.completed.map((series, index) => (
              <CoverCard
                key={series.id}
                series={series}
                href={`/series/${series.id}`}
                variant="novel"
                visual="channel"
                badge="Completed"
                actionLabel="Read Full Series"
                onClick={() =>
                  trackEvent("story_click", {
                    seriesId: series?.id,
                    sourceSection: "novels_completed",
                    position: index + 1,
                  })
                }
              />
            ))}
          </ShelfScroller>
        </section>
      ) : null}

      {model.rankings.length > 0 ? (
        <RankList
          items={model.rankings}
          label="Reader Rankings"
          eyebrow="Nightstand Leaders"
          description="The novel picks readers keep opening when one more chapter sounds harmless."
          visual="channel"
        />
      ) : null}

      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[rgba(255,255,255,0.04)] shadow-[var(--gush-shadow-card)]">
        <div className="absolute inset-0" aria-hidden="true">
          <div className="h-full w-full bg-[radial-gradient(circle_at_18%_18%,rgba(56,189,248,0.14),transparent_18%),radial-gradient(circle_at_82%_18%,rgba(236,72,153,0.18),transparent_20%),linear-gradient(180deg,rgba(8,12,21,0.96)_0%,rgba(7,10,19,0.98)_100%)]" />
        </div>
        <div className="relative grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="space-y-3">
            <SectionHeading
              eyebrow="Editorial Outlook"
              title="Coming Next"
              description="New routes and longer reads are being prepared for the shelf."
              tone="channel"
            />
            <p className="max-w-[44rem] text-sm leading-7 text-white/68">
              More late-night mysteries, sci-fi routes, and completed novel runs are on the way.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {["Late-night mystery", "Sci-fi routes", "Completed runs"].map((item) => (
                <span
                  key={item}
                  className="inline-flex min-h-[34px] items-center rounded-full border border-white/10 bg-[rgba(255,255,255,0.05)] px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/74"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
          <Link
            href="/search?type=novel"
            className={`inline-flex min-h-[46px] items-center gap-2 px-5 text-sm font-medium text-white/80 ${storefrontSecondaryButtonClass}`}
          >
            <BookOpen className="size-4" />
            Explore Novels
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </section>
    </StorefrontPage>
  );
}
