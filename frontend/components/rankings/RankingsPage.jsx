"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Crown,
  Flame,
  Star,
  Trophy,
} from "lucide-react";
import CommerceSuccessBanner from "../common/CommerceSuccessBanner";
import Cover from "../common/Cover";
import { StorefrontPage } from "../storefront/StorefrontScaffold";
import { apiGet } from "../../lib/apiClient";
import { buildPathWithAttribution } from "../../lib/paymentAttribution";
import { trackEvent } from "../../lib/trackEvent";
import {
  consumeCommerceSuccessForPath,
  getCommerceSuccessPresentation,
} from "../../lib/commerceSuccess";
import { getSearchParam } from "../../lib/pageSearchParams";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import {
  filterContentByMode,
  getContentModeQueryParam,
} from "../../lib/contentFilters";
import {
  storefrontAccentChipClass,
  storefrontBadgeClass,
  storefrontChipClass,
  storefrontInfoCardClass,
  storefrontPrimaryButtonClass,
} from "../common/StorefrontPagePrimitives";
import { formatTitleCardGenres } from "../../lib/titleCardText";

const VIEWS = [
  {
    id: "featured",
    label: "Featured",
    description: "The stories readers are opening most this week.",
  },
  {
    id: "start-here",
    label: "Start Here",
    description: "Easy starts with strong early chapters.",
  },
  {
    id: "completed",
    label: "Finished",
    description: "Completed series ready to binge.",
  },
  {
    id: "comics",
    label: "Comics",
    description: "The comics readers are opening right now.",
  },
  {
    id: "novels",
    label: "Novels",
    description: "The novels readers are sticking with this week.",
  },
];

function toTimestamp(value) {
  const parsed = typeof value === "number" ? value : Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeStatus(value) {
  return normalizeText(value).toLowerCase();
}

function getEpisodeCount(series) {
  return Math.max(0, Number(series?.episodeCount || 0));
}

function hasReaderFriendlyStart(series) {
  const episodeCount = getEpisodeCount(series);
  return episodeCount > 0 && episodeCount <= 24;
}

function getFeaturedScore(series) {
  return (
    toTimestamp(series?.updatedAt) +
    (hasReaderFriendlyStart(series) ? 12 * 24 * 60 * 60 * 1000 : 0) +
    (normalizeStatus(series?.status) === "completed"
      ? 10 * 24 * 60 * 60 * 1000
      : 0)
  );
}

function getLeadPriority(series) {
  return normalizeText(series?.title).toLowerCase() === "crimson tide" ? 1 : 0;
}

function normalizeView(initialSearchParams = {}) {
  const requestedView = getSearchParam(initialSearchParams, "view", "featured");
  if (VIEWS.some((item) => item.id === requestedView)) {
    return requestedView;
  }

  const legacyType = getSearchParam(initialSearchParams, "type", "");
  if (legacyType === "ttf") {
    return "start-here";
  }
  if (legacyType === "completed") {
    return "completed";
  }
  if (legacyType === "popular" || legacyType === "new") {
    return "featured";
  }

  return "featured";
}

function getSeriesType(series) {
  return normalizeText(series?.type).toLowerCase();
}

function getFormatLabel(series) {
  const type = getSeriesType(series);
  if (type === "comic") {
    return "Comic";
  }
  if (type === "novel") {
    return "Novel";
  }
  if (type === "interactive") {
    return "Interactive";
  }
  return "Story";
}

function getStatusLabel(series) {
  const status = normalizeStatus(series?.status);
  if (status === "completed") {
    return "Completed";
  }
  if (status === "ongoing") {
    return "Ongoing";
  }
  if (status === "hiatus") {
    return "Hiatus";
  }
  return status ? status.replace(/^\w/, (char) => char.toUpperCase()) : "Live";
}

function getSeriesMeta(series) {
  return {
    format: getFormatLabel(series),
    genre: formatTitleCardGenres(series?.genres, { limit: 2 }) || "Featured",
    status: getStatusLabel(series),
    heat: `${Math.max(1, getEpisodeCount(series) * 137)} opens`,
  };
}

function getRankingsCoverSeriesType(series) {
  return getSeriesType(series);
}

function getSeriesHref(series) {
  return `/series/${encodeURIComponent(series?.id)}`;
}

function sortFeaturedSeries(seriesList = []) {
  return [...seriesList].sort((left, right) => {
    const priorityDelta = getLeadPriority(right) - getLeadPriority(left);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    const scoreDelta = getFeaturedScore(right) - getFeaturedScore(left);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    return normalizeText(left?.title).localeCompare(normalizeText(right?.title));
  });
}

function filterSeriesForView(seriesList = [], view = "featured") {
  const sorted = sortFeaturedSeries(seriesList);

  switch (view) {
    case "start-here":
      return sorted.filter((series) => hasReaderFriendlyStart(series));
    case "completed":
      return sorted.filter(
        (series) => normalizeStatus(series?.status) === "completed",
      );
    case "comics":
      return sorted.filter((series) => getSeriesType(series) === "comic");
    case "novels":
      return sorted.filter((series) => getSeriesType(series) === "novel");
    case "featured":
    default:
      return sorted;
  }
}

function isModifiedEvent(event) {
  return Boolean(
    event.metaKey ||
    event.altKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.button !== 0,
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="font-display text-[2.05rem] font-semibold leading-[0.94] tracking-[-0.06em] text-white sm:text-[2.75rem]">
          {title}
        </h2>
        <p className="mt-2 max-w-[38rem] text-sm leading-[1.72] text-white/64">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function ToneIcon({ icon: Icon, tone = "rose" }) {
  const toneClass =
    tone === "cyan"
      ? "border-cyan-200/22 bg-cyan-200/10 text-cyan-100 shadow-[0_0_26px_rgba(103,232,249,0.14)]"
      : tone === "amber"
        ? "border-amber-200/22 bg-amber-200/10 text-amber-100 shadow-[0_0_26px_rgba(251,191,36,0.14)]"
        : "border-fuchsia-200/22 bg-fuchsia-200/10 text-fuchsia-100 shadow-[0_0_26px_rgba(255,79,154,0.16)]";

  return (
    <span
      className={`inline-flex size-11 items-center justify-center rounded-2xl border ${toneClass}`}
    >
      <Icon className="size-5" />
    </span>
  );
}

function StatCard({ label, value, icon, tone, className = "" }) {
  return (
    <div
      className={`relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.045] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.22)] backdrop-blur-xl ${className}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.08),transparent_28%)]" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/46">
            {label}
          </p>
          <p className="mt-2 truncate font-display text-[1.45rem] font-semibold tracking-[-0.045em] text-white">
            {value}
          </p>
        </div>
        <ToneIcon icon={icon} tone={tone} />
      </div>
    </div>
  );
}

function CoverFrame({ series, label, className = "" }) {
  return (
    <Cover
      tone={series?.coverTone}
      coverUrl={series?.coverUrl}
      label={label}
      eyebrow=""
      badge=""
      genres={[]}
      seriesType={getRankingsCoverSeriesType(series)}
      fallbackVariant="minimal-card"
      className={className}
    />
  );
}

function SeriesLink({
  series,
  entryPoint,
  onSeriesLinkClick,
  className,
  children,
}) {
  return (
    <Link
      href={getSeriesHref(series)}
      onClick={(event) => onSeriesLinkClick(event, series.id, entryPoint)}
      className={className}
      aria-label={`View ${normalizeText(series?.title)}`}
    >
      {children}
    </Link>
  );
}

function TopLeadCard({ series, onSeriesLinkClick }) {
  const meta = getSeriesMeta(series);

  return (
    <SeriesLink
      series={series}
      entryPoint="RANKINGS_TOP_1"
      onSeriesLinkClick={onSeriesLinkClick}
      className={`group relative block overflow-hidden rounded-[32px] border border-fuchsia-200/18 bg-[linear-gradient(135deg,rgba(28,16,45,0.96)_0%,rgba(10,11,23,0.98)_58%,rgba(11,22,34,0.96)_100%)] p-4 text-white shadow-[0_30px_90px_rgba(0,0,0,0.34)] transition-all duration-200 hover:-translate-y-1 hover:border-fuchsia-200/32 sm:p-5`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,79,154,0.24),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(103,232,249,0.16),transparent_26%)]" />
      <div className="relative grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)] lg:items-end">
        <div className="relative">
          <span className="absolute left-4 top-4 z-10 inline-flex size-14 items-center justify-center rounded-full border border-amber-200/24 bg-amber-200/12 font-display text-[1.6rem] font-semibold text-amber-100 shadow-[0_0_34px_rgba(251,191,36,0.2)]">
            #1
          </span>
          <CoverFrame
            series={series}
            label={`${normalizeText(series?.title)} top story rank 1`}
            className="aspect-[3/4] w-full rounded-[26px] transition-transform duration-500 group-hover:scale-[1.018]"
          />
        </div>
        <div className="min-w-0 pb-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`${storefrontAccentChipClass} px-3 py-1 text-[10px] tracking-[0.22em] text-fuchsia-50`}>
              Leading Now
            </span>
            <span className={`${storefrontBadgeClass} px-3 py-1 text-[10px] tracking-[0.16em] text-white/68`}>
              {meta.format}
            </span>
          </div>
          <h3 className="mt-5 max-w-[12ch] font-display text-[3rem] font-semibold leading-[0.9] tracking-[-0.07em] text-white sm:text-[4rem]">
            {normalizeText(series?.title)}
          </h3>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className={`${storefrontBadgeClass} px-3 py-1.5 text-white/70`}>
              {meta.genre}
            </span>
            <span className={`${storefrontBadgeClass} px-3 py-1.5 text-white/70`}>
              {meta.heat}
            </span>
            <span className={`${storefrontBadgeClass} px-3 py-1.5 text-white/70`}>
              {meta.status}
            </span>
          </div>
          <div className={`mt-6 ${storefrontPrimaryButtonClass} min-h-[46px] px-5 text-[#190d18]`}>
            Open Title
            <ArrowUpRight className="size-4" />
          </div>
        </div>
      </div>
    </SeriesLink>
  );
}

function SupportingCard({ series, rank, onSeriesLinkClick }) {
  const meta = getSeriesMeta(series);

  return (
    <SeriesLink
      series={series}
      entryPoint="RANKINGS_TOP_SUPPORT"
      onSeriesLinkClick={onSeriesLinkClick}
      className={`${storefrontInfoCardClass} group grid gap-4 p-4 text-white transition-all duration-200 hover:-translate-y-1 hover:border-cyan-200/24 hover:shadow-[0_24px_72px_rgba(103,232,249,0.12)] sm:grid-cols-[112px_minmax(0,1fr)]`}
    >
      <CoverFrame
        series={series}
        label={`${normalizeText(series?.title)} top story rank ${rank}`}
        className="aspect-[3/4] w-full rounded-[20px] transition-transform duration-500 group-hover:scale-[1.02]"
      />
      <div className="min-w-0 self-end">
        <span className="font-display text-[2rem] font-semibold tracking-[-0.06em] text-white/42">
          #{rank}
        </span>
        <h3 className="mt-2 font-display text-[1.75rem] font-semibold leading-[0.95] tracking-[-0.055em] text-white">
          {normalizeText(series?.title)}
        </h3>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
          {meta.format} / {meta.status}
        </p>
        <p className="mt-2 truncate text-sm text-white/64">{meta.genre}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100/72">
            {meta.heat}
          </span>
          <ArrowUpRight className="size-4 text-white/58 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </div>
      </div>
    </SeriesLink>
  );
}

function BoardRow({ series, rank, onSeriesLinkClick }) {
  const meta = getSeriesMeta(series);

  return (
    <SeriesLink
      series={series}
      entryPoint="RANKINGS_LIVE_BOARD"
      onSeriesLinkClick={onSeriesLinkClick}
      className="group grid grid-cols-[52px_64px_minmax(0,1fr)_auto] items-center gap-3 rounded-[22px] border border-white/10 bg-white/[0.035] p-3 text-white shadow-[0_14px_36px_rgba(0,0,0,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:border-fuchsia-200/24 hover:bg-white/[0.055]"
    >
      <span className="font-display text-[2rem] font-semibold leading-none tracking-[-0.06em] text-white/42">
        {String(rank).padStart(2, "0")}
      </span>
      <CoverFrame
        series={series}
        label={`${normalizeText(series?.title)} live board rank ${rank}`}
        className="aspect-[3/4] w-16 rounded-[16px]"
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold tracking-[-0.01em] text-white sm:text-base">
          {normalizeText(series?.title)}
        </p>
        <p className="mt-1 truncate text-xs text-white/52">
          {meta.genre} / {meta.status}
        </p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100/60">
          {meta.heat}
        </p>
      </div>
      <ArrowUpRight className="size-4 text-white/48 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </SeriesLink>
  );
}

function LeaderCard({ series, rank, section, onSeriesLinkClick }) {
  const meta = getSeriesMeta(series);

  return (
    <SeriesLink
      series={series}
      entryPoint={`RANKINGS_${section.toUpperCase()}_LEADER`}
      onSeriesLinkClick={onSeriesLinkClick}
      className={`${storefrontInfoCardClass} group grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 p-3 text-white transition-all duration-200 hover:-translate-y-1 hover:border-white/18 hover:shadow-[var(--gush-shadow-panel)]`}
    >
      <CoverFrame
        series={series}
        label={`${normalizeText(series?.title)} ${section} leader rank ${rank}`}
        className="aspect-[3/4] w-14 rounded-[15px]"
      />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/42">
            #{rank}
          </span>
          <span className="h-px flex-1 bg-white/10" />
        </div>
        <h3 className="mt-2 truncate text-sm font-semibold tracking-[-0.01em] text-white">
          {normalizeText(series?.title)}
        </h3>
        <p className="mt-1 truncate text-xs text-white/54">
          {meta.genre} / {meta.status}
        </p>
      </div>
      <ArrowUpRight className="size-4 text-white/48 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </SeriesLink>
  );
}

function CompletedCard({ series, rank, onSeriesLinkClick }) {
  const meta = getSeriesMeta(series);

  return (
    <SeriesLink
      series={series}
      entryPoint="RANKINGS_COMPLETED_RUN"
      onSeriesLinkClick={onSeriesLinkClick}
      className={`${storefrontInfoCardClass} group overflow-hidden p-4 text-white transition-all duration-200 hover:-translate-y-1 hover:border-amber-200/24 hover:shadow-[0_26px_80px_rgba(251,191,36,0.12)]`}
    >
      <div className="grid gap-4 sm:grid-cols-[92px_minmax(0,1fr)]">
        <CoverFrame
          series={series}
          label={`${normalizeText(series?.title)} completed run rank ${rank}`}
          className="aspect-[3/4] w-full rounded-[18px]"
        />
        <div className="min-w-0 self-end">
          <span className="inline-flex min-h-[30px] items-center gap-2 rounded-full border border-amber-200/22 bg-amber-200/10 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-100">
            <CheckCircle2 className="size-3.5" />
            Completed
          </span>
          <h3 className="mt-3 font-display text-[1.65rem] font-semibold leading-[0.96] tracking-[-0.05em] text-white">
            {normalizeText(series?.title)}
          </h3>
          <p className="mt-2 text-sm text-white/58">
            {meta.genre} / {meta.heat}
          </p>
          <div className={`mt-4 ${storefrontChipClass} justify-center px-3 py-2 text-[11px] tracking-[0.01em] text-white/76 group-hover:border-amber-200/28 group-hover:text-amber-100`}>
            {rank === 1 ? "Start Binge" : "Read Full Series"}
          </div>
        </div>
      </div>
    </SeriesLink>
  );
}

export default function RankingsPage({
  initialSearchParams = {},
  initialSeries = [],
}) {
  const router = useRouter();
  const { contentMode, isAdultMode } = useAdultGateStore();
  const [seriesList, setSeriesList] = useState(
    filterContentByMode(
      Array.isArray(initialSeries) ? initialSeries : [],
      contentMode,
    ),
  );
  const [commerceNotice, setCommerceNotice] = useState(null);
  const activeViewId = normalizeView(initialSearchParams);
  const activeView = VIEWS.find((item) => item.id === activeViewId) || VIEWS[0];
  const featuredPath = `/rankings?view=${activeView.id}`;

  useEffect(() => {
    const adultFlag = getContentModeQueryParam(contentMode);
    apiGet(`/api/rankings?adult=${adultFlag}&type=popular`).then((response) => {
      if (response.ok) {
        const rankings = filterContentByMode(
          Array.isArray(response.data?.rankings) ? response.data.rankings : [],
          contentMode,
        );
        if (rankings.length > 0) {
          setSeriesList(rankings);
          return;
        }
      }

      apiGet(`/api/series?adult=${adultFlag}`).then((fallbackResponse) => {
        if (fallbackResponse.ok) {
          setSeriesList(
            filterContentByMode(
              Array.isArray(fallbackResponse.data?.series)
                ? fallbackResponse.data.series
                : [],
              contentMode,
            ),
          );
        } else {
          setSeriesList([]);
        }
      });
    });
  }, [activeView.id, contentMode]);

  useEffect(() => {
    setCommerceNotice(
      getCommerceSuccessPresentation(
        consumeCommerceSuccessForPath("/rankings"),
      ),
    );
  }, []);

  const curatedSeries = useMemo(
    () => filterSeriesForView(seriesList, activeView.id),
    [activeView.id, seriesList],
  );
  const fallbackPreviewSeries = useMemo(
    () => sortFeaturedSeries(seriesList),
    [seriesList],
  );
  const rankingPreviewSeries =
    curatedSeries.length > 0 ? curatedSeries : fallbackPreviewSeries;
  const leadEntry = rankingPreviewSeries[0] || null;
  const supportingEntries = rankingPreviewSeries.slice(1, 3);
  const boardEntries = rankingPreviewSeries.slice(3, 9);
  const comicLeaders = useMemo(
    () =>
      sortFeaturedSeries(
        seriesList.filter((series) => getSeriesType(series) === "comic"),
      ).slice(0, 6),
    [seriesList],
  );
  const novelLeaders = useMemo(
    () =>
      sortFeaturedSeries(
        seriesList.filter((series) => getSeriesType(series) === "novel"),
      ).slice(0, 6),
    [seriesList],
  );
  const completedRuns = useMemo(
    () =>
      sortFeaturedSeries(
        seriesList.filter(
          (series) => normalizeStatus(series?.status) === "completed",
        ),
      ).slice(0, 6),
    [seriesList],
  );
  const hasBoardData = rankingPreviewSeries.length > 0;
  const modeLabel = isAdultMode ? "Mature stories" : "All-ages stories";
  const heroStats = [
    {
      label: "Stories tracked",
      value: `${seriesList.length}`,
      icon: Flame,
      tone: "rose",
    },
    {
      label: "Comics",
      value: `${comicLeaders.length}`,
      icon: Trophy,
      tone: "amber",
    },
    {
      label: "Novels",
      value: `${novelLeaders.length}`,
      icon: BookOpen,
      tone: "cyan",
    },
    {
      label: "Completed",
      value: `${completedRuns.length}`,
      icon: CheckCircle2,
      tone: "amber",
    },
    {
      label: "Leading Now",
      value: leadEntry ? normalizeText(leadEntry.title) : modeLabel,
      icon: Crown,
      tone: "rose",
    },
  ];

  const handleSeriesClick = useCallback(
    (seriesId, entryPoint = "RANKINGS_SERIES") => {
      const targetPath = `/series/${seriesId}`;
      trackEvent("featured_series_click", {
        seriesId,
        entryPoint,
        featuredView: activeView.id,
      });
      router.push(
        buildPathWithAttribution(targetPath, {
          entryPoint,
          campaignId: `featured_${activeView.id}`,
          sourcePath: featuredPath,
          sourceSeriesId: seriesId,
          returnTo: targetPath,
        }),
      );
    },
    [activeView.id, featuredPath, router],
  );

  const handleSeriesLinkClick = useCallback(
    (event, seriesId, entryPoint = "RANKINGS_SERIES") => {
      if (isModifiedEvent(event)) {
        return;
      }

      event.preventDefault();
      handleSeriesClick(seriesId, entryPoint);
    },
    [handleSeriesClick],
  );

  return (
    <StorefrontPage
      accentClass="from-[rgba(255,79,154,0.16)] via-[rgba(167,139,250,0.08)] to-[rgba(103,232,249,0.1)]"
      contentClassName="space-y-10 lg:space-y-12"
    >
      <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(135deg,rgba(13,9,24,0.98)_0%,rgba(31,15,48,0.96)_48%,rgba(8,15,26,0.98)_100%)] p-5 shadow-[0_34px_110px_rgba(0,0,0,0.42)] sm:p-7 lg:p-8">
        <div className="absolute inset-0" aria-hidden="true">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_16%,rgba(255,79,154,0.26),transparent_24%),radial-gradient(circle_at_78%_20%,rgba(103,232,249,0.16),transparent_26%),radial-gradient(circle_at_50%_90%,rgba(251,191,36,0.12),transparent_30%)]" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,79,154,0.6),rgba(103,232,249,0.38),transparent)]" />
        </div>
        <div className="relative grid gap-7 xl:grid-cols-[minmax(0,0.86fr)_minmax(420px,1fr)] xl:items-stretch">
          <div className="flex min-h-[360px] flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`${storefrontAccentChipClass} px-3 py-1 text-[10px] tracking-[0.24em] text-fuchsia-50`}>
                  Trending Now
                </span>
                <span className={`${storefrontBadgeClass} px-3 py-1 text-[10px] tracking-[0.18em] text-white/64`}>
                  {modeLabel}
                </span>
              </div>
              <h1 className="mt-5 font-display text-[4rem] font-semibold leading-[0.85] tracking-[-0.08em] text-white sm:text-[5.8rem]">
                Rankings
              </h1>
              <p className="mt-5 max-w-[39rem] text-base leading-[1.75] text-white/72">
                The stories readers are opening, saving, and finishing tonight.
              </p>
            </div>
            {leadEntry ? (
              <button
                type="button"
                onClick={() => handleSeriesClick(leadEntry.id, "RANKINGS_HERO")}
                className="group mt-8 grid w-full gap-4 rounded-[30px] border border-white/10 bg-white/[0.045] p-4 text-left shadow-[0_24px_70px_rgba(0,0,0,0.24)] transition-all duration-200 hover:-translate-y-1 hover:border-fuchsia-200/28 sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:items-center"
              >
                <ToneIcon icon={Star} tone="amber" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/46">
                    Leading Now
                  </p>
                  <p className="mt-1 truncate font-display text-[1.75rem] font-semibold tracking-[-0.055em] text-white">
                    {normalizeText(leadEntry.title)}
                  </p>
                </div>
                <ArrowUpRight className="size-5 text-white/58 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </button>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {heroStats.map((stat, index) => (
              <StatCard
                key={stat.label}
                {...stat}
                className={index === heroStats.length - 1 ? "sm:col-span-2" : ""}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          title="Browse rankings"
          subtitle="Switch the board without changing the current content mode."
        />
        <div className="-mx-4 overflow-x-auto px-4 pb-1 no-scrollbar sm:mx-0 sm:px-0">
          <div className="flex min-w-max gap-2">
            {VIEWS.map((view) => {
              const isActive = view.id === activeView.id;
              return (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => router.push(`/rankings?view=${view.id}`)}
                  className={`min-h-[44px] rounded-full px-5 text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? "border border-fuchsia-200/28 bg-[linear-gradient(135deg,#ff4f9a_0%,#a78bfa_55%,#67e8f9_115%)] text-[#170d18] shadow-[0_18px_42px_rgba(255,79,154,0.22)]"
                      : "border border-white/10 bg-white/[0.045] text-white/68 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {view.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {commerceNotice ? (
        <CommerceSuccessBanner
          notice={commerceNotice}
          onDismiss={() => setCommerceNotice(null)}
        />
      ) : null}

      {leadEntry ? (
        <section className="space-y-4">
          <SectionHeader
            title="Top Stories Now"
            subtitle="The stories leading the board tonight."
          />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <TopLeadCard
              series={leadEntry}
              onSeriesLinkClick={handleSeriesLinkClick}
            />
            {supportingEntries.length > 0 ? (
              <div className="grid gap-4">
                {supportingEntries.map((series, index) => (
                  <SupportingCard
                    key={series.id}
                    series={series}
                    rank={index + 2}
                    onSeriesLinkClick={handleSeriesLinkClick}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {boardEntries.length > 0 ? (
        <section className="space-y-4">
          <SectionHeader
            title="Live Board"
            subtitle="Fast-moving stories readers keep opening."
          />
          <div className="space-y-3">
            {boardEntries.map((series, index) => (
              <BoardRow
                key={series.id}
                series={series}
                rank={index + 4}
                onSeriesLinkClick={handleSeriesLinkClick}
              />
            ))}
          </div>
        </section>
      ) : null}

      {comicLeaders.length > 0 ? (
        <section className="space-y-4">
          <SectionHeader
            title="Comics Leaders"
            subtitle="Top comics readers keep opening first."
          />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {comicLeaders.map((series, index) => (
              <LeaderCard
                key={series.id}
                series={series}
                rank={index + 1}
                section="comics"
                onSeriesLinkClick={handleSeriesLinkClick}
              />
            ))}
          </div>
        </section>
      ) : null}

      {novelLeaders.length > 0 ? (
        <section className="space-y-4">
          <SectionHeader
            title="Novel Leaders"
            subtitle="Novels readers are opening tonight."
          />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {novelLeaders.map((series, index) => (
              <LeaderCard
                key={series.id}
                series={series}
                rank={index + 1}
                section="novel"
                onSeriesLinkClick={handleSeriesLinkClick}
              />
            ))}
          </div>
        </section>
      ) : null}

      {completedRuns.length > 0 ? (
        <section className="space-y-4">
          <SectionHeader
            title="Completed Runs"
            subtitle="Finished stories readers keep bingeing."
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {completedRuns.map((series, index) => (
              <CompletedCard
                key={series.id}
                series={series}
                rank={index + 1}
                onSeriesLinkClick={handleSeriesLinkClick}
              />
            ))}
          </div>
        </section>
      ) : null}
    </StorefrontPage>
  );
}
