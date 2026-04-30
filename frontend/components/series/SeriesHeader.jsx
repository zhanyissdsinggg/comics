"use client";

import Link from "next/link";
import { BookOpen, Heart } from "lucide-react";
import Cover from "../common/Cover";
import ShareButton from "../common/ShareButton";
import { resolveSeriesCreatorIdentity } from "../../lib/creatorIdentity";
import {
  formatInstallmentLabel,
  getLatestEntryLabel,
  getInstallmentLabel,
} from "../../lib/seriesFormatLabels";

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
    return "Story";
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
  primaryActionHref = "",
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
  const normalizedPrimaryActionHref = String(primaryActionHref || "").trim();
  const primaryActionLabel = primaryActionLabelOverride || "Start Reading";
  const latestEpisodeNumber = formatEpisodeNumber(latestEpisode?.number || "");
  const latestEpisodeValue = getLatestEntryLabel(series, latestEpisodeNumber);
  const installmentPluralLabel = getInstallmentLabel(series, { plural: true });
  const creatorPresentation = getCreatorPresentation(series);
  const coverBackdropUrl = String(series?.coverUrl || "").trim();
  const latestUpdateLabel = getLatestLabel(latestEpisode, series.updatedAt);
  const summaryText = summarizeSeriesDescription(series?.description, "");
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
        ? "Finished"
        : capitalize(series.status || "updating"),
      detail:
        isCompleted
          ? "Full run"
          : `New ${installmentPluralLabel.toLowerCase()}`,
    },
    {
      label: installmentPluralLabel,
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
    "inline-flex w-full min-h-[52px] items-center justify-center gap-2 rounded-full border-2 border-black px-5 py-3 text-sm font-black uppercase tracking-[0.02em] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 hover:translate-x-0.5 hover:translate-y-0.5",
    highlightPrimaryAction
      ? "bg-[#00E5FF] text-black"
      : "bg-[#00E5FF] text-black",
  ].join(" ");
  const primaryActions = normalizedPrimaryActionHref ? (
    <div className="grid gap-3">
      <Link
        ref={(node) => {
          assignRef(desktopPrimaryActionRef, node);
          assignRef(mobilePrimaryActionRef, node);
        }}
        href={normalizedPrimaryActionHref}
        onClick={primaryAction || undefined}
        data-testid="series-primary-action"
        className={`flex ${primaryActionClassName}`}
      >
        <BookOpen size={18} />
        <span>{primaryActionLabel}</span>
      </Link>
    </div>
  ) : primaryAction ? (
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
      <section className="relative overflow-hidden rounded-[30px] border-2 border-[#FFE500] bg-black/90 text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:rounded-[34px]">
        {coverBackdropUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-[0.12]"
            style={{ backgroundImage: `url(${coverBackdropUrl})` }}
          />
        ) : null}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,229,255,0.14),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(255,0,122,0.12),transparent_46%)]" />
        <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent)]" />

        <div className="relative grid gap-4 p-4 sm:p-7 lg:grid-cols-[minmax(0,1.08fr)_320px] lg:gap-12 xl:p-10">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border-2 border-black bg-[#FFE500] px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  {formatSeriesKind(series.type)}
                </span>
              {isAdult ? (
                <span className="rounded-full border-2 border-black bg-[#FF007A] px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  18+
                </span>
              ) : null}
            </div>

            <h1 className="mt-3 max-w-4xl text-[1.72rem] font-black uppercase leading-[0.94] tracking-[-0.06em] text-white sm:mt-4 sm:text-[3.6rem] lg:text-[4.9rem]">
              {series.title || "Series"}
            </h1>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[10px] font-black uppercase tracking-[0.05em] text-white/80 sm:mt-3 sm:text-sm sm:gap-x-2.5 sm:gap-y-2 sm:tracking-[0.06em]">
              <span>{creatorPresentation.value}</span>
              {latestEpisodeValue ? (
                <>
                  <span className="text-white/45">
                    /
                  </span>
                  <span>{latestEpisodeValue}</span>
                </>
              ) : null}
              {creatorHref ? (
                <>
                  <span className="text-white/45">
                    /
                  </span>
                  <Link
                    href={creatorHref}
                    className="font-black uppercase tracking-[0.04em] text-[#00E5FF] transition-colors hover:text-[#00E5FF]/80"
                    data-testid="series-creator-link"
                  >
                    Creator
                  </Link>
                </>
              ) : null}
            </div>

            {summaryText ? (
              <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-white/78 sm:text-[15px]">
                {summaryText}
              </p>
            ) : null}

            {visibleHighlights.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {visibleHighlights.map((item) => (
                  <span
                    key={`${item.tone}-${item.label}`}
                    className="rounded-full border-2 border-black bg-[#FFE500] px-3 py-1 text-xs font-black uppercase tracking-[0.06em] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  >
                    {item.label}
                  </span>
                ))}
              </div>
            ) : null}

            {primaryActions ? (
              <div className="mt-5 max-w-none sm:mt-8 sm:max-w-xs">{primaryActions}</div>
            ) : null}

            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:mt-5 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
              {onFollowToggle ? (
                <button
                  type="button"
                  onClick={onFollowToggle}
                  className={`group relative inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold tracking-[0.02em] transition-[background-color,border-color,box-shadow,transform] duration-200 sm:min-h-[44px] sm:w-auto ${
                    isFollowing
                      ? "border-2 border-black bg-[#FFE500] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5"
                      : "border-2 border-white/20 bg-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:border-white/35 hover:bg-[#111111]"
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
                className="col-span-1 min-h-[48px] w-full rounded-full border-2 border-white/20 bg-black px-4 py-2.5 text-sm font-black uppercase tracking-[0.02em] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-0.5 hover:translate-y-0.5 hover:border-white/35 hover:bg-[#111111] sm:min-h-[44px] sm:w-auto"
              />
            </div>
          </div>

          <div className="order-first space-y-3 lg:order-none lg:space-y-4">
            <div className="overflow-hidden rounded-[28px] border-2 border-white/20 bg-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
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
            <div className="space-y-3 rounded-[26px] border-2 border-[#FFE500] bg-black/85 p-4 text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:p-5">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/65">
                  Creator
                </p>
                <p className="mt-2.5 text-[15px] font-black uppercase leading-[1.15] tracking-[0.02em] text-white sm:mt-3 sm:text-base">
                  {creatorPresentation.value}
                </p>
              </div>

              <div className="grid gap-2.5 border-t border-white/15 pt-3 sm:grid-cols-2 sm:gap-3">
                <div className="rounded-[22px] border-2 border-white/20 bg-black px-4 py-3 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/65">
                    Reading
                  </p>
                  <p className="mt-2 text-sm font-black uppercase tracking-[0.04em] text-white">
                    {isCompleted ? "Finished" : "Ongoing"}
                  </p>
                </div>
                <div className="rounded-[22px] border-2 border-black bg-[#00E5FF] px-4 py-3 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-black/65">
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
            <div className="rounded-[26px] border-2 border-white/20 bg-black px-4 py-4 text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:px-5">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {heroFacts.map((item) =>
                  item.href ? (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="xl:border-l-[3px] xl:border-black xl:pl-4 first:xl:border-l-0 first:xl:pl-0"
                    >
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/55">
                        {item.label}
                      </p>
                      <p className="mt-2 text-base font-black uppercase tracking-[0.02em] text-white">
                        {item.value}
                      </p>
                    </Link>
                  ) : (
                    <div
                      key={item.label}
                      className="xl:border-l-[3px] xl:border-black xl:pl-4 first:xl:border-l-0 first:xl:pl-0"
                    >
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/55">
                        {item.label}
                      </p>
                      <p className="mt-2 text-base font-black uppercase tracking-[0.02em] text-white">
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
