"use client";

import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

function MascotPlaceholder() {
  return (
    <div
      aria-hidden="true"
      className="relative flex h-28 w-28 items-center justify-center sm:h-32 sm:w-32"
    >
      <div className="absolute inset-0 rotate-[-2deg] rounded-[28px] border border-black/10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] shadow-[0_18px_40px_rgba(15,23,42,0.08)]" />
      <div className="absolute left-5 top-5 h-4 w-4 rounded-full border border-black/10 bg-white" />
      <div className="absolute right-5 top-7 h-3 w-3 rounded-full border border-rose-200/70 bg-rose-50" />
      <div className="absolute bottom-5 left-6 h-5 w-5 rounded-full border border-sky-200/70 bg-sky-50" />
      <div className="absolute bottom-6 right-6 h-6 w-6 rounded-full border border-black/10 bg-white" />
      <div className="relative flex h-16 w-16 items-center justify-center rounded-[22px] border border-black/10 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
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
  title = "Couldn't load.",
  description = "",
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
          "relative w-full max-w-xl overflow-hidden rounded-[30px] border border-black/10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-6 py-8 text-center shadow-[0_28px_60px_rgba(15,23,42,0.14)] sm:px-8 sm:py-10",
          cardClassName,
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-[linear-gradient(180deg,rgba(255,255,255,0.75),transparent)]" />
        <div className="pointer-events-none absolute -right-6 top-8 h-20 w-20 rounded-full bg-sky-100/70 blur-2xl" />
        <div className="relative flex flex-col items-center justify-center">
          {showIllustration ? illustration || <MascotPlaceholder /> : null}

          <p className="mt-5 rounded-full border border-black/10 bg-[#f6f7f9] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-black/55">
            Network
          </p>

          <h2
            className={cn(
              "max-w-md text-balance font-display text-2xl font-semibold tracking-[-0.05em] text-black sm:text-[2rem]",
              showIllustration ? "mt-3" : "mt-0",
            )}
          >
            {title}
          </h2>

          {description ? (
            <p className="mt-3 max-w-md text-sm leading-6 text-black/68 sm:text-[15px]">
              {description}
            </p>
          ) : null}

          <button
            type="button"
            onClick={canRetry ? onRetry : undefined}
            disabled={!canRetry}
            className={cn(
              "mt-6 inline-flex items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] transition-[background-color,border-color,box-shadow,transform] duration-200",
              canRetry
                ? "border-black bg-black text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)] hover:bg-black/90 hover:shadow-[0_10px_24px_rgba(15,23,42,0.14)] active:translate-y-px"
                : "cursor-not-allowed border-black/10 bg-black/5 text-black/45",
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
