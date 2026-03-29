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
import EditorialHero from "../common/EditorialHero";
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
    description: "Browse recent releases, finished runs, and stories worth keeping up with.",
    secondary: "",
    emptyIcon: "search",
    emptyTitle: "No comics match this filter set",
    emptyDescription: "Clear the current filters or browse featured series.",
    pathname: "/comics",
    emptyBrowseCards: [
      {
        eyebrow: "Featured Series",
        title: "Featured Series",
        body: "Editorial picks from across the catalog.",
        ctaLabel: "Browse Series",
        href: "/rankings?view=featured",
      },
      {
        eyebrow: "Completed Series",
        title: "Completed Series",
        body: "Finished stories ready to read through.",
        ctaLabel: "Browse Series",
        href: "/rankings?view=completed",
      },
    ],
    fallbackGenres: ["Romance", "Fantasy", "Action", "BL", "Drama", "Thriller"],
  },
  novel: {
    eyebrow: "Novels",
    heroTitle: "Original novels.",
    title: "Novels",
    description: "Browse serialized fiction, recent chapters, and finished stories.",
    secondary: "",
    emptyIcon: "book",
    emptyTitle: "No novels match this filter set",
    emptyDescription: "Clear the current filters or browse featured series.",
    pathname: "/novels",
    emptyBrowseCards: [
      {
        eyebrow: "Featured Series",
        title: "Featured Series",
        body: "Editorial picks from across the catalog.",
        ctaLabel: "Browse Series",
        href: "/rankings?view=featured",
      },
      {
        eyebrow: "Completed Series",
        title: "Completed Series",
        body: "Finished stories ready to read through.",
        ctaLabel: "Browse Series",
        href: "/rankings?view=completed",
      },
    ],
    fallbackGenres: ["Fantasy", "Romance", "Drama", "Mystery", "BL", "Historical"],
  },
};

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
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
    getEpisodeCount(series) > 0 && getEpisodeCount(series) <= 24 ? 12 * 24 * 60 * 60 * 1000 : 0;
  const completedScore =
    normalizeStatus(series?.status) === "completed" ? 10 * 24 * 60 * 60 * 1000 : 0;
  const coverScore = series?.coverUrl ? 3 * 24 * 60 * 60 * 1000 : 0;
  const descriptionScore = String(series?.description || "").trim()
    ? 2 * 24 * 60 * 60 * 1000
    : 0;

  return updatedAtScore + startHereScore + completedScore + coverScore + descriptionScore;
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
    return "Start here";
  }
  return "";
}

function getSeriesSubtitle(series) {
  const creatorName = resolveSeriesCreatorName(series);
  if (Array.isArray(series?.genres) && series.genres.length > 0) {
    return series.genres.slice(0, 2).join(" / ");
  }
  if (String(series?.status || "").toLowerCase() === "completed") {
    return "Completed series";
  }
  if (getEpisodeCount(series) > 0) {
    return `${getEpisodeCount(series).toLocaleString()} episode${getEpisodeCount(series) === 1 ? "" : "s"}`;
  }
  return creatorName || "Updated series";
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
  const [series, setSeries] = useState(Array.isArray(initialSeries) ? initialSeries : []);
  const [loading, setLoading] = useState(!hasInitialSeries);
  const config = PAGE_CONFIG[type] || PAGE_CONFIG.comic;
  const searchParams = useMemo(() => toURLSearchParams(initialSearchParams), [initialSearchParams]);

  const selectedGenre = getSearchParam(initialSearchParams, "genre", "all");
  const sortBy = getSearchParam(initialSearchParams, "sort", "latest");
  const status = getSearchParam(initialSearchParams, "status", "all");
  const isComicPage = type === "comic";
  const isNovelPage = type === "novel";
  const hasActiveFilters = selectedGenre !== "all" || sortBy !== "latest" || status !== "all";

  useEffect(() => {
    async function loadSeries() {
      try {
        if (!hasInitialSeries) {
          setLoading(true);
        }
        const response = await apiGet(`/api/series?adult=${isAdultMode ? "1" : "0"}`, {
          cacheMs: 300000,
        });
        if (!response.ok) {
          throw new Error(response.message || response.error || `Failed to load ${type}s`);
        }

        const filtered = (response.data?.series || []).filter((item) => item.type === type);
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
      router.replace(nextQuery ? `${config.pathname}?${nextQuery}` : config.pathname);
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

    return Array.from(genreSet).sort((left, right) => left.localeCompare(right));
  }, [series]);

  const filteredAndSortedSeries = useMemo(() => {
    let result = series;

    if (selectedGenre !== "all") {
      result = result.filter((item) =>
        Array.isArray(item.genres)
          ? item.genres.some((genre) => genre.toLowerCase() === selectedGenre.toLowerCase())
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
          return String(left?.title || "").localeCompare(String(right?.title || ""));
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
      .sort((left, right) => toTimestamp(right?.updatedAt) - toTimestamp(left?.updatedAt))
      .slice(0, 4)
      .map((item) => ({
        ...mapSeriesCardItem(item),
        subtitle: toTimestamp(item?.updatedAt)
          ? `Updated ${new Date(item.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
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
        eyebrow: "Start Here",
        title: "Start Here",
        description: "Reader-friendly stories to begin with.",
        ctaLabel: "Browse Series",
        href: "/rankings?view=start-here",
        items: startHere,
      },
      {
        id: "featured",
        eyebrow: "Featured Series",
        title: "Featured Series",
        description: "Editorial picks from the catalog.",
        ctaLabel: "Browse Series",
        href: "/rankings?view=featured",
        items: featured,
      },
      {
        id: "latest",
        eyebrow: "Recent Updates",
        title: "Recent Updates",
        description: "The most recently updated titles.",
        ctaLabel: "Browse Series",
        href: `${config.pathname}?sort=latest`,
        items: latest,
      },
      {
        id: "completed",
        eyebrow: "Completed Series",
        title: "Completed Series",
        description: "Finished stories ready to read through.",
        ctaLabel: "Browse Series",
        href: "/rankings?view=completed",
        items: completed,
      },
    ].filter((shelf) => shelf.items.length > 0);
  }, [config.pathname, config.title, series]);
  const showFallbackDiscovery = !loading && discoveryShelves.length === 0;
  const emptyStateCopy = useMemo(() => {
    if (!loading && series.length === 0) {
      return {
        title: "Nothing here yet.",
        description: "Browse featured series or search by genre.",
      };
    }

    return {
      title: config.emptyTitle,
      description: config.emptyDescription,
    };
  }, [config.emptyDescription, config.emptyTitle, loading, series.length, type]);

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
    const byFeatured = [...series].sort((left, right) => getEditorialScore(right) - getEditorialScore(left));
    const byLatest = [...series].sort((left, right) => toTimestamp(right?.updatedAt) - toTimestamp(left?.updatedAt));
    const startHere = [...series]
      .filter((item) => getEpisodeCount(item) > 0)
      .sort((left, right) => {
        const leftEpisodes = getEpisodeCount(left);
        const rightEpisodes = getEpisodeCount(right);
        if (leftEpisodes !== rightEpisodes) {
          return leftEpisodes - rightEpisodes;
        }
        return getEditorialScore(right) - getEditorialScore(left);
      })[0] || null;
    const completed = byFeatured.find((item) => normalizeStatus(item?.status) === "completed") || null;
    return type === "comic"
      ? startHere || byFeatured[0] || byLatest[0] || completed || null
      : byFeatured[0] || byLatest[0] || completed || startHere || null;
  }, [series, type]);
  const catalogGridClassName =
    filteredAndSortedSeries.length <= 8
      ? "grid grid-cols-2 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      : "grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";
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
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 6)
      .map(([genre, count]) => ({ genre, count }));
  }, [series]);
  const fallbackGenrePicks = useMemo(() => {
    if (genreQuickPicks.length > 0) {
      return genreQuickPicks;
    }

    return (Array.isArray(config.fallbackGenres) ? config.fallbackGenres : []).map((genre) => ({
      genre,
      count: null,
    }));
  }, [config.fallbackGenres, genreQuickPicks]);
  const primaryButtonClass =
    "rounded-full bg-slate-950 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800";
  const secondaryButtonClass =
    "rounded-full border border-black/8 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]";
  const showEditorialHero = !isNovelPage;
  const showEntrySpotlight = Boolean(entrySpotlight) && !isComicPage && (!isNovelPage || !hasActiveFilters);
  const showCatalogCount = !isComicPage;

  return (
    <main className="gush-page-shell overflow-hidden">
      <div className="gush-page-ambient" />
      <SiteHeader variant="light" />

      <div className="gush-page-main gush-section-stack">
        {showEditorialHero ? (
          <EditorialHero
            eyebrow={config.eyebrow}
            title={config.heroTitle}
            description={config.description}
            secondary={config.secondary}
            appearance="light"
          />
        ) : null}

        {loading ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <SurfacePanel key={index} className="space-y-5" appearance="light" accent="blue">
                <div className="space-y-3">
                  <div className="h-3 w-24 rounded-full bg-slate-200" />
                  <div className="h-8 w-56 rounded-full bg-slate-200" />
                  <div className="h-4 w-full max-w-xl rounded-full bg-slate-100" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((__, cardIndex) => (
                    <SkeletonCard key={cardIndex} appearance="light" />
                  ))}
                </div>
              </SurfacePanel>
            ))}
          </div>
        ) : showFallbackDiscovery ? (
          <section className="grid gap-4 xl:grid-cols-[1.04fr_0.96fr]">
            <div className="grid gap-4 md:grid-cols-2">
              {config.emptyBrowseCards.map((card) => (
                <SurfacePanel key={card.title} className="space-y-4" appearance="light" accent="blue">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                      {card.eyebrow}
                    </p>
                    <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
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

            <SurfacePanel className="space-y-4" appearance="light" accent="blue">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Browse
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                  Browse by genre
                </h2>
              </div>

              <div className="flex flex-wrap gap-2">
                {fallbackGenrePicks.map((item) => (
                  <button
                    key={item.genre}
                    type="button"
                    onClick={() => router.push(`/search?q=${encodeURIComponent(item.genre)}&sort=latest`)}
                    className="rounded-full border border-black/8 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc] hover:text-slate-950"
                  >
                    {item.genre}
                  </button>
                ))}
              </div>

            </SurfacePanel>
          </section>
        ) : null}

        {!loading && showEntrySpotlight ? (
          <section>
            <SurfacePanel className="space-y-5" appearance="light" accent="blue">
              <div className="grid gap-4 sm:grid-cols-[200px_minmax(0,1fr)] sm:items-start">
                <Cover
                  tone={entrySpotlight.coverTone}
                  coverUrl={entrySpotlight.coverUrl}
                  label={entrySpotlight.title}
                  eyebrow={type === "comic" ? "Editors' pick" : "Novels"}
                  badge={getSeriesBadge(entrySpotlight)}
                  genres={entrySpotlight.genres}
                  seriesType={entrySpotlight.type}
                  className="mx-auto aspect-[3/4] w-full max-w-[210px] rounded-[24px] sm:mx-0"
                />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                    Featured
                  </p>
                  <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-slate-950">
                    {entrySpotlight.title}
                  </h2>
                  <p className="mt-3 text-sm text-slate-500">{getSeriesSubtitle(entrySpotlight)}</p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => handleSeriesClick(entrySpotlight.id)}
                      className={primaryButtonClass}
                    >
                      View Series
                    </button>
                  </div>
                </div>
              </div>
            </SurfacePanel>
          </section>
        ) : null}

        <FilterBar
          genres={genres}
          selectedGenre={selectedGenre}
          onGenreChange={(value) => updateParams({ genre: value })}
          sortBy={sortBy}
          onSortChange={(value) => updateParams({ sort: value })}
          status={status}
          onStatusChange={(value) => updateParams({ status: value })}
          onReset={handleResetFilters}
          appearance="light"
          density={isComicPage ? "quiet" : "default"}
        />

        {loading ? (
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 15 }).map((_, index) => (
              <SkeletonCard key={index} appearance="light" />
            ))}
          </div>
        ) : filteredAndSortedSeries.length === 0 ? (
          <SurfacePanel className="space-y-5" appearance="light" accent="blue">
            <EmptyState
              icon={config.emptyIcon}
              title={emptyStateCopy.title}
              description={emptyStateCopy.description}
              appearance="light"
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
                Browse Series
              </button>
              <button
                type="button"
                onClick={() => router.push(type === "comic" ? "/novels" : "/comics")}
                className={primaryButtonClass}
              >
                {type === "comic" ? "Browse Novels" : "Browse Comics"}
              </button>
            </div>
          </SurfacePanel>
        ) : (
          <div className={showCatalogCount ? "space-y-6" : "space-y-0"}>
            {showCatalogCount ? (
              <p className="text-sm text-slate-500">
                {formatTitleCount(filteredAndSortedSeries.length)}
              </p>
            ) : null}
            <div className={catalogGridClassName}>
              {filteredAndSortedSeries.map((item) => (
                <PortraitCard
                  key={item.id}
                  item={item}
                  tone={item.coverTone}
                  appearance="light"
                  showActionLabel={!isComicPage}
                  coverFallbackVariant={isComicPage ? "minimal-card" : "default"}
                  onClick={() => handleSeriesClick(item.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
