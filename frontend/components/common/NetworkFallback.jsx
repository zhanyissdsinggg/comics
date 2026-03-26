"use client";

import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

function MascotPlaceholder() {
  return (
    <div
      aria-hidden="true"
      className="relative flex h-28 w-28 items-center justify-center sm:h-32 sm:w-32"
    >
      <div className="absolute inset-0 rounded-[30px] border border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,247,237,0.96))] shadow-[0_18px_40px_rgba(15,23,42,0.08)]" />
      <div className="absolute left-5 top-5 h-4 w-4 rounded-full bg-amber-300/80" />
      <div className="absolute right-5 top-7 h-3 w-3 rounded-full bg-sky-200/90" />
      <div className="absolute bottom-5 left-6 h-5 w-5 rounded-full bg-rose-200/90" />
      <div className="absolute bottom-6 right-6 h-6 w-6 rounded-full border border-slate-200/80 bg-white/90" />
      <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/95 shadow-[0_10px_26px_rgba(15,23,42,0.1)]">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        </div>
      </div>
    </div>
  );
}

export default function NetworkFallback({
  title = "Oops! Our servers are taking a quick breather.",
  description = "We're having trouble connecting. Your data is safe, let's try that again.",
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
        compact ? "min-h-[18rem] sm:min-h-[20rem]" : "min-h-[42vh] sm:min-h-[48vh]",
        className,
      )}
    >
      <div
        className={cn(
          "relative w-full max-w-xl overflow-hidden rounded-[32px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,248,252,0.98))] px-6 py-8 text-center shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:px-8 sm:py-10",
          cardClassName,
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.08),transparent_28%),radial-gradient(circle_at_100%_0%,rgba(59,130,246,0.08),transparent_24%)]" />

        <div className="relative flex flex-col items-center justify-center">
          {showIllustration ? illustration || <MascotPlaceholder /> : null}

          <h2 className={cn("max-w-md text-balance font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]", showIllustration ? "mt-6" : "mt-0")}>
            {title}
          </h2>

          <p className="mt-3 max-w-md text-sm leading-7 text-slate-500 sm:text-[15px]">
            {description}
          </p>

          <button
            type="button"
            onClick={canRetry ? onRetry : undefined}
            disabled={!canRetry}
            className={cn(
              "mt-6 inline-flex items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition-all duration-200",
              canRetry
                ? "border-black/8 bg-slate-950 text-white hover:bg-slate-800"
                : "cursor-not-allowed border-black/6 bg-slate-200 text-slate-500",
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
