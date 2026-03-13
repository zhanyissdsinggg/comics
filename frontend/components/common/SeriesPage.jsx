/**
 * Generic listing page used for comics and novels.
 */

"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "../layout/SiteHeader";
import PortraitCard from "../home/PortraitCard";
import SkeletonCard from "../common/SkeletonCard";
import FilterBar from "../common/FilterBar";
import EmptyState from "../common/EmptyState";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { apiGet } from "../../lib/apiClient";

const PAGE_CONFIG = {
  comic: {
    title: "Comics",
    description: "Discover amazing comics and manga from around the world",
    emptyIcon: "search",
    emptyTitle: "No comics found",
    emptyDescription: "Try adjusting your filters or browse all comics.",
  },
  novel: {
    title: "Novels",
    description: "Discover amazing novels and web novels from talented authors",
    emptyIcon: "book",
    emptyTitle: "No novels found",
    emptyDescription: "Try adjusting your filters or browse all novels.",
  },
};

export default function SeriesPage({ type = "comic" }) {
  const router = useRouter();
  const { isAdultMode } = useAdultGateStore();
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedGenre, setSelectedGenre] = useState("all");
  const [sortBy, setSortBy] = useState("popular");
  const [status, setStatus] = useState("all");
  const config = PAGE_CONFIG[type];

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
        const filtered = (response.data?.series || []).filter((s) => s.type === type);
        setSeries(filtered);
      } catch (error) {
        console.error(`Failed to load ${type}s:`, error);
      } finally {
        setLoading(false);
      }
    }

    loadSeries();
  }, [isAdultMode, type]);

  const genres = useMemo(() => {
    const genreSet = new Set();
    series.forEach((s) => {
      if (s.genres && Array.isArray(s.genres)) {
        s.genres.forEach((g) => genreSet.add(g));
      }
    });
    return Array.from(genreSet).sort();
  }, [series]);

  const filteredAndSortedSeries = useMemo(() => {

    let result = series;

    if (selectedGenre !== "all") {
      result = result.filter(
        (s) => s.genres && s.genres.includes(selectedGenre)
      );
    }

    if (status !== "all") {
      result = result.filter((s) => {
        if (status === "completed") return s.status === "completed";
        if (status === "ongoing") return s.status !== "completed";
        return true;
      });
    }
    if (result.length === 0) {
      return result;
    }

    return [...result].sort((a, b) => {
      switch (sortBy) {
        case "latest":
          return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
        case "rating":
          return (b.rating || 0) - (a.rating || 0);
        case "trending":
          return (b.views || 0) - (a.views || 0);
        case "popular":
        default:
          return (b.followers || 0) - (a.followers || 0);
      }
    });
  }, [series, selectedGenre, sortBy, status]);

  const handleSeriesClick = useCallback((seriesId) => {
    router.push(`/series/${seriesId}`);
  }, [router]);

  const handleResetFilters = useCallback(() => {
    setSelectedGenre("all");
    setStatus("all");
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 py-8">
        {type === "comic" ? (
          <div className="mb-8 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-8 border border-emerald-500/20">
            <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              {config.title}
            </h1>
            <p className="text-neutral-300">{config.description}</p>
          </div>
        ) : (
          <div className="mb-8 rounded-3xl bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-rose-500/10 p-8 border border-purple-500/20">
            <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {config.title}
            </h1>
            <p className="text-neutral-300">{config.description}</p>
          </div>
        )}
        {!loading && (
          <div className="mb-8">
            <FilterBar
              genres={genres}
              selectedGenre={selectedGenre}
              onGenreChange={setSelectedGenre}
              sortBy={sortBy}
              onSortChange={setSortBy}
              status={status}
              onStatusChange={setStatus}
              totalCount={filteredAndSortedSeries.length}
            />
          </div>
        )}
        {loading ? (
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 15 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filteredAndSortedSeries.length === 0 ? (
          <EmptyState
            icon={config.emptyIcon}
            title={config.emptyTitle}
            description={config.emptyDescription}
            action={{
              label: "Reset Filters",
              onClick: handleResetFilters,
            }}
          />
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
      </main>
    </div>
  );
}