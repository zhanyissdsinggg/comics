/**
 * Generic listing page used for comics and novels.
 */

"use client";

import Link from "next/link";
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
    heroTitle: "Browse comics worth the tap.",
    title: "Comics",
    description: "Top Series, free starts, and standout comic reads in one place.",
    secondary: "Filter by genre, popularity, or completion.",
    emptyIcon: "search",
    emptyTitle: "No comics match this filter set",
    emptyDescription: "Reset the current filters or open Top Series to widen the selection.",
    pathname: "/comics",
    browseGuides: [
      {
        eyebrow: "Top Series",
        title: "Start with proven momentum.",
        body: "Start with the comics already pulling readers in.",
        ctaLabel: "Browse Top Series",
        href: "/rankings?type=popular&window=week",
      },
      {
        eyebrow: "Start free",
        title: "Sample the hook before you pay.",
        body: "Free first chapters are the fastest way to test art and tone.",
        ctaLabel: "See free starts",
        href: "/rankings?type=ttf&window=all",
      },
      {
        eyebrow: "Finished runs",
        title: "Binge-ready comics stay close.",
        body: "Finished runs are easier when you want payoff now.",
        ctaLabel: "See completed comics",
        href: "/comics?status=completed",
      },
    ],
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
    heroTitle: "Browse novels worth settling into.",
    title: "Novels",
    description: "Serialized novels, premium web fiction, and finished reads in one place.",
    secondary: "Sort by popularity, latest updates, or completion.",
    emptyIcon: "book",
    emptyTitle: "No novels match this filter set",
    emptyDescription: "Reset the current filters or open Top Series to find more to read.",
    pathname: "/novels",
    browseGuides: [
      {
        eyebrow: "Top Series",
        title: "Use the leaders as your entry point.",
        body: "Start with the novels already pulling readers in.",
        ctaLabel: "Browse Top Series",
        href: "/rankings?type=popular&window=week",
      },
      {
        eyebrow: "Latest updates",
        title: "Keep the catalog feeling current.",
        body: "Open recently updated novels when you want something current.",
        ctaLabel: "See latest novels",
        href: "/novels?sort=latest",
      },
      {
        eyebrow: "Finished reads",
        title: "Find a full story arc fast.",
        body: "Finished novels are the cleanest way into a longer read.",
        ctaLabel: "See completed novels",
        href: "/novels?status=completed",
      },
    ],
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

function summarizeDescription(text, fallback) {
  const source = String(text || "").replace(/\s+/g, " ").trim();
  if (!source) {
    return fallback;
  }

  if (source.length <= 138) {
    return source;
  }

  return `${source.slice(0, 135).trimEnd()}...`;
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

  const activeFilterCount = [
    selectedGenre !== "all" ? selectedGenre : "",
    status !== "all" ? status : "",
    sortBy !== "popular" ? sortBy : "",
  ].filter(Boolean).length;

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
      description: `${config.emptyDescription} If you just want a safer first click, jump to Top Series or start with free chapters.`,
    };
  }, [config.emptyDescription, config.emptyTitle, loading, series.length, type]);

  const handleSeriesClick = useCallback(
    (seriesId) => {
      router.push(`/series/${seriesId}`);
    },
    [router],
  );
  const buildSeriesHref = useCallback(
    (seriesId) => (seriesId ? `/series/${encodeURIComponent(seriesId)}` : "#"),
    [],
  );

  const handleResetFilters = useCallback(() => {
    router.replace(config.pathname);
  }, [config.pathname, router]);

  const heroStats = useMemo(
    () => [
      {
        label: "Titles",
        value: loading ? "Catalog" : series.length.toLocaleString(),
        hint:
          type === "comic"
            ? "Comic series available right now"
            : "Novel series available right now",
      },
      {
        label: "Visible",
        value: loading ? "Preview" : filteredAndSortedSeries.length.toLocaleString(),
        hint:
          activeFilterCount > 0
            ? "Titles left after the current filters"
            : "Full catalog visible right now",
      },
      {
        label: "Filters",
        value: String(activeFilterCount),
        hint:
          activeFilterCount > 0
            ? "Genre, status, or sort is shaping the list"
            : "Browsing all titles",
      },
      {
        label: "Mode",
        value: isAdultMode ? "18+" : "Standard",
        hint: isAdultMode ? "18+ titles can appear here" : "18+ titles are hidden",
      },
    ],
    [activeFilterCount, filteredAndSortedSeries.length, isAdultMode, loading, series.length, type],
  );
  const entrySpotlight = useMemo(() => {
    const byPopular = [...series].sort((left, right) => getPopularityScore(right) - getPopularityScore(left));
    const byLatest = [...series].sort((left, right) => toTimestamp(right?.updatedAt) - toTimestamp(left?.updatedAt));
    const freeStart = byPopular.find((item) => Number(item?.freeEpisodeCount || 0) > 0 || item?.hasFreeEpisodes) || null;
    const completed = byPopular.find((item) => normalizeStatus(item?.status) === "completed") || null;
    const primary =
      type === "comic"
        ? freeStart || byPopular[0] || byLatest[0] || completed || null
        : byPopular[0] || byLatest[0] || completed || freeStart || null;

    return {
      primary,
      secondary:
        type === "comic"
          ? completed || byLatest[0] || byPopular[1] || null
          : byLatest[0] || completed || freeStart || byPopular[1] || null,
      freeStart,
      completed,
    };
  }, [series, type]);
  const lowInventoryMode = !loading && series.length > 0 && (type === "novel" || series.length <= 8);
  const curatedShelfCards = useMemo(() => {
    if (!lowInventoryMode) {
      return [];
    }

    const seen = new Set();
    const cards = [];
    const byPopular = [...series].sort((left, right) => getPopularityScore(right) - getPopularityScore(left));
    const byLatest = [...series].sort((left, right) => toTimestamp(right?.updatedAt) - toTimestamp(left?.updatedAt));

    const pushCard = (seriesItem, config) => {
      if (!seriesItem?.id || seen.has(seriesItem.id)) {
        return;
      }
      seen.add(seriesItem.id);
      cards.push({
        ...config,
        series: seriesItem,
      });
    };

    const companionPick =
      byPopular.find(
        (item) =>
          item?.id !== entrySpotlight.primary?.id &&
          item?.id !== entrySpotlight.completed?.id &&
          item?.id !== entrySpotlight.freeStart?.id,
      ) || null;

    pushCard(entrySpotlight.primary, {
      eyebrow: type === "novel" ? "Best first read" : "Safest first click",
      title:
        type === "novel"
          ? "Start with the novel carrying the strongest signal."
          : "Start with the title most likely to land fast.",
      ctaLabel: "Open this title",
      fallbackDescription:
        type === "novel"
          ? "If you only open one title from this shelf first, make it the one already pulling the best signal."
          : "When the shelf is compact, lead with the title already doing the clearest job of pulling readers in.",
    });

    pushCard(
      type === "novel" ? entrySpotlight.secondary || byLatest[0] : companionPick || entrySpotlight.secondary,
      {
        eyebrow: type === "novel" ? "Next up" : "If you want a second option",
        title:
          type === "novel"
            ? "Keep one contrast pick nearby."
            : "Compare one neighboring title before you commit.",
        ctaLabel: "Compare this title",
        fallbackDescription:
          type === "novel"
            ? "A smaller novel shelf reads better when you have one backup pick with a different rhythm or status."
            : "A second strong option keeps the catalog from feeling thinner than it really is.",
      },
    );

    pushCard(entrySpotlight.completed || entrySpotlight.freeStart || byLatest[0], {
      eyebrow:
        entrySpotlight.completed || normalizeStatus(entrySpotlight.completed?.status) === "completed"
          ? "Finished pick"
          : entrySpotlight.freeStart
            ? "Start free"
            : "Fresh update",
      title:
        entrySpotlight.completed
          ? "Keep a payoff-ready option close."
          : entrySpotlight.freeStart
            ? "Keep one low-risk entry point in view."
            : "Keep a current title nearby.",
      ctaLabel: "Open this title",
      fallbackDescription:
        entrySpotlight.completed
          ? "Completed runs work well when you want the cleaner commitment from a small shelf."
          : entrySpotlight.freeStart
            ? "Free starts make the first click easier when you are still deciding if the shelf is for you."
            : "A fresh update keeps the shelf from feeling static.",
    });

    return cards.slice(0, 3);
  }, [entrySpotlight.completed, entrySpotlight.freeStart, entrySpotlight.primary, entrySpotlight.secondary, lowInventoryMode, series, type]);
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

  return (
    <main className="gush-page-shell overflow-hidden">
      <div className="gush-page-ambient" />
      <SiteHeader variant="light" />

      <div className="gush-page-main gush-section-stack">
        <EditorialHero
          eyebrow={config.eyebrow}
          title={config.heroTitle}
          description={config.description}
          secondary={config.secondary}
          stats={heroStats}
          appearance="light"
          actions={
            <>
              <button
                type="button"
                onClick={() => router.push("/search")}
                className={primaryButtonClass}
              >
                Search all series
              </button>
              <button
                type="button"
                onClick={() => router.push("/rankings")}
                className={secondaryButtonClass}
              >
                Browse Top Series
              </button>
            </>
          }
        />

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
        ) : discoveryShelves.length > 0 ? (
          <section className="grid gap-4 xl:grid-cols-2">
            {discoveryShelves.map((shelf) => (
              <SurfacePanel key={shelf.id} className="space-y-5" appearance="light" accent="blue">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div className="max-w-2xl">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                      {shelf.eyebrow}
                    </p>
                    <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                      {shelf.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{shelf.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push(shelf.href)}
                    className={secondaryButtonClass}
                  >
                    {shelf.ctaLabel}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {shelf.items.map((item) => (
                    <PortraitCard
                      key={`${shelf.id}-${item.id}`}
                      item={item}
                      tone={item.coverTone}
                      appearance="light"
                      onClick={() => handleSeriesClick(item.id)}
                    />
                  ))}
                </div>
              </SurfacePanel>
            ))}
          </section>
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
                    <p className="mt-3 text-sm leading-7 text-slate-600">{card.body}</p>
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
                  Quick browse
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                  Quick genre picks
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Open a genre and jump straight into the catalog.
                </p>
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
                    {item.count ? <span className="ml-2 text-xs text-slate-400">{item.count}</span> : null}
                  </button>
                ))}
              </div>

            </SurfacePanel>
          </section>
        ) : null}

        {!loading && entrySpotlight.primary ? (
          <section className="grid gap-4 xl:grid-cols-[1.04fr_0.96fr]">
            <SurfacePanel className="space-y-5" appearance="light" accent="blue">
              <div className="grid gap-4 sm:grid-cols-[200px_minmax(0,1fr)] sm:items-start">
                <Cover
                  tone={entrySpotlight.primary.coverTone}
                  coverUrl={entrySpotlight.primary.coverUrl}
                  label={entrySpotlight.primary.title}
                  eyebrow={type === "comic" ? "Best first click" : "Best place to settle in"}
                  badge={getSeriesBadge(entrySpotlight.primary)}
                  genres={entrySpotlight.primary.genres}
                  seriesType={entrySpotlight.primary.type}
                  className="mx-auto aspect-[3/4] w-full max-w-[210px] rounded-[24px] sm:mx-0"
                />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                    {type === "comic" ? "Best first click" : "Best place to settle in"}
                  </p>
                  <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-slate-950">
                    {entrySpotlight.primary.title}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {type === "comic"
                      ? "If you want the fastest way into this catalog, start with a book that already has momentum or free entry."
                      : "If you want a novel worth sinking into, start with the book that already has the strongest signal in this shelf."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.08)] px-3 py-1.5 text-xs font-semibold text-[var(--gush-accent,#2f6bff)]">
                      {getSeriesSubtitle(entrySpotlight.primary)}
                    </span>
                    {getSeriesBadge(entrySpotlight.primary) ? (
                      <span className="rounded-full border border-black/8 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                        {getSeriesBadge(entrySpotlight.primary)}
                      </span>
                    ) : null}
                    {Array.isArray(entrySpotlight.primary.genres) && entrySpotlight.primary.genres.length > 0 ? (
                      <span className="rounded-full border border-black/8 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                        {entrySpotlight.primary.genres.slice(0, 2).join(" / ")}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => handleSeriesClick(entrySpotlight.primary.id)}
                      className={primaryButtonClass}
                    >
                      Open this title
                    </button>
                    {entrySpotlight.freeStart ? (
                      <button
                        type="button"
                        onClick={() => handleSeriesClick(entrySpotlight.freeStart.id)}
                        className={secondaryButtonClass}
                      >
                        Start with free chapters
                      </button>
                    ) : null}
                    {entrySpotlight.completed ? (
                      <button
                        type="button"
                        onClick={() => handleSeriesClick(entrySpotlight.completed.id)}
                        className={secondaryButtonClass}
                      >
                        Try a finished read
                      </button>
                    ) : null}
                  </div>
                  {entrySpotlight.secondary ? (
                    <div className="mt-5 rounded-[22px] border border-black/6 bg-[#f8f9fc] px-4 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                        Next good click
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-950">{entrySpotlight.secondary.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{getSeriesSubtitle(entrySpotlight.secondary)}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </SurfacePanel>

            <div className="grid gap-4">
              <SurfacePanel className="space-y-4" appearance="light" accent="blue">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                    Quick genre picks
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                    Browse by genre.
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {genreQuickPicks.map((item) => (
                    <button
                      key={item.genre}
                      type="button"
                      onClick={() => updateParams({ genre: item.genre })}
                      className="rounded-full border border-black/8 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc] hover:text-slate-950"
                    >
                      {item.genre}
                      <span className="ml-2 text-xs text-slate-400">{item.count}</span>
                    </button>
                  ))}
                </div>
              </SurfacePanel>

              {Array.isArray(config.browseGuides) && config.browseGuides.length > 0 ? (
                <SurfacePanel className="space-y-4" appearance="light" accent="blue">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                      Best lanes
                    </p>
                    <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                      Start with a lane.
                    </h2>
                  </div>
                  <div className="space-y-3">
                    {config.browseGuides.map((item) => (
                      <div
                        key={item.title}
                        className="rounded-[20px] border border-black/6 bg-white/88 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                          {item.eyebrow}
                        </p>
                        <h3 className="mt-2 text-base font-semibold text-slate-950">{item.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                        <button
                          type="button"
                          onClick={() => router.push(item.href)}
                          className={`mt-3 ${secondaryButtonClass}`}
                        >
                          {item.ctaLabel}
                        </button>
                      </div>
                    ))}
                  </div>
                </SurfacePanel>
              ) : null}
            </div>
          </section>
        ) : null}

        {curatedShelfCards.length > 0 ? (
          <SurfacePanel className="space-y-5" appearance="light" accent="blue">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Curated starts
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  {type === "novel"
                    ? "This novel shelf is small enough to curate."
                    : "A compact shelf should still feel deliberate."}
                </h2>
              </div>
              <p className="text-sm text-slate-500">
                {type === "novel"
                  ? "Use these three picks to get into the catalog without making the page feel thin."
                  : "A tighter catalog still needs a few distinct ways in."}
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {curatedShelfCards.map((card) => {
                const item = card.series;
                return (
                  <Link
                    key={`curated-${card.eyebrow}-${item.id}`}
                    href={buildSeriesHref(item.id)}
                    className="group block rounded-[28px] border border-black/6 bg-white p-4 text-left shadow-[0_18px_42px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-black/10 hover:shadow-[0_22px_48px_rgba(15,23,42,0.08)]"
                    aria-label={`Open ${item.title}`}
                  >
                    <Cover
                      tone={item.coverTone}
                      coverUrl={item.coverUrl}
                      label={item.title}
                      eyebrow={card.eyebrow}
                      badge={getSeriesBadge(item)}
                      genres={item.genres}
                      seriesType={item.type}
                      className="aspect-[3/4] w-full rounded-[22px]"
                    />
                    <div className="mt-4 space-y-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                          {card.eyebrow}
                        </p>
                        <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{item.title}</h3>
                      </div>
                      <p className="text-sm leading-6 text-slate-600">
                        {summarizeDescription(item.description, card.fallbackDescription)}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.08)] px-3 py-1 text-xs font-semibold text-[var(--gush-accent,#2f6bff)]">
                          {getSeriesSubtitle(item)}
                        </span>
                        {getSeriesBadge(item) ? (
                          <span className="rounded-full border border-black/8 bg-[#f8f9fc] px-3 py-1 text-xs text-slate-600">
                            {getSeriesBadge(item)}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs font-semibold text-slate-950">{card.ctaLabel}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </SurfacePanel>
        ) : null}

        <SurfacePanel className="space-y-5" appearance="light" accent="blue">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Filters
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                Refine the catalog.
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              {loading
                ? "Refreshing catalog..."
                : `${filteredAndSortedSeries.length} title${filteredAndSortedSeries.length === 1 ? "" : "s"} visible`}
            </p>
          </div>

          <FilterBar
            genres={genres}
            selectedGenre={selectedGenre}
            onGenreChange={(value) => updateParams({ genre: value })}
            sortBy={sortBy}
            onSortChange={(value) => updateParams({ sort: value })}
            status={status}
            onStatusChange={(value) => updateParams({ status: value })}
            totalCount={filteredAndSortedSeries.length}
            loading={loading}
            onReset={handleResetFilters}
            appearance="light"
          />
        </SurfacePanel>

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
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Full catalog grid
                </p>
                <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-slate-950">
                  {filteredAndSortedSeries.length.toLocaleString()} titles in view.
                </h2>
              </div>
              <p className="text-sm text-slate-500">
                Sorted by {sortBy === "latest" ? "Latest" : "Popular"}
              </p>
            </div>

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
