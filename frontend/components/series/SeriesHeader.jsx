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
  const isCompleted = String(series.status || "").toLowerCase() === "completed";
  const ratingValue = series.rating ? Number(series.rating).toFixed(1) : "New";
  const lastEpisodeLabel = formatEpisodeNumber(progress?.lastEpisodeId);
  const primaryAction = onContinue || onStart || null;
  const primaryActionLabel = onContinue
    ? lastEpisodeLabel
      ? `Continue Episode ${lastEpisodeLabel}`
      : "Continue reading"
    : hasFreeEpisodes
      ? "Start free"
      : "Start reading";
  const secondaryAction = onContinue && onStart ? onStart : null;
  const secondaryActionLabel = secondaryAction ? "Start at Episode 1" : "";
  const followers = Number(series.followers || 0);
  const ratingCount = Number(series.ratingCount || 0);
  const readerPulseItems = [
    ratingCount > 0 ? `${ratingValue} stars` : ratingValue === "New" ? "New release" : `${ratingValue} stars`,
    followers > 0
      ? `${formatCompactCount(followers)} following`
      : isFollowing
        ? "Saved"
        : "Fresh pick",
    hasFreeEpisodes
      ? `${series.freeEpisodeCount || 0} free to start`
      : isCompleted
        ? "Finished run"
        : episodeCount > 0
          ? `${episodeCount} episodes`
          : "New series",
  ];
  const primaryActionClassName = [
    "inline-flex w-full items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold transition-colors",
    highlightPrimaryAction
      ? "border-[rgba(47,107,255,0.3)] bg-[rgba(47,107,255,0.08)] text-slate-950 shadow-[0_0_0_1px_rgba(47,107,255,0.12),0_22px_60px_rgba(47,107,255,0.14)]"
      : "border-black/8 bg-slate-950 text-white hover:bg-slate-800",
  ].join(" ");
  return (
    <header className="py-4 sm:py-6">
      <SurfacePanel className="relative overflow-hidden p-0" appearance="light" accent="blue">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.12),transparent_30%),radial-gradient(circle_at_82%_16%,rgba(255,255,255,0.74),transparent_24%)]" />
        <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[28px] border border-black/6 bg-white/80 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
              <div className="aspect-[3/4] w-full overflow-hidden">
                <Cover tone={series.coverTone} coverUrl={series.coverUrl} />
              </div>
            </div>

            {primaryAction ? (
              <div className="hidden w-full gap-3 sm:flex sm:flex-col">
                {highlightPrimaryAction ? (
                  <p className="text-center text-xs font-semibold text-[var(--gush-accent,#2f6bff)]">
                    Unlocked. Keep reading.
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
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-black/8 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-black/12 hover:bg-[#f8f9fc]"
                  >
                    <span>{secondaryActionLabel}</span>
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-black/8 bg-white/84 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                {formatSeriesKind(series.type)}
              </span>
              {isAdult ? (
                <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-red-500">
                  18+
                </span>
              ) : null}
              {hasFreeEpisodes ? (
                <span className="rounded-full border border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.06)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--gush-accent,#2f6bff)]">
                  Starts free
                </span>
              ) : null}
            </div>

            <h1 className="mt-4 font-display text-3xl font-semibold leading-[0.96] tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
              {series.title || "Series"}
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              {series.description || "Start at Episode 1 and see if this one pulls you in."}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {readerPulseItems.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-black/8 bg-white/84 px-3 py-1.5 text-sm text-slate-700"
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <span>{episodeCount ? `${episodeCount} episodes` : "New series"}</span>
              <span className="text-slate-300">|</span>
              <span>{capitalize(series.status || "updating")}</span>
              <span className="text-slate-300">|</span>
              {creatorHref ? (
                <button
                  type="button"
                  onClick={() => router.push(creatorHref)}
                  className="font-semibold text-slate-900 transition hover:text-[var(--gush-accent,#2f6bff)]"
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
                    className="rounded-full border border-black/8 bg-white/84 px-3 py-1 text-xs font-semibold text-slate-700"
                  >
                    {badge}
                  </span>
                ))}
                {genres.map((genre) => (
                  <span
                    key={genre}
                    className="rounded-full border border-black/8 bg-[#f8f9fc] px-3 py-1 text-xs text-slate-500"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            ) : null}

            {previewHint ? (
              <p className="mt-4 text-sm text-slate-500">{previewHint}</p>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {onFollowToggle ? (
                <button
                  type="button"
                  onClick={onFollowToggle}
                  className={`group relative inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
                    isFollowing
                      ? "border border-pink-200 bg-pink-50 text-slate-950 shadow-[0_18px_40px_rgba(236,72,153,0.08)]"
                      : "border border-black/8 bg-white/84 text-slate-700 hover:border-pink-200 hover:bg-pink-50"
                  }`}
                  aria-label={isFollowing ? "Remove from library" : "Save to library"}
                >
                  <Heart size={18} className={isFollowing ? "fill-current" : "group-hover:scale-110"} />
                  <span>{isFollowing ? "Saved" : "Save"}</span>
                </button>
              ) : null}
              <ShareButton
                url={typeof window !== "undefined" ? window.location.href : ""}
                title={series.title || "Check out this series"}
                description={series.description || ""}
                className="rounded-full border border-black/8 bg-white/84 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-black/12 hover:bg-white"
              />
            </div>
          </div>
        </div>

        {primaryAction ? (
          <div className="grid gap-3 px-5 pb-5 sm:hidden">
            {highlightPrimaryAction ? (
              <p className="text-center text-xs font-semibold text-[var(--gush-accent,#2f6bff)]">
                Unlocked. Keep reading.
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
                className="flex w-full items-center justify-center gap-2 rounded-full border border-black/8 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-black/12 hover:bg-[#f8f9fc]"
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
