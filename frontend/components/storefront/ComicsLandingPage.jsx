"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Sparkles } from "lucide-react";
import { trackEvent } from "../../lib/trackEvent";
import { withHomeArtwork } from "../../lib/homeArtwork";
import { siteMaterialImages } from "../../lib/siteMaterialAssets";
import {
  CuratedEditorialModule,
  CoverCard,
  EmptyShelf,
  GenreShelfSection,
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
  StorefrontNoCoverCard,
  storefrontSecondaryButtonClass,
} from "../common/StorefrontPagePrimitives";
import {
  buildCompletedRail,
  buildGenreLabel,
  buildGenreShelves,
  buildLatestInstallmentLabel,
  buildPopularRail,
  buildStatusLabel,
  buildTopTen,
  buildUpdatedRail,
  pickFeaturedSeries,
} from "./landingUtils";

const FEATURED_COMIC_TITLES = ["Crimson Tide"];
const FEATURED_COMIC_HOOKS = {
  "Crimson Tide":
    "A blood-red moon, a ruined harbor, and a hunter already too deep to walk away.",
};
const COMIC_GENRE_PRIORITY = ["Action", "Romance", "Fantasy"];
const POPULAR_COMIC_PRIORITY_TITLES = [
  "Cherry Blossom High",
  "Wild Hearts",
  "Starfall Academy",
  "Apex Predator",
  "The Quiet Storm",
  "Dragon's Oath",
];

function normalizeValue(value) {
  return String(value || "").trim().toLowerCase();
}

function getSeriesId(series) {
  return String(series?.id || "").trim();
}

function pickPrioritySeries(seriesList = [], titles = []) {
  const safeList = Array.isArray(seriesList) ? seriesList : [];
  for (const title of titles) {
    const match = safeList.find(
      (series) => normalizeValue(series?.title) === normalizeValue(title),
    );
    if (match) {
      return match;
    }
  }
  return null;
}

function excludeSeries(seriesList = [], excludedIds = new Set()) {
  const safeIds = excludedIds instanceof Set ? excludedIds : new Set();
  return (Array.isArray(seriesList) ? seriesList : []).filter((series) => {
    const seriesId = getSeriesId(series);
    return seriesId && !safeIds.has(seriesId);
  });
}

function pickPrioritySeriesList(seriesList = [], titles = [], limit = titles.length) {
  const safeList = Array.isArray(seriesList) ? seriesList : [];
  const selected = [];
  const selectedIds = new Set();

  titles.forEach((title) => {
    const match = safeList.find(
      (series) => normalizeValue(series?.title) === normalizeValue(title),
    );
    const seriesId = getSeriesId(match);
    if (!match || !seriesId || selectedIds.has(seriesId)) {
      return;
    }
    selectedIds.add(seriesId);
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
    if (!seriesId || selectedIds.has(seriesId)) {
      return;
    }
    selectedIds.add(seriesId);
    selected.push(series);
  });

  return selected.slice(0, limit);
}

function FeaturedCompletedRunCard({ series, index = 0 }) {
  if (!series) {
    return null;
  }

  const coverUrl = series?.coverUrl || "";
  const hasCover = Boolean(String(coverUrl).trim());

  return (
    <Link
      href={`/series/${series.id}`}
      onClick={() =>
        trackEvent("story_click", {
          seriesId: series?.id,
          sourceSection: "comics_completed_featured",
          position: index + 1,
        })
      }
      className="group block"
    >
      <article className="relative overflow-hidden rounded-[32px] border border-amber-200/18 bg-[linear-gradient(135deg,rgba(27,15,20,0.98)_0%,rgba(10,12,21,0.98)_52%,rgba(16,24,28,0.98)_100%)] p-4 shadow-[0_30px_96px_rgba(0,0,0,0.38)] transition-all duration-200 hover:-translate-y-1 hover:border-amber-200/30 sm:p-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(251,191,36,0.16),transparent_24%),radial-gradient(circle_at_82%_20%,rgba(103,232,249,0.12),transparent_28%)]" />
        <div className="relative grid gap-5 lg:grid-cols-[minmax(210px,260px)_minmax(0,1fr)] lg:items-end">
          <div className="relative">
            <div className="absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-amber-200/24 bg-amber-200/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-100">
              <CheckCircle2 className="size-3.5" />
              Completed
            </div>
            <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[rgba(255,255,255,0.04)] shadow-[0_24px_72px_rgba(0,0,0,0.34)]">
              {hasCover ? (
                <div className="aspect-[3/4] overflow-hidden">
                  <img
                    src={coverUrl}
                    alt=""
                    aria-hidden="true"
                    role="presentation"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </div>
              ) : (
                <StorefrontNoCoverCard
                  title={series.title}
                  description="Finished run ready to open from chapter one."
                  label="Completed run"
                  className="min-h-[312px] rounded-[inherit] border-0 shadow-none"
                />
              )}
              <div className="border-t border-white/10 bg-[rgba(8,10,18,0.88)] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/42">
                  Featured run
                </p>
                <p className="mt-2 text-[1.02rem] font-semibold text-white">
                  {series.title}
                </p>
              </div>
            </div>
          </div>
          <div className="min-w-0 pb-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/46">
              Featured completed run
            </p>
            <h3 className="mt-3 max-w-[14ch] font-display text-[2.7rem] font-semibold leading-[0.92] tracking-[-0.065em] text-white sm:text-[3.6rem]">
              {series.title}
            </h3>
            <p className="mt-4 max-w-[34rem] text-[0.96rem] leading-7 text-white/66">
              {buildLatestInstallmentLabel(series)} / {buildStatusLabel(series)} / Read the full arc tonight.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className={`${storefrontBadgeClass} px-3 py-1.5 text-white/70`}>
                {buildGenreLabel(series, 2) || "Comic"}
              </span>
              <span className={`${storefrontBadgeClass} px-3 py-1.5 text-white/70`}>
                All chapters open
              </span>
            </div>
            <div className="mt-6 inline-flex min-h-[46px] items-center gap-2 rounded-full border border-amber-200/24 bg-amber-200/12 px-5 text-sm font-semibold text-amber-50 transition-all duration-150 group-hover:border-amber-200/34 group-hover:bg-amber-200/16">
              Read Full Series
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

export default function ComicsLandingPage({
  initialSeries = [],
  initialReady = false,
  initialIncludeAdult = false,
}) {
  const { seriesList, loading } = useCatalogFeed({
    initialSeries,
    initialReady,
    initialIncludeAdult,
    type: "comic",
  });

  useEffect(() => {
    trackEvent("home_view", {
      contentType: "comic",
      sourceSection: "comics_page",
    });
  }, []);

  const model = useMemo(() => {
    const featuredBase =
      pickPrioritySeries(seriesList, FEATURED_COMIC_TITLES) ||
      pickFeaturedSeries(seriesList);
    const featured = featuredBase ? withHomeArtwork(featuredBase, "cover") : null;
    const featuredId = getSeriesId(featuredBase);
    const excludedIds = new Set(featuredId ? [featuredId] : []);
    const updatePool = excludeSeries(buildUpdatedRail(seriesList, 18), excludedIds);
    const popularPool = excludeSeries(buildPopularRail(seriesList, 18), excludedIds);
    const popular = pickPrioritySeriesList(
      popularPool,
      POPULAR_COMIC_PRIORITY_TITLES,
      6,
    );
    const completedPool = excludeSeries(
      buildCompletedRail(seriesList, 12),
      excludedIds,
    );
    const allGenreShelves = buildGenreShelves(
      excludeSeries(seriesList, excludedIds),
      {
        maxGenres: 12,
        perGenre: 4,
      },
    );
    const genreShelves = COMIC_GENRE_PRIORITY.map((genre) => {
      const match = allGenreShelves.find(
        (entry) => normalizeValue(entry?.genre) === normalizeValue(genre),
      );
      if (!match) {
        return null;
      }
      return {
        ...match,
        items: (Array.isArray(match.items) ? match.items : []).slice(0, 4),
      };
    }).filter(Boolean);

    return {
      featured,
      featuredHook:
        FEATURED_COMIC_HOOKS[String(featuredBase?.title || "").trim()] || "",
      freshDrops: updatePool.slice(0, 6),
      popular,
      completed: completedPool.slice(0, 6),
      genres: genreShelves,
      rankings: excludeSeries(buildTopTen(seriesList), excludedIds).slice(0, 6),
    };
  }, [seriesList]);

  return (
    <StorefrontPage
      accentClass="from-[rgba(255,93,136,0.15)] via-[rgba(255,178,92,0.08)] to-[rgba(103,232,249,0.08)]"
      contentClassName="space-y-10 lg:space-y-12"
    >
      {model.featured ? (
        <StoryHero
          series={model.featured}
          eyebrow="Featured Comic"
          hook={model.featuredHook}
          primaryLabel="Start Reading"
          secondaryLabel="View Series"
          statsVariant="chips"
          theme="comic"
          mobileContentFirst
          backgroundImageUrl={siteMaterialImages.comicsFeaturedHero}
          backgroundPosition="right center"
          featureLabel="Dark fantasy heat, large covers, and a cliffhanger worth the tap"
          chips={(Array.isArray(model.featured?.genres) ? model.featured.genres : []).slice(
            0,
            3,
          )}
          stats={[
            {
              label: "Latest",
              value: buildLatestInstallmentLabel(model.featured),
            },
            {
              label: "Status",
              value: buildStatusLabel(model.featured),
            },
            {
              label: "Genre",
              value: buildGenreLabel(model.featured, 2) || "Comic",
            },
          ]}
        />
      ) : loading ? null : (
        <EmptyShelf
          title="No comics here yet"
          description="Comic picks will show up here as soon as they go live in this mode."
          actionHref="/search?type=comic"
        />
      )}

      <section className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-[44rem]">
            <h2 className="mt-3 font-display text-[2.1rem] font-semibold leading-[0.92] tracking-[-0.065em] text-white sm:text-[2.9rem]">
              Fresh Drops
            </h2>
            <p className="mt-2.5 max-w-[44rem] text-[0.95rem] leading-[1.72] text-white/66">
              New chapters and quick catch-ups.
            </p>
          </div>
          <div className="self-start sm:self-auto">
            <Link
              href="/search?type=comic&sort=latest"
              className={`inline-flex min-h-[44px] items-center gap-2 px-4 text-sm font-medium text-white/78 ${storefrontSecondaryButtonClass}`}
            >
              <Sparkles className="size-4" />
              Latest drops
            </Link>
          </div>
        </div>
        <UpdateList
          items={model.freshDrops}
          sectionName="comics_fresh_drops"
          visual="channel"
        />
        {model.freshDrops.length === 0 ? (
          <StorefrontNoCoverCard
            title="Fresh drops are staying light tonight."
            description="New comic updates will land here once a stronger set of chapter drops is ready."
            label="Fresh drops"
            compact
            className="shadow-none"
          />
        ) : null}
      </section>

      <section className="space-y-4">
        <SectionHeading
          eyebrow="Trending Shelf"
          title="Popular Comics"
          description="Big covers, immediate mood, and the titles readers are most likely to open right now."
          tone="channel"
          action={
            <Link
              href="/search?type=comic&sort=popular"
              className={`inline-flex min-h-[44px] items-center gap-2 px-4 text-sm font-medium text-white/78 ${storefrontSecondaryButtonClass}`}
            >
              Browse all
              <ArrowUpRight className="size-4" />
            </Link>
          }
        />
        {model.popular.length > 2 ? (
          <ShelfScroller>
            {model.popular.map((series, index) => (
              <CoverCard
                key={series.id}
                series={series}
                href={`/series/${series.id}`}
                variant="comic"
                visual="channel"
                badge={`#${index + 1}`}
                actionLabel={buildLatestInstallmentLabel(series)}
                onClick={() =>
                  trackEvent("story_click", {
                    seriesId: series?.id,
                    sourceSection: "comics_popular",
                    position: index + 1,
                  })
                }
              />
            ))}
          </ShelfScroller>
        ) : model.popular.length > 0 ? (
          <CuratedEditorialModule
            items={model.popular}
            sectionName="comics_popular"
            actionLabel="Open Comic"
            variant="Comic"
          />
        ) : (
          <StorefrontNoCoverCard
            title="Popular picks are still a tighter shelf tonight."
            description="This lane will open up once a few stronger covers are ready to carry it."
            label="Popular shelf"
            compact
            className="shadow-none"
          />
        )}
      </section>

      {model.genres.length > 0 ? (
        <GenreShelfSection
          shelves={model.genres}
          variant="comic"
          visual="channel"
          eyebrow="Browse by mood"
          title="Genre Shelves"
          description="Action, romance, and fantasy shelves trimmed down to quick, high-click picks."
        />
      ) : null}

      {model.completed.length > 0 ? (
        <section className="space-y-4">
          <SectionHeading
            eyebrow=""
            title="Completed Comics"
            description="Finished runs when you want the payoff tonight, not next week."
            tone="channel"
          />
          {model.completed.length === 1 ? (
            <FeaturedCompletedRunCard series={model.completed[0]} />
          ) : model.completed.length <= 2 ? (
            <CuratedEditorialModule
              items={model.completed}
              sectionName="comics_completed"
              actionLabel="Read Full Series"
              variant="Comic"
            />
          ) : (
            <ShelfScroller>
              {model.completed.map((series, index) => (
                <CoverCard
                  key={series.id}
                  series={series}
                  href={`/series/${series.id}`}
                  variant="comic"
                  visual="channel"
                  badge="Completed"
                  actionLabel="Read Full Series"
                  onClick={() =>
                    trackEvent("story_click", {
                      seriesId: series?.id,
                      sourceSection: "comics_completed",
                      position: index + 1,
                    })
                  }
                />
              ))}
            </ShelfScroller>
          )}
        </section>
      ) : null}

      {model.rankings.length > 0 ? (
        <RankList
          items={model.rankings}
          label="Reader Rankings"
          eyebrow="Tonight's Leaders"
          description="The covers climbing fastest with comic readers right now."
          visual="channel"
        />
      ) : null}
    </StorefrontPage>
  );
}
