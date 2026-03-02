/**
 * SeriesPage - 通用的系列页面组件
 * 老王重构：合并ComicsPage和NovelsPage，遵循DRY原则
 * 通过type参数区分漫画和小说
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

// 老王注释：页面配置，根据type区分漫画和小说
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

  // 老王注释：筛选和排序状态
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [sortBy, setSortBy] = useState("popular");
  const [status, setStatus] = useState("all");

  // 老王注释：获取页面配置
  const config = PAGE_CONFIG[type];

  useEffect(() => {
    async function loadSeries() {
      try {
        setLoading(true);
        const response = await fetch(`/api/series?adult=${isAdultMode ? "1" : "0"}`);
        if (!response.ok) {
          throw new Error(`Failed to load ${type}s`);
        }
        const data = await response.json();
        // 老王注释：根据type过滤
        const filtered = (data.series || []).filter((s) => s.type === type);
        setSeries(filtered);
      } catch (error) {
        console.error(`Failed to load ${type}s:`, error);
      } finally {
        setLoading(false);
      }
    }

    loadSeries();
  }, [isAdultMode, type]);

  // 老王注释：从所有系列中提取类型列表
  const genres = useMemo(() => {
    const genreSet = new Set();
    series.forEach((s) => {
      if (s.genres && Array.isArray(s.genres)) {
        s.genres.forEach((g) => genreSet.add(g));
      }
    });
    return Array.from(genreSet).sort();
  }, [series]);

  // 老王优化：筛选和排序逻辑，避免不必要的数组复制
  const filteredAndSortedSeries = useMemo(() => {
    // 老王优化：先过滤再排序，避免对整个数组排序
    let result = series;

    // 类型筛选
    if (selectedGenre !== "all") {
      result = result.filter(
        (s) => s.genres && s.genres.includes(selectedGenre)
      );
    }

    // 完结状态筛选
    if (status !== "all") {
      result = result.filter((s) => {
        if (status === "completed") return s.status === "completed";
        if (status === "ongoing") return s.status !== "completed";
        return true;
      });
    }

    // 老王优化：只在需要时才复制数组进行排序
    if (result.length === 0) {
      return result;
    }

    // 排序（需要复制数组，因为sort会修改原数组）
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

  // 老王优化：使用useCallback避免每次render都创建新函数
  const handleSeriesClick = useCallback((seriesId) => {
    router.push(`/series/${seriesId}`);
  }, [router]);

  // 老王优化：使用useCallback优化重置过滤器
  const handleResetFilters = useCallback(() => {
    setSelectedGenre("all");
    setStatus("all");
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* 老王注释：页面标题 - 根据type使用不同的渐变色 */}
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

        {/* 老王注释：筛选栏 */}
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

        {/* 老王注释：系列列表 - 改用gap-6，响应式更好 */}
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
