"use client";

import dynamic from "next/dynamic";

const ShareButton = dynamic(() => import("../common/ShareButton"), {
  ssr: false,
});

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
  const isNightMode = Boolean(nightMode);

  return (
    <header
      className={`sticky top-0 z-40 backdrop-blur-xl shadow-glass ${
        isNightMode
          ? "border-b border-white/10 bg-neutral-950/80 text-neutral-100"
          : "border-b-[3px] border-black bg-[rgba(255,255,255,0.96)] text-black shadow-[0_6px_0_0_rgba(0,0,0,1)]"
      }`}
    >
      {typeof progress === "number" ? (
        <div
          className={`h-1 w-full ${
            isNightMode ? "bg-neutral-900" : "bg-[#f5f1ea]"
          }`}
        >
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
          className={`shrink-0 rounded-full border px-2 py-1 text-xs transition-all duration-300 hover:shadow-glow-sm active:scale-95 md:px-3 ${
            isNightMode
              ? "border-neutral-800 text-neutral-200 hover:border-brand-primary/50 hover:bg-neutral-800 hover:text-brand-primary"
              : "border-[3px] border-black bg-white text-black/62 shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#fff6c7] hover:text-black hover:shadow-none"
            }`}
        >
          Back
        </button>

        <div className="min-w-0 flex-1 text-center sm:flex-none">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p
            className={`text-xs ${
              isNightMode ? "text-neutral-400" : "text-black/50"
            }`}
          >
            {episodeLabel}
          </p>
        </div>

        <div className="flex basis-full flex-wrap items-center justify-center gap-2 sm:basis-auto sm:justify-end">
          <button
            type="button"
            onClick={onOpenToc}
            className={`shrink-0 rounded-full border px-2 py-1 text-xs md:px-3 ${
              isNightMode
                ? "border-neutral-800 text-neutral-200"
                : "border-[3px] border-black bg-white text-black/62 shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
            }`}
          >
            Chapters
          </button>
          <button
            type="button"
            onClick={onAddBookmark}
            className={`shrink-0 rounded-full border px-2 py-1 text-xs md:px-3 ${
              isNightMode
                ? "border-neutral-800 text-neutral-200"
                : "border-[3px] border-black bg-white text-black/62 shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
            }`}
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
              className={`shrink-0 rounded-full border px-2 py-1 text-xs md:px-3 ${
                isNightMode
                  ? "border-neutral-800 text-neutral-200"
                  : "border-[3px] border-black bg-white text-black/62 shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
              }`}
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
                : isNightMode
                  ? "border-neutral-800 text-neutral-200"
                  : "border-[3px] border-black bg-white text-black/62 shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
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
                  : isNightMode
                    ? "border-neutral-800 text-neutral-200"
                    : "border-[3px] border-black bg-white text-black/62 shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
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
                ? isNightMode
                  ? "border-neutral-900 text-neutral-600"
                  : "border-[3px] border-black bg-[#f5f1ea] text-black/35 shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                : isNightMode
                  ? "border-neutral-800 text-neutral-200"
                  : "border-[3px] border-black bg-white text-black/62 shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
              }`}
          >
            {layoutMode === "horizontal" ? "Horizontal" : "Vertical"}
          </button>
          <button
            type="button"
            onClick={onPrev}
            aria-label="Previous episode"
            disabled={!hasPrev}
            className={`shrink-0 rounded-full border px-2 py-1 text-xs md:px-3 ${
              hasPrev
                ? isNightMode
                  ? "border-neutral-800 text-neutral-200"
                  : "border-[3px] border-black bg-white text-black/62 shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                : isNightMode
                  ? "border-neutral-900 text-neutral-600"
                  : "border-[3px] border-black bg-[#f5f1ea] text-black/35 shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
              }`}
          >
            Previous
          </button>
          <button
            type="button"
            onClick={onNext}
            aria-label={!hasNext ? "End of chapter" : nextLocked ? "Locked upcoming episode" : "Forward episode"}
            disabled={!hasNext}
            className={`shrink-0 rounded-full px-3 py-1 text-xs ${
              !hasNext
                ? isNightMode
                  ? "border border-neutral-900 text-neutral-600"
                  : "border-[3px] border-black bg-[#f5f1ea] text-black/35 shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                : nextLocked
                ? "border-[3px] border-black bg-[#ffe3ec] text-[#8f003f] shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                : isNightMode
                  ? "border border-neutral-800 text-neutral-200"
                  : "border-[3px] border-black bg-white text-black/62 shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
            }`}
          >
            {!hasNext ? "End" : nextLocked ? "Locked ahead" : "Forward"}
          </button>
        </div>
      </div>
    </header>
  );
}
