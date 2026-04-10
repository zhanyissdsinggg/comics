"use client";

import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

function MascotPlaceholder() {
  return (
    <div
      aria-hidden="true"
      className="relative flex h-28 w-28 items-center justify-center sm:h-32 sm:w-32"
    >
      <div className="absolute inset-0 rounded-[30px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] shadow-[0_16px_36px_rgba(15,23,42,0.06)]" />
      <div className="absolute left-5 top-5 h-4 w-4 rounded-full bg-[#d9ecff]" />
      <div className="absolute right-5 top-7 h-3 w-3 rounded-full bg-slate-200/80" />
      <div className="absolute bottom-5 left-6 h-5 w-5 rounded-full bg-[#e8f2ff]" />
      <div className="absolute bottom-6 right-6 h-6 w-6 rounded-full border border-slate-200/70 bg-white" />
      <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-[color:var(--gush-border)] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
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
          "relative w-full max-w-xl overflow-hidden rounded-[32px] border border-[color:var(--gush-border)] bg-white px-6 py-8 text-center shadow-[0_22px_52px_rgba(15,23,42,0.06)] sm:px-8 sm:py-10",
          cardClassName,
        )}
      >
        <div className="relative flex flex-col items-center justify-center">
          {showIllustration ? illustration || <MascotPlaceholder /> : null}

          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Connection issue
          </p>

          <h2
            className={cn(
              "max-w-md text-balance font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]",
              showIllustration ? "mt-3" : "mt-0",
            )}
          >
            {title}
          </h2>

          <p className="mt-3 max-w-md text-sm leading-6 text-slate-500 sm:text-[15px]">
            {description}
          </p>

          <button
            type="button"
            onClick={canRetry ? onRetry : undefined}
            disabled={!canRetry}
            className={cn(
              "mt-6 inline-flex items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition-all duration-200",
              canRetry
                ? "border-slate-950 bg-slate-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.12)] hover:bg-slate-800"
                : "cursor-not-allowed border-[color:var(--gush-border)] bg-slate-200 text-slate-500",
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
