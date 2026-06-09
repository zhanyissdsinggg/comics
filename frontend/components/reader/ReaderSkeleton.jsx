"use client";

import { cn } from "../../lib/utils";
import {
  storefrontBadgeClass,
  storefrontSecondaryButtonClass,
} from "../common/StorefrontPagePrimitives";

function ReaderSkeletonLine({
  widthClass = "w-full",
  toneClass = "bg-white/10",
  className = "",
}) {
  return (
    <div
      className={cn(
        "h-3 animate-pulse rounded-full",
        widthClass,
        toneClass,
        className,
      )}
    />
  );
}

export default function ReaderSkeleton({
  isComic = false,
  rootClassName = "",
  mutedClassName = "",
  borderClassName = "",
  heroClassName = "",
  fallbackSeriesTitle = "Reader",
  fallbackEpisodeTitle = "Preparing chapter",
  backToSeriesHref = "/",
  onBack,
}) {
  return (
    <main
      className={cn(
        "min-h-screen px-4 pb-12 pt-8 md:px-6 md:pt-10",
        rootClassName,
        isComic ? "text-white" : "text-current",
      )}
    >
      <div
        className={cn(
          "mx-auto w-full",
          isComic ? "max-w-[1120px]" : "max-w-[760px]",
        )}
      >
        <div
          className={cn(
            "rounded-[28px] border px-5 py-5 md:px-6 md:py-6",
            isComic
              ? "border-white/10 bg-[#0b0f16]/88 shadow-[0_24px_70px_rgba(0,0,0,0.28)]"
              : heroClassName,
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]",
                    isComic
                      ? `${storefrontBadgeClass} text-white/78`
                      : `${borderClassName} bg-transparent ${mutedClassName}`,
                  )}
                >
                  Reader
                </span>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]",
                    isComic
                      ? `${storefrontBadgeClass} text-white/62`
                      : `${borderClassName} bg-transparent ${mutedClassName}`,
                  )}
                >
                  {isComic ? "Comic" : "Novel"}
                </span>
              </div>
              <h1
                className={cn(
                  "truncate text-[clamp(1.5rem,2.8vw,2.5rem)] font-black tracking-tight",
                  isComic ? "text-white" : "text-current",
                )}
              >
                {fallbackSeriesTitle}
              </h1>
              <p
                className={cn(
                  "mt-2 truncate text-sm md:text-base",
                  mutedClassName,
                )}
              >
                {fallbackEpisodeTitle}
              </p>
            </div>
            <button
              type="button"
              onClick={onBack}
              className={cn(
                "inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-full border px-4 text-sm font-bold transition-colors",
                isComic
                  ? `${storefrontSecondaryButtonClass} text-white`
                  : `${borderClassName} bg-white/5 text-white hover:bg-white/10`,
              )}
            >
              View Series
            </button>
          </div>
        </div>

        {isComic ? (
          <div className="mx-auto mt-6 max-w-[920px] rounded-[26px] bg-[#050505] px-3 py-4 md:px-5 md:py-5">
            <div className="mx-auto max-w-[760px] space-y-2">
              {[56, 68, 60].map((height, index) => (
                <div
                  key={index}
                  className="animate-pulse rounded-[16px] border border-white/[0.05] bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.03)_100%)]"
                  style={{
                    height: `${height}vh`,
                    minHeight: index === 1 ? 420 : 320,
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "mx-auto mt-6 max-w-[760px] rounded-[28px] border px-5 py-8 md:px-8 md:py-10",
              borderClassName,
            )}
          >
            <div className="mx-auto max-w-[680px] space-y-6">
              <div className="space-y-3">
                <ReaderSkeletonLine
                  widthClass="w-32"
                  toneClass={isComic ? "bg-white/10" : "bg-current/10"}
                />
                <ReaderSkeletonLine
                  widthClass="w-full"
                  toneClass={isComic ? "bg-white/10" : "bg-current/10"}
                  className="h-4"
                />
                <ReaderSkeletonLine
                  widthClass="w-5/6"
                  toneClass={isComic ? "bg-white/10" : "bg-current/10"}
                  className="h-4"
                />
              </div>
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="space-y-3">
                  <ReaderSkeletonLine
                    widthClass={index % 2 === 0 ? "w-full" : "w-[96%]"}
                    toneClass={isComic ? "bg-white/10" : "bg-current/10"}
                  />
                  <ReaderSkeletonLine
                    widthClass={index % 3 === 0 ? "w-[88%]" : "w-[92%]"}
                    toneClass={isComic ? "bg-white/10" : "bg-current/10"}
                  />
                  <ReaderSkeletonLine
                    widthClass={index % 2 === 0 ? "w-[78%]" : "w-[84%]"}
                    toneClass={isComic ? "bg-white/10" : "bg-current/10"}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
