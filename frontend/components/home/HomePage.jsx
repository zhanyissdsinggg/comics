"use client";

import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Plus } from "lucide-react";
import { HomeDataProvider, useHomeData } from "./HomeDataProvider";
import PortraitCard from "./PortraitCard";
import { apiGet } from "../../lib/apiClient";
import { trackEvent } from "../../lib/trackEvent";
import { buildHomeHeroItems, getHomeEditorialSnapshot } from "../../lib/homeMerchandising";
import { resolveSeriesCreatorName } from "../../lib/creatorIdentity";
import { normalizeGenreList } from "../../lib/coverPresentation";
import { getSearchParam } from "../../lib/pageSearchParams";
import { filterBlockedPublicSeries } from "../../lib/publicCatalogVisibility";
import {
  getStartReadingLabel,
} from "../../lib/seriesFormatLabels";
import {
  formatTitleCardCreator,
  formatTitleCardFormatStatus,
  formatTitleCardGenres,
} from "../../lib/titleCardText";

const LoginPrompt = dynamic(() => import("../auth/LoginPrompt"), {
  ssr: false,
});

const VIBE_OPTIONS = [
  "Romance",
  "Fantasy",
  "School life",
  "Action",
  "Funny",
  "Dark",
  "Quick read",
  "Binge-worthy",
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
  const raw =
    series?.shortDescription ||
    series?.summary ||
    series?.synopsis ||
    series?.description ||
    "";
  const normalized = String(raw).replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "One standout story for right now.";
  }

  const sentence = normalized.match(/[^.!?]+[.!?]?/u)?.[0]?.trim() || normalized;
  return sentence.length > 108 ? `${sentence.slice(0, 105).trimEnd()}...` : sentence;
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

function buildCoverAltText(series) {
  const title = String(series?.title || "").trim();
  const type = String(series?.type || "").trim().toLowerCase();

  if (title && (type === "comic" || type === "novel")) {
    return `${type.charAt(0).toUpperCase()}${type.slice(1)} cover for ${title}`;
  }

  if (title) {
    return `Cover for ${title}`;
  }

  return "Series cover";
}

function buildSectionItems(seriesList, section, excludedIds = new Set(), limit = 6) {
  const filtered = sanitizeHomepageSeriesList(seriesList).filter((series) => {
    const seriesId = String(series?.id || "").trim();
    return seriesId && !excludedIds.has(seriesId);
  });

  let ranked = filtered;
  if (section === "updates") {
    ranked = [...filtered].sort(
      (left, right) => toTimestamp(right?.updatedAt) - toTimestamp(left?.updatedAt),
    );
  } else if (section === "completed") {
    ranked = filtered.filter(
      (series) => String(series?.status || "").trim().toLowerCase() === "completed",
    );
  }

  return ranked.slice(0, limit);
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
  const normalizedSlotName = String(slotName || "").trim().toLowerCase();
  return (Array.isArray(homepageSlots) ? homepageSlots : []).some(
    (slot) =>
      String(slot?.slot || slot?.name || slot?.id || "")
        .trim()
        .toLowerCase() === normalizedSlotName,
  );
}

function createCanonicalHomeView(seriesList, homepageSlots, preferredFeaturedSeriesId = "") {
  const safeSeriesList = sanitizeHomepageSeriesList(seriesList);
  const editorialSnapshot = getHomeEditorialSnapshot(safeSeriesList, { homepageSlots });
  const canonicalHeroSeriesId = String(preferredFeaturedSeriesId || "").trim();
  const hasExplicitHomeHeroSlot = hasHomepageSlot(homepageSlots, "home-hero");
  const heroCandidates = buildHomeHeroItems(safeSeriesList, { homepageSlots })
    .map((item) =>
      safeSeriesList.find((series) => String(series?.id || "").trim() === String(item?.seriesId || "").trim()),
    )
    .filter(Boolean);

  const featuredSeries =
    safeSeriesList.find((series) => String(series?.id || "").trim() === canonicalHeroSeriesId) ||
    (hasExplicitHomeHeroSlot ? heroCandidates[0] : null) ||
    editorialSnapshot.breakoutPick ||
    editorialSnapshot.freeStartPick ||
    heroCandidates[0] ||
    editorialSnapshot.safeCatalog?.[0] ||
    safeSeriesList[0] ||
    null;

  const trendingSeed = [
    ...heroCandidates,
    editorialSnapshot.breakoutPick,
    ...(Array.isArray(editorialSnapshot.safeCatalog) ? editorialSnapshot.safeCatalog : []),
    ...safeSeriesList,
  ];
  const trendingExcludedIds = new Set([String(featuredSeries?.id || "").trim()].filter(Boolean));
  const trendingItems = buildSectionItems(trendingSeed, "trending", trendingExcludedIds, 6);

  const newUpdatesExcludedIds = new Set(
    [featuredSeries?.id, ...trendingItems.map((item) => item.id)]
      .map((value) => String(value || "").trim())
      .filter(Boolean),
  );
  const newUpdateItems = buildSectionItems(
    safeSeriesList,
    "updates",
    newUpdatesExcludedIds,
    6,
  );

  const completedExcludedIds = new Set(
    [
      featuredSeries?.id,
      ...trendingItems.map((item) => item.id),
      ...newUpdateItems.map((item) => item.id),
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean),
  );
  const completedItems = buildSectionItems(
    safeSeriesList,
    "completed",
    completedExcludedIds,
    4,
  );

  return {
    featuredSeries,
    trendingItems,
    newUpdateItems,
    completedItems,
  };
}

function VibeChips({ items, onSelect }) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--gush-ink-faint)]">
          Choose your vibe
        </p>
        <h2 className="text-[1.35rem] font-semibold tracking-[-0.04em] text-[var(--gush-ink-strong)]">
          Pick a mood. Keep it moving.
        </h2>
      </div>
      <div className="-mx-4 overflow-x-auto px-4 no-scrollbar overscroll-x-contain sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-2.5 pb-1">
          {items.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onSelect(item)}
              className="shrink-0 rounded-full border border-[var(--gush-border)] bg-[var(--gush-surface-strong)] px-4 py-2.5 text-sm font-medium text-[var(--gush-ink)] shadow-[var(--gush-shadow-soft)] transition-all duration-150 hover:-translate-y-0.5 hover:border-[rgba(244,122,166,0.28)] hover:bg-[var(--gush-surface-accent)]"
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

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--gush-ink-faint)]">
            Shelf
          </p>
          <div>
            <h2 className="text-[1.45rem] font-semibold tracking-[-0.05em] text-[var(--gush-ink-strong)]">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-[var(--gush-ink-soft)]">{description}</p>
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
          {items.map((series) => {
            const creatorName = resolveSeriesCreatorName(series);
            const formatStatusLine = formatTitleCardFormatStatus(
              series?.type,
              series?.status,
            );
            const genreLine = formatTitleCardGenres(series?.genres, { limit: 3 });
            const creatorLine = formatTitleCardCreator(creatorName);
            const signal = buildSeriesSignal(series, section);

            return (
              <div
                key={series.id}
                className="w-[156px] shrink-0 sm:w-[188px] lg:w-[208px]"
              >
                <PortraitCard
                  item={{
                    id: series.id,
                    title: series.title,
                    subtitle: "",
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
                  actionLabel="Start reading"
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
  if (!featuredSeries) {
    return null;
  }

  const title = String(featuredSeries?.title || "Featured").trim();
  const creatorName = resolveSeriesCreatorName(featuredSeries);
  const genres = getPrimaryGenres(featuredSeries?.genres, 3);
  const summary = buildHeroSummary(featuredSeries);
  const meta = buildSeriesMeta(featuredSeries);

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-[rgba(244,122,166,0.18)] bg-[linear-gradient(135deg,rgba(255,247,244,0.98)_0%,rgba(255,239,246,0.92)_42%,rgba(240,248,250,0.94)_100%)] p-4 shadow-[var(--gush-shadow-floating)] sm:p-6 lg:p-7">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(123,230,243,0.24),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(244,122,166,0.18),transparent_28%),radial-gradient(circle_at_50%_50%,rgba(188,166,255,0.12),transparent_34%)]" />
      <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_178px] lg:items-center xl:grid-cols-[minmax(0,1fr)_220px]">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="inline-flex rounded-full border border-[rgba(244,122,166,0.18)] bg-white/65 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--gush-ink-faint)]">
              Today’s Pick
            </p>
            <h1 className="max-w-[12ch] text-[2.25rem] font-semibold leading-[0.92] tracking-[-0.06em] text-[var(--gush-ink-strong)] sm:text-[2.8rem]">
              {title}
            </h1>
            <p className="max-w-[34rem] text-[0.98rem] leading-7 text-[var(--gush-ink-soft)]">
              {summary}
            </p>
          </div>

          {genres.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {genres.map((genre) => (
                <span
                  key={`featured-${genre}`}
                  className="rounded-full border border-[rgba(47,39,64,0.1)] bg-white/72 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--gush-ink)]"
                >
                  {genre}
                </span>
              ))}
            </div>
          ) : null}

          {meta ? (
            <p className="text-sm text-[var(--gush-ink-faint)]">{meta}</p>
          ) : creatorName ? (
            <p className="text-sm text-[var(--gush-ink-faint)]">{creatorName}</p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={featuredReadHref}
              data-testid="home-hero-primary-cta"
              className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border border-[rgba(244,122,166,0.24)] bg-[linear-gradient(135deg,#f47aa6_0%,#ff98bd_100%)] px-6 text-sm font-semibold text-[#23111d] shadow-[var(--gush-shadow-button)] transition-all duration-150 hover:-translate-y-0.5"
            >
              {getStartReadingLabel(featuredSeries, 1) || "Start reading"}
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href={`/series/${encodeURIComponent(featuredSeries.id)}`}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-[var(--gush-border)] bg-white/72 px-5 text-sm font-medium text-[var(--gush-ink)] transition-colors hover:bg-white"
            >
              Add to Library
              <Plus className="size-4" />
            </Link>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[178px] lg:max-w-[220px]">
          <div className="relative aspect-[3/4] overflow-hidden rounded-[26px] border border-white/50 bg-[rgba(255,255,255,0.7)] shadow-[0_18px_44px_rgba(82,63,108,0.22)]">
            {featuredSeries?.coverUrl ? (
              <Image
                src={featuredSeries.coverUrl}
                alt={buildCoverAltText(featuredSeries)}
                fill
                sizes="(max-width: 1024px) 178px, 220px"
                className="object-cover"
                priority
              />
            ) : (
              <div className="h-full w-full bg-[linear-gradient(180deg,#f6dce9,#dbeef4)]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#1a1424]/18 via-transparent to-white/20" />
          </div>
          <p className="mt-3 text-center text-xs text-[var(--gush-ink-faint)]">
            {Array.isArray(featuredSeries?.genres) && featuredSeries.genres.length > 0
              ? featuredSeries.genres.slice(0, 2).join(" • ")
              : buildUpdatedLabel(featuredSeries)}
          </p>
        </div>
      </div>
    </section>
  );
}

function HomeContent({ initialSearchParams = {}, initialHomeData = null }) {
  const router = useRouter();
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
      createCanonicalHomeView(seriesList, homepageSlots, initialFeaturedSeriesId),
    );
  }, [homepageSlots, initialFeaturedSeriesId, seriesList]);

  useEffect(() => {
    const featuredSeriesId = String(canonicalHomeView.featuredSeries?.id || "").trim();
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
    apiGet(`/api/series/${featuredSeriesId}?adult=0`, { cacheMs: 60000 })
      .then((response) => {
        if (cancelled || !response?.ok) {
          return;
        }
        const episodes = Array.isArray(response.data?.episodes) ? response.data.episodes : [];
        const firstEpisodeId =
          [...episodes].sort(
            (left, right) => Number(left?.number || 0) - Number(right?.number || 0),
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
  }, [canonicalHomeView.featuredSeries, featuredReadHref]);

  const { featuredSeries, trendingItems, newUpdateItems, completedItems } = canonicalHomeView;
  const editorialSnapshot = useMemo(
    () => getHomeEditorialSnapshot(seriesList, { homepageSlots }),
    [homepageSlots, seriesList],
  );

  const handleVibeSelect = (vibe) => {
    const normalized = String(vibe || "").trim().toLowerCase();
    if (normalized === "quick read") {
      router.push("/search?status=ongoing");
      return;
    }
    if (normalized === "binge-worthy") {
      router.push("/search?status=completed");
      return;
    }
    router.push(`/search?genre=${encodeURIComponent(vibe)}`);
  };

  return (
    <div className="min-h-screen bg-[var(--gush-home-bg)] text-[var(--gush-home-ink)]">
      <main className="mx-auto max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 sm:pb-16 sm:pt-7">
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

          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[24px] border border-[var(--gush-border)] bg-[var(--gush-home-surface-strong)] px-4 py-4 shadow-[var(--gush-shadow-soft)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--gush-ink-faint)]">
                Live now
              </p>
              <p className="mt-2 text-[1.55rem] font-semibold tracking-[-0.04em] text-[var(--gush-ink-strong)]">
                {editorialSnapshot.seriesCount.toLocaleString()}
              </p>
              <p className="mt-1 text-sm text-[var(--gush-ink-soft)]">
                Comics and novels in one feed.
              </p>
            </div>
            <div className="rounded-[24px] border border-[var(--gush-border)] bg-[var(--gush-home-surface-strong)] px-4 py-4 shadow-[var(--gush-shadow-soft)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--gush-ink-faint)]">
                Fresh drops
              </p>
              <p className="mt-2 text-[1.55rem] font-semibold tracking-[-0.04em] text-[var(--gush-ink-strong)]">
                {editorialSnapshot.newCount.toLocaleString()}
              </p>
              <p className="mt-1 text-sm text-[var(--gush-ink-soft)]">
                Recently updated stories worth checking first.
              </p>
            </div>
            <div className="rounded-[24px] border border-[var(--gush-border)] bg-[var(--gush-home-surface-strong)] px-4 py-4 shadow-[var(--gush-shadow-soft)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--gush-ink-faint)]">
                Genre mix
              </p>
              <p className="mt-2 text-[1.55rem] font-semibold tracking-[-0.04em] text-[var(--gush-ink-strong)]">
                {editorialSnapshot.genreCount.toLocaleString()}
              </p>
              <p className="mt-1 text-sm text-[var(--gush-ink-soft)]">
                Romance, school life, fantasy, thriller, and more.
              </p>
            </div>
          </section>

          <VibeChips items={VIBE_OPTIONS} onSelect={handleVibeSelect} />

          <HomeSection
            title="Hot this week"
            description="The stories readers are opening first."
            ctaLabel="See all"
            ctaHref="/rankings"
            items={trendingItems}
            section="trending"
          />
          <HomeSection
            title="Fresh drops"
            description="Recent updates, quick returns, and new chapter energy."
            ctaLabel="Browse all"
            ctaHref="/search?status=ongoing"
            items={newUpdateItems}
            section="updates"
          />
          <HomeSection
            title="Binge-ready"
            description="Completed stories when you want the full run."
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
  return (
    <HomeDataProvider initialData={initialHomeData}>
      <HomeContent
        initialSearchParams={initialSearchParams}
        initialHomeData={initialHomeData}
      />
    </HomeDataProvider>
  );
}
