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
          : "border-b border-[color:var(--gush-border)] bg-white/92 text-[color:var(--gush-ink-strong)]"
      }`}
    >
      {typeof progress === "number" ? (
        <div
          className={`h-1 w-full ${
            isNightMode ? "bg-neutral-900" : "bg-[color:var(--gush-page-bg-muted)]"
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
              : "border-[color:var(--gush-border)] text-[color:var(--gush-ink-soft)] hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] hover:text-[color:var(--gush-ink-strong)]"
          }`}
        >
          Back
        </button>

        <div className="min-w-0 flex-1 text-center sm:flex-none">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p
            className={`text-xs ${
              isNightMode ? "text-neutral-400" : "text-[color:var(--gush-ink-faint)]"
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
                : "border-[color:var(--gush-border)] text-[color:var(--gush-ink-soft)]"
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
                : "border-[color:var(--gush-border)] text-[color:var(--gush-ink-soft)]"
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
                  : "border-[color:var(--gush-border)] text-[color:var(--gush-ink-soft)]"
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
                  : "border-[color:var(--gush-border)] text-[color:var(--gush-ink-soft)]"
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
                    : "border-[color:var(--gush-border)] text-[color:var(--gush-ink-soft)]"
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
                  : "border-[color:var(--gush-border)] text-[color:var(--gush-ink-faint)]"
                : isNightMode
                  ? "border-neutral-800 text-neutral-200"
                  : "border-[color:var(--gush-border)] text-[color:var(--gush-ink-soft)]"
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
                  : "border-[color:var(--gush-border)] text-[color:var(--gush-ink-soft)]"
                : isNightMode
                  ? "border-neutral-900 text-neutral-600"
                  : "border-[color:var(--gush-border)] text-[color:var(--gush-ink-faint)]"
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
                  : "border border-[color:var(--gush-border)] text-[color:var(--gush-ink-faint)]"
                : nextLocked
                ? "border border-red-700 text-red-300"
                : isNightMode
                  ? "border border-neutral-800 text-neutral-200"
                  : "border border-[color:var(--gush-border)] text-[color:var(--gush-ink-soft)]"
            }`}
          >
            {!hasNext ? "End" : nextLocked ? "Locked ahead" : "Forward"}
          </button>
        </div>
      </div>
    </header>
  );
}
