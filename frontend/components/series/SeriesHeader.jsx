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

function formatUpdateLabel(value) {
  if (!value) {
    return "Date unavailable";
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return "Date unavailable";
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
          : "Format",
    },
    {
      label: "Status",
      value: isCompleted
        ? "Completed"
        : capitalize(series.status || "updating"),
      detail: isCompleted ? "Full run" : "Ongoing",
    },
    {
      label: "Episodes",
      value: episodeCount > 0 ? `${episodeCount}` : "Soon",
      detail: episodeCount > 0 ? "Available now" : "Coming soon",
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
    "inline-flex w-full min-h-[52px] items-center justify-center gap-2 border-[3px] border-black px-5 py-3 text-sm font-black uppercase tracking-[0.06em] transition-all duration-200",
    highlightPrimaryAction
      ? "bg-[#ff007a] text-white shadow-[6px_6px_0_0_rgba(0,0,0,1)]"
      : "bg-[#ff007a] text-white shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:bg-[#e1006d] hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)]",
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
      <section className="relative overflow-hidden border-[3px] border-black bg-[#ffe500] shadow-[10px_10px_0_0_rgba(0,0,0,1)]">
        {coverBackdropUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-[0.05]"
            style={{ backgroundImage: `url(${coverBackdropUrl})` }}
          />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,229,0,0.94)_0%,rgba(255,255,255,0.96)_44%,rgba(255,255,255,0.94)_100%)]" />
        <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.32),transparent)]" />

        <div className="relative grid gap-7 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.08fr)_320px] lg:gap-12 xl:p-10">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="border-[2px] border-black bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-black">
                {formatSeriesKind(series.type)}
              </span>
              {isAdult ? (
                <span className="border-[2px] border-black bg-[#ff007a] px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-white">
                  18+
                </span>
              ) : null}
            </div>

            <h1 className="mt-5 max-w-4xl text-[2.8rem] font-black uppercase leading-[0.88] tracking-[-0.07em] text-black sm:text-[3.6rem] lg:text-[4.9rem]">
              {series.title || "Series"}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-semibold uppercase tracking-[0.06em] text-black/65">
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
                    className="font-black uppercase tracking-[0.04em] text-black transition-colors hover:text-[#ff007a]"
                  >
                    Creator
                  </Link>
                </>
              ) : null}
            </div>

            {visibleHighlights.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {visibleHighlights.map((item) => (
                  <span
                    key={`${item.tone}-${item.label}`}
                    className="border-[2px] border-black bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.06em] text-black"
                  >
                    {item.label}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-8 max-w-3xl border-[3px] border-black bg-white px-5 py-5 shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
              <p className="text-[15px] font-semibold leading-8 text-black/72 sm:text-base">
                {summarizeSeriesDescription(
                  series.description,
                  "Start with chapter one.",
                )}
              </p>
            </div>

            {primaryActions ? (
              <div className="mt-8 max-w-xs">{primaryActions}</div>
            ) : null}

            <div className="mt-7 grid gap-3 sm:flex sm:flex-wrap sm:items-center">
              {onFollowToggle ? (
                <button
                  type="button"
                  onClick={onFollowToggle}
                  className={`group relative inline-flex min-h-[44px] items-center justify-center gap-2 border-[3px] border-black px-4 py-2.5 text-sm font-black uppercase tracking-[0.06em] transition-all duration-200 ${
                    isFollowing
                      ? "bg-[#ffe500] text-black shadow-[5px_5px_0_0_rgba(0,0,0,1)]"
                      : "bg-white text-black/72 shadow-[5px_5px_0_0_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#fff6c7] hover:text-black hover:shadow-none"
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
                className="min-h-[44px] border-[3px] border-black bg-white px-4 py-2.5 text-sm font-black uppercase tracking-[0.06em] text-black/72 shadow-[5px_5px_0_0_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#00e5ff] hover:text-black hover:shadow-none"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="overflow-hidden border-[3px] border-black bg-white shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
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
            <div className="space-y-3 border-[3px] border-black bg-white p-5 shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/55">
                  Public credit
                </p>
                <p className="mt-3 text-base font-black uppercase tracking-[0.02em] text-black">
                  {creatorPresentation.value}
                </p>
                <p className="mt-3 text-sm font-semibold leading-6 text-black/68">
                  {creatorHref ? "Open creator page." : creatorPresentation.detail}
                </p>
              </div>

              <div className="grid gap-3 border-t-[3px] border-black pt-3">
                <div className="border-[3px] border-black bg-[#00e5ff] px-4 py-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-black/55">
                    Read lane
                  </p>
                  <p className="mt-2 text-sm font-black uppercase tracking-[0.04em] text-black">
                    {isCompleted ? "Full run" : "Latest updates"}
                  </p>
                </div>
                <div className="border-[3px] border-black bg-[#ff007a] px-4 py-3 text-white">
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
            <div className="border-[3px] border-black bg-white px-5 py-4 shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                      <p className="mt-2 text-sm font-semibold leading-6 text-black/68">
                        {item.detail}
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
                      <p className="mt-2 text-sm font-semibold leading-6 text-black/68">
                        {item.detail}
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
