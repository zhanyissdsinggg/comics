/**
 * 老王注释：英雄轮播组件，支持触摸滑动手势
 */
"use client";

import { useMemo, useState, useRef } from "react";
import Cover from "../common/Cover";
import { ensureArray } from "../../lib/validators";

export default function HeroCarousel({ items }) {
  const safeItems = useMemo(() => ensureArray(items), [items]);
  const [index, setIndex] = useState(0);
  const active = safeItems[index] || safeItems[0];
  const bannerUrl =
    active?.bannerUrl ||
    active?.coverUrl ||
    `https://placehold.co/960x540?text=${encodeURIComponent(active?.title || "Banner")}`;

  // 老王注释：触摸手势相关状态
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const MIN_SWIPE_DISTANCE = 50; // 最小滑动距离（像素）

  if (safeItems.length === 0) {
    return (
      <section className="rounded-3xl border border-neutral-900 bg-neutral-900/50 p-6 text-sm text-neutral-400">
        No featured items.
      </section>
    );
  }

  const handlePrev = () => {
    setIndex((prev) => (prev - 1 + safeItems.length) % safeItems.length);
  };

  const handleNext = () => {
    setIndex((prev) => (prev + 1) % safeItems.length);
  };

  // 老王注释：触摸开始
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
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
  };

  return (
    <section className="group relative overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900/50 shadow-2xl transition-all duration-300 hover:border-emerald-500/30 hover:shadow-emerald-500/10">
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

          {/* 老王注释：渐变遮罩 - 从底部到顶部 */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

          {/* 老王注释：顶部渐变遮罩 - 增加层次感 */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent" />

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

          {/* 老王注释：指示器 */}
          {safeItems.length > 1 && (
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 md:bottom-4 md:gap-2">
              {safeItems.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === index
                      ? "w-8 bg-emerald-400 shadow-lg shadow-emerald-500/50"
                      : "w-1.5 bg-white/40 hover:bg-white/60"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
