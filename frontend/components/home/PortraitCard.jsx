/**
 * PortraitCard - iOS 26风格升级版
 * 老王优化：毛玻璃效果 + 浮动动画 + 深度阴影
 */
import { memo } from "react";
import Cover from "../common/Cover";

const badgeConfig = {
  HOT: { bg: "bg-gradient-to-r from-red-500 to-rose-500", text: "HOT", glow: "shadow-red-500/50" },
  POPULAR: { bg: "bg-gradient-to-r from-orange-500 to-amber-500", text: "POPULAR", glow: "shadow-orange-500/50" },
  NEW: { bg: "bg-gradient-to-r from-blue-500 to-cyan-500", text: "NEW", glow: "shadow-blue-500/50" },
  TTF: { bg: "bg-gradient-to-r from-purple-500 to-pink-500", text: "FREE", glow: "shadow-purple-500/50" },
  COMPLETED: { bg: "bg-gradient-to-r from-emerald-500 to-teal-500", text: "COMPLETED", glow: "shadow-emerald-500/50" },
  "18+": { bg: "bg-gradient-to-r from-rose-600 to-red-600", text: "18+", glow: "shadow-rose-500/50" },
};

function BadgePill({ badge }) {
  if (!badge) return null;
  const key = badge.toUpperCase();
  const cfg = badgeConfig[key] || { bg: "bg-neutral-700", text: badge, glow: "" };
  return (
    <span
      className={`${cfg.bg} ${cfg.glow} absolute left-2 top-2 z-10 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg backdrop-blur-sm`}
    >
      {cfg.text}
    </span>
  );
}

function PortraitCard({ item, tone, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full text-left"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      {/* 老王添加：iOS 26风格的封面区域 - 毛玻璃边框 + 浮动效果 */}
      <div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-neutral-900/50 backdrop-blur-xl border border-white/10 shadow-ios-lg transition-all duration-500 ease-out group-hover:shadow-ios-xl group-hover:-translate-y-2 group-hover:scale-[1.02] group-hover:border-white/20">
        <Cover
          tone={tone || item.coverTone}
          coverUrl={item.coverUrl}
          className="h-full w-full"
        />

        {/* 老王优化：iOS 26风格的渐变遮罩 - 更柔和 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        {/* Badge 标签 - 左上角 */}
        <BadgePill badge={item.badge} />

        {/* 老王优化：iOS 26风格的阅读进度条 - 圆角 + 毛玻璃 */}
        {typeof item.progressPercent === "number" && item.progressPercent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/30 backdrop-blur-sm">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 shadow-ios-glow transition-all duration-300"
              style={{ width: `${Math.round(item.progressPercent * 100)}%` }}
            />
          </div>
        )}

        {/* 老王优化：Hover时显示的标题 - 毛玻璃背景 */}
        <div className="absolute inset-x-0 bottom-0 p-4 opacity-0 transition-all duration-500 group-hover:opacity-100 group-hover:translate-y-0 translate-y-2">
          <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-3 border border-white/10">
            <p className="text-sm font-semibold leading-tight text-white drop-shadow-lg line-clamp-2">
              {item.title}
            </p>
          </div>
        </div>
      </div>

      {/* 老王优化：卡片下方文字 - 更大更清晰 */}
      <div className="mt-3 space-y-1 px-1">
        {item.eyebrow ? (
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300/85">
            {item.eyebrow}
          </p>
        ) : null}
        <p className="truncate text-sm font-bold leading-tight text-neutral-100 transition-colors group-hover:text-white">
          {item.title}
        </p>
        {item.subtitle && (
          <p className="truncate text-xs text-neutral-500 transition-colors group-hover:text-neutral-400">
            {item.subtitle}
          </p>
        )}
      </div>
    </button>
  );
}

export default memo(PortraitCard);
