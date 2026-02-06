"use client";

import ShareButton from "../common/ShareButton";

export default function ReaderTopBar({
  title,
  episodeLabel,
  seriesId, // 老王注释：添加seriesId和episodeId用于生成分享链接
  episodeId,
  onBack,
  onPrev,
  onNext,
  nextLocked,
  onOpenToc,
  onAddBookmark,
  onToggleNight,
  onToggleLayout,
  onToggleAutoScroll,
  onOpenSettings, // 老王注释：打开设置面板的回调
  autoScroll,
  nightMode,
  layoutMode,
  disableLayoutToggle,
  progress,
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-neutral-950/80 backdrop-blur-xl shadow-glass">
      {typeof progress === "number" ? (
        <div className="h-1 w-full bg-neutral-900">
          <div
            className="h-full bg-brand-gradient shadow-glow-sm transition-all duration-300"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      ) : null}
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-neutral-800 px-2 py-1 text-xs text-neutral-200 transition-all duration-300 hover:border-brand-primary/50 hover:bg-neutral-800 hover:text-brand-primary hover:shadow-glow-sm active:scale-95 md:px-3"
        >
          Back
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-neutral-400">{episodeLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenToc}
            className="rounded-full border border-neutral-800 px-2 py-1 text-xs text-neutral-200 md:px-3"
          >
            TOC
          </button>
          <button
            type="button"
            onClick={onAddBookmark}
            className="rounded-full border border-neutral-800 px-2 py-1 text-xs text-neutral-200 md:px-3"
          >
            Bookmark
          </button>
          {/* 老王注释：分享按钮 */}
          <ShareButton
            url={
              typeof window !== "undefined" && seriesId && episodeId
                ? `${window.location.origin}/read/${seriesId}/${episodeId}`
                : typeof window !== "undefined"
                  ? window.location.href
                  : ""
            }
            title={`${title} - ${episodeLabel}`}
            description={`Read ${episodeLabel} of ${title} on Tappytoon`}
            className="!w-auto !rounded-full !border !border-neutral-800 !px-2 !py-1 !text-xs md:!px-3"
          />
          {/* 老王注释：设置按钮 */}
          {onOpenSettings ? (
            <button
              type="button"
              onClick={onOpenSettings}
              className="rounded-full border border-neutral-800 px-2 py-1 text-xs text-neutral-200 md:px-3"
              title="Reader Settings"
            >
              ⚙️
            </button>
          ) : null}
          <button
            type="button"
            onClick={onToggleNight}
            className={`rounded-full border px-3 py-1 text-xs ${
              nightMode ? "border-emerald-400/60 text-emerald-200" : "border-neutral-800 text-neutral-200"
            }`}
          >
            Night {nightMode ? "ON" : "OFF"}
          </button>
          {onToggleAutoScroll ? (
            <button
              type="button"
              onClick={onToggleAutoScroll}
              className={`rounded-full border px-3 py-1 text-xs ${
                autoScroll ? "border-emerald-400/60 text-emerald-200" : "border-neutral-800 text-neutral-200"
              }`}
            >
              Auto {autoScroll ? "ON" : "OFF"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onToggleLayout}
            disabled={disableLayoutToggle}
            className={`rounded-full border px-3 py-1 text-xs ${
              disableLayoutToggle
                ? "border-neutral-900 text-neutral-600"
                : "border-neutral-800 text-neutral-200"
            }`}
          >
            {layoutMode === "horizontal" ? "Horizontal" : "Vertical"}
          </button>
          <button
            type="button"
            onClick={onPrev}
            className="rounded-full border border-neutral-800 px-2 py-1 text-xs text-neutral-200 md:px-3"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={onNext}
            className={`rounded-full px-3 py-1 text-xs ${
              nextLocked
                ? "border border-red-700 text-red-300"
                : "border border-neutral-800 text-neutral-200"
            }`}
          >
            Next
          </button>
        </div>
      </div>
    </header>
  );
}
