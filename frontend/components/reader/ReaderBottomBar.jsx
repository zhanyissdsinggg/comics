"use client";

import { List, Settings2 } from "lucide-react";
import { cn } from "../../lib/utils";

export default function ReaderBottomBar({
  visible = true,
  isComic = false,
  shellClassName = "",
  progressClassName = "",
  navButtonClassName = "",
  centerButtonClassName = "",
  iconButtonClassName = "",
  primaryButtonClassName = "",
  activeButtonClassName = "",
  progressPercent = 0,
  hasPrev = false,
  hasNext = false,
  onPrev,
  onNext,
  onOpenSeries,
  onOpenSettings,
  settingsOpen = false,
}) {
  return (
    <div
      aria-label="Chapter navigation"
      data-visible={visible ? "true" : "false"}
      className={cn(
        "fixed bottom-0 left-0 z-50 w-full backdrop-blur-xl transition-transform duration-300",
        shellClassName,
        visible ? "translate-y-0" : "translate-y-full",
      )}
    >
      <div className="absolute left-0 top-0 h-1 w-full bg-white/10">
        <div
          className={cn(
            "h-full transition-[width] duration-300",
            progressClassName,
          )}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <div
        className={cn(
          "mx-auto flex min-h-[78px] w-full items-center justify-between gap-3 px-4 py-3 md:px-6",
          isComic ? "max-w-[1120px]" : "max-w-[760px]",
        )}
      >
        <button type="button" onClick={onPrev} className={navButtonClassName}>
          Previous
        </button>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
          <button
            type="button"
            onClick={onOpenSeries}
            className={centerButtonClassName}
          >
            <List className="h-4 w-4" />
            {isComic ? "Chapter list" : "Episode list"}
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Reader Settings"
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-full border transition-colors",
              iconButtonClassName,
              settingsOpen ? activeButtonClassName : "",
            )}
          >
            <Settings2 className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={onNext}
          className={cn(primaryButtonClassName, !hasNext && "opacity-100")}
        >
          Next
        </button>
      </div>
    </div>
  );
}
