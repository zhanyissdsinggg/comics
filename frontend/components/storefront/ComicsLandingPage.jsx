"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { trackEvent } from "../../lib/trackEvent";
import { withHomeArtwork } from "../../lib/homeArtwork";
import {
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
import { storefrontSecondaryButtonClass } from "../common/StorefrontPagePrimitives";
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
            title="Completed Comics"
            description="Finished runs when you want the payoff tonight, not next week."
            tone="channel"
          />
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
