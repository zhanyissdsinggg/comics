"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Compass,
  Flame,
  Gamepad2,
  Library,
  Search,
  Sparkles,
  Star,
} from "lucide-react";
import {
  storefrontAccentChipClass,
  storefrontBadgeClass,
  storefrontInfoCardClass,
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
  storefrontSoftCardClass,
} from "../common/StorefrontPagePrimitives";
import { apiGet } from "../../lib/apiClient";
import { getContentModeQueryParam } from "../../lib/contentFilters";
import { resolveDisplayImageUrl } from "../../lib/fallbackImage";
import { trackEvent } from "../../lib/trackEvent";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import {
  buildCardHook,
  buildCreatorLabel,
  buildGenreLabel,
  buildLatestInstallmentLabel,
  buildReadHref,
  buildReadingTimeLabel,
  buildSeriesHook,
  buildSeriesHref,
  buildStatusLabel,
  buildUpdatedLabel,
  filterSeriesByType,
  normalizeType,
} from "./landingUtils";
import PageShell from "../layout/PageShell";

function coverAlt(series) {
  const title = String(series?.title || "").trim() || "Untitled";
  const type = normalizeType(series?.type) || "series";
  const prefix = type === "comic" || type === "novel" ? type : "series";
  return `${prefix.charAt(0).toUpperCase()}${prefix.slice(1)} cover image for ${title}`;
}

function ratingLabel(series) {
  const numeric = Number(series?.ratingAvg || series?.rating || 0);
  return numeric > 0 ? numeric.toFixed(1) : "";
}

function buildCoverMeta(series, variant = "comic") {
  if (variant === "novel") {
    return {
      eyebrow: buildGenreLabel(series, 2) || "Novel",
      secondary: buildReadingTimeLabel(series),
      tertiary: [buildLatestInstallmentLabel(series), buildStatusLabel(series)]
        .filter(Boolean)
        .join(" / "),
    };
  }

  return {
    eyebrow: buildGenreLabel(series, 2) || buildCreatorLabel(series) || "Featured",
    secondary: buildLatestInstallmentLabel(series),
    tertiary: buildStatusLabel(series),
  };
}

export function useCatalogFeed({
  initialSeries = [],
  initialReady = false,
  initialIncludeAdult = false,
  type = "",
}) {
  const { contentMode, forceDisableAdultMode } = useAdultGateStore();
  const includeAdult = contentMode === "adult";
  const [seriesList, setSeriesList] = useState(() =>
    filterSeriesByType(initialSeries, type),
  );
  const [loading, setLoading] = useState(!initialReady);
  const handledInitialRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const adultFlag = getContentModeQueryParam(contentMode);
    const canReuseInitial =
      !handledInitialRef.current &&
      initialReady &&
      initialIncludeAdult === includeAdult;

    handledInitialRef.current = true;

    if (canReuseInitial) {
      setSeriesList(filterSeriesByType(initialSeries, type));
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    apiGet(`/api/series?adult=${adultFlag}&pageSize=100`, { cacheMs: 30_000 })
      .then((response) => {
        if (cancelled) {
          return;
        }

        if (!response.ok) {
          if (response.error === "ADULT_GATED") {
            forceDisableAdultMode();
          }
          setSeriesList([]);
          setLoading(false);
          return;
        }

        setSeriesList(filterSeriesByType(response.data?.series || [], type));
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setSeriesList([]);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    contentMode,
    forceDisableAdultMode,
    includeAdult,
    initialIncludeAdult,
    initialReady,
    initialSeries,
    type,
  ]);

  return {
    contentMode,
    includeAdult,
    loading,
    seriesList,
  };
}

export function StorefrontPage({
  children,
  accentClass = "from-[rgba(255,79,154,0.16)] via-[rgba(167,139,250,0.08)] to-[rgba(103,232,249,0.1)]",
  theme = "default",
  className = "",
  contentClassName = "",
}) {
  void accentClass;

  return (
    <PageShell
      theme={theme}
      className={cn("pb-12", className)}
      contentClassName={contentClassName}
    >
      {children}
    </PageShell>
  );
}

export function SectionHeading({
  eyebrow = "",
  title,
  description = "",
  action = null,
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-[44rem]">
        {eyebrow ? (
          <p className={`${storefrontBadgeClass} text-white/62`}>
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-3 font-display text-[1.92rem] font-semibold leading-[0.94] tracking-[-0.06em] text-white sm:text-[2.5rem]">
          {title}
        </h2>
        {description ? (
          <p className="mt-2.5 max-w-[40rem] text-sm leading-[1.72] text-white/68">
            {description}
          </p>
        ) : null}
      </div>
      <div className="self-start sm:self-auto">{action}</div>
    </div>
  );
}

export function StoryHero({
  series,
  eyebrow,
  hook,
  title,
  primaryLabel = "Start Reading",
  primaryHref,
  primaryTestId,
  secondaryLabel = "View Series",
  secondaryHref,
  secondaryTestId,
  stats = [],
  chips = [],
  trailingCard = null,
}) {
  if (!series) {
    return null;
  }

  const heroTitle = title || String(series?.title || "").trim();
  const description = hook || buildSeriesHook(series);
  const readHref = primaryHref || buildReadHref(series);
  const detailHref = secondaryHref || buildSeriesHref(series);
  const creator = buildCreatorLabel(series);
  const coverUrl = resolveDisplayImageUrl(series?.coverUrl, {
    kind: "cover",
    adult: series?.adult || series?.isAdult,
  });

  return (
    <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(140deg,rgba(11,12,21,0.98)_0%,rgba(12,12,20,0.96)_44%,rgba(18,14,24,0.98)_100%)] shadow-[var(--gush-shadow-floating)]">
      <div className="absolute inset-0" aria-hidden="true">
        <img
          src={coverUrl}
          alt=""
          aria-hidden="true"
          role="presentation"
          className="h-full w-full scale-110 object-cover opacity-34 blur-2xl"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(255,79,154,0.26),transparent_22%),radial-gradient(circle_at_84%_16%,rgba(103,232,249,0.18),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(8,7,14,0.18)_16%,rgba(8,7,14,0.76)_55%,rgba(8,7,14,0.96)_100%)]" />
      </div>

      <div className="relative grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(240px,320px)] lg:items-end lg:gap-8 lg:p-8">
        <div className="order-2 space-y-5 lg:order-1">
          <div className="space-y-3">
            {eyebrow ? (
              <p className={`${storefrontBadgeClass} px-3 py-1.5 text-white/78`}>
                {eyebrow}
              </p>
            ) : null}
            <h1 className="max-w-[13ch] font-display text-[2.65rem] font-semibold leading-[0.92] tracking-[-0.065em] text-white sm:text-[4rem]">
              {heroTitle}
            </h1>
            {description ? (
              <p className="max-w-[38rem] text-[0.98rem] leading-[1.72] text-white/68">
                {description}
              </p>
            ) : null}
            {creator ? (
              <p className="text-sm uppercase tracking-[0.16em] text-white/46">
                by {creator}
              </p>
            ) : null}
          </div>

          {chips.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {chips.map((chip) => (
                <span
                  key={chip}
                  className={`${storefrontBadgeClass} px-3 py-1.5 text-white/76`}
                >
                  {chip}
                </span>
              ))}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={readHref}
              data-testid={primaryTestId}
              className={`${storefrontPrimaryButtonClass} min-h-[48px] px-6 text-[#1b0e17]`}
            >
              {primaryLabel}
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href={detailHref}
              data-testid={secondaryTestId}
              className={`${storefrontSecondaryButtonClass} min-h-[48px] px-5 text-white/82`}
            >
              {secondaryLabel}
            </Link>
          </div>

          {stats.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className={`${storefrontInfoCardClass} px-4 py-3.5`}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/48">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-[0.98rem] font-semibold tracking-[-0.02em] text-white">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="order-1 mx-auto w-full max-w-[260px] lg:order-2 lg:max-w-[320px]">
          {trailingCard || (
            <div className="relative mx-auto w-full max-w-[300px]">
              <div className="absolute inset-4 rounded-[28px] bg-[rgba(255,79,154,0.2)] blur-3xl" />
              <div className="absolute inset-3 -rotate-[5deg] rounded-[28px] border border-white/8 bg-[rgba(255,255,255,0.025)]" />
              <div className="absolute inset-2 rotate-[4deg] rounded-[28px] border border-white/8 bg-[rgba(103,232,249,0.08)]" />
              <div className="relative aspect-[3/4] overflow-hidden rounded-[28px] border border-white/12 shadow-[0_28px_72px_rgba(0,0,0,0.42)]">
                <img
                  src={coverUrl}
                  alt={coverAlt(series)}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,transparent_24%,rgba(0,0,0,0.48)_100%)]" />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function ShelfScroller({ children, className = "" }) {
  return (
    <div className={`-mx-4 overflow-x-auto px-4 pb-2 no-scrollbar scroll-snap-x sm:mx-0 sm:px-0 ${className}`}>
      <div className="flex min-w-max gap-3 sm:gap-4">{children}</div>
    </div>
  );
}

export function CoverCard({
  series,
  href,
  variant = "comic",
  badge = "",
  actionLabel = "Start Reading",
  progressPercent = 0,
  subtitle = "",
  onClick,
}) {
  if (!series) {
    return null;
  }

  const meta = buildCoverMeta(series, variant);
  const hook = subtitle || buildCardHook(series, variant === "novel" ? 92 : 76);
  const genres = buildGenreLabel(series, 2);
  const status = buildStatusLabel(series);
  const coverUrl = resolveDisplayImageUrl(series?.coverUrl, {
    kind: "cover",
    adult: series?.adult || series?.isAdult,
  });
  const rating = ratingLabel(series);
  const widthClass =
    variant === "novel"
      ? "w-[calc(58vw-1rem)] min-w-[174px] max-w-[244px] sm:w-[220px] md:w-[244px]"
      : "w-[calc(52vw-1rem)] min-w-[160px] max-w-[224px] sm:w-[196px] md:w-[224px]";
  const metaLine =
    variant === "novel"
      ? meta.tertiary || [buildLatestInstallmentLabel(series), status].filter(Boolean).join(" / ")
      : [genres, meta.tertiary || status].filter(Boolean).join(" / ");

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-label={String(series?.title || "").trim() || "Open story"}
      className={`group scroll-snap-item ${widthClass} shrink-0`}
    >
      <article className="space-y-3">
        <div className="relative aspect-[3/4] overflow-hidden rounded-[30px] border border-white/10 bg-[rgba(255,255,255,0.035)] shadow-[var(--gush-shadow-card)] transition-all duration-200 group-hover:-translate-y-1.5 group-hover:border-white/18 group-hover:shadow-[0_30px_96px_rgba(0,0,0,0.42)]">
          <img
            src={coverUrl}
            alt=""
            aria-hidden="true"
            role="presentation"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,8,15,0.08)_0%,rgba(7,8,17,0.18)_26%,rgba(7,8,17,0.84)_100%)]" />
          <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-2">
            <span className="rounded-full border border-white/12 bg-[rgba(15,13,19,0.74)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/76 backdrop-blur-xl">
              {badge || meta.secondary}
            </span>
            {rating ? (
              <span className="flex items-center gap-1 rounded-full border border-white/12 bg-[rgba(15,13,19,0.74)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/82 backdrop-blur-xl">
                <Star className="size-3 fill-current text-[var(--gush-gold)]" />
                {rating}
              </span>
            ) : null}
          </div>
          <div className="absolute bottom-0 left-0 right-0 space-y-1.5 p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/62">
              {meta.eyebrow}
            </p>
            <h3 className="line-clamp-2 text-[1.18rem] font-semibold leading-[1.02] tracking-[-0.03em] text-white">
              {series.title}
            </h3>
            <p className="line-clamp-2 text-sm leading-5 text-white/70">
              {hook}
            </p>
          </div>
        </div>
        <div className="space-y-1 px-1">
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/46">
            {metaLine}
          </p>
          <div className="flex items-center justify-between gap-3 text-sm text-white/72">
            <span className="truncate">{actionLabel}</span>
            <span className="shrink-0">{buildUpdatedLabel(series)}</span>
          </div>
          {progressPercent > 0 ? (
            <div className="pt-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#ff5fa4_0%,#67e8f9_100%)]"
                  style={{
                    width: `${Math.max(8, Math.round(Math.min(1, progressPercent) * 100))}%`,
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>
      </article>
    </Link>
  );
}

export function UpdateList({
  items = [],
  variant = "comic",
  sectionName = "",
}) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-3">
      {items.map((series, index) => {
        const href =
          series?.resumeEpisodeId && series?.id
            ? `/read/${series.id}/${series.resumeEpisodeId}`
            : buildReadHref(series);
        return (
          <Link
            key={`${series.id}-${index}`}
            href={href}
            onClick={() => {
              if (sectionName) {
                trackEvent("story_click", {
                  seriesId: series?.id,
                  sourceSection: sectionName,
                  position: index + 1,
                });
              }
            }}
            className={`group grid grid-cols-[76px_minmax(0,1fr)_auto] items-center gap-3 p-3 transition-all duration-150 hover:-translate-y-0.5 hover:border-white/16 hover:bg-[rgba(255,255,255,0.075)] sm:grid-cols-[88px_minmax(0,1fr)_auto] ${storefrontSoftCardClass}`}
          >
            <div className="relative aspect-[3/4] overflow-hidden rounded-[18px] border border-white/10">
              <img
                src={resolveDisplayImageUrl(series?.coverUrl, {
                  kind: "cover",
                  adult: series?.adult || series?.isAdult,
                })}
                alt=""
                aria-hidden="true"
                role="presentation"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/46">
                {variant === "novel"
                  ? buildReadingTimeLabel(series)
                  : buildGenreLabel(series, 2) || "Fresh update"}
              </p>
              <h3 className="mt-1 line-clamp-2 text-[1.08rem] font-semibold leading-tight text-white">
                {series.title}
              </h3>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-white/64">
                {variant === "novel"
                  ? buildCardHook(series, 88)
                  : buildLatestInstallmentLabel(series)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/42">
                {buildUpdatedLabel(series)}
              </p>
              <p className="mt-2 text-sm font-medium text-white/76">
                {series?.progressPercent > 0 ? "Continue Reading" : "Start Reading"}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function RankList({
  items = [],
  label = "Top 10",
  eyebrow = "Reader Rankings",
  description = "The titles everyone keeps opening.",
  compact = false,
  minimal = false,
}) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    <section
      className={`${storefrontInfoCardClass} ${
        minimal ? "p-3.5" : compact ? "p-4" : "p-4 sm:p-5"
      }`}
    >
      <SectionHeading
        eyebrow={eyebrow}
        title={label}
        description={description}
      />
      <div className={`grid ${minimal ? "mt-4 gap-2.5" : "mt-5 gap-3"}`}>
        {items.map((series, index) => {
          return (
            <Link
              key={`${series.id}-${index}`}
              href={buildSeriesHref(series)}
              className={`group grid items-center gap-3 border border-white/8 bg-[rgba(255,255,255,0.025)] transition-colors hover:bg-[rgba(255,255,255,0.075)] ${
                minimal
                  ? "grid-cols-[30px_48px_minmax(0,1fr)] rounded-[20px] px-3 py-2.5"
                  : "grid-cols-[34px_56px_minmax(0,1fr)] rounded-[22px] px-3 py-3"
              }`}
            >
              <span className={`text-center font-display font-semibold text-white/72 ${minimal ? "text-[1.25rem]" : "text-[1.5rem]"}`}>
                {index + 1}
              </span>
              <div className={`aspect-[3/4] overflow-hidden border border-white/10 ${minimal ? "rounded-[14px]" : "rounded-[16px]"}`}>
                <img
                  src={resolveDisplayImageUrl(series?.coverUrl, {
                    kind: "cover",
                    adult: series?.adult || series?.isAdult,
                  })}
                  alt=""
                  aria-hidden="true"
                  role="presentation"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <h3 className={`truncate font-semibold text-white ${minimal ? "text-[0.95rem] leading-[1]" : "text-base leading-[1]"}`}>
                  {series.title}
                </h3>
                <p className="truncate text-sm text-white/58">
                  {[buildGenreLabel(series, 2), buildStatusLabel(series)]
                    .filter(Boolean)
                    .join(" / ")}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function GenreShelfSection({
  shelves = [],
  variant = "comic",
  title = "Genre Shelves",
  description = "Open a shelf and keep reading.",
  isDecorativeImage,
}) {
  if (!Array.isArray(shelves) || shelves.length === 0) {
    return null;
  }

  return (
    <section className="space-y-8">
      <SectionHeading title={title} description={description} />
      {shelves.map((shelf) => (
        <div key={shelf.genre} className="space-y-4">
          <h3 className="font-display text-[1.45rem] font-semibold leading-[1] tracking-[-0.014em] text-white">
            {shelf.genre}
          </h3>
          <ShelfScroller>
            {shelf.items.map((series) => (
              <CoverCard
                key={series.id}
                series={series}
                href={buildSeriesHref(series)}
                variant={variant}
                actionLabel={buildLatestInstallmentLabel(series)}
                decorativeImage={Boolean(isDecorativeImage?.(series))}
              />
            ))}
          </ShelfScroller>
        </div>
      ))}
    </section>
  );
}

export function InteractivePromo() {
  return (
    <section className="rounded-[36px] border border-[rgba(103,232,249,0.18)] bg-[linear-gradient(135deg,rgba(7,10,18,0.98)_0%,rgba(13,11,25,0.98)_50%,rgba(16,12,24,0.98)_100%)] p-5 shadow-[var(--gush-shadow-panel)] sm:p-6">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="space-y-3">
          <p className="inline-flex items-center gap-2 rounded-full border border-cyan-200/16 bg-cyan-200/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100">
            <Gamepad2 className="size-3.5" />
            Interactive Stories
          </p>
          <h2 className="font-display text-[2rem] font-semibold leading-[1.02] tracking-[-0.014em] text-white sm:text-[2.5rem]">
            Your Choice Changes the Story
          </h2>
          <p className="max-w-[44rem] text-sm leading-7 text-white/68">
            Read interactive comics where every decision unlocks a new scene, a secret route, or a completely different ending.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/interactive"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#67e8f9_0%,#7af0c9_100%)] px-6 text-sm font-semibold text-[#0b1320]"
          >
            Explore Stories
            <Compass className="size-4" />
          </Link>
          <Link
            href="/search?format=interactive"
            className={`${storefrontSecondaryButtonClass} min-h-[48px] px-5 text-white/82`}
          >
            More Stories
          </Link>
        </div>
      </div>
    </section>
  );
}

export function DiscoveryFilterPill({
  label,
  active = false,
  href = "#",
  icon: Icon = null,
}) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
        active
          ? `${storefrontAccentChipClass} border-white/16 bg-[rgba(255,79,154,0.16)] text-white shadow-[var(--gush-shadow-soft)]`
          : `${storefrontSecondaryButtonClass} text-white/78`
      }`}
    >
      {Icon ? <Icon className="size-4" /> : null}
      {label}
    </Link>
  );
}

export function EmptyShelf({
  title = "Nothing here yet",
  description = "Fresh stories will land here soon.",
  actionHref = "/search",
}) {
  return (
    <section className={`${storefrontInfoCardClass} p-6`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/48">
        Next Up
      </p>
      <h2 className="mt-2 font-display text-[2rem] font-semibold tracking-[-0.014em] text-white">
        {title}
      </h2>
      <p className="mt-3 max-w-[34rem] text-sm leading-7 text-white/66">
        {description}
      </p>
      <Link
        href={actionHref}
        className={`mt-5 ${storefrontSecondaryButtonClass} min-h-[44px] px-4 text-white/82`}
      >
        Find a Story
        <Library className="size-4" />
      </Link>
    </section>
  );
}

export const discoveryIcons = {
  Search,
  Flame,
  Sparkles,
  BookOpen,
  Library,
  Compass,
};
