/**
 * Generic editorial listing page used for comics and novels.
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
    title: "Comics",
    description: "Follow weekly hits, completed binge picks, and polished creator-led comic releases in one clean shelf.",
    secondary: "Use editorial filters instead of endless category pages and jump into a series the moment the fit feels right.",
    emptyIcon: "search",
    emptyTitle: "No comics match this filter set",
    emptyDescription: "Reset the current filters or move to rankings to widen the shelf.",
    pathname: "/comics",
  },
  novel: {
    title: "Novels",
    description: "Browse serialized novels, premium web fiction, and long-form story lanes without losing the storefront rhythm.",
    secondary: "Sort for momentum, tighten by genre, and surface finished reads before the browsing session cools off.",
    emptyIcon: "book",
    emptyTitle: "No novels match this filter set",
    emptyDescription: "Reset the current filters or move to rankings to reopen discovery.",
    pathname: "/novels",
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

  const heroStats = useMemo(
    () => [
      {
        label: "Titles",
        value: loading ? "--" : series.length.toLocaleString(),
        hint: type === "comic" ? "Comic series live in this storefront lane" : "Novel series live in this storefront lane",
      },
      {
        label: "Visible",
        value: loading ? "--" : filteredAndSortedSeries.length.toLocaleString(),
        hint: activeFilterCount > 0 ? "Titles left after the active filter set" : "Full shelf visible right now",
      },
      {
        label: "Filters",
        value: String(activeFilterCount),
        hint: activeFilterCount > 0 ? "Genre, status, or sort is shaping the list" : "Broad browse mode",
      },
      {
        label: "Mode",
        value: isAdultMode ? "18+" : "Standard",
        hint: isAdultMode ? "Protected catalog slice can appear here" : "Age-gated titles are hidden",
      },
    ],
    [activeFilterCount, filteredAndSortedSeries.length, isAdultMode, loading, series.length, type],
  );

  const handleSeriesClick = useCallback(
    (seriesId) => {
      router.push(`/series/${seriesId}`);
    },
    [router],
  );

  const handleResetFilters = useCallback(() => {
    router.replace(config.pathname);
  }, [config.pathname, router]);

  return (
    <main className="min-h-screen bg-transparent text-neutral-100">
      <SiteHeader />

      <div className="mx-auto max-w-[1280px] space-y-6 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <EditorialHero
          eyebrow={type === "comic" ? "Comic desk" : "Novel desk"}
          title={`Browse ${config.title.toLowerCase()} with a cleaner editorial lane.`}
          description={config.description}
          secondary={config.secondary}
          stats={heroStats}
          actions={
            <>
              <button
                type="button"
                onClick={() => router.push("/search")}
                className="rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-neutral-950 transition hover:bg-neutral-200"
              >
                Search titles
              </button>
              <button
                type="button"
                onClick={() => router.push("/rankings")}
                className="rounded-full border border-white/10 bg-black/10 px-4 py-2 text-xs font-semibold text-neutral-200 transition hover:border-white/20 hover:bg-white/10"
              >
                Open rankings
              </button>
            </>
          }
        />

        <SurfacePanel className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                Shelf controls
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
                Tighten the browse lane without losing momentum.
              </h2>
            </div>
            <p className="text-xs text-neutral-500">
              {loading ? "Loading titles..." : `${filteredAndSortedSeries.length} title${filteredAndSortedSeries.length === 1 ? "" : "s"} visible`}
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
          />
        </SurfacePanel>

        {loading ? (
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 15 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        ) : filteredAndSortedSeries.length === 0 ? (
          <SurfacePanel>
            <EmptyState
              icon={config.emptyIcon}
              title={config.emptyTitle}
              description={config.emptyDescription}
              action={{
                label: "Reset filters",
                onClick: handleResetFilters,
              }}
            />
          </SurfacePanel>
        ) : (
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredAndSortedSeries.map((item) => (
              <PortraitCard
                key={item.id}
                item={item}
                tone={item.coverTone}
                onClick={() => handleSeriesClick(item.id)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
