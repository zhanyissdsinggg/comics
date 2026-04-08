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
      detail: creatorHref ? "Open credit page." : creatorPresentation.detail,
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
    "inline-flex w-full min-h-[48px] items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition-all duration-200",
    highlightPrimaryAction
      ? "border-[rgba(0,113,227,0.22)] bg-[linear-gradient(180deg,rgba(41,151,255,1),rgba(0,113,227,0.94))] text-white shadow-[0_18px_36px_rgba(0,113,227,0.28)]"
      : "border-[rgba(0,113,227,0.18)] bg-[linear-gradient(180deg,rgba(41,151,255,0.96),rgba(0,113,227,0.9))] text-white shadow-[0_16px_34px_rgba(0,113,227,0.24)] hover:-translate-y-0.5 hover:border-[rgba(0,113,227,0.28)] hover:bg-[linear-gradient(180deg,rgba(64,164,255,1),rgba(0,113,227,0.94))] hover:shadow-[0_20px_40px_rgba(0,113,227,0.3)]",
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
      <section className="relative overflow-hidden rounded-[46px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,10,12,0.98),rgba(18,18,20,0.94))] shadow-[0_40px_110px_rgba(0,0,0,0.28)] backdrop-blur-[30px]">
        {coverBackdropUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-[0.14]"
            style={{ backgroundImage: `url(${coverBackdropUrl})` }}
          />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,8,10,0.94)_0%,rgba(8,8,10,0.88)_40%,rgba(8,8,10,0.58)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(41,151,255,0.18),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.06),transparent_28%)]" />

        <div className="relative grid gap-7 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.08fr)_300px] lg:gap-12 xl:p-10">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/72">
                {formatSeriesKind(series.type)}
              </span>
              {isAdult ? (
                <span className="rounded-full border border-[rgba(255,126,92,0.26)] bg-[rgba(255,126,92,0.14)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ffd4ca]">
                  18+
                </span>
              ) : null}
            </div>

            <h1 className="mt-5 max-w-4xl text-[2.7rem] font-semibold leading-[0.88] tracking-[-0.06em] text-white sm:text-[3.5rem] lg:text-[4.7rem]">
              {series.title || "Series"}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-white/66">
              <span>{creatorPresentation.value}</span>
              {latestEpisodeValue ? (
                <>
                  <span className="text-white/24">•</span>
                  <span>{latestEpisodeValue}</span>
                </>
              ) : null}
              {creatorHref ? (
                <>
                  <span className="text-white/24">•</span>
                  <Link
                    href={creatorHref}
                    className="font-medium text-white/78 transition-colors hover:text-white"
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
                    className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/66"
                  >
                    {item.label}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-8 max-w-3xl">
              <p className="text-[15px] leading-8 text-white/66 sm:text-base">
                {series.description ||
                  "Open the first episode and see if it lands."}
              </p>
            </div>

            {primaryActions ? (
              <div className="mt-8 max-w-sm">{primaryActions}</div>
            ) : null}

            <div className="mt-7 grid gap-3 sm:flex sm:flex-wrap sm:items-center">
              {onFollowToggle ? (
                <button
                  type="button"
                  onClick={onFollowToggle}
                  className={`group relative inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
                    isFollowing
                      ? "border border-[rgba(0,113,227,0.28)] bg-[rgba(0,113,227,0.16)] text-white shadow-[0_12px_28px_rgba(0,113,227,0.16)]"
                      : "border border-white/10 bg-white/[0.04] text-white/72 hover:border-[rgba(0,113,227,0.24)] hover:bg-[rgba(0,113,227,0.12)] hover:text-white"
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
                className="min-h-[44px] rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white/72 transition-colors hover:border-white/16 hover:bg-white/[0.08] hover:text-white"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.04] shadow-[0_30px_80px_rgba(0,0,0,0.24)] backdrop-blur-xl">
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
            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_16px_36px_rgba(0,0,0,0.18)] backdrop-blur-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/42">
                Credits
              </p>
              <p className="mt-3 text-base font-semibold text-white">
                {creatorPresentation.value}
              </p>
              <p className="mt-3 text-sm leading-6 text-white/62">
                {creatorHref
                  ? "Open the credit page for public details."
                  : creatorPresentation.detail}
              </p>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] px-5 py-4 shadow-[0_18px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {heroFacts.map((item) =>
                  item.href ? (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="xl:border-l xl:border-white/10 xl:pl-4 first:xl:border-l-0 first:xl:pl-0"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/42">
                        {item.label}
                      </p>
                      <p className="mt-2 text-base font-semibold text-white">
                        {item.value}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-white/62">
                        {item.detail}
                      </p>
                    </Link>
                  ) : (
                    <div
                      key={item.label}
                      className="xl:border-l xl:border-white/10 xl:pl-4 first:xl:border-l-0 first:xl:pl-0"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/42">
                        {item.label}
                      </p>
                      <p className="mt-2 text-base font-semibold text-white">
                        {item.value}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-white/62">
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
