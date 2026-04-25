"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

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
  const [nightState, setNightState] = useState(Boolean(nightMode));
  const [autoScrollState, setAutoScrollState] = useState(Boolean(autoScroll));

  useEffect(() => {
    setNightState(Boolean(nightMode));
  }, [nightMode]);

  useEffect(() => {
    setAutoScrollState(Boolean(autoScroll));
  }, [autoScroll]);

  const lightButtonClass =
    "border border-black/10 bg-white text-black/62 shadow-[0_10px_24px_rgba(15,23,42,0.08)] hover:border-black/16 hover:bg-black/[0.03] hover:text-black";
  const lightActiveButtonClass =
    "border border-emerald-200/80 bg-[linear-gradient(180deg,#f4fff8_0%,#ecfdf3_100%)] text-emerald-700 shadow-[0_10px_24px_rgba(16,185,129,0.12)]";
  const lightMutedButtonClass =
    "border border-black/8 bg-[#f3f4f6] text-black/35 shadow-none";
  const lightLockedButtonClass =
    "border border-rose-200/80 bg-[linear-gradient(180deg,#fff6f8_0%,#fff1f3_100%)] text-rose-700 shadow-[0_10px_24px_rgba(244,63,94,0.1)]";

  const canOpenToc = typeof onOpenToc === "function";
  const canBookmark = typeof onAddBookmark === "function";
  const canToggleNight = typeof onToggleNight === "function";
  const canToggleLayout = typeof onToggleLayout === "function";
  const canPrev = typeof onPrev === "function";
  const canNext = typeof onNext === "function";

  return (
    <header
      className={`sticky top-0 z-40 backdrop-blur-xl shadow-glass ${
        isNightMode
          ? "border-b border-white/10 bg-neutral-950/80 text-neutral-100"
          : "border-b border-black/8 bg-[rgba(255,255,255,0.94)] text-black shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
      }`}
    >
      {typeof progress === "number" ? (
        <div
          className={`h-1 w-full ${
            isNightMode ? "bg-neutral-900" : "bg-[#f6f7f9]"
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
              : lightButtonClass
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
          {canOpenToc ? (
            <button
              type="button"
              onClick={onOpenToc}
              className={`shrink-0 rounded-full border px-2 py-1 text-xs md:px-3 ${
                isNightMode
                  ? "border-neutral-800 text-neutral-200"
                  : lightButtonClass
              }`}
              aria-label="Chapters"
            >
              Chapters
            </button>
          ) : null}
          {canBookmark ? (
            <button
              type="button"
              onClick={onAddBookmark}
              className={`shrink-0 rounded-full border px-2 py-1 text-xs md:px-3 ${
                isNightMode
                  ? "border-neutral-800 text-neutral-200"
                  : lightButtonClass
              }`}
            >
              Save
            </button>
          ) : null}
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
                  : lightButtonClass
              }`}
              title="Reader Settings"
              aria-label="Reader Settings"
            >
              Display
            </button>
          ) : null}
          {canToggleNight ? (
            <button
              type="button"
              onClick={() => {
                setNightState((current) => !current);
                onToggleNight?.();
              }}
              aria-pressed={nightState}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs ${
                nightState
                  ? isNightMode
                    ? "border-emerald-400 bg-emerald-500/15 text-emerald-200 shadow-[0_0_0_1px_rgba(74,222,128,0.28)]"
                    : lightActiveButtonClass
                  : isNightMode
                    ? "border-neutral-800 text-neutral-200"
                    : lightButtonClass
                }`}
            >
              Night {nightState ? "On" : "Off"}
            </button>
          ) : null}
          {onToggleAutoScroll ? (
            <button
              type="button"
              onClick={() => {
                setAutoScrollState((current) => !current);
                onToggleAutoScroll?.();
              }}
              aria-pressed={autoScrollState}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs ${
                autoScrollState
                ? isNightMode
                    ? "border-emerald-400 bg-emerald-500/15 text-emerald-200 shadow-[0_0_0_1px_rgba(74,222,128,0.28)]"
                    : lightActiveButtonClass
                  : isNightMode
                    ? "border-neutral-800 text-neutral-200"
                    : lightButtonClass
              }`}
            >
              Auto {autoScrollState ? "On" : "Off"}
            </button>
          ) : null}
          {canToggleLayout ? (
            <button
              type="button"
              onClick={onToggleLayout}
              disabled={disableLayoutToggle}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs ${
                disableLayoutToggle
                  ? isNightMode
                    ? "border-neutral-900 text-neutral-600"
                    : lightMutedButtonClass
                  : isNightMode
                    ? "border-neutral-800 text-neutral-200"
                    : lightButtonClass
                }`}
            >
              {layoutMode === "horizontal" ? "Wide" : "Scroll"}
            </button>
          ) : null}
          {canPrev ? (
            <button
              type="button"
              onClick={onPrev}
              aria-label="Previous episode"
              disabled={!hasPrev}
              className={`shrink-0 rounded-full border px-2 py-1 text-xs md:px-3 ${
                hasPrev
                  ? isNightMode
                    ? "border-neutral-800 text-neutral-200"
                    : lightButtonClass
                  : isNightMode
                    ? "border-neutral-900 text-neutral-600"
                    : lightMutedButtonClass
                }`}
            >
              Prev
            </button>
          ) : null}
          {canNext ? (
            <button
              type="button"
              onClick={onNext}
              aria-label={
                !hasNext
                  ? "End of chapter"
                  : nextLocked
                    ? "Locked upcoming episode"
                    : "Forward episode"
              }
              disabled={!hasNext}
              className={`shrink-0 rounded-full px-3 py-1 text-xs ${
                !hasNext
                  ? isNightMode
                    ? "border border-neutral-900 text-neutral-600"
                    : lightMutedButtonClass
                  : nextLocked
                    ? lightLockedButtonClass
                    : isNightMode
                      ? "border border-neutral-800 text-neutral-200"
                      : lightButtonClass
              }`}
            >
              {!hasNext ? "End" : nextLocked ? "Locked" : "Next"}
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
