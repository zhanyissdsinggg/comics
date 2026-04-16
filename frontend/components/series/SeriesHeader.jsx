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

  if (source.length <= 180) {
    return source;
  }

  return `${source.slice(0, 177).trimEnd()}...`;
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
          : "Story format",
    },
    {
      label: "Status",
      value: isCompleted
        ? "Completed"
        : capitalize(series.status || "updating"),
      detail: isCompleted ? "Full run" : "Updating",
    },
    {
      label: "Episodes",
      value: episodeCount > 0 ? `${episodeCount}` : "Soon",
      detail: episodeCount > 0 ? "Listed now" : "No episodes yet",
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
    "inline-flex w-full min-h-[48px] items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition-all duration-200",
    highlightPrimaryAction
      ? "border-[color:var(--gush-ink-strong)] bg-[color:var(--gush-ink-strong)] text-white shadow-[0_0_0_4px_rgba(15,23,42,0.05),0_16px_30px_rgba(15,23,42,0.12)]"
      : "border-[color:var(--gush-ink-strong)] bg-[color:var(--gush-ink-strong)] text-white shadow-[0_12px_24px_rgba(15,23,42,0.08)] hover:bg-black/82 hover:shadow-[0_16px_30px_rgba(15,23,42,0.12)]",
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
      <section className="relative overflow-hidden rounded-[40px] border border-[color:var(--gush-border)] bg-white shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        {coverBackdropUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-[0.05]"
            style={{ backgroundImage: `url(${coverBackdropUrl})` }}
          />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.985)_0%,rgba(255,255,255,0.965)_48%,rgba(255,255,255,0.92)_100%)]" />
        <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(248,250,252,0.72),transparent)]" />

        <div className="relative grid gap-7 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.08fr)_300px] lg:gap-12 xl:p-10">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[color:var(--gush-border)] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--gush-ink-faint)]">
                {formatSeriesKind(series.type)}
              </span>
              {isAdult ? (
                <span className="rounded-full border border-[rgba(198,40,40,0.14)] bg-[rgba(255,241,242,0.96)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9f1239]">
                  18+
                </span>
              ) : null}
            </div>

            <h1 className="mt-5 max-w-4xl text-[2.7rem] font-semibold leading-[0.9] tracking-[-0.06em] text-[color:var(--gush-ink-strong)] sm:text-[3.4rem] lg:text-[4.35rem]">
              {series.title || "Series"}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-[color:var(--gush-ink-soft)]">
              <span>{creatorPresentation.value}</span>
              {latestEpisodeValue ? (
                <>
                  <span className="text-[color:var(--gush-border-strong)]">
                    /
                  </span>
                  <span>{latestEpisodeValue}</span>
                </>
              ) : null}
              {creatorHref ? (
                <>
                  <span className="text-[color:var(--gush-border-strong)]">
                    /
                  </span>
                  <Link
                    href={creatorHref}
                    className="font-medium text-[color:var(--gush-ink)] transition-colors hover:text-[color:var(--gush-accent)]"
                  >
                    Creator page
                  </Link>
                </>
              ) : null}
            </div>

            {visibleHighlights.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {visibleHighlights.map((item) => (
                  <span
                    key={`${item.tone}-${item.label}`}
                    className="rounded-full border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-3 py-1 text-xs text-[color:var(--gush-ink-soft)]"
                  >
                    {item.label}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-8 max-w-3xl">
              <p className="text-[15px] leading-8 text-[color:var(--gush-ink-soft)] sm:text-base">
                {summarizeSeriesDescription(
                  series.description,
                  "Open the first episode and see if it lands.",
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
                  className={`group relative inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
                    isFollowing
                      ? "border border-[color:var(--gush-border-strong)] bg-[color:var(--gush-page-bg-muted)] text-[color:var(--gush-ink-strong)] shadow-[0_8px_18px_rgba(15,23,42,0.06)]"
                      : "border border-[color:var(--gush-border)] bg-white text-[color:var(--gush-ink-soft)] hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] hover:text-[color:var(--gush-ink-strong)]"
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
                className="min-h-[44px] rounded-full border border-[color:var(--gush-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[color:var(--gush-ink-soft)] transition-colors hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] hover:text-[color:var(--gush-ink-strong)]"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="overflow-hidden rounded-[32px] border border-[color:var(--gush-border)] bg-white shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
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
            <div className="rounded-[28px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--gush-ink-faint)]">
                Public credit
              </p>
              <p className="mt-3 text-base font-semibold text-[color:var(--gush-ink-strong)]">
                {creatorPresentation.value}
              </p>
              <p className="mt-3 text-sm leading-6 text-[color:var(--gush-ink-soft)]">
                {creatorHref
                  ? "Creator page"
                  : creatorPresentation.detail}
              </p>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="rounded-[28px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-5 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {heroFacts.map((item) =>
                  item.href ? (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="xl:border-l xl:border-[color:var(--gush-border)] xl:pl-4 first:xl:border-l-0 first:xl:pl-0"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--gush-ink-faint)]">
                        {item.label}
                      </p>
                      <p className="mt-2 text-base font-semibold text-[color:var(--gush-ink-strong)]">
                        {item.value}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[color:var(--gush-ink-soft)]">
                        {item.detail}
                      </p>
                    </Link>
                  ) : (
                    <div
                      key={item.label}
                      className="xl:border-l xl:border-[color:var(--gush-border)] xl:pl-4 first:xl:border-l-0 first:xl:pl-0"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--gush-ink-faint)]">
                        {item.label}
                      </p>
                      <p className="mt-2 text-base font-semibold text-[color:var(--gush-ink-strong)]">
                        {item.value}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[color:var(--gush-ink-soft)]">
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
