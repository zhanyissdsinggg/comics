/**
 * 老王注释：英雄轮播组件 - 支持触摸滑动手势 + 自动播放 + 进度条
 */
"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import Cover from "../common/Cover";
import { ensureArray } from "../../lib/validators";

export default function HeroCarousel({ items }) {
  const safeItems = useMemo(() => ensureArray(items), [items]);
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const active = safeItems[index] || safeItems[0];
  const bannerUrl =
    active?.bannerUrl ||
    active?.coverUrl ||
    `https://placehold.co/960x540?text=${encodeURIComponent(active?.title || "Banner")}`;

  // 老王注释：触摸手势相关状态
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const MIN_SWIPE_DISTANCE = 50; // 最小滑动距离（像素）

  // 老王注释：自动播放相关
  const AUTO_PLAY_INTERVAL = 5000; // 5秒切换
  const progressIntervalRef = useRef(null);
  const autoPlayTimeoutRef = useRef(null);

  if (safeItems.length === 0) {
    return (
      <section className="rounded-3xl border border-neutral-900 bg-neutral-900/50 p-6 text-sm text-neutral-400">
        No featured items.
      </section>
    );
  }

  const handlePrev = () => {
    setIndex((prev) => (prev - 1 + safeItems.length) % safeItems.length);
    setProgress(0); // 重置进度
  };

  const handleNext = () => {
    setIndex((prev) => (prev + 1) % safeItems.length);
    setProgress(0); // 重置进度
  };

  // 老王注释：触摸开始
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    setIsPaused(true); // 触摸时暂停自动播放
  };

  // 老王注释：触摸移动
  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  // 老王注释：触摸结束，判断滑动方向
  const handleTouchEnd = () => {
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > MIN_SWIPE_DISTANCE;
    const isRightSwipe = distance < -MIN_SWIPE_DISTANCE;

    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }

    // 重置
    touchStartX.current = 0;
    touchEndX.current = 0;
    setIsPaused(false); // 恢复自动播放
  };

  // 老王注释：自动播放逻辑
  useEffect(() => {
    if (safeItems.length <= 1 || isPaused) {
      return;
    }

    // 进度条更新（每50ms更新一次，平滑动画）
    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + (50 / AUTO_PLAY_INTERVAL) * 100;
        return newProgress >= 100 ? 100 : newProgress;
      });
    }, 50);

    // 自动切换到下一张
    autoPlayTimeoutRef.current = setTimeout(() => {
      handleNext();
    }, AUTO_PLAY_INTERVAL);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (autoPlayTimeoutRef.current) {
        clearTimeout(autoPlayTimeoutRef.current);
      }
    };
  }, [index, isPaused, safeItems.length]);

  return (
    <section
      className="group relative overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900/50 shadow-2xl transition-all duration-300 hover:border-brand-primary/30 hover:shadow-glow-sm"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="p-3 md:p-4">
        <div
          className="relative aspect-[16/7] overflow-hidden rounded-2xl sm:aspect-[16/6] md:aspect-[16/5]"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* 老王注释：背景图片 */}
          {bannerUrl ? (
            <div
              className="absolute inset-0 h-full w-full bg-neutral-900 transition-transform duration-700 group-hover:scale-105"
              style={{
                backgroundImage: `url(${bannerUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                willChange: "transform",
              }}
              aria-label={active?.title || "Banner"}
            />
          ) : (
            <Cover
              tone={active.coverTone}
              coverUrl={active.coverUrl}
              className="absolute inset-0 h-full w-full transition-transform duration-700 group-hover:scale-105"
              style={{ willChange: "transform" }}
            />
          )}

          {/* 老王注释：渐变遮罩 - 使用品牌色增强视觉效果 */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

          {/* 老王注释：顶部品牌色渐变 - 增加层次感 */}
          <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/10 via-transparent to-brand-secondary/5" />

          {/* 老王注释：标题和描述 */}
          {active?.title && (
            <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
              <h2 className="mb-1 text-xl font-bold text-white drop-shadow-lg md:mb-2 md:text-3xl">
                {active.title}
              </h2>
              {active.description && (
                <p className="text-xs text-neutral-200 drop-shadow-md md:text-sm">
                  {active.description}
                </p>
              )}
            </div>
          )}

          {/* 老王注释：左右切换按钮 */}
          <div className="absolute inset-0">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous banner"
              className="absolute left-0 top-0 h-full w-1/3 cursor-w-resize transition-colors hover:bg-gradient-to-r hover:from-black/20 hover:to-transparent"
            />
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next banner"
              className="absolute right-0 top-0 h-full w-1/3 cursor-e-resize transition-colors hover:bg-gradient-to-l hover:from-black/20 hover:to-transparent"
            />
          </div>

          {/* 老王注释：进度条指示器 - 显示自动播放进度 */}
          {safeItems.length > 1 && (
            <div className="absolute bottom-3 left-1/2 flex w-[90%] max-w-md -translate-x-1/2 gap-1.5 md:bottom-4 md:gap-2">
              {safeItems.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setIndex(i);
                    setProgress(0);
                  }}
                  aria-label={`Go to slide ${i + 1}`}
                  className="group/indicator relative flex-1"
                >
                  {/* 老王注释：背景轨道 */}
                  <div className="h-1 w-full overflow-hidden rounded-full bg-white/20 backdrop-blur-sm">
                    {/* 老王注释：进度条 - 当前项显示进度，其他项显示完成/未完成状态 */}
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        i === index
                          ? "bg-brand-gradient shadow-glow-sm"
                          : i < index
                          ? "bg-white/60"
                          : "bg-white/0"
                      }`}
                      style={{
                        width: i === index ? `${progress}%` : i < index ? "100%" : "0%",
                        transition: i === index ? "width 50ms linear" : "width 300ms ease",
                      }}
                    />
                  </div>
                  {/* 老王注释：悬停提示 */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-2 py-1 text-xs text-white opacity-0 backdrop-blur-sm transition-opacity group-hover/indicator:opacity-100">
                    {safeItems[i]?.title || `Slide ${i + 1}`}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
