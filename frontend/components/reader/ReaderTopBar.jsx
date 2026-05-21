"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import {
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  Ellipsis,
  Settings2,
} from "lucide-react";
import { cn } from "../../lib/utils";

const ShareButton = dynamic(() => import("../common/ShareButton"), {
  ssr: false,
});

export default function ReaderTopBar({
  title,
  episodeLabel,
  subtitle,
  contextLabel = "",
  contextActionLabel = "",
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
  seriesType = "comic",
  variant = "minimal",
  isComic = false,
  rightSlot = null,
  bookmarkActive = false,
}) {
  if (variant === "minimal") {
    return (
      <header
        className={cn(
          "fixed top-0 z-50 w-full backdrop-blur-xl transition-transform duration-300",
          isComic
            ? "border-b border-white/5 bg-[#0b0f16]/88 text-white"
            : "border-b border-black/8 bg-[rgba(250,250,250,0.94)] text-[#1f2933]",
        )}
      >
        <div
          className={cn(
            "mx-auto flex min-h-[72px] w-full items-center justify-between gap-3 px-4 py-3 md:px-6",
            isComic ? "max-w-[1120px]" : "max-w-[760px]",
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              aria-label={contextActionLabel || "Back"}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-2xl border transition-all active:scale-[0.97]",
                isComic
                  ? "border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10"
                  : "border-[#d8dde6] bg-white/90 text-[#1f2933] hover:bg-white",
              )}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              {subtitle ? (
                <p
                  className={cn(
                    "mb-1 truncate text-[10px] font-semibold uppercase tracking-[0.22em]",
                    isComic ? "text-white/58" : "text-[#667085]",
                  )}
                >
                  {subtitle}
                </p>
              ) : null}
              {contextLabel ? (
                <p
                  className={cn(
                    "mb-1 truncate text-[10px] font-semibold uppercase tracking-[0.18em]",
                    isComic ? "text-white/72" : "text-[#667085]",
                  )}
                >
                  {contextLabel}
                </p>
              ) : null}
              <h1
                className={cn(
                  "truncate text-sm font-black md:text-[15px]",
                  isComic ? "text-white" : "text-current",
                )}
              >
                {title}
              </h1>
              <p
                className={cn(
                  "truncate text-xs md:text-sm",
                  isComic ? "text-white/58" : "text-[#667085]",
                )}
              >
                {episodeLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {typeof onAddBookmark === "function" ? (
              <button
                type="button"
                onClick={onAddBookmark}
                aria-label={
                  bookmarkActive ? "Remove bookmark" : "Save bookmark"
                }
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-2xl border transition-all active:scale-[0.97]",
                  isComic
                    ? "border-white/10 bg-white/5 text-gray-300 hover:border-white/20 hover:bg-white/10 hover:text-white"
                    : "border-[#d8dde6] bg-white/90 text-[#1f2933] hover:bg-white",
                )}
              >
                {bookmarkActive ? (
                  <BookmarkCheck className="h-5 w-5" />
                ) : (
                  <Bookmark className="h-5 w-5" />
                )}
              </button>
            ) : null}
            {typeof onOpenSettings === "function" ? (
              <button
                type="button"
                onClick={onOpenSettings}
                aria-label="Reader Settings"
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-2xl border transition-all active:scale-[0.97]",
                  isComic
                    ? "border-white/10 bg-white/5 text-gray-300 hover:border-white/20 hover:bg-white/10 hover:text-white"
                    : "border-[#d8dde6] bg-white/90 text-[#1f2933] hover:bg-white",
                )}
              >
                <Settings2 className="h-5 w-5" />
              </button>
            ) : null}
            {rightSlot}
            {!rightSlot ? (
              <button
                type="button"
                aria-label="More"
                className={cn(
                  "hidden h-11 w-11 items-center justify-center rounded-2xl border transition-all md:flex",
                  isComic
                    ? "border-white/10 bg-white/5 text-gray-300"
                    : "border-[#d8dde6] bg-white/90 text-[#1f2933]",
                )}
              >
                <Ellipsis className="h-5 w-5" />
              </button>
            ) : null}
          </div>
        </div>
      </header>
    );
  }

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
    "border-2 border-white/20 bg-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 ease-out hover:translate-x-0.5 hover:translate-y-0.5 hover:border-white/35 hover:bg-[#111111]";
  const lightActiveButtonClass =
    "border-2 border-black bg-[#00C767] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";
  const lightMutedButtonClass =
    "border-2 border-white/10 bg-black text-white/35 shadow-none";
  const lightLockedButtonClass =
    "border-2 border-black bg-[#FF007A] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";
  const installmentPlural = seriesType === "novel" ? "Episodes" : "Chapters";
  const installmentSingle = seriesType === "novel" ? "episode" : "chapter";

  const canOpenToc = typeof onOpenToc === "function";
  const canBookmark = typeof onAddBookmark === "function";
  const canToggleNight = typeof onToggleNight === "function";
  const canToggleLayout = typeof onToggleLayout === "function";
  const canPrev = typeof onPrev === "function";
  const canNext = typeof onNext === "function";
  const topBarButtonClass =
    "shrink-0 rounded-full border border-white/10 bg-[rgba(255,255,255,0.04)] px-3 py-1.5 text-xs text-white shadow-[0_12px_24px_rgba(0,0,0,0.24)] backdrop-blur-xl transition-all duration-150 hover:-translate-y-0.5 hover:border-white/16 hover:bg-[rgba(255,255,255,0.08)]";
  const activeChipClass =
    "border-[rgba(255,79,154,0.34)] bg-[rgba(255,79,154,0.16)] text-white shadow-[0_12px_24px_rgba(255,79,154,0.14)]";
  const lockedChipClass =
    "border-[rgba(255,79,154,0.26)] bg-[rgba(255,79,154,0.18)] text-white";
  const mutedChipClass =
    "border-white/6 bg-[rgba(255,255,255,0.02)] text-white/34 shadow-none";

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-[rgba(11,10,16,0.82)] text-neutral-100 backdrop-blur-2xl">
      {typeof progress === "number" ? (
        <div className="h-1 w-full bg-[rgba(255,255,255,0.04)]">
          <div
            className="h-full bg-[linear-gradient(90deg,#ff4f9a_0%,#ff76ad_55%,#67e8f9_100%)] transition-all duration-300"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      ) : null}

      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-3 py-3 sm:flex-nowrap sm:justify-between sm:px-4">
        <button type="button" onClick={onBack} className={topBarButtonClass}>
          {contextActionLabel || "Back"}
        </button>

        <div className="min-w-0 flex-1 text-center sm:flex-none">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p
            className={`text-xs ${
              isNightMode ? "text-neutral-400" : "text-white/50"
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
              className={topBarButtonClass}
              aria-label={installmentPlural}
            >
              {installmentPlural}
            </button>
          ) : null}
          {canBookmark ? (
            <button
              type="button"
              onClick={onAddBookmark}
              className={topBarButtonClass}
            >
              Save
            </button>
          ) : null}
          <ShareButton
            url={shareUrl}
            title={`${title} - ${episodeLabel}`}
            description={`${episodeLabel} from ${title} on Gush`}
            className={`!w-auto !shrink-0 !rounded-full !px-2 !py-1 !text-xs md:!px-3 ${
              isNightMode
                ? "!border !border-white/10 !bg-[rgba(255,255,255,0.04)]"
                : "!border !border-white/10 !bg-[rgba(255,255,255,0.04)] !text-white !shadow-[0_12px_24px_rgba(0,0,0,0.24)] hover:!translate-y-[-2px] hover:!border-white/16 hover:!bg-[rgba(255,255,255,0.08)]"
            }`}
          />
          {onOpenSettings ? (
            <button
              type="button"
              onClick={onOpenSettings}
              className={topBarButtonClass}
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
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs ${nightState ? activeChipClass : topBarButtonClass}`}
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
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs ${autoScrollState ? activeChipClass : topBarButtonClass}`}
            >
              Auto {autoScrollState ? "On" : "Off"}
            </button>
          ) : null}
          {canToggleLayout ? (
            <button
              type="button"
              onClick={onToggleLayout}
              disabled={disableLayoutToggle}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs ${disableLayoutToggle ? mutedChipClass : topBarButtonClass}`}
            >
              {layoutMode === "horizontal" ? "Wide" : "Scroll"}
            </button>
          ) : null}
          {canPrev ? (
            <button
              type="button"
              onClick={onPrev}
              aria-label={`Previous ${installmentSingle}`}
              disabled={!hasPrev}
              className={`shrink-0 rounded-full border px-2 py-1.5 text-xs md:px-3 ${hasPrev ? topBarButtonClass : mutedChipClass}`}
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
                  ? `End of ${installmentSingle}`
                  : nextLocked
                    ? `Locked next ${installmentSingle}`
                    : `Next ${installmentSingle}`
              }
              disabled={!hasNext}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs ${
                !hasNext
                  ? mutedChipClass
                  : nextLocked
                    ? lockedChipClass
                    : topBarButtonClass
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
