"use client";

import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  storefrontBadgeClass,
  storefrontPrimaryButtonClass,
} from "./StorefrontPagePrimitives";

function MascotPlaceholder() {
  return (
    <div
      aria-hidden="true"
      className="relative flex h-28 w-28 items-center justify-center sm:h-32 sm:w-32"
    >
      <div className="absolute inset-0 rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(31,25,40,0.96)_0%,rgba(16,13,24,0.98)_100%)] shadow-[0_22px_56px_rgba(8,6,20,0.32)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(103,232,249,0.16),transparent_24%),radial-gradient(circle_at_78%_18%,rgba(255,79,154,0.18),transparent_26%),radial-gradient(circle_at_34%_84%,rgba(244,201,93,0.16),transparent_22%)]" />
      <div className="absolute left-5 top-5 h-4 w-4 rounded-full bg-[rgba(103,232,249,0.72)] blur-[2px]" />
      <div className="absolute right-5 top-7 h-3 w-3 rounded-full bg-[rgba(255,79,154,0.78)] blur-[1px]" />
      <div className="absolute bottom-5 left-6 h-5 w-5 rounded-full bg-[rgba(244,201,93,0.72)] blur-[2px]" />
      <div className="absolute bottom-6 right-6 h-6 w-6 rounded-full border border-white/10 bg-[rgba(255,255,255,0.035)]" />
      <div className="relative flex h-16 w-16 items-center justify-center rounded-[22px] border border-white/12 bg-[rgba(8,7,14,0.86)] shadow-[0_16px_38px_rgba(0,0,0,0.34)] backdrop-blur-xl">
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
          "relative w-full max-w-xl overflow-hidden rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(29,24,37,0.98)_0%,rgba(16,13,24,0.98)_100%)] px-6 py-8 text-center text-white shadow-[0_24px_64px_rgba(8,6,20,0.34)] sm:px-8 sm:py-10",
          cardClassName,
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,79,154,0.14),transparent_24%),radial-gradient(circle_at_top_right,rgba(103,232,249,0.12),transparent_22%)]" />
        <div className="relative flex flex-col items-center justify-center">
          {showIllustration ? illustration || <MascotPlaceholder /> : null}

          <p className={`mt-5 ${storefrontBadgeClass} text-white/56`}>
            Network
          </p>

          <h2
            className={cn(
              "max-w-md text-balance font-display text-2xl font-semibold tracking-[-0.05em] text-white sm:text-[2rem]",
              showIllustration ? "mt-3" : "mt-0",
            )}
          >
            {title}
          </h2>

          {description ? (
            <p className="mt-3 max-w-md text-sm leading-6 text-white/68 sm:text-[15px]">
              {description}
            </p>
          ) : null}

          <button
            type="button"
            onClick={canRetry ? onRetry : undefined}
            disabled={!canRetry}
            className={cn(
              "mt-6",
              storefrontPrimaryButtonClass,
              !canRetry ? "cursor-not-allowed opacity-50" : "",
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
