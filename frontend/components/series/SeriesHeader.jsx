"use client";

import Link from "next/link";
import { BookOpen, Heart } from "lucide-react";
import Cover from "../common/Cover";
import ShareButton from "../common/ShareButton";
import { resolveSeriesCreatorIdentity } from "../../lib/creatorIdentity";

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

function getCreatorPresentation(series) {
  return resolveSeriesCreatorIdentity(series);
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
    timeZone: "UTC",
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
  const creatorPresentation = getCreatorPresentation(series);
  const coverBackdropUrl = String(series?.coverUrl || "").trim();
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
      value: creatorPresentation.value,
      detail: creatorHref ? "View Creator" : creatorPresentation.detail,
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
      ? "border-[rgba(244,201,138,0.34)] bg-[rgba(244,201,138,0.9)] text-slate-950 shadow-[0_18px_40px_rgba(0,0,0,0.18)]"
      : "border-[rgba(244,201,138,0.3)] bg-[var(--gush-home-accent)] text-slate-950 shadow-[0_18px_42px_rgba(0,0,0,0.2)] hover:bg-[#ffd6a0]",
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
      <section className="relative overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(180deg,#111723,#0c1018)] shadow-[0_32px_90px_rgba(0,0,0,0.28)]">
        {coverBackdropUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-[0.12]"
            style={{ backgroundImage: `url(${coverBackdropUrl})` }}
          />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,13,20,0.94)_0%,rgba(9,13,20,0.9)_44%,rgba(9,13,20,0.7)_72%,rgba(9,13,20,0.5)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(77,106,215,0.22),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(244,201,138,0.12),transparent_24%)]" />

        <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8 xl:p-8">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[28px] border border-white/12 bg-black/20 shadow-[0_24px_60px_rgba(0,0,0,0.24)]">
              <div className="aspect-[3/4] w-full overflow-hidden">
                <Cover
                  tone={series.coverTone}
                  coverUrl={series.coverUrl}
                  label={series.title}
                  eyebrow={creatorPresentation.eyebrow}
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
              <span className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/72">
                {formatSeriesKind(series.type)}
              </span>
              {isAdult ? (
                <span className="rounded-full border border-red-400/30 bg-red-500/[0.12] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-red-100">
                  18+
                </span>
              ) : null}
            </div>

            <h1 className="mt-4 font-display text-[2.35rem] font-semibold leading-[0.94] tracking-[-0.045em] text-white sm:text-[3rem] lg:text-[4.1rem]">
              {series.title || "Series"}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-white/60">
              <span>{creatorPresentation.value}</span>
              {latestEpisodeValue ? (
                <>
                  <span className="text-white/24">•</span>
                  <span>{latestEpisodeValue}</span>
                </>
              ) : null}
            </div>

            {visibleHighlights.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {visibleHighlights.map((item) => (
                  <span
                    key={`${item.tone}-${item.label}`}
                    className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/72"
                  >
                    {item.label}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-6 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/42">
                Story
              </p>
              <p className="max-w-3xl text-[15px] leading-7 text-white/72 sm:text-base sm:leading-8">
                {series.description || "Open the first episode and see if it lands."}
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {heroFacts.map((item) =>
                item.href ? (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="rounded-[22px] border border-white/10 bg-white/[0.06] px-4 py-4 transition hover:border-white/16 hover:bg-white/[0.09]"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/40">
                      {item.label}
                    </p>
                    <p className="mt-2 text-base font-semibold text-white">{item.value}</p>
                    <p className="mt-2 text-sm leading-6 text-white/60">{item.detail}</p>
                  </Link>
                ) : (
                  <div
                    key={item.label}
                    className="rounded-[22px] border border-white/10 bg-white/[0.06] px-4 py-4"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/40">
                      {item.label}
                    </p>
                    <p className="mt-2 text-base font-semibold text-white">{item.value}</p>
                    <p className="mt-2 text-sm leading-6 text-white/60">{item.detail}</p>
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
                      ? "border border-pink-300/30 bg-pink-500/[0.12] text-white shadow-[0_18px_40px_rgba(236,72,153,0.12)]"
                      : "border border-white/10 bg-white/[0.04] text-white/74 hover:border-pink-300/30 hover:bg-pink-500/[0.1] hover:text-white"
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
                className="min-h-[44px] rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white/74 transition-colors hover:border-white/16 hover:bg-white/[0.08] hover:text-white"
              />
            </div>
          </div>
        </div>
      </section>
    </header>
  );
}
