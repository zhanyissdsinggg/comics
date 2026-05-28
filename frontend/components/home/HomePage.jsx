"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Plus } from "lucide-react";
import { HomeDataProvider, useHomeData } from "./HomeDataProvider";
import { apiGet } from "../../lib/apiClient";
import { resolveDisplayImageUrl } from "../../lib/fallbackImage";
import { trackEvent } from "../../lib/trackEvent";
import {
  buildHomeHeroItems,
  getHomeEditorialSnapshot,
} from "../../lib/homeMerchandising";
import { resolveSeriesCreatorName } from "../../lib/creatorIdentity";
import { normalizeGenreList } from "../../lib/coverPresentation";
import {
  buildEditorialCardHook,
  buildEditorialHook,
} from "../../lib/editorialHooks";
import { getSearchParam } from "../../lib/pageSearchParams";
import { filterBlockedPublicSeries } from "../../lib/publicCatalogVisibility";
import {
  formatInstallmentLabel,
  getStartReadingLabel,
} from "../../lib/seriesFormatLabels";
import { getContentModeQueryParam } from "../../lib/contentFilters";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import {
  formatTitleCardCreator,
  formatTitleCardFormatStatus,
  formatTitleCardGenres,
} from "../../lib/titleCardText";

const LoginPrompt = dynamic(() => import("../auth/LoginPrompt"), {
  ssr: false,
});
const PortraitCard = dynamic(() => import("./PortraitCard"));

const VIBE_OPTIONS = [
  "Heartbreak",
  "Magic school",
  "Enemies to lovers",
  "Dark mystery",
  "Quick chaos",
  "Soft romance",
  "Power fantasy",
  "Weekend binge",
];

function toTimestamp(value) {
  const parsed = typeof value === "number" ? value : Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function dedupeSeries(seriesList) {
  const seen = new Set();
  return (Array.isArray(seriesList) ? seriesList : []).filter((series) => {
    const seriesId = String(series?.id || "").trim();
    if (!seriesId || seen.has(seriesId)) {
      return false;
    }
    seen.add(seriesId);
    return true;
  });
}

function sanitizeHomepageSeriesList(seriesList) {
  return dedupeSeries(filterBlockedPublicSeries(seriesList));
}

function buildHeroSummary(series) {
  const normalizedTitle = String(series?.title || "")
    .trim()
    .toLowerCase();
  if (
    normalizedTitle &&
    /crown|king|kingdom|prince|royal|throne/.test(normalizedTitle)
  ) {
    return "A stolen crown. A kingdom built on lies. And one runaway prince who was never supposed to survive.";
  }

  return buildEditorialHook(series, {
    maxLength: 118,
    includeTitle: false,
  });
}

function getPrimaryGenres(genres, limit = 3) {
  return normalizeGenreList(genres).slice(0, limit);
}

function buildSeriesMeta(series) {
  const creatorName = resolveSeriesCreatorName(series);
  const statusLabel = String(series?.status || "").trim();

  return [
    formatTitleCardCreator(creatorName),
    formatTitleCardFormatStatus(series?.type, statusLabel),
    statusLabel,
  ]
    .filter(Boolean)
    .slice(0, 2)
    .join(" / ");
}

function buildUpdatedLabel(series) {
  const updatedAtMs = toTimestamp(series?.updatedAt);
  if (!updatedAtMs) {
    return "Fresh drop";
  }

  if (updatedAtMs >= Date.now() - 24 * 60 * 60 * 1000) {
    return "Updated today";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(updatedAtMs));
}

function buildSeriesSignal(series, section) {
  const updatedAtLabel = buildUpdatedLabel(series);
  const installmentCount = Math.max(0, Number(series?.episodeCount || 0));

  if (section === "completed") {
    return "Binge-worthy";
  }
  if (section === "updates") {
    return updatedAtLabel;
  }
  if (installmentCount > 0 && installmentCount <= 12) {
    return "Quick read";
  }
  if (String(series?.status || "").toLowerCase() === "completed") {
    return "Complete";
  }
  return "Hot this week";
}

function buildShortHook(series) {
  return buildEditorialCardHook(series, { maxLength: 78 });
}

function buildEpisodeSignal(series) {
  const latestNumber =
    series?.latestEpisodeNumber ||
    series?.latestChapterNumber ||
    series?.episodeCount ||
    "";
  return formatInstallmentLabel(series?.type || series, latestNumber || "");
}

function buildCoverAltText(series) {
  const title = String(series?.title || "").trim();
  const type = String(series?.type || "")
    .trim()
    .toLowerCase();

  if (title && (type === "comic" || type === "novel")) {
    return `${type.charAt(0).toUpperCase()}${type.slice(1)} cover image for ${title}`;
  }

  if (title) {
    return `Cover image for ${title}`;
  }

  return "Series cover image";
}

function buildTypedCoverAltText(series) {
  const title = String(series?.title || "").replace(/\s+/g, " ").trim();
  const type = String(series?.type || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  if (title && (type === "comic" || type === "novel")) {
    return `${type.charAt(0).toUpperCase()}${type.slice(1)} cover image for ${title}`;
  }

  if (title) {
    return `Cover image for ${title}`;
  }

  return "Series cover image";
}

function buildSectionItems(
  seriesList,
  section,
  excludedIds = new Set(),
  limit = 6,
) {
  const filtered = sanitizeHomepageSeriesList(seriesList).filter((series) => {
    const seriesId = String(series?.id || "").trim();
    return seriesId && !excludedIds.has(seriesId);
  });

  let ranked = filtered;
  if (section === "updates") {
    ranked = [...filtered].sort(
      (left, right) =>
        toTimestamp(right?.updatedAt) - toTimestamp(left?.updatedAt),
    );
  } else if (section === "completed") {
    ranked = filtered.filter(
      (series) =>
        String(series?.status || "")
          .trim()
          .toLowerCase() === "completed",
    );
  }

  return ranked.slice(0, limit);
}

function buildSlotSectionItems(seriesList, homepageSlots, slotName, limit = 6) {
  const visibleCatalog = sanitizeHomepageSeriesList(seriesList);
  const slotSeriesIds = (Array.isArray(homepageSlots) ? homepageSlots : [])
    .find(
      (slot) =>
        String(slot?.slot || slot?.name || slot?.id || "")
          .trim()
          .toLowerCase() === String(slotName || "").trim().toLowerCase(),
    )
    ?.seriesIds;

  if (!Array.isArray(slotSeriesIds) || slotSeriesIds.length === 0) {
    return [];
  }

  const byId = new Map(
    visibleCatalog.map((series) => [String(series?.id || "").trim(), series]),
  );

  return slotSeriesIds
    .map((seriesId) => byId.get(String(seriesId || "").trim()))
    .filter(Boolean)
    .slice(0, limit);
}

function inferFirstEpisodeId(series) {
  const direct =
    String(series?.firstReadableEpisodeId || "").trim() ||
    String(series?.firstEpisodeId || "").trim();
  if (direct) {
    return direct;
  }

  const latestEpisodeId = String(series?.latestEpisodeId || "").trim();
  const match = latestEpisodeId.match(/^(.*?)(\d+)$/);
  if (!match) {
    return "";
  }

  const [, prefix, digits] = match;
  return `${prefix}${String(1).padStart(digits.length, "0")}`;
}

function buildReaderHref(seriesId, episodeId) {
  const normalizedSeriesId = String(seriesId || "").trim();
  const normalizedEpisodeId = String(episodeId || "").trim();

  if (normalizedSeriesId && normalizedEpisodeId) {
    return `/read/${normalizedSeriesId}/${normalizedEpisodeId}`;
  }

  if (normalizedSeriesId) {
    return `/series/${normalizedSeriesId}`;
  }

  return "/comics";
}

function hasHomepageSlot(homepageSlots, slotName) {
  const normalizedSlotName = String(slotName || "")
    .trim()
    .toLowerCase();
  return (Array.isArray(homepageSlots) ? homepageSlots : []).some(
    (slot) =>
      String(slot?.slot || slot?.name || slot?.id || "")
        .trim()
        .toLowerCase() === normalizedSlotName,
  );
}

function createCanonicalHomeView(
  seriesList,
  homepageSlots,
  preferredFeaturedSeriesId = "",
) {
  const safeSeriesList = sanitizeHomepageSeriesList(seriesList);
  const editorialSnapshot = getHomeEditorialSnapshot(safeSeriesList, {
    homepageSlots,
  });
  const canonicalHeroSeriesId = String(preferredFeaturedSeriesId || "").trim();
  const hasExplicitHomeHeroSlot = hasHomepageSlot(homepageSlots, "home-hero");
  const heroCandidates = buildHomeHeroItems(safeSeriesList, { homepageSlots })
    .map((item) =>
      safeSeriesList.find(
        (series) =>
          String(series?.id || "").trim() ===
          String(item?.seriesId || "").trim(),
      ),
    )
    .filter(Boolean);

  const featuredSeries =
    safeSeriesList.find(
      (series) => String(series?.id || "").trim() === canonicalHeroSeriesId,
    ) ||
    (hasExplicitHomeHeroSlot ? heroCandidates[0] : null) ||
    editorialSnapshot.breakoutPick ||
    editorialSnapshot.freeStartPick ||
    heroCandidates[0] ||
    editorialSnapshot.safeCatalog?.[0] ||
    safeSeriesList[0] ||
    null;

  const featuredSeriesId = String(featuredSeries?.id || "").trim();
  const breakoutSlotItems = buildSlotSectionItems(
    safeSeriesList,
    homepageSlots,
    "home-breakout",
    6,
  );
  const slotReservedIds = new Set(
    [
      ...buildSlotSectionItems(safeSeriesList, homepageSlots, "home-free-start", 6),
      ...buildSlotSectionItems(safeSeriesList, homepageSlots, "home-binge-ready", 4),
    ]
      .map((series) => String(series?.id || "").trim())
      .filter(Boolean),
  );
  const breakoutCandidates = dedupeSeries(
    [
      ...breakoutSlotItems,
      editorialSnapshot.breakoutPick,
      ...heroCandidates,
      ...safeSeriesList,
    ].filter(Boolean),
  );
  const trendingItems = breakoutCandidates
    .filter((series) => {
      const seriesId = String(series?.id || "").trim();
      return (
        seriesId &&
        seriesId !== featuredSeriesId &&
        !slotReservedIds.has(seriesId)
      );
    })
    .slice(0, 6);

  const assignedSectionIds = new Set(
    [featuredSeriesId, ...trendingItems.map((item) => item.id)]
      .map((value) => String(value || "").trim())
      .filter(Boolean),
  );
  const slotDrivenUpdates = buildSlotSectionItems(
    safeSeriesList,
    homepageSlots,
    "home-free-start",
    6,
  );
  const completedReservedIds = new Set(
    buildSlotSectionItems(safeSeriesList, homepageSlots, "home-binge-ready", 4)
      .map((series) => String(series?.id || "").trim())
      .filter(Boolean),
  );
  const fallbackUpdates = buildSectionItems(
    safeSeriesList,
    "updates",
    assignedSectionIds,
    6,
  );
  const newUpdateItems = dedupeSeries([
    ...slotDrivenUpdates,
    ...fallbackUpdates,
  ])
    .filter((series) => {
      const seriesId = String(series?.id || "").trim();
      return (
        seriesId &&
        !assignedSectionIds.has(seriesId) &&
        !completedReservedIds.has(seriesId)
      );
    })
    .slice(0, 6);
  newUpdateItems.forEach((series) =>
    assignedSectionIds.add(String(series?.id || "").trim()),
  );

  const slotDrivenCompleted = buildSlotSectionItems(
    safeSeriesList,
    homepageSlots,
    "home-binge-ready",
    4,
  );
  const fallbackCompleted = buildSectionItems(
    safeSeriesList,
    "completed",
    assignedSectionIds,
    4,
  );
  const completedItems = dedupeSeries([
    ...slotDrivenCompleted,
    ...fallbackCompleted,
  ])
    .filter((series) => {
      const seriesId = String(series?.id || "").trim();
      return seriesId && !assignedSectionIds.has(seriesId);
    })
    .slice(0, 4);

  return {
    featuredSeries,
    trendingItems,
    newUpdateItems,
    completedItems,
  };
}

function VibeChips({ items, onSelect }) {
  return (
    <section className="space-y-4 rounded-[32px] border border-white/8 bg-[rgba(255,255,255,0.03)] px-4 py-5 shadow-[var(--gush-shadow-panel)] sm:px-6">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[var(--gush-ink-faint)]">
          Mood launcher
        </p>
        <h2 className="font-display text-[1.6rem] font-semibold tracking-[-0.05em] text-[var(--gush-ink-strong)]">
          What are you in the mood for?
        </h2>
      </div>
      <div className="-mx-4 overflow-x-auto px-4 no-scrollbar overscroll-x-contain sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-2.5 pb-1">
          {items.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onSelect(item)}
              className="shrink-0 rounded-full border border-white/10 bg-[rgba(255,255,255,0.04)] px-4 py-2.5 text-sm font-medium text-white shadow-[var(--gush-shadow-soft)] transition-all duration-150 hover:-translate-y-0.5 hover:border-[rgba(255,79,154,0.28)] hover:bg-[rgba(255,79,154,0.12)]"
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function HomeSection({
  title,
  description,
  ctaLabel,
  ctaHref,
  items,
  section = "trending",
}) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  if (section === "updates") {
    return (
      <section className="space-y-4 rounded-[32px] border border-white/8 bg-[rgba(255,255,255,0.03)] px-4 py-5 shadow-[var(--gush-shadow-panel)] sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--gush-ink-faint)]">
              Follow list
            </p>
            <div>
              <h2 className="font-display text-[1.8rem] font-semibold tracking-[-0.05em] text-[var(--gush-ink-strong)]">
                {title}
              </h2>
              {description ? (
                <p className="mt-1 text-sm text-[var(--gush-ink-soft)]">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
          {ctaHref ? (
            <Link
              href={ctaHref}
              className="inline-flex items-center gap-1 text-sm font-medium text-[var(--gush-ink-soft)] transition-colors hover:text-[var(--gush-ink-strong)]"
            >
              {ctaLabel}
              <ArrowRight className="size-4" />
            </Link>
          ) : null}
        </div>

        <div className="space-y-3">
          {items.map((series) => {
            const latestLabel = buildEpisodeSignal(series);
            const readHref = buildReaderHref(
              series.id,
              inferFirstEpisodeId(series),
            );
            return (
              <Link
                key={series.id}
                href={readHref}
                className="group flex items-center gap-3 rounded-[24px] border border-white/8 bg-[rgba(255,255,255,0.03)] p-3 transition-all duration-150 hover:-translate-y-0.5 hover:border-white/14 hover:bg-[rgba(255,255,255,0.05)]"
              >
                <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-[18px] border border-white/10 bg-[var(--gush-card)]">
                  {series?.coverUrl ? (
                    <img
                      src={resolveDisplayImageUrl(series.coverUrl, {
                        kind: "cover",
                        adult: series?.adult || series?.isAdult,
                      })}
                      alt={buildCoverAltText(series)}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="h-full w-full bg-[linear-gradient(180deg,#251f2f,#17131d)]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 font-display text-[1.12rem] font-semibold tracking-[-0.04em] text-white">
                    {series.title}
                  </p>
                  <p className="mt-1 line-clamp-1 text-xs uppercase tracking-[0.16em] text-white/44">
                    {latestLabel || "Latest update"}
                  </p>
                  <p className="mt-2 line-clamp-1 text-sm text-white/62">
                    {buildUpdatedLabel(series)}
                  </p>
                </div>
                <div className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/78 transition-colors group-hover:bg-[rgba(255,79,154,0.14)] group-hover:text-white">
                  {series?.progressPercent ? "Continue" : "Start"}
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--gush-ink-faint)]">
            {section === "completed" ? "Weekend shelf" : "Reader picks"}
          </p>
          <div>
            <h2 className="font-display text-[1.8rem] font-semibold tracking-[-0.05em] text-[var(--gush-ink-strong)]">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-[var(--gush-ink-soft)]">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {ctaHref ? (
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-1 text-sm font-medium text-[var(--gush-ink-soft)] transition-colors hover:text-[var(--gush-ink-strong)]"
          >
            {ctaLabel}
            <ArrowRight className="size-4" />
          </Link>
        ) : null}
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-2 no-scrollbar overscroll-x-contain sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-3 sm:gap-4">
          {items.map((series, index) => {
            const creatorName = resolveSeriesCreatorName(series);
            const formatStatusLine = formatTitleCardFormatStatus(
              series?.type,
              series?.status,
            );
            const genreLine = formatTitleCardGenres(series?.genres, {
              limit: 3,
            });
            const creatorLine = formatTitleCardCreator(creatorName);
            const signal = buildSeriesSignal(series, section);

            return (
              <div
                key={series.id}
                className="w-[72vw] max-w-[280px] shrink-0 sm:w-[240px] lg:w-[280px]"
              >
                <PortraitCard
                  item={{
                    id: series.id,
                    title: series.title,
                    subtitle: "",
                    rank: section === "trending" ? index + 1 : "",
                    hook: buildShortHook(series),
                    genres: Array.isArray(series?.genres) ? series.genres : [],
                    type: series?.type || "",
                    seriesType: series?.type || "",
                    status: series?.status || "",
                    coverUrl: series.coverUrl,
                    coverTone: series.coverTone,
                    badge: "",
                  }}
                  tone={series.coverTone}
                  href={`/series/${encodeURIComponent(series.id)}`}
                  density="compact"
                  actionLabel="View title"
                />
                <div className="mt-2 space-y-1 px-1">
                  {formatStatusLine ? (
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--gush-ink-faint)]">
                      {formatStatusLine}
                    </p>
                  ) : null}
                  {genreLine ? (
                    <p className="line-clamp-2 text-xs text-[var(--gush-ink-soft)]">
                      {genreLine}
                    </p>
                  ) : null}
                  <p className="text-xs text-[var(--gush-ink-faint)]">
                    {signal}
                    {creatorLine ? ` • ${creatorLine}` : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function HomeHero({ featuredSeries, featuredReadHref }) {
  const hasFeaturedSeries = Boolean(featuredSeries);
  const title = String(
    featuredSeries?.title || "Find your next obsession",
  ).trim();
  const creatorName = resolveSeriesCreatorName(featuredSeries);
  const genres = hasFeaturedSeries
    ? getPrimaryGenres(featuredSeries?.genres, 3)
    : ["Comics", "Novels", "Interactive"];
  const summary = hasFeaturedSeries
    ? buildHeroSummary(featuredSeries)
    : "A sharp turn, one bad choice, and the kind of story that keeps the next chapter impossible to ignore.";
  const meta = hasFeaturedSeries
    ? buildSeriesMeta(featuredSeries)
    : "Editorial picks / cover-first / late-night worthy";
  const updatedLabel = hasFeaturedSeries
    ? buildUpdatedLabel(featuredSeries)
    : "Fresh today";
  const primaryHref = hasFeaturedSeries ? featuredReadHref : "/search";
  const secondaryHref = hasFeaturedSeries
    ? `/series/${encodeURIComponent(featuredSeries.id)}`
    : "/library";
  const heroHeading = "Read original comics and novels in one place.";

  return (
    <section className="relative min-h-[78vh] overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(140deg,rgba(19,15,24,0.98)_0%,rgba(14,12,19,0.96)_44%,rgba(20,16,27,0.98)_100%)] p-4 shadow-[var(--gush-shadow-floating)] sm:min-h-[620px] sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(255,79,154,0.18),transparent_26%),radial-gradient(circle_at_82%_20%,rgba(103,232,249,0.14),transparent_24%),radial-gradient(circle_at_50%_0%,rgba(167,139,250,0.12),transparent_30%)]" />
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] lg:items-center">
        <div className="order-2 space-y-5 lg:order-1 lg:max-w-[42rem]">
          <div className="space-y-3">
            <p className="inline-flex rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/62">
              TODAY&apos;S OBSESSION
            </p>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
              {heroHeading}
            </p>
            <h1 className="max-w-[12ch] font-display text-[2.9rem] font-semibold leading-[0.88] tracking-[-0.07em] text-[var(--gush-ink-strong)] sm:text-[4rem] lg:text-[4.6rem]">
              {title}
            </h1>
            <p className="max-w-[34rem] text-[1rem] leading-7 text-[var(--gush-ink-soft)]">
              {summary}
            </p>
          </div>

          {genres.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {genres.map((genre) => (
                <span
                  key={`featured-${genre}`}
                  className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-white/78"
                >
                  {genre}
                </span>
              ))}
            </div>
          ) : null}

          {meta ? (
            <p className="text-sm text-[var(--gush-ink-faint)]">{meta}</p>
          ) : creatorName ? (
            <p className="text-sm text-[var(--gush-ink-faint)]">
              {creatorName}
            </p>
          ) : null}

          <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-[24px] border border-white/8 bg-[rgba(15,13,19,0.72)] p-3 backdrop-blur-xl sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-0 sm:flex-row sm:items-center">
            <Link
              href={primaryHref}
              data-testid="home-hero-primary-cta"
              className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border border-[rgba(255,79,154,0.3)] bg-[linear-gradient(135deg,#ff4f9a_0%,#ff76ad_100%)] px-6 text-sm font-semibold text-[#1a0e16] shadow-[var(--gush-shadow-button)] transition-all duration-150 hover:-translate-y-0.5"
            >
              {hasFeaturedSeries
                ? getStartReadingLabel(featuredSeries, 1) || "Start reading"
                : "Start reading"}
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href={secondaryHref}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-5 text-sm font-medium text-white transition-colors hover:bg-white/[0.08]"
            >
              {hasFeaturedSeries ? "Save Series" : "Save Series"}
              <Plus className="size-4" />
            </Link>
          </div>
        </div>

        <div className="order-1 mx-auto flex w-full max-w-[280px] justify-center lg:order-2 lg:max-w-[340px]">
          <div className="relative w-full max-w-[260px] rotate-[2deg] lg:max-w-[320px]">
            <div className="absolute inset-4 rounded-[32px] bg-[rgba(103,232,249,0.08)] blur-3xl" />
            <div className="absolute inset-2 -rotate-[5deg] rounded-[30px] border border-white/8 bg-[rgba(255,255,255,0.04)]" />
            <div className="absolute inset-3 rotate-[5deg] rounded-[30px] border border-white/8 bg-[rgba(255,79,154,0.06)]" />
            <div className="relative aspect-[3/4] overflow-hidden rounded-[30px] border border-white/12 bg-[rgba(255,255,255,0.08)] shadow-[0_24px_60px_rgba(0,0,0,0.42)]">
              {featuredSeries?.coverUrl ? (
                <img
                  src={resolveDisplayImageUrl(featuredSeries.coverUrl, {
                    kind: "cover",
                    adult: featuredSeries?.adult || featuredSeries?.isAdult,
                  })}
                  alt={buildTypedCoverAltText(featuredSeries)}
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-end bg-[linear-gradient(180deg,#251f2f,#17131d)] p-5">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-white/54">
                      Gush edit
                    </p>
                    <p className="mt-2 font-display text-[2rem] font-semibold leading-[0.9] tracking-[-0.05em] text-white">
                      Read your way in.
                    </p>
                  </div>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/32 via-transparent to-white/10" />
              <div className="absolute bottom-3 left-3 right-3 rounded-full border border-white/12 bg-[rgba(15,13,19,0.74)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/76 backdrop-blur-xl">
                Free start / {updatedLabel} / 8 min read
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HomeContent({ initialSearchParams = {}, initialHomeData = null }) {
  const router = useRouter();
  const { contentMode } = useAdultGateStore();
  const { loading, seriesList, homepageSlots } = useHomeData();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const initialFeaturedSeriesId = String(
    initialHomeData?.canonicalHome?.featuredSeriesId || "",
  ).trim();
  const initialFeaturedReadHref = String(
    initialHomeData?.canonicalHome?.featuredReadHref || "",
  ).trim();
  const [canonicalHomeView, setCanonicalHomeView] = useState(() =>
    createCanonicalHomeView(seriesList, homepageSlots, initialFeaturedSeriesId),
  );
  const [featuredReadHref, setFeaturedReadHref] = useState(() => {
    if (initialFeaturedReadHref) {
      return initialFeaturedReadHref;
    }
    const fallbackFeaturedSeries = createCanonicalHomeView(
      seriesList,
      homepageSlots,
      initialFeaturedSeriesId,
    ).featuredSeries;
    return buildReaderHref(
      fallbackFeaturedSeries?.id,
      inferFirstEpisodeId(fallbackFeaturedSeries),
    );
  });

  useEffect(() => {
    const reason = getSearchParam(initialSearchParams, "reason");
    const openLogin = getSearchParam(initialSearchParams, "openLogin");
    const returnTo = getSearchParam(initialSearchParams, "returnTo", "/");
    if (openLogin === "1") {
      window.sessionStorage.setItem("mn_open_login", "1");
      window.sessionStorage.setItem("mn_return_to", returnTo);
    } else if (reason === "NEED_LOGIN") {
      setShowLoginPrompt(true);
    }
    if (reason === "NEED_LOGIN" || openLogin === "1") {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("reason");
      newUrl.searchParams.delete("returnTo");
      newUrl.searchParams.delete("openLogin");
      router.replace(newUrl.pathname + newUrl.search, { scroll: false });
    }
  }, [initialSearchParams, router]);

  useEffect(() => {
    trackEvent("view_home", {});
  }, []);

  useEffect(() => {
    setCanonicalHomeView(
      createCanonicalHomeView(
        seriesList,
        homepageSlots,
        initialFeaturedSeriesId,
      ),
    );
  }, [homepageSlots, initialFeaturedSeriesId, seriesList]);

  useEffect(() => {
    const featuredSeriesId = String(
      canonicalHomeView.featuredSeries?.id || "",
    ).trim();
    if (!featuredSeriesId) {
      return;
    }

    const inferredHref = buildReaderHref(
      featuredSeriesId,
      inferFirstEpisodeId(canonicalHomeView.featuredSeries),
    );
    if (!featuredReadHref) {
      setFeaturedReadHref(inferredHref);
    }

    if (featuredReadHref.startsWith(`/read/${featuredSeriesId}/`)) {
      return;
    }

    let cancelled = false;
    apiGet(
      `/api/series/${featuredSeriesId}?adult=${getContentModeQueryParam(contentMode)}`,
      { cacheMs: 60000 },
    )
      .then((response) => {
        if (cancelled || !response?.ok) {
          return;
        }
        const episodes = Array.isArray(response.data?.episodes)
          ? response.data.episodes
          : [];
        const firstEpisodeId =
          [...episodes].sort(
            (left, right) =>
              Number(left?.number || 0) - Number(right?.number || 0),
          )[0]?.id || "";
        if (!firstEpisodeId) {
          return;
        }
        setFeaturedReadHref(buildReaderHref(featuredSeriesId, firstEpisodeId));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [canonicalHomeView.featuredSeries, contentMode, featuredReadHref]);

  const { featuredSeries, trendingItems, newUpdateItems, completedItems } =
    canonicalHomeView;

  const handleVibeSelect = (vibe) => {
    const normalized = String(vibe || "")
      .trim()
      .toLowerCase();
    if (normalized === "weekend binge") {
      router.push("/search?status=completed");
      return;
    }
    if (normalized === "quick chaos") {
      router.push("/search?q=quick");
      return;
    }
    const genreMap = {
      heartbreak: "Romance",
      "magic school": "Fantasy",
      "enemies to lovers": "Romance",
      "dark mystery": "Mystery",
      "soft romance": "Romance",
      "power fantasy": "Fantasy",
    };
    const mappedGenre = genreMap[normalized];
    if (mappedGenre) {
      router.push(`/search?genre=${encodeURIComponent(mappedGenre)}`);
      return;
    }
    router.push(`/search?q=${encodeURIComponent(vibe)}`);
  };

  return (
    <div className="gush-home-shell min-h-screen text-[var(--gush-home-ink)]">
      <main className="mx-auto max-w-[1220px] px-4 pb-12 pt-5 sm:px-6 sm:pb-16 sm:pt-7">
        <div className="space-y-6 sm:space-y-8">
          {loading ? (
            <div className="overflow-hidden rounded-[32px] border border-[var(--gush-border)] bg-[var(--gush-home-surface)] p-5 shadow-[var(--gush-shadow-panel)] sm:p-7">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
                <div className="space-y-4">
                  <div className="h-4 w-28 animate-pulse rounded-full bg-[rgba(47,39,64,0.08)]" />
                  <div className="h-16 max-w-[24rem] animate-pulse rounded-[18px] bg-[rgba(47,39,64,0.08)]" />
                  <div className="h-20 max-w-[34rem] animate-pulse rounded-[18px] bg-[rgba(47,39,64,0.06)]" />
                  <div className="h-12 w-44 animate-pulse rounded-full bg-[rgba(244,122,166,0.16)]" />
                </div>
                <div className="mx-auto aspect-[3/4] w-full max-w-[180px] animate-pulse rounded-[24px] bg-[rgba(47,39,64,0.08)]" />
              </div>
            </div>
          ) : (
            <HomeHero
              featuredSeries={featuredSeries}
              featuredReadHref={featuredReadHref}
            />
          )}

          <VibeChips items={VIBE_OPTIONS} onSelect={handleVibeSelect} />

          <HomeSection
            title="Hot this week"
            description="Cover-first picks readers keep opening first."
            ctaLabel="See rankings"
            ctaHref="/rankings"
            items={trendingItems}
            section="trending"
          />
          <HomeSection
            title="Fresh drops"
            description="New chapters, quick catch-ups, and recent returns."
            ctaLabel="Browse all"
            ctaHref="/search?status=ongoing"
            items={newUpdateItems}
            section="updates"
          />
          <HomeSection
            title="Binge this weekend"
            description="Completed stories with no waiting."
            ctaLabel="More finished reads"
            ctaHref="/search?status=completed"
            items={completedItems}
            section="completed"
          />
        </div>

        <LoginPrompt
          isOpen={showLoginPrompt}
          onClose={() => setShowLoginPrompt(false)}
          eyebrow=""
          title="Sign in"
          message=""
          returnTo="/"
          primaryLabel="Sign In"
          secondaryLabel="Create Account"
          showFeatures={false}
        />
      </main>
    </div>
  );
}

export default function HomePage({
  initialSearchParams = {},
  initialHomeData = null,
}) {
  const { contentMode } = useAdultGateStore();
  const initialPayloadMode = String(initialHomeData?.contentMode || "").trim();
  const canReuseInitialHomeData =
    initialHomeData && initialPayloadMode === contentMode;
  const effectiveInitialHomeData = canReuseInitialHomeData
    ? initialHomeData
    : null;

  return (
    <HomeDataProvider
      key={`home-data:${contentMode}:${canReuseInitialHomeData ? "seeded" : "client"}`}
      initialData={effectiveInitialHomeData}
    >
      <HomeContent
        initialSearchParams={initialSearchParams}
        initialHomeData={effectiveInitialHomeData}
      />
    </HomeDataProvider>
  );
}
