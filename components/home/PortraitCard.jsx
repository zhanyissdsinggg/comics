/**
 * 老王注释：PortraitCard卡片组件，带评分显示和hover效果
 */
import { memo } from "react";
import Cover from "../common/Cover";
import Pill from "../common/Pill";

function PortraitCard({ item, tone, onClick }) {
  // 老王注释：模拟评分数据（实际应该从item中获取）
  const rating = item.rating || 4.5;
  const hasRating = typeof rating === "number" && rating > 0;
  const hasFreeEpisodes = item.hasFreeEpisodes || item.freeEpisodeCount > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group scroll-snap-item min-w-[120px] rounded-2xl border border-neutral-900 bg-neutral-900/50 p-2 text-left shadow-lg transition-all duration-300 hover:scale-105 hover:border-emerald-500/40 hover:shadow-2xl hover:shadow-emerald-500/20 active:scale-95 sm:min-w-[140px] sm:p-3"
      style={{ willChange: "transform" }}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl">
        <Cover
          tone={tone || item.coverTone}
          coverUrl={item.coverUrl}
          className="h-full w-full transition-transform duration-500 group-hover:scale-110"
          style={{ willChange: "transform" }}
        />
        {/* 老王注释：hover时的渐变遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* 老王注释：评分显示 */}
        {hasRating && (
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 backdrop-blur-sm">
            <span className="text-[10px] text-yellow-400">⭐</span>
            <span className="text-[10px] font-semibold text-white">{rating.toFixed(1)}</span>
          </div>
        )}

        {item.badge ? (
          <div className="absolute left-2 top-2">
            <Pill>{item.badge}</Pill>
          </div>
        ) : hasFreeEpisodes ? (
          <div className="absolute left-2 top-2">
            <Pill>Free to Read</Pill>
          </div>
        ) : null}
        {typeof item.progressPercent === "number" && item.progressPercent > 0 ? (
          <div className="absolute bottom-0 left-0 right-0 bg-neutral-950/70 px-2 py-1">
            <div className="h-1 w-full rounded-full bg-neutral-800">
              <div
                className="h-full rounded-full bg-emerald-400/80"
                style={{ width: `${Math.round(item.progressPercent * 100)}%` }}
              />
            </div>
            <div className="mt-1 text-[10px] text-neutral-200">
              {Math.round(item.progressPercent * 100)}% read
            </div>
          </div>
        ) : null}
      </div>
      <div className="mt-2 space-y-1 sm:mt-3">
        <p className="text-sm font-semibold transition-colors group-hover:text-emerald-400">{item.title}</p>
        <p className="text-xs text-neutral-400">{item.subtitle}</p>
      </div>
    </button>
  );
}

// 老王注释：用React.memo包装避免不必要的重渲染，这个SB组件在列表里会被渲染很多次
export default memo(PortraitCard);
