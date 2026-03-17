"use client";

import { useRouter } from "next/navigation";
import { BookOpen, Heart } from "lucide-react";
import Cover from "../common/Cover";
import ShareButton from "../common/ShareButton";
import SurfacePanel from "../common/SurfacePanel";

function capitalize(value) {
  if (!value) {
    return "";
  }
  const text = String(value);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatEpisodeNumber(value) {
  if (!value) {
    return "";
  }
  const match = String(value).match(/(\d+)/);
  return match ? match[1] : String(value);
}

function formatSeriesKind(value) {
  if (!value) {
    return "Series";
  }
  return `${capitalize(value)} series`;
}

function formatCompactCount(value) {
  const count = Number(value || 0);
  if (!Number.isFinite(count) || count <= 0) {
    return "0";
  }

  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: count >= 1000 ? 1 : 0,
  }).format(count);
}

export default function SeriesHeader({
  series,
  previewHint,
  progress,
  episodeCount = 0,
  onContinue,
  onStart,
  onFollowToggle,
  isFollowing,
  desktopPrimaryActionRef,
  mobilePrimaryActionRef,
  highlightPrimaryAction = false,
  creatorHref = "",
}) {
  const router = useRouter();
  const genres = series.genres || [];
  const badges = series.badges || [];
  const isAdult = Boolean(series.adult);
  const hasFreeEpisodes = series.hasFreeEpisodes || series.freeEpisodeCount > 0;
  const ratingValue = series.rating ? Number(series.rating).toFixed(1) : "New";
  const lastEpisodeLabel = formatEpisodeNumber(progress?.lastEpisodeId);
  const primaryAction = onContinue || onStart || null;
  const primaryActionLabel = onContinue
    ? lastEpisodeLabel
      ? `Continue Episode ${lastEpisodeLabel}`
      : "Continue reading"
    : hasFreeEpisodes
      ? "Read free preview"
      : "Start reading";
  const secondaryAction = onContinue && onStart ? onStart : null;
  const secondaryActionLabel = secondaryAction ? "Start from Episode 1" : "";
  const followers = Number(series.followers || 0);
  const ratingCount = Number(series.ratingCount || 0);
  const readerPulseItems = [
    `${ratingValue} rating${ratingCount > 0 ? ` (${formatCompactCount(ratingCount)})` : ""}`,
    followers > 0
      ? `${formatCompactCount(followers)} saved`
      : isFollowing
        ? "Saved in your library"
        : "Add to library",
    hasFreeEpisodes
      ? `${series.freeEpisodeCount || 0} free episode${series.freeEpisodeCount === 1 ? "" : "s"}`
      : episodeCount > 0
        ? `${episodeCount} episodes`
        : "New series",
  ];
  const primaryActionClassName = [
    "inline-flex w-full items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold transition-colors",
    highlightPrimaryAction
      ? "border-emerald-300/60 bg-emerald-400/18 text-emerald-50 shadow-[0_0_0_1px_rgba(110,231,183,0.28),0_22px_60px_rgba(16,185,129,0.22)] motion-safe:animate-pulse"
      : "border-emerald-400/30 bg-emerald-400/12 text-emerald-100 hover:border-emerald-300/50 hover:bg-emerald-400/18",
  ].join(" ");
  return (
    <header className="py-4 sm:py-6">
      <SurfacePanel className="relative overflow-hidden p-0">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_34%),radial-gradient(circle_at_82%_16%,rgba(34,211,238,0.12),transparent_24%)]" />
        <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black/20 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
              <div className="aspect-[3/4] w-full overflow-hidden">
                <Cover tone={series.coverTone} coverUrl={series.coverUrl} />
              </div>
            </div>

            {primaryAction ? (
              <div className="hidden w-full gap-3 sm:flex sm:flex-col">
                {highlightPrimaryAction ? (
                  <p className="text-center text-xs font-semibold text-emerald-200">
                    Purchase confirmed. Your clearest next chapter is ready.
                  </p>
                ) : null}
                <button
                  ref={desktopPrimaryActionRef}
                  type="button"
                  onClick={primaryAction}
                  className={primaryActionClassName}
                >
                  <BookOpen size={18} />
                  <span>{primaryActionLabel}</span>
                </button>
                {secondaryAction ? (
                  <button
                    type="button"
                    onClick={secondaryAction}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-neutral-100 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
                  >
                    <span>{secondaryActionLabel}</span>
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200">
                {formatSeriesKind(series.type)}
              </span>
              {isAdult ? (
                <span className="rounded-full border border-red-400/30 bg-red-500/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-red-200">
                  18+
                </span>
              ) : null}
              {hasFreeEpisodes ? (
                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
                  Free episodes available
                </span>
              ) : null}
            </div>

            <h1 className="mt-4 font-display text-3xl font-semibold leading-[0.96] tracking-tight text-white sm:text-4xl lg:text-5xl">
              {series.title || "Series"}
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-neutral-300 sm:text-base">
              {series.description || "A polished reading experience with fast chapter access, clear unlock options, and progress that stays in sync."}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {readerPulseItems.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-neutral-200"
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-neutral-400">
              <span>{episodeCount ? `${episodeCount} episodes` : "New series"}</span>
              <span className="text-neutral-600">|</span>
              <span>{capitalize(series.status || "updating")}</span>
              <span className="text-neutral-600">|</span>
              {creatorHref ? (
                <button
                  type="button"
                  onClick={() => router.push(creatorHref)}
                  className="font-semibold text-emerald-200 transition hover:text-emerald-100"
                >
                  {series.author || "Studio"}
                </button>
              ) : (
                <span>{series.author || "Studio"}</span>
              )}
              {lastEpisodeLabel ? (
                <>
                  <span className="text-neutral-600">|</span>
                  <span>Last read: Episode {lastEpisodeLabel}</span>
                </>
              ) : null}
            </div>

            {badges.length > 0 || genres.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {badges.map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-neutral-200"
                  >
                    {badge}
                  </span>
                ))}
                {genres.map((genre) => (
                  <span
                    key={genre}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-neutral-300"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            ) : null}

            {previewHint ? (
              <p className="mt-4 text-sm text-neutral-400">{previewHint}</p>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {onFollowToggle ? (
                <button
                  type="button"
                  onClick={onFollowToggle}
                  className={`group relative inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
                    isFollowing
                      ? "border border-pink-400/30 bg-pink-500/16 text-white shadow-[0_18px_50px_rgba(236,72,153,0.2)]"
                      : "border border-white/10 bg-white/[0.05] text-neutral-200 hover:border-pink-400/30 hover:bg-pink-500/10"
                  }`}
                  aria-label={isFollowing ? "Remove from library" : "Add to library"}
                >
                  <Heart size={18} className={isFollowing ? "fill-current" : "group-hover:scale-110"} />
                  <span>{isFollowing ? "In Library" : "Add to Library"}</span>
                </button>
              ) : null}
              <ShareButton
                url={typeof window !== "undefined" ? window.location.href : ""}
                title={series.title || "Check out this series"}
                description={series.description || ""}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-neutral-200 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
              />
            </div>
          </div>
        </div>

        {primaryAction ? (
          <div className="grid gap-3 px-5 pb-5 sm:hidden">
            {highlightPrimaryAction ? (
              <p className="text-center text-xs font-semibold text-emerald-200">
                Purchase confirmed. Your clearest next chapter is ready.
              </p>
            ) : null}
            <button
              ref={mobilePrimaryActionRef}
              type="button"
              onClick={primaryAction}
              className={`flex ${primaryActionClassName}`}
            >
              <BookOpen size={18} />
              <span>{primaryActionLabel}</span>
            </button>
            {secondaryAction ? (
              <button
                type="button"
                onClick={secondaryAction}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-neutral-100 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
              >
                <span>{secondaryActionLabel}</span>
              </button>
            ) : null}
          </div>
        ) : null}
      </SurfacePanel>
    </header>
  );
}
