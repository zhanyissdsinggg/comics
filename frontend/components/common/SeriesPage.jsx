/**
 * Generic listing page used for comics and novels.
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "../layout/SiteHeader";
import Cover from "../common/Cover";
import PortraitCard from "../home/PortraitCard";
import SkeletonCard from "../common/SkeletonCard";
import FilterBar from "../common/FilterBar";
import EmptyState from "../common/EmptyState";
import SurfacePanel from "../common/SurfacePanel";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { apiGet } from "../../lib/apiClient";
import { resolveSeriesCreatorName } from "../../lib/creatorIdentity";
import { getSearchParam, toURLSearchParams } from "../../lib/pageSearchParams";

const PAGE_CONFIG = {
  comic: {
    eyebrow: "Comics",
    heroTitle: "Original comics.",
    title: "Comics",
    description: "",
    secondary: "",
    emptyIcon: "search",
    emptyTitle: "No comics found",
    emptyDescription: "",
    pathname: "/comics",
    emptyBrowseCards: [
      {
        eyebrow: "Featured Series",
        title: "Featured",
        body: "",
        ctaLabel: "Featured",
        href: "/rankings?view=featured",
      },
      {
        eyebrow: "Completed Series",
        title: "Completed",
        body: "",
        ctaLabel: "Completed",
        href: "/rankings?view=completed",
      },
    ],
    fallbackGenres: ["Romance", "Fantasy", "Action", "BL", "Drama", "Thriller"],
  },
  novel: {
    eyebrow: "Novels",
    heroTitle: "Original novels.",
    title: "Novels",
    description: "",
    secondary: "",
    emptyIcon: "book",
    emptyTitle: "No novels found",
    emptyDescription: "",
    pathname: "/novels",
    emptyBrowseCards: [
      {
        eyebrow: "Featured Series",
        title: "Featured",
        body: "",
        ctaLabel: "Featured",
        href: "/rankings?view=featured",
      },
      {
        eyebrow: "Completed Series",
        title: "Completed",
        body: "",
        ctaLabel: "Completed",
        href: "/rankings?view=completed",
      },
    ],
    fallbackGenres: [
      "Fantasy",
      "Romance",
      "Drama",
      "Mystery",
      "BL",
      "Historical",
    ],
  },
};

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isRecentlyUpdated(series, days = 21) {
  const updatedAt = toTimestamp(series?.updatedAt);
  if (!updatedAt) {
    return false;
  }

  return updatedAt >= Date.now() - days * 24 * 60 * 60 * 1000;
}

function getEpisodeCount(series) {
  return Math.max(0, toNumber(series?.episodeCount));
}

function getEditorialScore(series) {
  const updatedAtScore = toTimestamp(series?.updatedAt);
  const startHereScore =
    getEpisodeCount(series) > 0 && getEpisodeCount(series) <= 24
      ? 12 * 24 * 60 * 60 * 1000
      : 0;
  const completedScore =
    normalizeStatus(series?.status) === "completed"
      ? 10 * 24 * 60 * 60 * 1000
      : 0;
  const coverScore = series?.coverUrl ? 3 * 24 * 60 * 60 * 1000 : 0;
  const descriptionScore = String(series?.description || "").trim()
    ? 2 * 24 * 60 * 60 * 1000
    : 0;

  return (
    updatedAtScore +
    startHereScore +
    completedScore +
    coverScore +
    descriptionScore
  );
}

function toTimestamp(value) {
  const parsed = typeof value === "number" ? value : Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatTitleCount(value) {
  const count = Number(value) || 0;
  return `${count.toLocaleString()} ${count === 1 ? "title" : "titles"}`;
}

function getSeriesBadge(series) {
  if (String(series?.status || "").toLowerCase() === "completed") {
    return "Completed";
  }
  if (isRecentlyUpdated(series, 14)) {
    return "Updated";
  }
  if (getEpisodeCount(series) > 0 && getEpisodeCount(series) <= 12) {
    return "First picks";
  }
  return "";
}

function getSeriesSubtitle(series) {
  const creatorName = resolveSeriesCreatorName(series);
  if (Array.isArray(series?.genres) && series.genres.length > 0) {
    return series.genres.slice(0, 2).join(" / ");
  }
  if (String(series?.status || "").toLowerCase() === "completed") {
    return "Completed";
  }
  if (getEpisodeCount(series) > 0) {
    return `${getEpisodeCount(series).toLocaleString()} episode${getEpisodeCount(series) === 1 ? "" : "s"}`;
  }
  return creatorName || "Updated";
}

function mapSeriesCardItem(series) {
  const creatorName = resolveSeriesCreatorName(series);
  return {
    id: series.id,
    title: series.title,
    subtitle: getSeriesSubtitle(series),
    genres: Array.isArray(series?.genres) ? series.genres : [],
    type: series?.type || "",
    seriesType: series?.type || "",
    status: series?.status || "",
    adult: Boolean(series?.adult),
    author: creatorName,
    coverUrl: series.coverUrl,
    coverTone: series.coverTone,
    badge: getSeriesBadge(series),
  };
}

export default function SeriesPage({
  type = "comic",
  initialSearchParams = {},
  initialSeries = [],
  hasInitialSeries = false,
}) {
  const router = useRouter();
  const { isAdultMode } = useAdultGateStore();
  const [series, setSeries] = useState(
    Array.isArray(initialSeries) ? initialSeries : [],
  );
  const [loading, setLoading] = useState(!hasInitialSeries);
  const config = PAGE_CONFIG[type] || PAGE_CONFIG.comic;
  const searchParams = useMemo(
    () => toURLSearchParams(initialSearchParams),
    [initialSearchParams],
  );

  const selectedGenre = getSearchParam(initialSearchParams, "genre", "all");
  const sortBy = getSearchParam(initialSearchParams, "sort", "latest");
  const status = getSearchParam(initialSearchParams, "status", "all");
  const isComicPage = type === "comic";
  const isNovelPage = type === "novel";
  const hasActiveFilters =
    selectedGenre !== "all" || sortBy !== "latest" || status !== "all";

  useEffect(() => {
    async function loadSeries() {
      try {
        if (!hasInitialSeries) {
          setLoading(true);
        }
        const response = await apiGet(
          `/api/series?adult=${isAdultMode ? "1" : "0"}`,
          {
            cacheMs: 300000,
          },
        );
        if (!response.ok) {
          throw new Error(
            response.message || response.error || `Failed to load ${type}s`,
          );
        }

        const filtered = (response.data?.series || []).filter(
          (item) => item.type === type,
        );
        setSeries(filtered);
      } catch (error) {
        console.error(`Failed to load ${type}s:`, error);
      } finally {
        setLoading(false);
      }
    }

    loadSeries();
  }, [hasInitialSeries, isAdultMode, type]);

  const updateParams = useCallback(
    (updates) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        const nextValue = typeof value === "string" ? value.trim() : value;
        if (!nextValue || nextValue === "all") {
          params.delete(key);
        } else {
          params.set(key, String(nextValue));
        }
      });

      const nextQuery = params.toString();
      router.replace(
        nextQuery ? `${config.pathname}?${nextQuery}` : config.pathname,
      );
    },
    [config.pathname, router, searchParams],
  );

  const genres = useMemo(() => {
    const genreSet = new Set();

    series.forEach((item) => {
      if (Array.isArray(item.genres)) {
        item.genres.forEach((genre) => genreSet.add(genre));
      }
    });

    return Array.from(genreSet).sort((left, right) =>
      left.localeCompare(right),
    );
  }, [series]);

  const filteredAndSortedSeries = useMemo(() => {
    let result = series;

    if (selectedGenre !== "all") {
      result = result.filter((item) =>
        Array.isArray(item.genres)
          ? item.genres.some(
              (genre) => genre.toLowerCase() === selectedGenre.toLowerCase(),
            )
          : false,
      );
    }

    const normalizedFilterStatus = normalizeStatus(status);
    if (normalizedFilterStatus !== "all") {
      result = result.filter((item) => {
        const normalizedItemStatus = normalizeStatus(item.status);
        if (normalizedFilterStatus === "completed") {
          return normalizedItemStatus === "completed";
        }
        if (normalizedFilterStatus === "ongoing") {
          return normalizedItemStatus !== "completed";
        }
        return true;
      });
    }

    if (result.length === 0) {
      return result;
    }

    return [...result].sort((left, right) => {
      switch (sortBy) {
        case "latest":
          return new Date(right.updatedAt || 0) - new Date(left.updatedAt || 0);
        case "title":
          return String(left?.title || "").localeCompare(
            String(right?.title || ""),
          );
        default:
          return getEditorialScore(right) - getEditorialScore(left);
      }
    });
  }, [selectedGenre, series, sortBy, status]);

  const discoveryShelves = useMemo(() => {
    const startHere = [...series]
      .filter((item) => getEpisodeCount(item) > 0)
      .sort((left, right) => {
        const leftEpisodes = getEpisodeCount(left);
        const rightEpisodes = getEpisodeCount(right);
        if (leftEpisodes !== rightEpisodes) {
          return leftEpisodes - rightEpisodes;
        }
        return getEditorialScore(right) - getEditorialScore(left);
      })
      .slice(0, 4)
      .map(mapSeriesCardItem);

    const featured = [...series]
      .sort((left, right) => getEditorialScore(right) - getEditorialScore(left))
      .slice(0, 4)
      .map(mapSeriesCardItem);

    const latest = [...series]
      .sort(
        (left, right) =>
          toTimestamp(right?.updatedAt) - toTimestamp(left?.updatedAt),
      )
      .slice(0, 4)
        .map((item) => ({
          ...mapSeriesCardItem(item),
          subtitle: toTimestamp(item?.updatedAt)
          ? new Date(item.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : getSeriesSubtitle(item),
      }));

    const completed = [...series]
      .filter((item) => normalizeStatus(item?.status) === "completed")
      .sort((left, right) => getEditorialScore(right) - getEditorialScore(left))
      .slice(0, 4)
      .map(mapSeriesCardItem);

    return [
      {
        id: "start-free",
        eyebrow: "First Picks",
        title: "First Picks",
        description: "",
        ctaLabel: "First Picks",
        href: "/rankings?view=start-here",
        items: startHere,
      },
      {
        id: "featured",
        eyebrow: "Featured Series",
        title: "Featured Series",
        description: "",
        ctaLabel: "Featured",
        href: "/rankings?view=featured",
        items: featured,
      },
      {
        id: "latest",
        eyebrow: "Recent Updates",
        title: "Recent Updates",
        description: "",
        ctaLabel: "Recent",
        href: `${config.pathname}?sort=latest`,
        items: latest,
      },
      {
        id: "completed",
        eyebrow: "Completed Series",
        title: "Completed Series",
        description: "",
        ctaLabel: "Completed",
        href: "/rankings?view=completed",
        items: completed,
      },
    ].filter((shelf) => shelf.items.length > 0);
  }, [config.pathname, config.title, series]);
  const showFallbackDiscovery = !loading && discoveryShelves.length === 0;
  const emptyStateCopy = useMemo(() => {
    if (!loading && series.length === 0) {
      return {
        title: "No titles yet.",
        description: "",
      };
    }

    return {
      title: config.emptyTitle,
      description: config.emptyDescription,
    };
  }, [
    config.emptyDescription,
    config.emptyTitle,
    loading,
    series.length,
    type,
  ]);

  const handleSeriesClick = useCallback(
    (seriesId) => {
      router.push(`/series/${seriesId}`);
    },
    [router],
  );
  const handleResetFilters = useCallback(() => {
    router.replace(config.pathname);
  }, [config.pathname, router]);
  const entrySpotlight = useMemo(() => {
    const byFeatured = [...series].sort(
      (left, right) => getEditorialScore(right) - getEditorialScore(left),
    );
    const byLatest = [...series].sort(
      (left, right) =>
        toTimestamp(right?.updatedAt) - toTimestamp(left?.updatedAt),
    );
    const startHere =
      [...series]
        .filter((item) => getEpisodeCount(item) > 0)
        .sort((left, right) => {
          const leftEpisodes = getEpisodeCount(left);
          const rightEpisodes = getEpisodeCount(right);
          if (leftEpisodes !== rightEpisodes) {
            return leftEpisodes - rightEpisodes;
          }
          return getEditorialScore(right) - getEditorialScore(left);
        })[0] || null;
    const completed =
      byFeatured.find(
        (item) => normalizeStatus(item?.status) === "completed",
      ) || null;
    return type === "comic"
      ? startHere || byFeatured[0] || byLatest[0] || completed || null
      : byFeatured[0] || byLatest[0] || completed || startHere || null;
  }, [series, type]);
  const catalogGridClassName =
    filteredAndSortedSeries.length <= 8
      ? "grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      : "grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";
  const genreQuickPicks = useMemo(() => {
    const genreCounts = new Map();

    series.forEach((item) => {
      if (!Array.isArray(item?.genres)) {
        return;
      }

      item.genres.forEach((genre) => {
        const key = String(genre || "").trim();
        if (!key) {
          return;
        }
        genreCounts.set(key, (genreCounts.get(key) || 0) + 1);
      });
    });

    return Array.from(genreCounts.entries())
      .sort(
        (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
      )
      .slice(0, 6)
      .map(([genre, count]) => ({ genre, count }));
  }, [series]);
  const fallbackGenrePicks = useMemo(() => {
    if (genreQuickPicks.length > 0) {
      return genreQuickPicks;
    }

    return (
      Array.isArray(config.fallbackGenres) ? config.fallbackGenres : []
    ).map((genre) => ({
      genre,
      count: null,
    }));
  }, [config.fallbackGenres, genreQuickPicks]);
  const primaryButtonClass =
    "rounded-full border-2 border-black bg-[#00E5FF] px-5 py-2.5 text-xs font-black uppercase tracking-[0.08em] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 hover:translate-x-0.5 hover:translate-y-0.5";
  const secondaryButtonClass =
    "rounded-full border-2 border-black bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.08em] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 hover:translate-x-0.5 hover:translate-y-0.5";
  const showEntrySpotlight =
    Boolean(entrySpotlight) &&
    !isComicPage &&
    (!isNovelPage || !hasActiveFilters);
  const showCatalogCount = !isComicPage;

  return (
    <main className="min-h-screen overflow-hidden bg-black text-white">
      <SiteHeader variant="home" />

      <div className="mx-auto flex max-w-[1320px] flex-col gap-6 px-4 py-7 md:gap-8 md:px-8 md:py-10">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.22fr)_minmax(320px,0.78fr)]">
          <SurfacePanel
            className="space-y-4 px-4 py-4 sm:space-y-5 sm:px-6 sm:py-6"
            tone="highlight"
            accent="cyan"
            appearance="dark"
          >
            <div className="max-w-3xl">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/70">
                {config.eyebrow}
              </p>
              <h1 className="mt-3 text-[2.2rem] font-black uppercase leading-[0.92] tracking-[-0.06em] text-white sm:mt-4 sm:text-[3.35rem] xl:text-[4.2rem]">
                {config.heroTitle}
              </h1>
              <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-white/80 sm:text-[0.98rem]">
                {config.description}
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {fallbackGenrePicks.slice(0, 6).map((item) => (
                <button
                  key={`hero-genre-${item.genre}`}
                  type="button"
                  onClick={() => updateParams({ genre: item.genre })}
                  className="inline-flex items-center rounded-full border-2 border-black bg-white px-3 py-1.5 text-xs font-black uppercase tracking-[0.08em] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 hover:translate-x-0.5 hover:translate-y-0.5"
                >
                  {item.genre}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/search")}
                className="rounded-full border-2 border-black bg-[#00E5FF] px-5 py-2.5 text-sm font-black uppercase tracking-[0.08em] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 hover:translate-x-0.5 hover:translate-y-0.5"
              >
                Search
              </button>
            </div>
          </SurfacePanel>

          {showEntrySpotlight ? (
            <section className="rounded-[30px] border-2 border-[#FFE500] bg-black/85 p-4 text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:p-6">
              <div className="grid grid-cols-[108px_minmax(0,1fr)] gap-4 sm:grid-cols-[132px_minmax(0,1fr)]">
                <Cover
                  tone={entrySpotlight.coverTone}
                  coverUrl={entrySpotlight.coverUrl}
                  label={entrySpotlight.title}
                  eyebrow={
                    type === "comic" ? "Featured" : "Novel"
                  }
                  badge={getSeriesBadge(entrySpotlight)}
                  genres={entrySpotlight.genres}
                  seriesType={entrySpotlight.type}
                  className="aspect-[3/4] w-full overflow-hidden rounded-[24px] border-2 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                />

                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.26em] text-white/70">
                    Spotlight
                  </p>
                  <h2 className="mt-2.5 text-[1.5rem] font-black uppercase leading-tight tracking-[-0.04em] text-white sm:mt-3 sm:text-[1.8rem]">
                    {entrySpotlight.title}
                  </h2>
                  <p className="mt-3 text-sm font-semibold leading-6 text-white/80">
                    {getSeriesSubtitle(entrySpotlight)}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(Array.isArray(entrySpotlight?.genres)
                      ? entrySpotlight.genres
                      : []
                    )
                      .slice(0, 2)
                      .map((genre) => (
                        <span
                          key={`spotlight-${entrySpotlight.id}-${genre}`}
                          className="rounded-full border-2 border-black bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                        >
                          {genre}
                        </span>
                      ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSeriesClick(entrySpotlight.id)}
                    className="mt-5 rounded-full border-2 border-black bg-[#00E5FF] px-4 py-2 text-sm font-black uppercase tracking-[0.08em] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 hover:translate-x-0.5 hover:translate-y-0.5"
                  >
                    Series
                  </button>
                </div>
              </div>
            </section>
          ) : null}
        </section>

        {loading ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <SurfacePanel
                key={index}
                className="space-y-5"
                appearance="dark"
                accent="cyan"
              >
                <div className="space-y-3">
                  <div className="h-3 w-24 rounded-full bg-white/20" />
                  <div className="h-8 w-56 rounded-full bg-white/20" />
                  <div className="h-4 w-full max-w-xl rounded-full bg-white/10" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((__, cardIndex) => (
                    <SkeletonCard key={cardIndex} appearance="dark" />
                  ))}
                </div>
              </SurfacePanel>
            ))}
          </div>
        ) : showFallbackDiscovery ? (
          <section className="grid gap-4 xl:grid-cols-[1.04fr_0.96fr]">
            <div className="grid gap-4 md:grid-cols-2">
              {config.emptyBrowseCards.map((card) => (
                <SurfacePanel
                  key={card.title}
                  className="space-y-4"
                  appearance="dark"
                  accent="cyan"
                >
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/70">
                      {card.eyebrow}
                    </p>
                    <h2 className="mt-2 font-display text-2xl font-black uppercase tracking-[-0.05em] text-white">
                      {card.title}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push(card.href)}
                    className={secondaryButtonClass}
                  >
                    {card.ctaLabel}
                  </button>
                </SurfacePanel>
              ))}
            </div>

            <SurfacePanel
              className="space-y-4"
              appearance="dark"
              accent="cyan"
            >
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/70">
                  Genres
                </p>
                <h2 className="mt-2 font-display text-2xl font-black uppercase tracking-[-0.05em] text-white">
                  Genres
                </h2>
              </div>

              <div className="flex flex-wrap gap-2">
                {fallbackGenrePicks.map((item) => (
                  <button
                    key={item.genre}
                    type="button"
                    onClick={() =>
                      router.push(
                        `/search?q=${encodeURIComponent(item.genre)}&sort=latest`,
                      )
                    }
                    className="rounded-full border-2 border-black bg-white px-3 py-2 text-sm font-black uppercase tracking-[0.08em] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 hover:translate-x-0.5 hover:translate-y-0.5"
                  >
                    {item.genre}
                  </button>
                ))}
              </div>
            </SurfacePanel>
          </section>
        ) : null}

        <SurfacePanel className="space-y-5" appearance="dark" accent="cyan">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/70">
                Catalog
              </p>
              <h2 className="mt-2 font-display text-[1.95rem] font-black uppercase tracking-[-0.05em] text-white">
                {config.title}
              </h2>
            </div>
            {showCatalogCount ? (
              <p className="text-sm font-black uppercase tracking-[0.12em] text-white/70">
                {formatTitleCount(filteredAndSortedSeries.length)}
              </p>
            ) : null}
          </div>

          <FilterBar
            genres={genres}
            selectedGenre={selectedGenre}
            onGenreChange={(value) => updateParams({ genre: value })}
            sortBy={sortBy}
            onSortChange={(value) => updateParams({ sort: value })}
            status={status}
            onStatusChange={(value) => updateParams({ status: value })}
            onReset={handleResetFilters}
            appearance="dark"
            density={isComicPage ? "quiet" : "default"}
          />
        </SurfacePanel>

        {loading ? (
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 15 }).map((_, index) => (
              <SkeletonCard key={index} appearance="dark" />
            ))}
          </div>
        ) : filteredAndSortedSeries.length === 0 ? (
          <SurfacePanel className="space-y-5" appearance="dark" accent="cyan">
            <EmptyState
              icon={config.emptyIcon}
              title={emptyStateCopy.title}
              description={emptyStateCopy.description}
              appearance="dark"
              action={{
                label: "Reset filters",
                onClick: handleResetFilters,
              }}
            />
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/rankings?view=featured")}
                className={secondaryButtonClass}
              >
                Featured
              </button>
              <button
                type="button"
                onClick={() =>
                  router.push(type === "comic" ? "/novels" : "/comics")
                }
                className={primaryButtonClass}
              >
                {type === "comic" ? "Novels" : "Comics"}
              </button>
            </div>
          </SurfacePanel>
        ) : (
          <div className={catalogGridClassName}>
            {filteredAndSortedSeries.map((item) => (
              <PortraitCard
                key={item.id}
                item={item}
                tone={item.coverTone}
                density="compact"
                showActionLabel={false}
                coverFallbackVariant={isComicPage ? "minimal-card" : "default"}
                onClick={() => handleSeriesClick(item.id)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
