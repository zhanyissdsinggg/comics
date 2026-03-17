/**
 * Generic listing page used for comics and novels.
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Compass, Flame, Sparkles } from "lucide-react";
import SiteHeader from "../layout/SiteHeader";
import PortraitCard from "../home/PortraitCard";
import SkeletonCard from "../common/SkeletonCard";
import FilterBar from "../common/FilterBar";
import EmptyState from "../common/EmptyState";
import EditorialHero from "../common/EditorialHero";
import SurfacePanel from "../common/SurfacePanel";
import Cover from "../common/Cover";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { apiGet } from "../../lib/apiClient";

const PAGE_CONFIG = {
  comic: {
    title: "Comics",
    description: "Browse weekly hits, completed binge picks, and standout comic series in one place.",
    secondary:
      "Use filters to narrow by genre, popularity, or completion status and jump in when something clicks.",
    emptyIcon: "search",
    emptyTitle: "No comics match this filter set",
    emptyDescription: "Reset the current filters or open the charts to widen the selection.",
    pathname: "/comics",
  },
  novel: {
    title: "Novels",
    description: "Browse serialized novels, premium web fiction, and long-form stories in one place.",
    secondary:
      "Sort by popularity or latest updates, narrow by genre, and find finished reads faster.",
    emptyIcon: "book",
    emptyTitle: "No novels match this filter set",
    emptyDescription: "Reset the current filters or open the charts to find more to read.",
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

function formatSeriesMeta(series) {
  const typeLabel = String(series.type || "").trim();
  const statusLabel = String(series.status || "").trim();
  const rating = Number(series.rating);
  const ratingLabel = Number.isFinite(rating) && rating > 0 ? `Rating ${rating.toFixed(1)}` : "";
  const genres = Array.isArray(series.genres) ? series.genres.slice(0, 2).join(" / ") : "";

  return [typeLabel, statusLabel, ratingLabel, genres].filter(Boolean).join(" | ");
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

  const spotlightSeries = useMemo(
    () => filteredAndSortedSeries.slice(0, 3),
    [filteredAndSortedSeries],
  );
  const leadSpotlight = spotlightSeries[0] || null;
  const supportSpotlights = spotlightSeries.slice(1);

  const discoveryCards = useMemo(
    () => [
      {
        id: "chart",
        eyebrow: "See the heat",
        title: type === "comic" ? "Open the live comic chart." : "Open the live novel chart.",
        description:
          type === "comic"
            ? "Charts surface the titles readers are opening right now, which is the fastest way to find heat."
            : "Charts help you compare current novel momentum before you commit to a longer read.",
        onClick: () => router.push("/rankings"),
        accentClass:
          "border-white/10 bg-white/[0.04] text-neutral-100 hover:border-white/20 hover:bg-white/[0.08]",
      },
      {
        id: "search",
        eyebrow: "Search deep",
        title: "Jump into the full search when you want more control.",
        description:
          "Use the broader search experience when you need tighter genre, type, and ranking combinations.",
        onClick: () => router.push("/search"),
        accentClass:
          "border-white/10 bg-white/[0.04] text-neutral-100 hover:border-white/20 hover:bg-white/[0.08]",
      },
      {
        id: "filter",
        eyebrow: activeFilterCount > 0 ? "Filters active" : "Wide open",
        title:
          activeFilterCount > 0
            ? `${activeFilterCount} active filter${activeFilterCount === 1 ? "" : "s"} shaping this list.`
            : "Nothing is hidden right now.",
        description:
          activeFilterCount > 0
            ? "Reset the current view when you want to widen discovery instead of staying inside a narrow slice."
            : "Use genre and status only when you know the mood you want. Otherwise, this is already the broadest shelf.",
        onClick: () => {
          if (activeFilterCount > 0) {
            handleResetFilters();
            return;
          }

          router.push("/rankings?type=popular&window=week");
        },
        accentClass:
          activeFilterCount > 0
            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200 hover:border-emerald-300/50 hover:bg-emerald-400/15"
            : "border-white/10 bg-white/[0.04] text-neutral-100 hover:border-white/20 hover:bg-white/[0.08]",
      },
    ],
    [activeFilterCount, handleResetFilters, router, type],
  );

  return (
    <main className="min-h-screen bg-transparent text-neutral-100">
      <SiteHeader />

      <div className="mx-auto max-w-[1280px] space-y-6 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <EditorialHero
          eyebrow={type === "comic" ? "Comics" : "Novels"}
          title={`Browse ${config.title.toLowerCase()} in one place.`}
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
                Search all series
              </button>
              <button
                type="button"
                onClick={() => router.push("/rankings")}
                className="rounded-full border border-white/10 bg-black/10 px-4 py-2 text-xs font-semibold text-neutral-200 transition hover:border-white/20 hover:bg-white/10"
              >
                See charts
              </button>
            </>
          }
        />

        <SurfacePanel className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                Filters
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
                Narrow the list without losing the storefront feel.
              </h2>
            </div>
            <p className="text-xs text-neutral-500">
              {loading
                ? "Loading titles..."
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
          <div className="space-y-6">
            {leadSpotlight ? (
              <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
                <SurfacePanel className="relative overflow-hidden p-0">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_30%),radial-gradient(circle_at_82%_0%,rgba(56,189,248,0.16),transparent_24%)]" />
                  <button
                    type="button"
                    onClick={() => handleSeriesClick(leadSpotlight.id)}
                    className="relative block h-full w-full text-left"
                  >
                    <div className="grid gap-0 lg:grid-cols-[0.94fr_1.06fr]">
                      <div className="relative min-h-[320px] overflow-hidden lg:min-h-[100%]">
                        <Cover
                          tone={leadSpotlight.coverTone}
                          coverUrl={leadSpotlight.coverUrl}
                          className="absolute inset-0 h-full w-full"
                        />
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,8,13,0.14),rgba(5,8,13,0.78))]" />
                      </div>

                      <div className="relative p-5 sm:p-6">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.1] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-100">
                            {activeFilterCount > 0 ? "Filtered spotlight" : "Editorial spotlight"}
                          </span>
                          {leadSpotlight.badge ? (
                            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-200">
                              {leadSpotlight.badge}
                            </span>
                          ) : null}
                        </div>

                        <h2 className="mt-4 max-w-2xl font-display text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
                          {leadSpotlight.title}
                        </h2>
                        <p className="mt-4 text-sm leading-7 text-neutral-300">
                          {leadSpotlight.description ||
                            "Lead with the strongest title in the current browse view, then branch out once the tone and genre feel right."}
                        </p>

                        <div className="mt-5 flex flex-wrap gap-2">
                          {(leadSpotlight.genres || []).slice(0, 4).map((genre) => (
                            <span
                              key={genre}
                              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-neutral-300"
                            >
                              {genre}
                            </span>
                          ))}
                        </div>

                        <div className="mt-5 rounded-[24px] border border-white/10 bg-black/20 px-4 py-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">
                            Reader snapshot
                          </p>
                          <p className="mt-3 text-sm leading-7 text-neutral-300">
                            {formatSeriesMeta(leadSpotlight) ||
                              "Premium catalog pick surfaced from the current browse view."}
                          </p>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-3">
                          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-neutral-950">
                            Open series
                            <ArrowRight size={16} />
                          </span>
                          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-neutral-200">
                            <Compass size={16} />
                            Browse similar
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                </SurfacePanel>

                <div className="grid gap-6">
                  <SurfacePanel className="space-y-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                        Quick routes
                      </p>
                      <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
                        Keep discovery moving.
                      </h2>
                    </div>

                    <div className="grid gap-3">
                      {discoveryCards.map((card, index) => {
                        const Icon = index === 0 ? Flame : index === 1 ? Compass : Sparkles;

                        return (
                          <button
                            key={card.id}
                            type="button"
                            onClick={card.onClick}
                            className={`rounded-[24px] border p-4 text-left transition hover:-translate-y-1 ${card.accentClass}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-current opacity-75">
                                  {card.eyebrow}
                                </p>
                                <h3 className="mt-3 text-lg font-semibold text-white">
                                  {card.title}
                                </h3>
                              </div>
                              <Icon size={18} className="mt-1 shrink-0 text-current" />
                            </div>
                            <p className="mt-3 text-sm leading-7 text-neutral-300">{card.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </SurfacePanel>

                  {supportSpotlights.length > 0 ? (
                    <SurfacePanel className="space-y-4">
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                            Start here next
                          </p>
                          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
                            Two more strong picks.
                          </h2>
                        </div>
                        <p className="text-xs text-neutral-500">Top filtered titles</p>
                      </div>

                      <div className="grid gap-3">
                        {supportSpotlights.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSeriesClick(item.id)}
                            className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-left transition hover:border-white/20 hover:bg-white/[0.06]"
                          >
                            <div className="grid gap-4 sm:grid-cols-[96px_minmax(0,1fr)] sm:items-center">
                              <div className="overflow-hidden rounded-[20px] border border-white/10">
                                <Cover
                                  tone={item.coverTone}
                                  coverUrl={item.coverUrl}
                                  className="h-28 w-full"
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">
                                  {item.badge || "Series pick"}
                                </p>
                                <h3 className="mt-2 text-lg font-semibold text-white">{item.title}</h3>
                                <p className="mt-2 text-sm leading-6 text-neutral-400">
                                  {formatSeriesMeta(item)}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </SurfacePanel>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-500">
                  Full catalog grid
                </p>
                <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-white">
                  {filteredAndSortedSeries.length.toLocaleString()} titles in view.
                </h2>
              </div>
              <p className="text-sm text-neutral-400">
                Sorted by {sortBy === "latest" ? "Latest" : "Popular"}
              </p>
            </div>

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
          </div>
        )}
      </div>
    </main>
  );
}
