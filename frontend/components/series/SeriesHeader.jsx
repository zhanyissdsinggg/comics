"use client";

import { Heart } from "lucide-react";
import Cover from "../common/Cover";
import ShareButton from "../common/ShareButton";

export default function SeriesHeader({
  series,
  previewHint,
  progress,
  onContinue,
  onStart,
  onFollowToggle,
  isFollowing,
}) {
  const genres = series.genres || [];
  const badges = series.badges || [];
  const isAdult = Boolean(series.adult);
  const hasFreeEpisodes = series.hasFreeEpisodes || series.freeEpisodeCount > 0;

  return (
    <header className="py-4 sm:py-6">
      {/* Always horizontal: small cover left, info right */}
      <div className="flex gap-4 sm:gap-8">
        {/* Cover + read button (desktop only) */}
        <div className="flex-shrink-0 w-28 sm:w-48 md:w-56">
          <div className="aspect-[3/4] w-full overflow-hidden rounded-lg bg-neutral-800">
            <Cover tone={series.coverTone} coverUrl={series.coverUrl} />
          </div>
          <div className="mt-3 hidden sm:block space-y-2">
            {onContinue ? (
              <button
                type="button"
                onClick={onContinue}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-500"
              >
                <span>▶</span>
                <span>Continue Reading</span>
              </button>
            ) : onStart ? (
              <button
                type="button"
                onClick={onStart}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-500"
              >
                <span>▶</span>
                <span>Start Reading</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Metadata */}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-emerald-400 sm:text-2xl md:text-3xl">
            {series.title || "Series"}
          </h1>

          {/* Metadata key-value pairs */}
          <div className="mt-2 sm:mt-4 space-y-1.5 sm:space-y-2 text-sm">
            {series.author && (
              <div className="flex gap-3 sm:gap-4">
                <span className="w-16 sm:w-20 flex-shrink-0 text-neutral-500 text-xs sm:text-sm">Author</span>
                <span className="text-emerald-400 text-xs sm:text-sm">{series.author}</span>
              </div>
            )}
            {series.type && (
              <div className="flex gap-3 sm:gap-4">
                <span className="w-16 sm:w-20 flex-shrink-0 text-neutral-500 text-xs sm:text-sm">Type</span>
                <span className="text-neutral-200 text-xs sm:text-sm">{series.type.charAt(0).toUpperCase() + series.type.slice(1)}</span>
              </div>
            )}
            {series.status && (
              <div className="flex gap-3 sm:gap-4">
                <span className="w-16 sm:w-20 flex-shrink-0 text-neutral-500 text-xs sm:text-sm">Status</span>
                <span className="text-neutral-200 text-xs sm:text-sm">{series.status}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="mt-2 sm:mt-4 flex flex-wrap gap-1.5 sm:gap-2">
            {isAdult && (
              <span className="rounded-full bg-red-600 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold text-white">18+</span>
            )}
            {hasFreeEpisodes && (
              <span className="rounded-full bg-emerald-600 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold text-white">Free</span>
            )}
            {badges.map((badge) => (
              <span key={badge} className="rounded-full border border-neutral-700 bg-neutral-800 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs text-neutral-300">{badge}</span>
            ))}
            {genres.map((genre) => (
              <span key={genre} className="rounded-full border border-neutral-700 bg-neutral-800 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs text-neutral-300">{genre}</span>
            ))}
          </div>

          {/* Description - hidden on mobile to save space */}
          <p className="mt-3 hidden sm:block text-sm leading-relaxed text-neutral-400">
            {series.description || "No description available."}
          </p>

          {/* Action buttons - 老王优化：让收藏按钮更明显 */}
          <div className="mt-3 sm:mt-5 flex items-center gap-2 sm:gap-3">
            {onFollowToggle && (
              <button
                type="button"
                onClick={onFollowToggle}
                className={`group relative flex items-center gap-2 rounded-lg px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-base font-semibold transition-all duration-200 ${
                  isFollowing
                    ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 hover:scale-105"
                    : "border-2 border-pink-500/30 bg-pink-500/10 text-pink-400 hover:border-pink-500/50 hover:bg-pink-500/20 hover:scale-105"
                }`}
                aria-label={isFollowing ? "Unfollow series" : "Follow series"}
              >
                <Heart
                  size={18}
                  className={`transition-all duration-200 ${
                    isFollowing ? "fill-current" : "group-hover:scale-110"
                  }`}
                />
                <span>{isFollowing ? "Following" : "Follow"}</span>
                {isFollowing && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                  </span>
                )}
              </button>
            )}
            <ShareButton
              url={typeof window !== "undefined" ? window.location.href : ""}
              title={series.title || "Check out this series"}
              description={series.description || ""}
              className="rounded-lg border border-neutral-700 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-neutral-300 transition-colors hover:border-neutral-500"
            />
          </div>
        </div>
      </div>

      {/* Mobile read button - full width below the header */}
      <div className="mt-3 sm:hidden">
        {onContinue ? (
          <button
            type="button"
            onClick={onContinue}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-500"
          >
            <span>▶</span>
            <span>Continue Reading</span>
          </button>
        ) : onStart ? (
          <button
            type="button"
            onClick={onStart}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-500"
          >
            <span>▶</span>
            <span>Start Reading</span>
          </button>
        ) : null}

        {/* Mobile description */}
        {series.description && (
          <p className="mt-3 text-xs leading-relaxed text-neutral-500 line-clamp-2">
            {series.description}
          </p>
        )}
      </div>
    </header>
  );
}
