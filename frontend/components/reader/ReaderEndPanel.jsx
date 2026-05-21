"use client";

import { Heart, Share2 } from "lucide-react";
import { cn } from "../../lib/utils";

export default function ReaderEndPanel({
  isComic = false,
  shellClassName = "",
  mutedClassName = "",
  borderClassName = "",
  primaryButtonClassName = "",
  secondaryButtonClassName = "",
  heading,
  description,
  nextEpisodeTitle = "",
  nextEpisodeHint = "",
  hasNextEpisode = false,
  isUnlocked = true,
  isSignedIn = false,
  shortfallPts = 0,
  currentPricePts = 0,
  currentBookmark = null,
  liked = false,
  onPrimaryAction,
  onOpenComments,
  onPrev,
  onBack,
  onBookmark,
  onLike,
  onShare,
  onOpenLogin,
  onOpenStore,
  onUnlock,
  unlockBusy = false,
}) {
  return (
    <section data-testid="reader-end-panel" className="px-4 pb-4 pt-8 md:px-6">
      <div className={cn("mx-auto", isComic ? "max-w-5xl" : "max-w-[760px]")}>
        <div className="grid gap-4">
          <div className={shellClassName}>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">
              End of chapter
            </p>
            <h3
              className={cn(
                "mt-3 text-[clamp(1.9rem,3vw,2.8rem)] font-black tracking-tight",
                isComic ? "text-white" : "text-current",
              )}
            >
              {heading}
            </h3>
            <p
              className={cn("mt-3 max-w-2xl text-sm leading-6", mutedClassName)}
            >
              {description}
            </p>

            {hasNextEpisode ? (
              <div
                className={cn(
                  "mt-5 rounded-[24px] border px-4 py-4 text-left",
                  borderClassName,
                )}
              >
                <p
                  className={cn(
                    "text-[10px] font-black uppercase tracking-[0.18em]",
                    mutedClassName,
                  )}
                >
                  More from this series
                </p>
                <p
                  className={cn(
                    "mt-2 text-base font-black",
                    isComic ? "text-white" : "text-current",
                  )}
                >
                  {nextEpisodeTitle}
                </p>
                <p className={cn("mt-1 text-sm leading-6", mutedClassName)}>
                  {nextEpisodeHint}
                </p>
              </div>
            ) : null}

            <div className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              {isUnlocked ? (
                <button
                  type="button"
                  onClick={onPrimaryAction}
                  aria-label={hasNextEpisode ? "Continue reading" : "Back to series"}
                  className={primaryButtonClassName}
                >
                  {hasNextEpisode ? "Continue reading" : "Back to series"}
                </button>
              ) : !isSignedIn ? (
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className={primaryButtonClassName}
                >
                  Sign in to unlock
                </button>
              ) : shortfallPts > 0 ? (
                <button
                  type="button"
                  onClick={onOpenStore}
                  className={primaryButtonClassName}
                >
                  Get more points
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onUnlock}
                  disabled={unlockBusy}
                  className={cn(
                    primaryButtonClassName,
                    "disabled:cursor-wait disabled:opacity-70",
                  )}
                >
                  {unlockBusy
                    ? "Unlocking..."
                    : `Unlock with ${currentPricePts} pts`}
                </button>
              )}

              <button
                type="button"
                onClick={onOpenComments}
                className={secondaryButtonClassName}
              >
                Join the discussion
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={onPrev}
                className={secondaryButtonClassName}
              >
                Previous chapter
              </button>
              <button
                type="button"
                onClick={onBack}
                className={secondaryButtonClassName}
              >
                Back to series
              </button>
              <button
                type="button"
                onClick={onBookmark}
                className={secondaryButtonClassName}
              >
                {currentBookmark ? "Remove bookmark" : "Save progress"}
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={onLike}
                className={cn(
                  "flex min-h-[92px] items-center justify-center gap-3 rounded-[24px] border px-4 py-4 text-sm font-bold transition-all active:scale-[0.98]",
                  liked
                    ? "border-red-500/30 bg-red-500/10 text-red-300"
                    : borderClassName,
                )}
              >
                <Heart className={cn("h-5 w-5", liked ? "fill-current" : "")} />
                <span>{liked ? "Liked" : "Like"}</span>
              </button>
              <button
                type="button"
                onClick={onShare}
                className={cn(
                  "flex min-h-[92px] items-center justify-center gap-3 rounded-[24px] border px-4 py-4 text-sm font-bold transition-all active:scale-[0.98]",
                  borderClassName,
                )}
              >
                <Share2 className="h-5 w-5" />
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
