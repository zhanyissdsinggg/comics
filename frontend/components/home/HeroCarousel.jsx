/**
 * HeroCarousel - 参考 Webtoon/Lezhin 的全宽 Hero Banner
 * 大图 + 左侧文字信息 + 右侧封面图（桌面端）
 * 支持触摸滑动 + 自动播放 + 圆点指示器
 */
"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import Image from "next/image";
import { ensureArray } from "../../lib/validators";

function normalizeBannerUrl(url) {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "placehold.co" && !parsed.pathname.match(/\.(png|jpg|jpeg|webp|gif)$/i)) {
      parsed.pathname = parsed.pathname + ".png";
      return parsed.toString();
    }
  } catch { /* ignore */ }
  return url;
}

const TONE_GRADIENTS = {
  warm: "from-orange-900/90 via-red-900/60",
  cool: "from-blue-900/90 via-cyan-900/60",
  dusk: "from-purple-900/90 via-indigo-900/60",
  neon: "from-emerald-900/90 via-teal-900/60",
  noir: "from-neutral-900/90 via-neutral-800/60",
  default: "from-neutral-900/90 via-neutral-800/60",
};

export default function HeroCarousel({ items }) {
  const safeItems = useMemo(() => ensureArray(items), [items]);
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const AUTO_PLAY_INTERVAL = 5000;
  const progressIntervalRef = useRef(null);
  const autoPlayTimeoutRef = useRef(null);

  const active = safeItems[index] || safeItems[0];
  const rawBannerUrl = active?.bannerUrl || active?.coverUrl;
  const bannerUrl = normalizeBannerUrl(rawBannerUrl);
  const coverUrl = normalizeBannerUrl(active?.coverUrl);
  const gradient = TONE_GRADIENTS[active?.coverTone] || TONE_GRADIENTS.default;

  const handlePrev = () => { setIndex((p) => (p - 1 + safeItems.length) % safeItems.length); setProgress(0); };
  const handleNext = () => { setIndex((p) => (p + 1) % safeItems.length); setProgress(0); };
  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; setIsPaused(true); };
  const handleTouchMove = (e) => { touchEndX.current = e.touches[0].clientX; };
  const handleTouchEnd = () => {
    const d = touchStartX.current - touchEndX.current;
    if (d > 50) handleNext();
    else if (d < -50) handlePrev();
    touchStartX.current = 0; touchEndX.current = 0; setIsPaused(false);
  };

  useEffect(() => {
    if (safeItems.length <= 1 || isPaused) return;
    progressIntervalRef.current = setInterval(() => {
      setProgress((p) => { const n = p + (50 / AUTO_PLAY_INTERVAL) * 100; return n >= 100 ? 100 : n; });
    }, 50);
    autoPlayTimeoutRef.current = setTimeout(() => {
      setIndex((p) => (p + 1) % safeItems.length);
      setProgress(0);
    }, AUTO_PLAY_INTERVAL);
    return () => {
      clearInterval(progressIntervalRef.current);
      clearTimeout(autoPlayTimeoutRef.current);
    };
  }, [index, isPaused, safeItems.length]);

  if (safeItems.length === 0) return null;

  return (
    <section
      className="relative overflow-hidden rounded-2xl bg-neutral-900"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 背景大图（全宽） */}
      <div className="relative aspect-[21/9] w-full overflow-hidden sm:aspect-[21/8] md:aspect-[21/7]">
        {bannerUrl ? (
          <div
            className="absolute inset-0 scale-105 bg-center bg-cover transition-transform duration-700"
            style={{ backgroundImage: `url(${bannerUrl})` }}
            aria-hidden="true"
          />
        ) : (
          /* 无图时用色调渐变背景 */
          <div className={`absolute inset-0 bg-gradient-to-br ${gradient} to-neutral-950`} />
        )}

        {/* 深色渐变遮罩 - 左侧更深，右侧透明 */}
        <div className={`absolute inset-0 bg-gradient-to-r ${gradient} to-transparent`} />
        {/* 底部渐变 */}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-transparent to-transparent" />

        {/* ===== 内容层 ===== */}
        <div className="absolute inset-0 flex items-end p-5 md:items-center md:p-10">
          <div className="flex w-full items-end justify-between gap-6 md:items-center">
            {/* 左侧：文字信息 */}
            <div className="max-w-xs space-y-3 md:max-w-sm lg:max-w-md">
              {/* 类别标签 */}
              <div className="flex items-center gap-2">
                <span className="rounded-sm bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
                  Featured
                </span>
                {active?.badge && (
                  <span className="rounded-sm bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white/80 backdrop-blur-sm">
                    {active.badge}
                  </span>
                )}
              </div>

              {/* 标题 */}
              <h2 className="text-2xl font-black leading-tight tracking-tight text-white drop-shadow-lg md:text-4xl lg:text-5xl">
                {active?.title}
              </h2>

              {/* 描述 */}
              {active?.description && (
                <p className="line-clamp-2 text-sm leading-relaxed text-white/70 md:text-base">
                  {active.description}
                </p>
              )}

              {/* CTA 按钮 */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition-all hover:bg-emerald-400 hover:shadow-emerald-400/40 active:scale-95"
                >
                  Read Now
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-95"
                >
                  + Follow
                </button>
              </div>
            </div>

            {/* 右侧：封面小图（桌面端显示） */}
            {coverUrl && (
              <div className="hidden shrink-0 md:block">
                <div className="relative h-48 w-32 overflow-hidden rounded-xl shadow-2xl shadow-black/60 ring-1 ring-white/10 lg:h-56 lg:w-40">
                  <Image
                    src={coverUrl}
                    alt={active?.title || ""}
                    fill
                    className="object-cover"
                    sizes="160px"
                    priority
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 左右点击区域 */}
        {safeItems.length > 1 && (
          <>
            <button type="button" onClick={handlePrev} aria-label="Previous"
              className="absolute left-0 top-0 h-full w-1/4 cursor-w-resize" />
            <button type="button" onClick={handleNext} aria-label="Next"
              className="absolute right-0 top-0 h-full w-1/4 cursor-e-resize" />
          </>
        )}
      </div>

      {/* 底部：圆点指示器 + 进度条 */}
      {safeItems.length > 1 && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
          {safeItems.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { setIndex(i); setProgress(0); }}
              aria-label={`Slide ${i + 1}`}
              className="relative overflow-hidden rounded-full transition-all duration-300"
              style={{
                width: i === index ? "24px" : "6px",
                height: "6px",
                background: i === index ? "transparent" : "rgba(255,255,255,0.3)",
              }}
            >
              {i === index && (
                <span className="absolute inset-0 rounded-full bg-white/30">
                  <span
                    className="absolute left-0 top-0 h-full rounded-full bg-white"
                    style={{ width: `${progress}%`, transition: "width 50ms linear" }}
                  />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
