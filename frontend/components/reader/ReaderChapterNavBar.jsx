"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ReaderChapterNavBar({
  visible = false,
  hasPrev = false,
  hasNext = false,
  nextLocked = false,
  onPrev,
  onNext,
}) {
  return (
    <div
      aria-label="Chapter navigation"
      data-visible={visible ? "true" : "false"}
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4 transition-all duration-300 ease-out",
        visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
      )}
    >
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-[24px] border border-white/10 bg-neutral-950/84 px-3 py-3 shadow-[0_24px_60px_rgba(0,0,0,0.38)] backdrop-blur-xl">
        <span className="hidden shrink-0 text-[10px] font-semibold uppercase tracking-[0.24em] text-neutral-500 sm:inline">
          Chapter Navigation
        </span>

        <button
          type="button"
          onClick={onPrev}
          disabled={!hasPrev}
          aria-label="Previous Chapter"
          className={cn(
            "inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200",
            hasPrev
              ? "border-white/10 bg-white/[0.04] text-white hover:border-white/20 hover:bg-white/[0.08]"
              : "border-white/6 bg-white/[0.02] text-neutral-600",
          )}
        >
          <ChevronLeft className="size-4" strokeWidth={2.2} />
          <span>Previous Chapter</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={!hasNext}
          aria-label={!hasNext ? "End of chapter" : nextLocked ? "Unlock next chapter" : "Next Chapter"}
          className={cn(
            "inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200",
            !hasNext
              ? "border-white/6 bg-white/[0.02] text-neutral-600"
              : nextLocked
                ? "border-red-500/30 bg-red-500/[0.08] text-red-200 hover:border-red-400/40 hover:bg-red-500/[0.12]"
                : "border-white/10 bg-white/[0.04] text-white hover:border-white/20 hover:bg-white/[0.08]",
          )}
        >
          <span>{nextLocked ? "Unlock Next" : "Next Chapter"}</span>
          <ChevronRight className="size-4" strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}
