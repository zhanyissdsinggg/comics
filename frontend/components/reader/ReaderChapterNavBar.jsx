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
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-[24px] border-2 border-white/20 bg-black/95 px-3 py-3 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] backdrop-blur-xl">
        <span className="hidden shrink-0 text-[10px] font-black uppercase tracking-[0.24em] text-white/50 sm:inline">
          Chapter Navigation
        </span>

        <button
          type="button"
          onClick={onPrev}
          disabled={!hasPrev}
          aria-label="Previous Chapter"
          className={cn(
            "inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-black uppercase tracking-[0.04em] transition-all duration-150 ease-out",
            hasPrev
              ? "border-white/20 bg-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:border-[#FFE500] hover:bg-[#111111]"
              : "border-white/10 bg-black text-white/35 shadow-none",
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
            "inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-black uppercase tracking-[0.04em] transition-all duration-150 ease-out",
            !hasNext
              ? "border-white/10 bg-black text-white/35 shadow-none"
              : nextLocked
                ? "border-2 border-black bg-[#FF007A] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#ff1f8a]"
                : "border-white/20 bg-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:border-[#00E5FF] hover:bg-[#111111]",
          )}
        >
          <span>{nextLocked ? "Unlock Next" : "Next Chapter"}</span>
          <ChevronRight className="size-4" strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}
