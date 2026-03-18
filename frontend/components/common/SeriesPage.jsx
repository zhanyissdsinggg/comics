/**
 * Generic listing page used for comics and novels.
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SiteHeader from "../layout/SiteHeader";
import PortraitCard from "../home/PortraitCard";
import SkeletonCard from "../common/SkeletonCard";
import FilterBar from "../common/FilterBar";
import EmptyState from "../common/EmptyState";
import EditorialHero from "../common/EditorialHero";
import SurfacePanel from "../common/SurfacePanel";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { apiGet } from "../../lib/apiClient";

const PAGE_CONFIG = {
  comic: {
    eyebrow: "Comics",
    heroTitle: "Browse comics with faster first clicks.",
    title: "Comics",
    description: "Browse Top Series, completed binge picks, and standout comic series in one place.",
    secondary:
      "Use filters to narrow by genre, popularity, or completion status and jump in when something clicks.",
    emptyIcon: "search",
    emptyTitle: "No comics match this filter set",
    emptyDescription: "Reset the current filters or open Top Series to widen the selection.",
    pathname: "/comics",
    browseGuides: [
      {
        eyebrow: "Top Series",
        title: "Start with proven momentum.",
        body: "If you want the safest comic first click, Top Series is still the easiest place to begin.",
        ctaLabel: "Browse Top Series",
        href: "/rankings?type=popular&window=week",
      },
      {
        eyebrow: "Start free",
        title: "Sample the hook before you pay.",
        body: "Free first chapters are the fastest way to test pacing, art, and tone without guessing.",
        ctaLabel: "See free starts",
        href: "/rankings?type=ttf&window=all",
      },
      {
        eyebrow: "Finished runs",
        title: "Binge-ready comics stay close.",
        body: "Completed series work better when you want payoff now instead of waiting on future updates.",
        ctaLabel: "See completed comics",
        href: "/comics?status=completed",
      },
    ],
  },
  novel: {
    eyebrow: "Novels",
    heroTitle: "Browse novels with room to settle in.",
    title: "Novels",
    description: "Browse serialized novels, premium web fiction, and long-form stories in one place.",
    secondary:
      "Sort by popularity or latest updates, narrow by genre, and find finished reads faster.",
    emptyIcon: "book",
    emptyTitle: "No novels match this filter set",
    emptyDescription: "Reset the current filters or open Top Series to find more to read.",
    pathname: "/novels",
    browseGuides: [
      {
        eyebrow: "Top Series",
        title: "Use the leaders as your entry point.",
        body: "When a novel catalog feels too wide, Top Series narrows it down to safer starts.",
        ctaLabel: "Browse Top Series",
        href: "/rankings?type=popular&window=week",
      },
      {
        eyebrow: "Latest updates",
        title: "Keep the catalog feeling current.",
        body: "Open recently updated novels when you want active stories instead of back-catalog drift.",
        ctaLabel: "See latest novels",
        href: "/novels?sort=latest",
      },
      {
        eyebrow: "Finished reads",
        title: "Find a full story arc fast.",
        body: "Completed novels are still the cleanest first choice when you want to settle into a longer read.",
        ctaLabel: "See completed novels",
        href: "/novels?status=completed",
      },
    ],
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
    coverUrl: series.coverUrl,
    coverTone: series.coverTone,
    badge: getSeriesBadge(series),
  };
}

export default function SeriesPage({ type = "comic" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAdultMode } = useAdultGateStore();
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const config = PAGE_CONFIG[type] || PAGE_CONFIG.comic;

  const selectedGenre = searchParams.get("genre") || "all";
  const sortBy = searchParams.get("sort") || "popular";
  const status = searchParams.get("status") || "all";

  useEffect(() => {
    async function loadSeries() {
      try {
        setLoading(true);
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
  }, [isAdultMode, type]);

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
        description:
          "The easiest first click for a new reader. Sample the hook before spending points.",
        ctaLabel: "Start reading free",
        href: "/rankings?type=ttf&window=all",
        items: freeStart,
      },
      {
        id: "trending",
        eyebrow: "Trending now",
        title: `Popular ${config.title.toLowerCase()}`,
        description:
          "These titles already have reader momentum, so they are safer entry points than random catalog picks.",
        ctaLabel: "Browse Top Series",
        href: "/rankings?type=popular&window=week",
        items: trending,
      },
      {
        id: "latest",
        eyebrow: "New updates",
        title: "Fresh drops",
        description:
          "Open the most recently updated titles if you want the catalog to feel current instead of static.",
        ctaLabel: "See latest",
        href: `${config.pathname}?sort=latest`,
        items: latest,
      },
      {
        id: "completed",
        eyebrow: "Binge ready",
        title: "Completed picks",
        description:
          "Finished runs are easier first reads when you want payoff without waiting on updates.",
        ctaLabel: "See finished reads",
        href: `${config.pathname}?status=completed`,
        items: completed,
      },
    ].filter((shelf) => shelf.items.length > 0);
  }, [config.pathname, config.title, series]);

  const handleSeriesClick = useCallback(
    (seriesId) => {
      router.push(`/series/${seriesId}`);
    },
    [router],
  );

  const handleResetFilters = useCallback(() => {
    router.replace(config.pathname);
  }, [config.pathname, router]);

  const heroStats = useMemo(
    () => [
      {
        label: "Titles",
        value: loading ? "--" : series.length.toLocaleString(),
        hint:
          type === "comic"
            ? "Comic series available right now"
            : "Novel series available right now",
      },
      {
        label: "Visible",
        value: loading ? "--" : filteredAndSortedSeries.length.toLocaleString(),
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
  const primaryButtonClass =
    "rounded-full bg-slate-950 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800";
  const secondaryButtonClass =
    "rounded-full border border-black/8 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f4f6fb] text-slate-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.1),transparent_24%),linear-gradient(180deg,#eef2f9_0%,#f4f6fb_72%)]" />
      <SiteHeader variant="light" />

      <div className="relative mx-auto max-w-[1280px] space-y-6 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
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
                Top Series
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
        ) : null}

        {!loading && Array.isArray(config.browseGuides) && config.browseGuides.length > 0 ? (
          <section className="grid gap-4 xl:grid-cols-3">
            {config.browseGuides.map((item) => (
              <SurfacePanel key={item.title} className="space-y-4" appearance="light" accent="blue">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                    {item.eyebrow}
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                    {item.title}
                  </h2>
                </div>
                <p className="text-sm leading-7 text-slate-600">{item.body}</p>
                <button
                  type="button"
                  onClick={() => router.push(item.href)}
                  className={secondaryButtonClass}
                >
                  {item.ctaLabel}
                </button>
              </SurfacePanel>
            ))}
          </section>
        ) : null}

        <SurfacePanel className="space-y-5" appearance="light" accent="blue">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Filters
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                Refine the catalog without losing your place.
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              {loading
                ? "Getting the catalog ready..."
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
              title={config.emptyTitle}
              description={`${config.emptyDescription} If you just want a safer first click, jump to Top Series or start with free chapters.`}
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

            <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
