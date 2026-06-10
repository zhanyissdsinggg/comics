"use client";

import { siteConfig } from "../../lib/siteConfig";
import { cn } from "../../lib/utils";

export default function ReaderEndPanel({
  isComic = false,
  shellClassName = "",
  mutedClassName = "",
  borderClassName = "",
  primaryButtonClassName = "",
  secondaryButtonClassName = "",
  completionLabel = "Part Complete",
  heading,
  description,
  nextEpisodeTitle = "",
  nextEpisodeHint = "",
  nextActionLabel = "Next part",
  nextReadyLabel = "Next part is ready",
  hasNextEpisode = false,
  isUnlocked = true,
  isSignedIn = false,
  shortfallPts = 0,
  currentPricePts = 0,
  currentBookmark = null,
  liked = false,
  onPrimaryAction,
  onOpenComments,
  onBack,
  onOpenLogin,
  onOpenStore,
  onUnlock,
  unlockBusy = false,
}) {
  const checkoutEnabled = siteConfig.monetization.checkoutEnabled === true;
  return (
    <section data-testid="reader-end-panel" className="px-4 pb-4 pt-8 md:px-6">
      <div className={cn("mx-auto", isComic ? "max-w-5xl" : "max-w-[760px]")}>
        <div className="grid gap-4">
          <div className={shellClassName}>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/46">
              {completionLabel}
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
                  Up Next
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

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {isUnlocked ? (
                <button
                  type="button"
                  onClick={onPrimaryAction}
                  aria-label={hasNextEpisode ? nextActionLabel : "View Series"}
                  className={primaryButtonClassName}
                >
                  {hasNextEpisode ? nextActionLabel : "View Series"}
                </button>
              ) : !isSignedIn ? (
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className={primaryButtonClassName}
                >
                  Sign in to unlock
                </button>
              ) : !checkoutEnabled && currentPricePts > 0 ? (
                <button
                  type="button"
                  onClick={onOpenStore}
                  className={primaryButtonClassName}
                >
                  Open Store
                </button>
              ) : shortfallPts > 0 ? (
                <button
                  type="button"
                  onClick={onOpenStore}
                  className={primaryButtonClassName}
                >
                  {checkoutEnabled ? "Add Points" : "Open Store"}
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
                Reader reactions
              </button>
              <button
                type="button"
                onClick={onBack}
                className={secondaryButtonClassName}
              >
                View Series
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-[0.16em] text-white/42">
              {hasNextEpisode ? <span>{nextReadyLabel}</span> : null}
              {currentBookmark ? <span>Progress saved</span> : null}
              {liked ? <span>Liked</span> : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
