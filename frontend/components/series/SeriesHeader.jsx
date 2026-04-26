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

function summarizeSeriesDescription(text, fallback) {
  const source = String(text || "")
    .replace(/\s+/g, " ")
    .trim();

  if (!source) {
    return fallback;
  }

  if (source.length <= 120) {
    return source;
  }

  return `${source.slice(0, 117).trimEnd()}...`;
}

function getLatestLabel(latestEpisode, updatedAt) {
  if (latestEpisode?.releasedAt) {
    return formatUpdateLabel(latestEpisode.releasedAt);
  }

  return formatUpdateLabel(updatedAt);
}

function formatUpdateLabel(value) {
  if (!value) {
    return "Date unavailable";
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return "Date unavailable";
  }

  return `${new Date(timestamp).toLocaleDateString("en-US", {
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
  const primaryActionLabel = primaryActionLabelOverride || "Read";
  const latestEpisodeNumber = formatEpisodeNumber(latestEpisode?.number || "");
  const latestEpisodeValue = latestEpisodeNumber
    ? `Episode ${latestEpisodeNumber}`
    : "Coming soon";
  const creatorPresentation = getCreatorPresentation(series);
  const coverBackdropUrl = String(series?.coverUrl || "").trim();
  const latestUpdateLabel = getLatestLabel(latestEpisode, series.updatedAt);
  const heroFacts = [
    {
      label: "Format",
      value: formatSeriesKind(series.type),
      detail:
        Array.isArray(genres) && genres.length > 0
          ? genres.slice(0, 2).join(" / ")
          : "Format",
    },
    {
      label: "Status",
      value: isCompleted
        ? "Completed"
        : capitalize(series.status || "updating"),
      detail: isCompleted ? "Full run" : "New chapters",
    },
    {
      label: "Episodes",
      value: episodeCount > 0 ? `${episodeCount}` : "Soon",
      detail: episodeCount > 0 ? "Ready to read" : "Coming soon",
    },
    {
      label: "Latest",
      value: latestEpisodeValue,
      detail: latestUpdateLabel,
    },
  ];
  const primaryActionClassName = [
    "inline-flex w-full min-h-[52px] items-center justify-center gap-2 rounded-full border border-black px-5 py-3 text-sm font-semibold tracking-[0.02em] transition-all duration-200",
    highlightPrimaryAction
      ? "bg-black text-white shadow-[0_16px_36px_rgba(15,23,42,0.18)]"
      : "bg-black text-white shadow-[0_16px_36px_rgba(15,23,42,0.18)] hover:bg-black/90",
  ].join(" ");
  const primaryActions = primaryAction ? (
    <div className="grid gap-3">
      <button
        ref={(node) => {
          assignRef(desktopPrimaryActionRef, node);
          assignRef(mobilePrimaryActionRef, node);
        }}
        type="button"
        onClick={primaryAction}
        data-testid="series-primary-action"
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
    <header className="py-2 sm:py-6">
      <section className="relative overflow-hidden rounded-[36px] border border-black/10 bg-white shadow-[0_28px_70px_rgba(15,23,42,0.08)]">
        {coverBackdropUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-[0.05]"
            style={{ backgroundImage: `url(${coverBackdropUrl})` }}
          />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.98)_0%,rgba(251,251,253,0.97)_48%,rgba(246,247,251,0.94)_100%)]" />
        <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.46),transparent)]" />

        <div className="relative grid gap-4 p-4 sm:p-7 lg:grid-cols-[minmax(0,1.08fr)_320px] lg:gap-12 xl:p-10">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-black/10 bg-[#f8f9fb] px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-black">
                  {formatSeriesKind(series.type)}
                </span>
              {isAdult ? (
                <span className="rounded-full border border-black bg-black px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-white">
                  18+
                </span>
              ) : null}
            </div>

            <h1 className="mt-3 max-w-4xl text-[1.72rem] font-black uppercase leading-[0.94] tracking-[-0.06em] text-black sm:mt-4 sm:text-[3.6rem] lg:text-[4.9rem]">
              {series.title || "Series"}
            </h1>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-black/65 sm:mt-3 sm:text-sm sm:gap-x-2.5 sm:gap-y-2 sm:tracking-[0.06em]">
              <span>{creatorPresentation.value}</span>
              {latestEpisodeValue ? (
                <>
                  <span className="text-black/40">
                    /
                  </span>
                  <span>{latestEpisodeValue}</span>
                </>
              ) : null}
              {creatorHref ? (
                <>
                  <span className="text-black/40">
                    /
                  </span>
                  <Link
                    href={creatorHref}
                    className="font-black uppercase tracking-[0.04em] text-black transition-colors hover:text-black/68"
                    data-testid="series-creator-link"
                  >
                    Creator
                  </Link>
                </>
              ) : null}
            </div>

            {visibleHighlights.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {visibleHighlights.map((item) => (
                  <span
                    key={`${item.tone}-${item.label}`}
                    className="rounded-full border border-black/10 bg-[#f8f9fb] px-3 py-1 text-xs font-black uppercase tracking-[0.06em] text-black"
                  >
                    {item.label}
                  </span>
                ))}
              </div>
            ) : null}

            {primaryActions ? (
              <div className="mt-5 max-w-none sm:mt-8 sm:max-w-xs">{primaryActions}</div>
            ) : null}

            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-7 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
              {onFollowToggle ? (
                <button
                  type="button"
                  onClick={onFollowToggle}
                  className={`group relative inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold tracking-[0.02em] transition-[background-color,border-color,box-shadow,transform] duration-200 sm:min-h-[44px] sm:w-auto ${
                    isFollowing
                      ? "rounded-full border border-black/10 bg-[#f8f9fb] text-black shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
                      : "rounded-full border border-black/10 bg-white text-black/72 shadow-[0_10px_24px_rgba(15,23,42,0.08)] hover:border-black/18 hover:bg-black/[0.03] hover:text-black active:translate-y-px"
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
                className="col-span-1 min-h-[48px] w-full rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold tracking-[0.02em] text-black/72 shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition-all hover:border-black/18 hover:bg-black/[0.03] hover:text-black sm:min-h-[44px] sm:w-auto"
              />
            </div>
          </div>

          <div className="order-first space-y-3 lg:order-none lg:space-y-4">
            <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
              <div className="aspect-[4/5] w-full overflow-hidden sm:aspect-[3/4]">
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
            <div className="space-y-3 rounded-[26px] border border-black/10 bg-white p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)] sm:p-5">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/55">
                  Creator
                </p>
                <p className="mt-2.5 text-[15px] font-black uppercase leading-[1.15] tracking-[0.02em] text-black sm:mt-3 sm:text-base">
                  {creatorPresentation.value}
                </p>
              </div>

              <div className="grid gap-2.5 border-t border-black/8 pt-3 sm:grid-cols-2 sm:gap-3">
                <div className="rounded-[22px] border border-black/10 bg-[#f6f7fb] px-4 py-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-black/55">
                    Reading
                  </p>
                  <p className="mt-2 text-sm font-black uppercase tracking-[0.04em] text-black">
                    {isCompleted ? "Complete" : "Ongoing"}
                  </p>
                </div>
                <div className="rounded-[22px] border border-black bg-black px-4 py-3 text-white">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/70">
                    Latest
                  </p>
                  <p className="mt-2 text-sm font-black uppercase tracking-[0.04em]">
                    {latestEpisodeValue}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="rounded-[26px] border border-black/10 bg-white px-4 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.08)] sm:px-5">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {heroFacts.map((item) =>
                  item.href ? (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="xl:border-l-[3px] xl:border-black xl:pl-4 first:xl:border-l-0 first:xl:pl-0"
                    >
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/55">
                        {item.label}
                      </p>
                      <p className="mt-2 text-base font-black uppercase tracking-[0.02em] text-black">
                        {item.value}
                      </p>
                    </Link>
                  ) : (
                    <div
                      key={item.label}
                      className="xl:border-l-[3px] xl:border-black xl:pl-4 first:xl:border-l-0 first:xl:pl-0"
                    >
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/55">
                        {item.label}
                      </p>
                      <p className="mt-2 text-base font-black uppercase tracking-[0.02em] text-black">
                        {item.value}
                      </p>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </header>
  );
}
