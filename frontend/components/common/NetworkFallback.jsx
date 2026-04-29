"use client";

import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { storefrontPrimaryButtonClass } from "./StorefrontPagePrimitives";

function MascotPlaceholder() {
  return (
    <div
      aria-hidden="true"
      className="relative flex h-28 w-28 items-center justify-center sm:h-32 sm:w-32"
    >
      <div className="absolute inset-0 rotate-[-2deg] rounded-[26px] border-2 border-black bg-[#0b0b0b] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]" />
      <div className="absolute left-5 top-5 h-4 w-4 rounded-full border-2 border-black bg-[#00E5FF]" />
      <div className="absolute right-5 top-7 h-3 w-3 rounded-full border-2 border-black bg-[#FF007A]" />
      <div className="absolute bottom-5 left-6 h-5 w-5 rounded-full border-2 border-black bg-[#FFE500]" />
      <div className="absolute bottom-6 right-6 h-6 w-6 rounded-full border-2 border-black bg-[#111111]" />
      <div className="relative flex h-16 w-16 items-center justify-center rounded-[22px] border-2 border-black bg-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-white/30" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/30" />
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
          "relative w-full max-w-xl overflow-hidden rounded-[26px] border-2 border-black bg-[#0b0b0b] px-6 py-8 text-center text-white shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] sm:px-8 sm:py-10",
          cardClassName,
        )}
      >
        <div className="relative flex flex-col items-center justify-center">
          {showIllustration ? illustration || <MascotPlaceholder /> : null}

          <p className="mt-5 rounded-full border-2 border-black bg-black px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-white/70 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            Network
          </p>

          <h2
            className={cn(
              "max-w-md text-balance font-display text-2xl font-black uppercase tracking-[-0.05em] text-white sm:text-[2rem]",
              showIllustration ? "mt-3" : "mt-0",
            )}
          >
            {title}
          </h2>

          {description ? (
            <p className="mt-3 max-w-md text-sm font-semibold leading-6 text-white/75 sm:text-[15px]">
              {description}
            </p>
          ) : null}

          <button
            type="button"
            onClick={canRetry ? onRetry : undefined}
            disabled={!canRetry}
            className={cn("mt-6", storefrontPrimaryButtonClass, !canRetry ? "opacity-50 cursor-not-allowed" : "")}
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
