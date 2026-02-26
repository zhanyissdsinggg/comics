/**
 * ComicsPage - 漫画专区页面
 * 老王注释：专门展示漫画内容的页面，带筛选和排序功能
 */

"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "../layout/SiteHeader";
import PortraitCard from "../home/PortraitCard";
import Skeleton from "../common/Skeleton";
import FilterBar from "../common/FilterBar";
import { useAdultGateStore } from "../../store/useAdultGateStore";

export default function ComicsPage() {
  const router = useRouter();
  const { isAdultMode } = useAdultGateStore();
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);

  // 老王注释：筛选和排序状态
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [sortBy, setSortBy] = useState("popular");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    async function loadComics() {
      try {
        setLoading(true);
        const response = await fetch(`/api/series?adult=${isAdultMode ? "1" : "0"}`);
        if (!response.ok) {
          throw new Error("Failed to load comics");
        }
        const data = await response.json();
        // 老王注释：只显示漫画类型
        const comics = (data.series || []).filter((s) => s.type === "comic");
        setSeries(comics);
      } catch (error) {
        console.error("Failed to load comics:", error);
      } finally {
        setLoading(false);
      }
    }

    loadComics();
  }, [isAdultMode]);

  // 老王注释：从所有漫画中提取类型列表
  const genres = useMemo(() => {
    const genreSet = new Set();
    series.forEach((s) => {
      if (s.genres && Array.isArray(s.genres)) {
        s.genres.forEach((g) => genreSet.add(g));
      }
    });
    return Array.from(genreSet).sort();
  }, [series]);

  // 老王注释：筛选和排序逻辑
  const filteredAndSortedSeries = useMemo(() => {
    let result = [...series];

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

    // 排序
    result.sort((a, b) => {
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

    return result;
  }, [series, selectedGenre, sortBy, status]);

  return (
    <div className="min-h-screen bg-neutral-950">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* 老王注释：页面标题 - 加了渐变背景 */}
        <div className="mb-8 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-8 border border-emerald-500/20">
          <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Comics
          </h1>
          <p className="text-neutral-300">Discover amazing comics and manga from around the world</p>
        </div>

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

        {/* 老王注释：漫画列表 - 改用gap-6，响应式更好 */}
        {loading ? (
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 15 }).map((_, i) => (
              <Skeleton key={i} className="h-72 w-full rounded-2xl" />
            ))}
          </div>
        ) : filteredAndSortedSeries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-6xl mb-4">📚</div>
            <p className="text-neutral-400 text-lg mb-2">No comics found</p>
            <p className="text-neutral-500 text-sm mb-6">Try adjusting your filters</p>
            <button
              onClick={() => {
                setSelectedGenre("all");
                setStatus("all");
              }}
              className="rounded-2xl bg-emerald-500 px-6 py-3 text-white hover:bg-emerald-600 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredAndSortedSeries.map((item) => (
              <PortraitCard
                key={item.id}
                item={item}
                tone={item.coverTone}
                onClick={() => router.push(`/series/${item.id}`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
