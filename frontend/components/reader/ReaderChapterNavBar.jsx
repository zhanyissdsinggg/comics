"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getInstallmentLabel } from "../../lib/seriesFormatLabels";

export default function ReaderChapterNavBar({
  visible = false,
  hasPrev = false,
  hasNext = false,
  nextLocked = false,
  onPrev,
  onNext,
  seriesType,
}) {
  const installmentLabel = getInstallmentLabel(seriesType);
  return (
    <div
      aria-label={`${installmentLabel} navigation`}
      data-visible={visible ? "true" : "false"}
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4 transition-all duration-300 ease-out",
        visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
      )}
    >
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-[24px] border border-white/12 bg-[rgba(10,12,20,0.9)] px-3 py-3 shadow-[0_24px_54px_rgba(0,0,0,0.36)] backdrop-blur-[22px]">
        <span className="hidden shrink-0 text-[10px] font-black uppercase tracking-[0.24em] text-white/50 sm:inline">
          {installmentLabel} Navigation
        </span>

        <button
          type="button"
          onClick={onPrev}
          disabled={!hasPrev}
          aria-label={`Previous ${installmentLabel}`}
          className={cn(
            "inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-black uppercase tracking-[0.04em] transition-all duration-150 ease-out",
            hasPrev
              ? "border-white/16 bg-white/[0.05] text-white shadow-[0_16px_30px_rgba(8,6,20,0.22)] hover:-translate-y-0.5 hover:border-white/24 hover:bg-white/[0.08]"
              : "border-white/8 bg-white/[0.02] text-white/35 shadow-none",
          )}
        >
          <ChevronLeft className="size-4" strokeWidth={2.2} />
          <span>{`Previous ${installmentLabel}`}</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={!hasNext}
          aria-label={
            !hasNext
              ? `End of ${installmentLabel.toLowerCase()}`
              : nextLocked
                ? `Unlock next ${installmentLabel.toLowerCase()}`
                : `Next ${installmentLabel}`
          }
          className={cn(
            "inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-black uppercase tracking-[0.04em] transition-all duration-150 ease-out",
            !hasNext
              ? "border-white/8 bg-white/[0.02] text-white/35 shadow-none"
              : nextLocked
                ? "border-[rgba(255,79,154,0.28)] bg-[linear-gradient(135deg,rgba(255,79,154,0.22)_0%,rgba(255,124,177,0.16)_100%)] text-white shadow-[0_16px_30px_rgba(255,79,154,0.18)] hover:-translate-y-0.5"
                : "border-white/16 bg-white/[0.05] text-white shadow-[0_16px_30px_rgba(8,6,20,0.22)] hover:-translate-y-0.5 hover:border-cyan-300/20 hover:bg-white/[0.08]",
          )}
        >
          <span>{nextLocked ? "Unlock Next" : `Next ${installmentLabel}`}</span>
          <ChevronRight className="size-4" strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}
