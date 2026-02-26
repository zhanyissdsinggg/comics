/**
 * SimilarSeriesSection - 相似作品推荐组件
 *
 * 老王说：这个组件在详情页展示相似作品，基于AI内容相似度算法
 */

"use client";

import { useRouter } from "next/navigation";
import { useSimilarRecommendations } from "../../hooks/useAIRecommendations";
import Skeleton from "../common/Skeleton";

export default function SimilarSeriesSection({ seriesId }) {
  const router = useRouter();
  const { data: similarSeries, loading, error } = useSimilarRecommendations(seriesId, 6);

  if (loading) {
    return (
      <div className="mt-8">
        <h2 className="text-xl font-bold text-white mb-4">🤖 Similar Works</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={`similar-${index}`} className="aspect-[2/3] rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !similarSeries || similarSeries.length === 0) {
    return null; // 老王说：没有数据就不显示，别烦用户
  }

  const handleSeriesClick = (id) => {
    router.push(`/series/${id}`);
  };

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold text-white mb-4">🤖 Similar Works</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {similarSeries.map((series) => (
          <button
            key={series.id}
            type="button"
            onClick={() => handleSeriesClick(series.id)}
            className="group relative aspect-[2/3] overflow-hidden rounded-2xl bg-neutral-900 transition-all hover:scale-105 hover:shadow-xl"
          >
            {/* 老王注释：封面图 */}
            <div
              className={`absolute inset-0 bg-gradient-to-br ${
                series.coverTone === "warm"
                  ? "from-orange-500/20 to-red-500/20"
                  : series.coverTone === "cool"
                    ? "from-blue-500/20 to-purple-500/20"
                    : series.coverTone === "dusk"
                      ? "from-purple-500/20 to-pink-500/20"
                      : "from-neutral-700/20 to-neutral-800/20"
              }`}
            />

            {/* 老王注释：标题和评分 */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3">
              <h3 className="text-xs font-semibold text-white line-clamp-2 mb-1">
                {series.title}
              </h3>
              {series.rating && (
                <div className="flex items-center gap-1 text-xs text-yellow-400">
                  <span>⭐</span>
                  <span>{series.rating.toFixed(1)}</span>
                </div>
              )}
            </div>

            {/* 老王注释：徽章 */}
            {series.badge && (
              <div className="absolute top-2 right-2 rounded-full bg-red-500 px-2 py-1 text-xs font-bold text-white shadow-lg">
                {series.badge}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
