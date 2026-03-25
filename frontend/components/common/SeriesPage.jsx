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
import { getSearchParam, toURLSearchParams } from "../../lib/pageSearchParams";

const PAGE_CONFIG = {
  comic: {
    eyebrow: "Comics",
    heroTitle: "Comics worth opening.",
    title: "Comics",
    description: "Standout comics, free starts, and finished runs.",
    secondary: "",
    emptyIcon: "search",
    emptyTitle: "No comics match this filter set",
    emptyDescription: "Reset the current filters or open Top Series to widen the selection.",
    pathname: "/comics",
    emptyBrowseCards: [
      {
        eyebrow: "Start here",
        title: "Free first chapters",
        body: "Test the hook before you spend points.",
        ctaLabel: "Start reading free",
        href: "/rankings?type=ttf&window=all",
      },
      {
        eyebrow: "Trending now",
        title: "Popular comics",
        body: "Start with the comics already pulling readers in.",
        ctaLabel: "Browse Top Series",
        href: "/rankings?type=popular&window=week",
      },
    ],
    fallbackGenres: ["Romance", "Fantasy", "Action", "BL", "Drama", "Thriller"],
  },
  novel: {
    eyebrow: "Novels",
    heroTitle: "Novels worth settling into.",
    title: "Novels",
    description: "Serialized fiction, finished reads, and recent updates.",
    secondary: "",
    emptyIcon: "book",
    emptyTitle: "No novels match this filter set",
    emptyDescription: "Reset the current filters or open Top Series to find more to read.",
    pathname: "/novels",
    emptyBrowseCards: [
      {
        eyebrow: "Trending now",
        title: "Popular novels",
        body: "Start with the novels already pulling readers in.",
        ctaLabel: "Browse Top Series",
        href: "/rankings?type=popular&window=week",
      },
      {
        eyebrow: "New updates",
        title: "Fresh drops",
        body: "Latest releases keep the shelf feeling current.",
        ctaLabel: "See latest novels",
        href: "/novels?sort=latest",
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

function getPopularityScore(series) {
  return Math.max(
    toNumber(series.followers),
    toNumber(series.views),
    toNumber(series.ratingCount),
    Math.round(toNumber(series.rating) * 100),
  );
}

function toTimestamp(value) {
  const parsed = typeof value === "number" ? value : Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function getSeriesBadge(series) {
  if (String(series?.status || "").toLowerCase() === "completed") {
    return "Completed";
  }
  if (Number(series?.freeEpisodeCount || 0) > 0 || series?.hasFreeEpisodes) {
    return "Free";
  }
  const badgeTokens = [series?.badge, ...(Array.isArray(series?.badges) ? series.badges : [])]
    .filter(Boolean)
    .map((badge) => String(badge).trim().toUpperCase());
  if (badgeTokens.includes("NEW")) {
    return "New";
  }
  if (badgeTokens.includes("HOT")) {
    return "Trending";
  }
  return "";
}

function getSeriesSubtitle(series) {
  if (Array.isArray(series?.genres) && series.genres.length > 0) {
    return series.genres.slice(0, 2).join(" / ");
  }
  if (String(series?.status || "").toLowerCase() === "completed") {
    return "Completed series";
  }
  if (Number(series?.freeEpisodeCount || 0) > 0) {
    return `${Number(series.freeEpisodeCount).toLocaleString()} free chapter${Number(series.freeEpisodeCount) === 1 ? "" : "s"}`;
  }
  return series?.author || "Updated series";
}

function mapSeriesCardItem(series) {
  return {
    id: series.id,
    title: series.title,
    subtitle: getSeriesSubtitle(series),
    genres: Array.isArray(series?.genres) ? series.genres : [],
    type: series?.type || "",
    seriesType: series?.type || "",
    status: series?.status || "",
    adult: Boolean(series?.adult),
    freeEpisodeCount: Number(series?.freeEpisodeCount || 0),
    hasFreeEpisodes: Boolean(series?.hasFreeEpisodes || Number(series?.freeEpisodeCount || 0) > 0),
    author: series?.author || "",
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
  const sortBy = getSearchParam(initialSearchParams, "sort", "popular");
  const status = getSearchParam(initialSearchParams, "status", "all");
  const isNovelPage = type === "novel";
  const hasActiveFilters = selectedGenre !== "all" || sortBy !== "popular" || status !== "all";

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
        case "popular":
        default:
          return getPopularityScore(right) - getPopularityScore(left);
      }
    });
  }, [selectedGenre, series, sortBy, status]);

  const discoveryShelves = useMemo(() => {
    const freeStart = [...series]
      .filter((item) => Number(item?.freeEpisodeCount || 0) > 0 || item?.hasFreeEpisodes)
      .sort((left, right) => {
        const freeDelta = Number(right?.freeEpisodeCount || 0) - Number(left?.freeEpisodeCount || 0);
        if (freeDelta !== 0) {
          return freeDelta;
        }
        return getPopularityScore(right) - getPopularityScore(left);
      })
      .slice(0, 4)
      .map(mapSeriesCardItem);

    const trending = [...series]
      .sort((left, right) => getPopularityScore(right) - getPopularityScore(left))
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
      .sort((left, right) => getPopularityScore(right) - getPopularityScore(left))
      .slice(0, 4)
      .map(mapSeriesCardItem);

    return [
      {
        id: "start-free",
        eyebrow: "Start here",
        title: "Free first chapters",
        description: "Sample the hook before spending points.",
        ctaLabel: "Start reading free",
        href: "/rankings?type=ttf&window=all",
        items: freeStart,
      },
      {
        id: "trending",
        eyebrow: "Trending now",
        title: `Popular ${config.title.toLowerCase()}`,
        description: "These titles already have reader momentum.",
        ctaLabel: "Browse Top Series",
        href: "/rankings?type=popular&window=week",
        items: trending,
      },
      {
        id: "latest",
        eyebrow: "New updates",
        title: "Fresh drops",
        description: "Open the most recently updated titles first.",
        ctaLabel: "See latest",
        href: `${config.pathname}?sort=latest`,
        items: latest,
      },
      {
        id: "completed",
        eyebrow: "Binge ready",
        title: "Completed picks",
        description: "Finished runs are easier when you want payoff now.",
        ctaLabel: "See finished reads",
        href: `${config.pathname}?status=completed`,
        items: completed,
      },
    ].filter((shelf) => shelf.items.length > 0);
  }, [config.pathname, config.title, series]);
  const showFallbackDiscovery = !loading && discoveryShelves.length === 0;
  const emptyStateCopy = useMemo(() => {
    if (!loading && series.length === 0) {
      return {
        title: type === "comic" ? "Try another comic lane." : "Try another novel lane.",
        description:
          type === "comic"
            ? "Open Top Series, start free, or search by genre for another way in."
            : "Open Top Series, browse latest updates, or search by genre for another way in.",
      };
    }

    return {
      title: config.emptyTitle,
      description: `${config.emptyDescription} Top Series and free-start charts stay close if you want another way in.`,
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
    const byPopular = [...series].sort((left, right) => getPopularityScore(right) - getPopularityScore(left));
    const byLatest = [...series].sort((left, right) => toTimestamp(right?.updatedAt) - toTimestamp(left?.updatedAt));
    const freeStart = byPopular.find((item) => Number(item?.freeEpisodeCount || 0) > 0 || item?.hasFreeEpisodes) || null;
    const completed = byPopular.find((item) => normalizeStatus(item?.status) === "completed") || null;
    return type === "comic"
      ? freeStart || byPopular[0] || byLatest[0] || completed || null
      : byPopular[0] || byLatest[0] || completed || freeStart || null;
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
  const showEntrySpotlight = Boolean(entrySpotlight) && (!isNovelPage || !hasActiveFilters);

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
                    onClick={() => router.push(`/search?q=${encodeURIComponent(item.genre)}&sort=popular`)}
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
                    {type === "comic" ? "Start here" : "Featured read"}
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
                      Open this title
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
                onClick={() => router.push("/rankings?type=popular&window=week")}
                className={secondaryButtonClass}
              >
                Browse top series
              </button>
              <button
                type="button"
                onClick={() => router.push("/rankings?type=ttf&window=all")}
                className={primaryButtonClass}
              >
                Start free
              </button>
            </div>
          </SurfacePanel>
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-slate-500">
              {filteredAndSortedSeries.length.toLocaleString()} title{filteredAndSortedSeries.length === 1 ? "" : "s"}
            </p>

            <div className={catalogGridClassName}>
              {filteredAndSortedSeries.map((item) => (
                <PortraitCard
                  key={item.id}
                  item={item}
                  tone={item.coverTone}
                  appearance="light"
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
