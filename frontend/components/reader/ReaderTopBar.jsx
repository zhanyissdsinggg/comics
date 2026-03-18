"use client";

import ShareButton from "../common/ShareButton";

export default function ReaderTopBar({
  title,
  episodeLabel,
  seriesId,
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
  onOpenSettings,
  autoScroll,
  nightMode,
  layoutMode,
  disableLayoutToggle,
  progress,
  hasPrev = true,
  hasNext = true,
}) {
  const shareUrl =
    typeof window !== "undefined" && seriesId && episodeId
      ? `${window.location.origin}/read/${seriesId}/${episodeId}`
      : typeof window !== "undefined"
        ? window.location.href
        : "";

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

      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 rounded-full border border-neutral-800 px-2 py-1 text-xs text-neutral-200 transition-all duration-300 hover:border-brand-primary/50 hover:bg-neutral-800 hover:text-brand-primary hover:shadow-glow-sm active:scale-95 md:px-3"
        >
          Back
        </button>

        <div className="min-w-0 flex-1 text-center sm:flex-none">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="text-xs text-neutral-400">{episodeLabel}</p>
        </div>

        <div className="flex basis-full flex-wrap items-center justify-center gap-2 sm:basis-auto sm:justify-end">
          <button
            type="button"
            onClick={onOpenToc}
            className="shrink-0 rounded-full border border-neutral-800 px-2 py-1 text-xs text-neutral-200 md:px-3"
          >
            Chapters
          </button>
          <button
            type="button"
            onClick={onAddBookmark}
            className="shrink-0 rounded-full border border-neutral-800 px-2 py-1 text-xs text-neutral-200 md:px-3"
          >
            Bookmark
          </button>
          <ShareButton
            url={shareUrl}
            title={`${title} - ${episodeLabel}`}
            description={`Read ${episodeLabel} of ${title} on Gush`}
            className="!w-auto !shrink-0 !rounded-full !border !border-neutral-800 !px-2 !py-1 !text-xs md:!px-3"
          />
          {onOpenSettings ? (
            <button
              type="button"
              onClick={onOpenSettings}
              className="shrink-0 rounded-full border border-neutral-800 px-2 py-1 text-xs text-neutral-200 md:px-3"
              title="Reader Settings"
              aria-label="Reader Settings"
            >
              Settings
            </button>
          ) : null}
          <button
            type="button"
            onClick={onToggleNight}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs ${
              nightMode
                ? "border-emerald-400/60 text-emerald-200"
                : "border-neutral-800 text-neutral-200"
            }`}
          >
            Night {nightMode ? "ON" : "OFF"}
          </button>
          {onToggleAutoScroll ? (
            <button
              type="button"
              onClick={onToggleAutoScroll}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs ${
                autoScroll
                  ? "border-emerald-400/60 text-emerald-200"
                  : "border-neutral-800 text-neutral-200"
              }`}
            >
              Auto {autoScroll ? "ON" : "OFF"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onToggleLayout}
            disabled={disableLayoutToggle}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs ${
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
            disabled={!hasPrev}
            className={`shrink-0 rounded-full border px-2 py-1 text-xs md:px-3 ${
              hasPrev
                ? "border-neutral-800 text-neutral-200"
                : "border-neutral-900 text-neutral-600"
            }`}
          >
            Previous
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!hasNext}
            className={`shrink-0 rounded-full px-3 py-1 text-xs ${
              !hasNext
                ? "border border-neutral-900 text-neutral-600"
                : nextLocked
                ? "border border-red-700 text-red-300"
                : "border border-neutral-800 text-neutral-200"
            }`}
          >
            {!hasNext ? "End" : nextLocked ? "Next locked" : "Next"}
          </button>
        </div>
      </div>
    </header>
  );
}
