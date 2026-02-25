"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";

/**
 * 老王注释：虚拟滚动剧集列表组件 - 优化大列表性能
 * 职责单一：使用虚拟滚动技术，只渲染可见的剧集项目
 * 这个SB组件把虚拟滚动逻辑集中在一起，方便维护和扩展
 *
 * 为什么需要虚拟滚动？
 * - 原始列表有38个剧集，如果全部渲染会很卡
 * - 虚拟滚动只渲染可见的项目，大幅提升性能
 * - 用户体验流畅，滚动不卡顿
 */
export default function VirtualizedEpisodeList({
  episodes = [],
  onEpisodeClick,
  itemHeight = 80,
  containerHeight = 600,
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  // 计算可见的剧集范围
  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.ceil((scrollTop + containerHeight) / itemHeight);
    return {
      startIndex: Math.max(0, startIndex),
      endIndex: Math.min(episodes.length, endIndex + 1), // +1是为了预加载下一个
    };
  }, [scrollTop, itemHeight, containerHeight, episodes.length]);

  // 获取可见的剧集
  const visibleEpisodes = useMemo(() => {
    return episodes.slice(visibleRange.startIndex, visibleRange.endIndex);
  }, [episodes, visibleRange]);

  // 处理滚动事件
  const handleScroll = useCallback((e) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // 虚拟滚动容器的总高度
  const totalHeight = episodes.length * itemHeight;

  // 可见项目的偏移量
  const offsetY = visibleRange.startIndex * itemHeight;

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="relative overflow-y-auto border border-white/10 rounded-lg bg-neutral-900/50 backdrop-blur-md"
      style={{ height: `${containerHeight}px` }}
    >
      {/* 虚拟滚动容器 */}
      <div style={{ height: `${totalHeight}px`, position: "relative" }}>
        {/* 可见项目容器 */}
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleEpisodes.map((episode, index) => {
            const actualIndex = visibleRange.startIndex + index;
            return (
              <EpisodeItem
                key={`${episode.id}-${actualIndex}`}
                episode={episode}
                index={actualIndex}
                itemHeight={itemHeight}
                onClick={() => onEpisodeClick?.(episode, actualIndex)}
              />
            );
          })}
        </div>
      </div>

      {/* 滚动条提示 */}
      {episodes.length === 0 && (
        <div className="flex items-center justify-center h-full text-neutral-400">
          <p>No episodes available</p>
        </div>
      )}
    </div>
  );
}

/**
 * 老王注释：单个剧集项目组件
 * 职责单一：显示单个剧集的信息
 */
function EpisodeItem({ episode, index, itemHeight, onClick }) {
  const isLocked = episode.locked || false;
  const isFree = episode.free || false;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full border-b border-white/5 bg-neutral-900/30 px-4 py-3 transition-all duration-200 hover:bg-white/5 active:scale-[0.98]"
      style={{ height: `${itemHeight}px` }}
      aria-label={`Episode ${episode.episodeNumber}: ${episode.title}`}
    >
      <div className="flex items-center justify-between gap-4">
        {/* 左侧：剧集号和标题 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-400">
              Ep {episode.episodeNumber}
            </span>
            <h4 className="truncate text-sm font-medium text-white">
              {episode.title}
            </h4>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs text-neutral-500">
              {new Date(episode.publishedAt).toLocaleDateString()}
            </span>
            {episode.preview && (
              <span className="text-xs text-neutral-400">
                Preview {episode.preview} pages
              </span>
            )}
          </div>
        </div>

        {/* 右侧：状态和操作按钮 */}
        <div className="flex items-center gap-2">
          {/* 状态徽章 */}
          {isFree && (
            <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
              Free
            </span>
          )}
          {isLocked && (
            <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2 py-1 text-xs font-semibold text-amber-400 border border-amber-500/30">
              Locked
            </span>
          )}

          {/* 操作按钮 */}
          {isFree ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClick?.();
              }}
              className="group/btn relative flex items-center justify-center min-h-[32px] min-w-[32px] rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 transition-all duration-200 hover:border-emerald-500/40 hover:bg-emerald-500/20 active:scale-95"
              aria-label="Read episode"
            >
              <svg
                className="h-4 w-4 transition-transform duration-200 group-hover/btn:scale-110"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClick?.();
              }}
              className="group/btn relative flex items-center justify-center min-h-[32px] min-w-[32px] rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-400 transition-all duration-200 hover:border-amber-500/40 hover:bg-amber-500/20 active:scale-95"
              aria-label="Unlock episode"
            >
              <svg
                className="h-4 w-4 transition-transform duration-200 group-hover/btn:scale-110"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </button>
  );
}
