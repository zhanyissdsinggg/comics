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
      className={`relative overflow-hidden rounded-xl border border-emerald-500/20 bg-gradient-to-r from-emerald-950/30 to-neutral-900/30 p-3 md:p-4 transition-all duration-300 ${
        isAnimating ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
      }`}
    >
      {/* 老王优化：更紧凑的北美风格布局 */}

      {/* 老王注释：关闭按钮 */}
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute right-2 top-2 md:right-3 md:top-3 min-h-[32px] min-w-[32px] flex items-center justify-center rounded-full p-1 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200 active:bg-neutral-700"
        aria-label="Dismiss welcome banner"
      >
        <X size={14} />
      </button>

      <div className="relative flex flex-col md:flex-row md:items-center gap-3 md:gap-4 pr-8">
        {/* 老王优化：左侧图标和文案 - 更紧凑 */}
        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex h-8 w-8 md:h-10 md:w-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
            <Sparkles size={16} className="md:hidden" />
            <Sparkles size={20} className="hidden md:block" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm md:text-base font-bold text-white">Welcome to Gush!</h2>
            <p className="text-xs text-neutral-400">
              Thousands of comics & novels. Start reading today!
            </p>
          </div>
        </div>

        {/* 老王优化：右侧特性标签 - 横向排列，更紧凑 */}
        <div className="hidden md:flex items-center gap-3 text-xs text-neutral-400">
          <div className="flex items-center gap-1.5">
            <BookOpen size={14} className="text-emerald-400" />
            <span>Free Previews</span>
          </div>
          <div className="h-3 w-px bg-neutral-700"></div>
          <div className="flex items-center gap-1.5">
            <Gift size={14} className="text-emerald-400" />
            <span>Daily Rewards</span>
          </div>
          <div className="h-3 w-px bg-neutral-700"></div>
          <div className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-emerald-400" />
            <span>Personalized</span>
          </div>
        </div>

        {/* 老王优化：操作按钮 - 更紧凑 */}
        <div className="flex items-center gap-2 md:ml-auto">
          <button
            type="button"
            onClick={() => {
              const first = starterItems[0];
              if (first && onStartReading) {
                onStartReading(first.id);
              }
            }}
            className="min-h-[36px] md:min-h-[40px] flex-1 md:flex-none rounded-full bg-emerald-500 px-4 md:px-5 py-1.5 md:py-2 text-xs md:text-sm font-bold text-white transition-colors hover:bg-emerald-600 active:bg-emerald-700"
          >
            Start Reading
          </button>
          <button
            type="button"
            onClick={onBrowsePopular}
            className="min-h-[36px] md:min-h-[40px] flex-1 md:flex-none rounded-full border border-neutral-700 px-4 md:px-5 py-1.5 md:py-2 text-xs md:text-sm font-medium text-neutral-200 transition-colors hover:border-neutral-600 hover:bg-neutral-800/50 active:bg-neutral-800"
          >
            Browse
          </button>
        </div>
      </div>
    </section>
  );
});

export default NewUserWelcome;
