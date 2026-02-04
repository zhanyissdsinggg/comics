"use client";

import { memo, useState, useEffect } from "react";
import { Sparkles, BookOpen, Gift, X } from "lucide-react";

/**
 * 老王注释：新用户欢迎横幅组件
 * 功能：引导新用户开始阅读，提供快速入口
 * 遵循KISS原则：简洁明了的欢迎信息
 * 遵循DRY原则：统一的按钮样式
 */
const NewUserWelcome = memo(function NewUserWelcome({ starterItems, onStartReading, onBrowsePopular }) {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  // 老王注释：检查是否已关闭欢迎横幅
  useEffect(() => {
    const dismissed = localStorage.getItem("mn_welcome_banner_dismissed");
    if (dismissed) {
      setIsVisible(false);
    } else {
      // 老王注释：延迟显示动画
      setTimeout(() => setIsAnimating(true), 100);
    }
  }, []);

  // 老王注释：关闭横幅
  const handleDismiss = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      localStorage.setItem("mn_welcome_banner_dismissed", "true");
    }, 300);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <section
      className={`relative overflow-hidden rounded-2xl md:rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 via-neutral-900/40 to-neutral-900/40 p-4 md:p-6 transition-all duration-300 ${
        isAnimating ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
      }`}
    >
      {/* 老王注释：背景装饰 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.1),transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.05),transparent_50%)]"></div>

      {/* 老王注释：关闭按钮 */}
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute right-3 top-3 md:right-4 md:top-4 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200 active:bg-neutral-700"
        aria-label="Dismiss welcome banner"
      >
        <X size={16} />
      </button>

      <div className="relative">
        {/* 老王注释：标题区域 */}
        <div className="mb-4 md:mb-6 flex items-start gap-2 md:gap-3 pr-8">
          <div className="flex h-10 w-10 md:h-12 md:w-12 flex-shrink-0 items-center justify-center rounded-xl md:rounded-2xl bg-emerald-500/10 text-emerald-400">
            <Sparkles size={20} className="md:hidden" />
            <Sparkles size={24} className="hidden md:block" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg md:text-xl font-bold text-white">Welcome to Tappytoon! 🎉</h2>
            <p className="mt-1 md:mt-1.5 text-xs md:text-sm text-neutral-400">
              Discover thousands of comics and novels. Start your reading journey today!
            </p>
          </div>
        </div>

        {/* 老王注释：特性卡片 */}
        <div className="mb-4 md:mb-6 grid gap-2 md:gap-3 sm:grid-cols-3">
          <div className="flex items-start gap-2 md:gap-3 rounded-lg md:rounded-xl border border-neutral-800/50 bg-neutral-900/50 p-2.5 md:p-3">
            <div className="flex h-7 w-7 md:h-8 md:w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <BookOpen size={14} className="md:hidden" />
              <BookOpen size={16} className="hidden md:block" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Free Previews</p>
              <p className="mt-0.5 text-[10px] md:text-xs text-neutral-400">Try before you unlock</p>
            </div>
          </div>
          <div className="flex items-start gap-2 md:gap-3 rounded-lg md:rounded-xl border border-neutral-800/50 bg-neutral-900/50 p-2.5 md:p-3">
            <div className="flex h-7 w-7 md:h-8 md:w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Gift size={14} className="md:hidden" />
              <Gift size={16} className="hidden md:block" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Daily Rewards</p>
              <p className="mt-0.5 text-xs text-neutral-400">Check in for free Points</p>
            </div>
          </div>
          <div className="flex items-start gap-2 md:gap-3 rounded-lg md:rounded-xl border border-neutral-800/50 bg-neutral-900/50 p-2.5 md:p-3">
            <div className="flex h-7 w-7 md:h-8 md:w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Sparkles size={14} className="md:hidden" />
              <Sparkles size={16} className="hidden md:block" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Personalized</p>
              <p className="mt-0.5 text-[10px] md:text-xs text-neutral-400">Recommendations for you</p>
            </div>
          </div>
        </div>

        {/* 老王注释：操作按钮 */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <button
            type="button"
            onClick={() => {
              const first = starterItems[0];
              if (first && onStartReading) {
                onStartReading(first.id);
              }
            }}
            className="min-h-[44px] flex-1 sm:flex-none rounded-full bg-emerald-500 px-5 md:px-6 py-2 md:py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-600 active:bg-emerald-700"
          >
            Start Reading Now
          </button>
          <button
            type="button"
            onClick={onBrowsePopular}
            className="min-h-[44px] flex-1 sm:flex-none rounded-full border border-neutral-700 px-5 md:px-6 py-2 md:py-2.5 text-sm font-medium text-neutral-200 transition-colors hover:border-neutral-600 hover:bg-neutral-800/50 active:bg-neutral-800"
          >
            Browse Popular
          </button>
        </div>
      </div>
    </section>
  );
});

export default NewUserWelcome;
