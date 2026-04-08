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
  const headerHighlights = genres
    .slice(0, 2)
    .map((genre) => ({ label: genre, tone: "genre" }));
  const primaryAction = onPrimaryAction || null;
  const primaryActionLabel = primaryActionLabelOverride || "Start Reading";
  const latestEpisodeNumber = formatEpisodeNumber(latestEpisode?.number || "");
  const latestEpisodeValue = latestEpisodeNumber
    ? `Episode ${latestEpisodeNumber}`
    : "Coming soon";
  const creatorPresentation = getCreatorPresentation(series);
  const coverBackdropUrl = String(series?.coverUrl || "").trim();
  const heroFacts = [
    {
      label: "Format",
      value: formatSeriesKind(series.type),
      detail:
        Array.isArray(genres) && genres.length > 0
          ? genres.slice(0, 2).join(" / ")
          : "Series",
    },
    {
      label: "Status",
      value: isCompleted
        ? "Completed"
        : capitalize(series.status || "updating"),
      detail: isCompleted ? "Completed run." : "Still updating.",
    },
    {
      label: "Episodes",
      value: episodeCount > 0 ? `${episodeCount}` : "Coming soon",
      detail:
        episodeCount > 0
          ? `${episodeCount} listed.`
          : "No episodes listed yet.",
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
      ? "border-[rgba(183,129,64,0.22)] bg-[linear-gradient(180deg,rgba(255,236,210,0.98),rgba(248,219,180,0.98))] text-slate-950 shadow-[0_16px_36px_rgba(183,129,64,0.14)]"
      : "border-[rgba(183,129,64,0.18)] bg-[linear-gradient(180deg,rgba(255,241,221,0.98),rgba(248,227,196,0.98))] text-slate-950 shadow-[0_14px_34px_rgba(183,129,64,0.12)] hover:border-[rgba(183,129,64,0.26)] hover:bg-[linear-gradient(180deg,rgba(255,244,228,1),rgba(249,231,202,1))]",
  ].join(" ");
  const primaryActions = primaryAction ? (
    <div className="grid gap-3">
      {highlightPrimaryAction ? (
        <p className="text-center text-xs font-semibold text-[rgba(138,95,44,0.88)]">
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
  const visibleHighlights = headerHighlights
    .filter((item) => Boolean(item?.label))
    .slice(0, 2);

  return (
    <header className="py-4 sm:py-6">
      <section className="relative overflow-hidden rounded-[42px] border border-black/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.985),rgba(247,242,235,0.96))] shadow-[0_30px_84px_rgba(15,23,42,0.09)]">
        {coverBackdropUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-[0.1]"
            style={{ backgroundImage: `url(${coverBackdropUrl})` }}
          />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,252,247,0.98)_0%,rgba(255,249,240,0.95)_40%,rgba(250,245,236,0.84)_72%,rgba(246,239,230,0.72)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(183,129,64,0.14),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(134,98,69,0.08),transparent_28%)]" />

        <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.1fr)_280px] lg:gap-10 xl:p-10">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-black/8 bg-white/78 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-600">
                {formatSeriesKind(series.type)}
              </span>
              {isAdult ? (
                <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-red-600">
                  18+
                </span>
              ) : null}
            </div>

            <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              Story Page
            </p>
            <h1 className="mt-4 max-w-4xl font-display text-[2.55rem] font-semibold leading-[0.9] tracking-[-0.055em] text-slate-950 sm:text-[3.3rem] lg:text-[4.5rem]">
              {series.title || "Series"}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-600">
              <span>{creatorPresentation.value}</span>
              {latestEpisodeValue ? (
                <>
                  <span className="text-slate-300">•</span>
                  <span>{latestEpisodeValue}</span>
                </>
              ) : null}
              {creatorHref ? (
                <>
                  <span className="text-slate-300">•</span>
                  <Link
                    href={creatorHref}
                    className="font-medium text-slate-700 transition-colors hover:text-slate-950"
                  >
                    View creator
                  </Link>
                </>
              ) : null}
            </div>

            {visibleHighlights.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {visibleHighlights.map((item) => (
                  <span
                    key={`${item.tone}-${item.label}`}
                    className="rounded-full border border-black/8 bg-[rgba(250,247,241,0.92)] px-3 py-1 text-xs text-slate-600"
                  >
                    {item.label}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-7 max-w-3xl space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Story
              </p>
              <p className="text-[15px] leading-8 text-slate-600 sm:text-base">
                {series.description ||
                  "Open the first episode and see if it lands."}
              </p>
            </div>

            {primaryActions ? (
              <div className="mt-8 max-w-sm">{primaryActions}</div>
            ) : null}

            <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap sm:items-center">
              {onFollowToggle ? (
                <button
                  type="button"
                  onClick={onFollowToggle}
                  className={`group relative inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
                    isFollowing
                      ? "border border-pink-200 bg-pink-50 text-pink-700 shadow-[0_12px_28px_rgba(236,72,153,0.08)]"
                      : "border border-black/8 bg-white/84 text-slate-600 hover:border-pink-200 hover:bg-pink-50 hover:text-pink-700"
                  }`}
                  aria-label={
                    isFollowing ? "Remove from library" : "Save to library"
                  }
                >
                  <Heart
                    size={18}
                    className={
                      isFollowing ? "fill-current" : "group-hover:scale-110"
                    }
                  />
                  <span>{isFollowing ? "Saved" : "Save"}</span>
                </button>
              ) : null}
              <ShareButton
                url={typeof window !== "undefined" ? window.location.href : ""}
                title={series.title || "Check out this series"}
                description={series.description || ""}
                className="min-h-[44px] rounded-full border border-black/8 bg-white/84 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-black/12 hover:bg-white hover:text-slate-950"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="overflow-hidden rounded-[32px] border border-black/8 bg-white/84 shadow-[0_24px_60px_rgba(15,23,42,0.09)]">
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
            <div className="rounded-[28px] border border-black/8 bg-white/78 p-5 shadow-[0_14px_32px_rgba(15,23,42,0.04)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Credits
              </p>
              <p className="mt-3 text-base font-semibold text-slate-950">
                {creatorPresentation.value}
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                {creatorHref
                  ? "Public creator details are available from the credit page."
                  : creatorPresentation.detail}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2 xl:grid-cols-5">
            {heroFacts.map((item) =>
              item.href ? (
                <Link
                  key={item.label}
                  href={item.href}
                  className="rounded-[24px] border border-black/8 bg-white/82 px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)] transition hover:-translate-y-0.5 hover:border-black/12 hover:bg-white"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-950">
                    {item.value}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {item.detail}
                  </p>
                </Link>
              ) : (
                <div
                  key={item.label}
                  className="rounded-[24px] border border-black/8 bg-white/82 px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)]"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-950">
                    {item.value}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {item.detail}
                  </p>
                </div>
              ),
            )}
          </div>
        </div>
      </section>
    </header>
  );
}
