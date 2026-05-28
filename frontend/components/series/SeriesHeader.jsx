"use client";

import Link from "next/link";
import { BookOpen, Heart } from "lucide-react";
import Cover from "../common/Cover";
import ShareButton from "../common/ShareButton";
import {
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
  storefrontInfoCardClass,
} from "../common/StorefrontPagePrimitives";
import { resolveSeriesCreatorIdentity } from "../../lib/creatorIdentity";
import {
  getSeriesHeroMetadataParts,
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

  if (source.length <= 140) {
    return source;
  }

  return `${source.slice(0, 137).trimEnd()}...`;
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

function HeroFactCard({ label, value, detail, href = "" }) {
  const content = (
    <div className={storefrontInfoCardClass}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/52">
        {label}
      </p>
      <p className="mt-3 text-base font-semibold tracking-[-0.02em] text-white">
        {value}
      </p>
      {detail ? (
        <p className="mt-2 text-sm leading-6 text-white/64">{detail}</p>
      ) : null}
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link
      href={href}
      className="block transition-transform duration-150 hover:-translate-y-0.5"
    >
      {content}
    </Link>
  );
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
  const genres = Array.isArray(series?.genres) ? series.genres : [];
  const isAdult = Boolean(series?.adult);
  const isCompleted =
    String(series?.status || "").toLowerCase() === "completed";
  const headerHighlights = genres.slice(0, 3).filter(Boolean);
  const primaryAction = onPrimaryAction || null;
  const normalizedPrimaryActionHref = String(primaryActionHref || "").trim();
  const primaryActionLabel = primaryActionLabelOverride || "Start reading";
  const latestEpisodeNumber = formatEpisodeNumber(latestEpisode?.number || "");
  const latestEpisodeValue = getLatestEntryLabel(series, latestEpisodeNumber);
  const installmentPluralLabel = getInstallmentLabel(series, { plural: true });
  const creatorPresentation = getCreatorPresentation(series);
  const coverBackdropUrl = String(series?.coverUrl || "").trim();
  const latestUpdateLabel = getLatestLabel(latestEpisode, series?.updatedAt);
  const summaryText = summarizeSeriesDescription(series?.description, "");
  const heroMetadata = getSeriesHeroMetadataParts(
    series,
    creatorPresentation.value,
    latestEpisodeNumber,
  );
  const creatorLine = heroMetadata.creatorText;
  const latestLine = heroMetadata.latestText;
  const heroFacts = [
    {
      label: "Format",
      value: formatSeriesKind(series?.type),
      detail:
        genres.length > 0 ? genres.slice(0, 2).join(" / ") : "Story format",
    },
    {
      label: "Status",
      value: isCompleted
        ? "Finished"
        : capitalize(series?.status || "updating"),
      detail: isCompleted
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

  const primaryButtonClass = highlightPrimaryAction
    ? `${storefrontPrimaryButtonClass} shadow-[0_18px_40px_rgba(255,79,154,0.3)]`
    : storefrontPrimaryButtonClass;

  const primaryActions = normalizedPrimaryActionHref ? (
    <Link
      ref={(node) => {
        assignRef(desktopPrimaryActionRef, node);
        assignRef(mobilePrimaryActionRef, node);
      }}
      href={normalizedPrimaryActionHref}
      onClick={primaryAction || undefined}
      data-testid="series-primary-action"
      className={`inline-flex min-h-[52px] w-full sm:w-auto ${primaryButtonClass}`}
    >
      <BookOpen size={18} />
      <span>{primaryActionLabel}</span>
    </Link>
  ) : primaryAction ? (
    <button
      ref={(node) => {
        assignRef(desktopPrimaryActionRef, node);
        assignRef(mobilePrimaryActionRef, node);
      }}
      type="button"
      onClick={primaryAction}
      data-testid="series-primary-action"
      className={`inline-flex min-h-[52px] w-full sm:w-auto ${primaryButtonClass}`}
    >
      <BookOpen size={18} />
      <span>{primaryActionLabel}</span>
    </button>
  ) : null;

  return (
    <header className="py-2 sm:py-6">
      <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(145deg,rgba(22,18,30,0.98)_0%,rgba(14,12,19,0.98)_46%,rgba(24,19,32,0.98)_100%)] text-white shadow-[0_34px_100px_rgba(8,6,20,0.42)]">
        {coverBackdropUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-[0.12]"
            style={{ backgroundImage: `url(${coverBackdropUrl})` }}
          />
        ) : null}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,79,154,0.18),transparent_26%),radial-gradient(circle_at_85%_12%,rgba(103,232,249,0.12),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(167,139,250,0.12),transparent_28%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent_28%,rgba(7,6,12,0.22)_100%)]" />

        <div className="relative grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.06fr)_320px] lg:gap-10 xl:p-8">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/72">
                {formatSeriesKind(series?.type)}
              </span>
              {isAdult ? (
                <span className="rounded-full border border-[rgba(255,189,205,0.28)] bg-[rgba(255,79,154,0.14)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ffd6e5]">
                  18+
                </span>
              ) : null}
            </div>

            <h1 className="mt-4 max-w-4xl font-display text-[2.05rem] font-semibold leading-[0.92] tracking-[-0.06em] text-white sm:text-[3.5rem] lg:text-[4.6rem]">
              {series?.title || "Series"}
            </h1>

            <div
              data-testid="series-hero-metadata"
              className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-white/72 sm:text-xs"
            >
              {creatorLine ? (
                creatorHref ? (
                  <Link
                    href={creatorHref}
                    className="text-[var(--gush-cyan)] transition-colors hover:text-white"
                    data-testid="series-creator-link"
                  >
                    {creatorLine}
                  </Link>
                ) : (
                  <span>{creatorLine}</span>
                )
              ) : null}
              {creatorLine && latestLine ? (
                <>
                  <span className="text-white/34" aria-hidden="true">
                    {heroMetadata.separator}
                  </span>
                  <span>{latestLine}</span>
                </>
              ) : null}
              {!creatorLine && latestLine ? <span>{latestLine}</span> : null}
            </div>

            {summaryText ? (
              <p className="mt-4 max-w-3xl text-sm leading-7 text-white/74 sm:text-[15px]">
                {summaryText}
              </p>
            ) : null}

            {headerHighlights.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {headerHighlights.map((item) => (
                  <span
                    key={`series-highlight-${item}`}
                    className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-white/78"
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              {primaryActions}
              {onFollowToggle ? (
                <button
                  type="button"
                  onClick={onFollowToggle}
                  className={`inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-all duration-150 sm:w-auto ${
                    isFollowing
                      ? "border border-[rgba(255,79,154,0.24)] bg-[rgba(255,79,154,0.14)] text-[#ffd5e5] shadow-[0_14px_30px_rgba(255,79,154,0.16)] hover:-translate-y-0.5"
                      : storefrontSecondaryButtonClass
                  }`}
                  aria-label={
                    isFollowing ? "Remove from saved" : "Save series"
                  }
                >
                  <Heart
                    size={18}
                    className={isFollowing ? "fill-current" : ""}
                  />
                  <span>{isFollowing ? "Saved" : "Save Series"}</span>
                </button>
              ) : null}
              <ShareButton
                url={typeof window !== "undefined" ? window.location.href : ""}
                title={series?.title || "Check out this series"}
                description={series?.description || ""}
                className={`min-h-[48px] w-full sm:w-auto ${storefrontSecondaryButtonClass}`}
              />
            </div>
          </div>

          <div className="order-first space-y-4 lg:order-none">
            <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[rgba(9,8,14,0.78)] shadow-[0_28px_74px_rgba(8,6,20,0.36)]">
              <div className="aspect-[4/5] w-full overflow-hidden sm:aspect-[3/4]">
                <Cover
                  tone={series?.coverTone}
                  coverUrl={series?.coverUrl}
                  label={series?.title}
                  eyebrow={creatorPresentation.eyebrow}
                  badge=""
                  genres={genres}
                  seriesType={series?.type}
                  className="h-full w-full"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className={storefrontInfoCardClass}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/52">
                  Creator
                </p>
                <p className="mt-3 text-sm leading-6 text-white/76">
                  {creatorPresentation.value}
                </p>
              </div>
              <div className={storefrontInfoCardClass}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/52">
                  Reading pace
                </p>
                <p className="mt-3 text-sm leading-6 text-white/76">
                  {isCompleted
                    ? "Finished and ready to binge."
                    : `New ${installmentPluralLabel.toLowerCase()} on deck.`}
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {heroFacts.map((item) => (
                <HeroFactCard
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  detail={item.detail}
                  href={item.href}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    </header>
  );
}
