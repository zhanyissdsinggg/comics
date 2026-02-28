/**
 * PortraitCard - 参考 Webtoon/Tapas/Lezhin 顶级漫画平台设计
 * 大封面图 + 渐变遮罩 + 标题 + 流畅hover动画
 */
import { memo } from "react";
import Cover from "../common/Cover";

const badgeConfig = {
  HOT: { bg: "bg-red-500", text: "HOT" },
  POPULAR: { bg: "bg-orange-500", text: "POPULAR" },
  NEW: { bg: "bg-blue-500", text: "NEW" },
  TTF: { bg: "bg-purple-500", text: "FREE" },
  COMPLETED: { bg: "bg-emerald-600", text: "COMPLETED" },
  "18+": { bg: "bg-rose-700", text: "18+" },
};

function BadgePill({ badge }) {
  if (!badge) return null;
  const key = badge.toUpperCase();
  const cfg = badgeConfig[key] || { bg: "bg-neutral-700", text: badge };
  return (
    <span
      className={`${cfg.bg} absolute left-2 top-2 z-10 rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-md`}
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
      {/* 封面区域 */}
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-neutral-900 shadow-lg shadow-black/40 transition-all duration-300 group-hover:shadow-xl group-hover:shadow-black/60 group-hover:-translate-y-1">
        <Cover
          tone={tone || item.coverTone}
          coverUrl={item.coverUrl}
          className="h-full w-full"
        />

        {/* 底部渐变遮罩 - 像 Webtoon 一样让标题叠在封面上 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Badge 标签 - 左上角 */}
        <BadgePill badge={item.badge} />

        {/* 阅读进度条 */}
        {typeof item.progressPercent === "number" && item.progressPercent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
            <div
              className="h-full bg-emerald-400"
              style={{ width: `${Math.round(item.progressPercent * 100)}%` }}
            />
          </div>
        )}

        {/* Hover时显示的标题（叠在图片上） */}
        <div className="absolute inset-x-0 bottom-0 p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <p className="text-xs font-semibold leading-tight text-white drop-shadow-lg line-clamp-2">
            {item.title}
          </p>
        </div>
      </div>

      {/* 卡片下方文字 */}
      <div className="mt-2 space-y-0.5 px-0.5">
        <p className="truncate text-[13px] font-semibold leading-tight text-neutral-100 transition-colors group-hover:text-white">
          {item.title}
        </p>
        {item.subtitle && (
          <p className="truncate text-[11px] text-neutral-500 transition-colors group-hover:text-neutral-400">
            {item.subtitle}
          </p>
        )}
      </div>
    </button>
  );
}

export default memo(PortraitCard);
