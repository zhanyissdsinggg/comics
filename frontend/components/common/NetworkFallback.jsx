"use client";

import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

function MascotPlaceholder() {
  return (
    <div
      aria-hidden="true"
      className="relative flex h-28 w-28 items-center justify-center sm:h-32 sm:w-32"
    >
      <div className="absolute inset-0 rounded-[30px] border-[3px] border-black bg-[#fff6cf] shadow-[8px_8px_0_0_rgba(0,0,0,1)]" />
      <div className="absolute left-5 top-5 h-4 w-4 rounded-full bg-[#ffe500]" />
      <div className="absolute right-5 top-7 h-3 w-3 rounded-full bg-[#ff007a]" />
      <div className="absolute bottom-5 left-6 h-5 w-5 rounded-full bg-[#00e5ff]" />
      <div className="absolute bottom-6 right-6 h-6 w-6 rounded-full border-[2px] border-black bg-white" />
      <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-black bg-white shadow-[5px_5px_0_0_rgba(0,0,0,1)]">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-black/30" />
          <span className="h-2.5 w-2.5 rounded-full bg-black/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-black/30" />
        </div>
      </div>
    </div>
  );
}

export default function NetworkFallback({
  title = "We couldn't load this right now.",
  description = "Connection looks shaky. Your data is safe. Try again.",
  retryLabel = "Retry",
  onRetry,
  compact = false,
  showIllustration = true,
  illustration = null,
  className = "",
  cardClassName = "",
  children = null,
}) {
  const canRetry = typeof onRetry === "function";

  return (
    <section
      role="status"
      aria-live="polite"
      className={cn(
        "flex w-full flex-col items-center justify-center px-4 py-8 sm:px-6",
        compact
          ? "min-h-[18rem] sm:min-h-[20rem]"
          : "min-h-[42vh] sm:min-h-[48vh]",
        className,
      )}
    >
      <div
        className={cn(
          "relative w-full max-w-xl overflow-hidden rounded-[32px] border-[3px] border-black bg-white px-6 py-8 text-center shadow-[10px_10px_0_0_rgba(0,0,0,1)] sm:px-8 sm:py-10",
          cardClassName,
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),transparent_30%)]" />
        <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-[#00e5ff]/20 blur-3xl" />
        <div className="relative flex flex-col items-center justify-center">
          {showIllustration ? illustration || <MascotPlaceholder /> : null}

          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.28em] text-black/55">
            Connection issue
          </p>

          <h2
            className={cn(
              "max-w-md text-balance font-display text-2xl font-black uppercase tracking-[-0.05em] text-black sm:text-[2rem]",
              showIllustration ? "mt-3" : "mt-0",
            )}
          >
            {title}
          </h2>

          <p className="mt-3 max-w-md text-sm leading-6 text-black/68 sm:text-[15px]">
            {description}
          </p>

          <button
            type="button"
            onClick={canRetry ? onRetry : undefined}
            disabled={!canRetry}
            className={cn(
              "mt-6 inline-flex items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] transition-all duration-200",
              canRetry
                ? "border-[3px] border-black bg-black text-white shadow-[6px_6px_0_0_rgba(255,0,122,1)] hover:-translate-y-0.5 hover:bg-[#ff007a]"
                : "cursor-not-allowed border-[3px] border-black bg-black/10 text-black/45",
            )}
          >
            <RefreshCw className="size-4" />
            <span>{retryLabel}</span>
          </button>

          {children ? (
            <div className="mt-4 flex w-full flex-wrap items-center justify-center gap-2">
              {children}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
