"use client";

import Link from "next/link";
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

function formatUpdateLabel(value) {
  if (!value) {
    return "Update timing unavailable";
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return "Update timing unavailable";
  }

  return `Updated ${new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

export default function SeriesHeader({
  series,
  previewHint,
  accessSummary = null,
  lastReadEpisode = null,
  episodeCount = 0,
  latestEpisode = null,
  onPrimaryAction = null,
  onContinue,
  onStart,
  primaryActionLabelOverride = "",
  secondaryActionLabelOverride = "",
  readingHint = "",
  onFollowToggle,
  isFollowing,
  desktopPrimaryActionRef,
  mobilePrimaryActionRef,
  highlightPrimaryAction = false,
  creatorHref = "",
  onOpenStore,
  onOpenMembership,
}) {
  const genres = series.genres || [];
  const badges = series.badges || [];
  const isAdult = Boolean(series.adult);
  const hasFreeEpisodes =
    accessSummary?.startsFree ||
    series.hasFreeEpisodes ||
    series.freeEpisodeCount > 0;
  const isCompleted = String(series.status || "").toLowerCase() === "completed";
  const ratingValue = series.rating ? Number(series.rating).toFixed(1) : "New";
  const lastEpisodeLabel = formatEpisodeNumber(lastReadEpisode?.number || "");
  const primaryAction = onPrimaryAction || onContinue || onStart || null;
  const primaryActionLabel = primaryActionLabelOverride || (onContinue
    ? lastEpisodeLabel
      ? "Continue Reading"
      : "Continue Reading"
    : hasFreeEpisodes
      ? "Read Free"
      : "Start Reading");
  const secondaryAction = onContinue && onStart ? onStart : null;
  const secondaryActionLabel = secondaryAction
    ? secondaryActionLabelOverride || "Start at Episode 1"
    : "";
  const followers = Number(series.followers || 0);
  const ratingCount = Number(series.ratingCount || 0);
  const latestEpisodeNumber = formatEpisodeNumber(latestEpisode?.id || latestEpisode?.number || "");
  const accessCounts = accessSummary?.counts || {};
  const accessFactHint = accessSummary?.startsFree
    ? (accessCounts.points > 0 || accessCounts.membership > 0 || accessCounts.locked > 0
        ? "Later chapters unlock with points or membership."
        : "")
    : accessSummary?.entryHint ||
      (hasFreeEpisodes
        ? ""
        : isCompleted
          ? "A finished run if you want payoff without waiting."
          : "Open the first episode, then use points or membership when needed.");
  const readerPulseItems = [
    ratingCount > 0 ? `${ratingValue} stars` : ratingValue === "New" ? "New release" : `${ratingValue} stars`,
    followers > 0
      ? `${formatCompactCount(followers)} following`
      : isFollowing
        ? "Saved"
        : "Fresh pick",
    (!accessSummary?.heroBadgeLabel && accessSummary?.badgeLabel) ||
      (!accessSummary?.heroBadgeLabel && hasFreeEpisodes
        ? `${series.freeEpisodeCount || 0} free to start`
        : isCompleted
          ? "Finished run"
          : episodeCount > 0
            ? `${episodeCount} episodes`
            : "New series"),
  ];
  const primaryActionClassName = [
    "inline-flex w-full items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold transition-colors",
    highlightPrimaryAction
      ? "border-[rgba(49,87,214,0.24)] bg-[rgba(49,87,214,0.08)] text-slate-950 shadow-[0_0_0_1px_rgba(49,87,214,0.12),0_22px_60px_rgba(49,87,214,0.12)]"
      : "border-black/8 bg-slate-950 text-white hover:bg-slate-800",
  ].join(" ");
  const mobilePrimaryActions = primaryAction ? (
    <div className="grid gap-3 sm:hidden">
      {highlightPrimaryAction ? (
        <p className="text-center text-xs font-semibold text-[var(--gush-accent,#3157d6)]">
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
          className="flex w-full items-center justify-center gap-2 rounded-full border border-black/8 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-black/12 hover:bg-[rgba(246,243,237,0.92)]"
        >
          <span>{secondaryActionLabel}</span>
        </button>
      ) : null}
    </div>
  ) : null;
  const quickFacts = [
    {
      label: "Latest update",
      value: latestEpisodeNumber ? `Episode ${latestEpisodeNumber}` : isCompleted ? "Completed run" : "Series page",
      hint: latestEpisode?.title
        ? `${latestEpisode.title} • ${formatUpdateLabel(latestEpisode?.publishedAt || series.updatedAt)}`
        : formatUpdateLabel(series.updatedAt),
    },
    {
      label: "Access",
      value:
        accessSummary?.entryLabel ||
        (onContinue
          ? "Continue where you stopped"
          : hasFreeEpisodes
            ? "Free start"
            : "Unlock as you go"),
      hint: accessFactHint,
    },
    {
      label: creatorHref ? "Creator shelf" : "Creator credit",
      value: series.author || "Studio",
      hint: creatorHref
        ? "Open the creator page to compare related titles from the same voice."
        : "Creator or studio credit attached to this series.",
    },
  ];
  const mobileLeadFact = quickFacts[1] || quickFacts[0] || null;
  return (
    <header className="py-4 sm:py-6">
      <SurfacePanel className="relative overflow-hidden p-0" appearance="light" accent="blue">
        <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[28px] border border-black/8 bg-white/90 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
              <div className="aspect-[3/4] w-full overflow-hidden">
                <Cover
                  tone={series.coverTone}
                  coverUrl={series.coverUrl}
                  label={series.title}
                  eyebrow={series.author || formatSeriesKind(series.type)}
                  badge={hasFreeEpisodes ? "Free" : series.badge}
                  genres={series.genres}
                  seriesType={series.type}
                />
              </div>
            </div>

            {primaryAction ? (
              <div className="hidden w-full gap-3 sm:flex sm:flex-col">
                {highlightPrimaryAction ? (
                  <p className="text-center text-xs font-semibold text-[var(--gush-accent,#3157d6)]">
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
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-black/8 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-black/12 hover:bg-[rgba(246,243,237,0.92)]"
                  >
                    <span>{secondaryActionLabel}</span>
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-black/8 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                {formatSeriesKind(series.type)}
              </span>
              {isAdult ? (
                <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-red-500">
                  18+
                </span>
              ) : null}
              {accessSummary?.heroBadgeLabel ? (
                <span className="rounded-full border border-[rgba(49,87,214,0.14)] bg-[rgba(49,87,214,0.06)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--gush-accent,#3157d6)]">
                  {accessSummary.heroBadgeLabel}
                </span>
              ) : null}
            </div>

            <h1 className="mt-4 font-display text-3xl font-semibold leading-[0.96] tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
              {series.title || "Series"}
            </h1>

            <div className="mt-5">{mobilePrimaryActions}</div>
            {readingHint ? (
              <p className="mt-3 text-sm font-medium text-[var(--gush-accent,#3157d6)]">
                {readingHint}
              </p>
            ) : null}

            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
              {series.description || "Start at Episode 1 and see if this one pulls you in."}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {readerPulseItems.map((item, index) => (
                <span
                  key={item}
                  className={`rounded-full border border-black/8 bg-[rgba(246,243,237,0.92)] px-3 py-1.5 text-sm text-slate-700 ${
                    index > 1 ? "hidden sm:inline-flex" : ""
                  }`}
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
                <Link
                  href={creatorHref}
                  className="font-semibold text-slate-900 transition hover:text-[var(--gush-accent,#3157d6)]"
                >
                  {series.author || "Studio"}
                </Link>
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

            {mobileLeadFact ? (
              <div className="mt-5 rounded-[22px] border border-black/8 bg-white px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)] sm:hidden">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  {mobileLeadFact.label}
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-950">{mobileLeadFact.value}</p>
                {mobileLeadFact.hint ? (
                  <p className="mt-2 text-sm leading-6 text-slate-600">{mobileLeadFact.hint}</p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-5 hidden gap-3 sm:grid md:grid-cols-3">
              {quickFacts.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[22px] border border-black/8 bg-white px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    {item.label}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">{item.value}</p>
                  {item.hint ? (
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.hint}</p>
                  ) : null}
                </div>
              ))}
            </div>

            {badges.length > 0 || genres.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {badges.map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full border border-black/8 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                  >
                    {badge}
                  </span>
                ))}
                {genres.map((genre) => (
                  <span
                    key={genre}
                    className="rounded-full border border-black/8 bg-[rgba(246,243,237,0.92)] px-3 py-1 text-xs text-slate-500"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            ) : null}

            {previewHint ? (
              <p className="mt-4 text-xs leading-6 text-slate-500 sm:text-sm">{previewHint}</p>
            ) : null}

            <div className="mt-5 grid gap-3 sm:flex sm:flex-wrap sm:items-center">
              {onFollowToggle ? (
                <button
                  type="button"
                  onClick={onFollowToggle}
                  className={`group relative inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
                    isFollowing
                      ? "border border-pink-200 bg-pink-50 text-slate-950 shadow-[0_18px_40px_rgba(236,72,153,0.08)]"
                      : "border border-black/8 bg-white text-slate-700 hover:border-pink-200 hover:bg-pink-50"
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
                className="min-h-[44px] rounded-full border border-black/8 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-black/12 hover:bg-[rgba(246,243,237,0.92)]"
              />
              {onOpenStore ? (
                <button
                  type="button"
                  onClick={onOpenStore}
                  className="min-h-[44px] rounded-full border border-black/8 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-black/12 hover:bg-[rgba(246,243,237,0.92)]"
                >
                  Point packs
                </button>
              ) : null}
              {onOpenMembership ? (
                <button
                  type="button"
                  onClick={onOpenMembership}
                  className="min-h-[44px] rounded-full border border-black/8 bg-[rgba(246,243,237,0.92)] px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-black/12 hover:bg-white"
                >
                  Membership
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </SurfacePanel>
    </header>
  );
}
