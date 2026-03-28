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
  return capitalize(value);
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

function assignRef(ref, value) {
  if (!ref) {
    return;
  }
  if (typeof ref === "function") {
    ref(value);
    return;
  }
  ref.current = value;
}

export default function SeriesHeader({
  series,
  episodeCount = 0,
  latestEpisode = null,
  onPrimaryAction = null,
  primaryActionLabelOverride = "",
  onFollowToggle,
  isFollowing,
  desktopPrimaryActionRef,
  mobilePrimaryActionRef,
  highlightPrimaryAction = false,
  creatorHref = "",
}) {
  const genres = series.genres || [];
  const isAdult = Boolean(series.adult);
  const isCompleted = String(series.status || "").toLowerCase() === "completed";
  const headerHighlights = genres.slice(0, 2).map((genre) => ({ label: genre, tone: "genre" }));
  const primaryAction = onPrimaryAction || null;
  const primaryActionLabel = primaryActionLabelOverride || "Start Reading";
  const latestEpisodeNumber = formatEpisodeNumber(latestEpisode?.number || "");
  const latestEpisodeValue = latestEpisodeNumber ? `Episode ${latestEpisodeNumber}` : "Coming soon";
  const creatorName = String(series.author || "").trim();
  const creatorValue = creatorName || "Credits coming soon";
  const heroFacts = [
    {
      label: "Format",
      value: formatSeriesKind(series.type),
      detail: Array.isArray(genres) && genres.length > 0 ? genres.slice(0, 2).join(" / ") : "Series",
    },
    {
      label: "Status",
      value: isCompleted ? "Completed" : capitalize(series.status || "updating"),
      detail: isCompleted ? "Completed run." : "Still updating.",
    },
    {
      label: "Episodes",
      value: episodeCount > 0 ? `${episodeCount}` : "Coming soon",
      detail: episodeCount > 0 ? `${episodeCount} listed.` : "No episodes listed yet.",
    },
    {
      label: "Creator",
      value: creatorValue,
      detail: creatorHref ? "View Creator" : "Story credits are being updated.",
      href: creatorHref,
    },
    {
      label: "Latest",
      value: latestEpisodeValue,
      detail: latestEpisode?.releasedAt
        ? formatUpdateLabel(latestEpisode.releasedAt)
        : formatUpdateLabel(series.updatedAt),
    },
  ];
  const primaryActionClassName = [
    "inline-flex w-full min-h-[48px] items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition-colors",
    highlightPrimaryAction
      ? "border-[rgba(49,87,214,0.24)] bg-[rgba(49,87,214,0.08)] text-slate-950 shadow-[0_0_0_1px_rgba(49,87,214,0.12),0_22px_60px_rgba(49,87,214,0.12)]"
      : "border-black/8 bg-slate-950 text-white shadow-[0_18px_42px_rgba(15,23,42,0.12)] hover:bg-slate-800",
  ].join(" ");
  const primaryActions = primaryAction ? (
    <div className="grid gap-3">
      {highlightPrimaryAction ? (
        <p className="text-center text-xs font-semibold text-[var(--gush-accent,#3157d6)]">
          Unlocked. Keep reading.
        </p>
      ) : null}
      <button
        ref={(node) => {
          assignRef(desktopPrimaryActionRef, node);
          assignRef(mobilePrimaryActionRef, node);
        }}
        type="button"
        onClick={primaryAction}
        className={`flex ${primaryActionClassName}`}
      >
        <BookOpen size={18} />
        <span>{primaryActionLabel}</span>
      </button>
    </div>
  ) : null;
  const visibleHighlights = headerHighlights.filter((item) => Boolean(item?.label)).slice(0, 2);

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
                  badge=""
                  genres={series.genres}
                  seriesType={series.type}
                  className="h-full w-full"
                />
              </div>
            </div>
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
            </div>

            <h1 className="mt-4 font-display text-3xl font-semibold leading-[0.96] tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
              {series.title || "Series"}
            </h1>

            {visibleHighlights.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {visibleHighlights.map((item) => (
                  <span
                    key={`${item.tone}-${item.label}`}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      item.tone === "badge"
                        ? "border-black/8 bg-white font-semibold text-slate-700"
                        : "border-black/8 bg-[rgba(246,243,237,0.92)] text-slate-500"
                    }`}
                  >
                    {item.label}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-6 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                Story
              </p>
              <p className="max-w-3xl text-[15px] leading-7 text-slate-600 sm:text-base sm:leading-8">
                {series.description || "Open the first episode and see if it lands."}
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {heroFacts.map((item) =>
                item.href ? (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="rounded-[22px] border border-black/8 bg-white px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)] transition hover:border-black/12 hover:bg-[#f8f9fc]"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                      {item.label}
                    </p>
                    <p className="mt-2 text-base font-semibold text-slate-950">{item.value}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
                  </Link>
                ) : (
                  <div
                    key={item.label}
                    className="rounded-[22px] border border-black/8 bg-white px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                      {item.label}
                    </p>
                    <p className="mt-2 text-base font-semibold text-slate-950">{item.value}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
                  </div>
                ),
              )}
            </div>

            {primaryActions ? <div className="mt-6 max-w-sm">{primaryActions}</div> : null}

            <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap sm:items-center">
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
            </div>
          </div>
        </div>
      </SurfacePanel>
    </header>
  );
}
