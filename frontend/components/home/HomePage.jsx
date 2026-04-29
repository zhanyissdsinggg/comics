"use client";

import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { HomeDataProvider, useHomeData } from "./HomeDataProvider";
import { apiGet } from "../../lib/apiClient";
import { trackEvent } from "../../lib/trackEvent";
import { buildHomeHeroItems, getHomeEditorialSnapshot } from "../../lib/homeMerchandising";
import { resolveSeriesCreatorName } from "../../lib/creatorIdentity";
import { normalizeGenreList } from "../../lib/coverPresentation";
import { getSearchParam } from "../../lib/pageSearchParams";
import { filterBlockedPublicSeries } from "../../lib/publicCatalogVisibility";
import {
  formatInstallmentCount,
  getStartReadingLabel,
} from "../../lib/seriesFormatLabels";
import { cn } from "@/lib/utils";

const LoginPrompt = dynamic(() => import("../auth/LoginPrompt"), {
  ssr: false,
});

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
    return "A good place to start when you want one story worth opening right now.";
  }

  const sentence = normalized.match(/[^.!?]+[.!?]?/u)?.[0]?.trim() || normalized;
  return sentence.length > 110 ? `${sentence.slice(0, 107).trimEnd()}...` : sentence;
}

function getPrimaryGenres(genres, limit = 3) {
  return normalizeGenreList(genres).slice(0, limit);
}

function buildSeriesMeta(series) {
  const creatorName = resolveSeriesCreatorName(series);
  const typeLabel = String(series?.type || "")
    .trim()
    .toLowerCase();
  const episodeCount = Math.max(0, Number(series?.episodeCount || 0));
  const statusLabel = String(series?.status || "").trim();

  return [
    creatorName,
    typeLabel ? `${typeLabel.charAt(0).toUpperCase()}${typeLabel.slice(1)}` : "",
    episodeCount > 0 ? formatInstallmentCount(series, episodeCount) : "",
    statusLabel,
  ]
    .filter(Boolean)
    .join(" / ");
}

function buildUpdatedLabel(series) {
  const updatedAtMs = toTimestamp(series?.updatedAt);
  if (!updatedAtMs) {
    return "New release";
  }

  if (updatedAtMs >= Date.now() - 24 * 60 * 60 * 1000) {
    return "Updated Today";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(updatedAtMs));
}

function buildSeriesCardLabel(series, section) {
  if (section === "completed") {
    return "Finished Series";
  }

  if (section === "updates") {
    return buildUpdatedLabel(series);
  }

  const genres = getPrimaryGenres(series?.genres, 1);
  return genres[0] || "Trending";
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

  const sectionGridClass =
    section === "completed"
      ? "grid-cols-2 md:grid-cols-4"
      : "grid-cols-2 md:grid-cols-3";

  return (
    <section className="border-t border-white/10 py-8 sm:py-10">
      <div className="mb-5 flex items-end justify-between gap-4 sm:mb-6">
        <div className="space-y-1.5">
          <h2 className="text-[1.35rem] font-semibold tracking-[-0.03em] text-white sm:text-[1.55rem]">
            {title}
          </h2>
          {description ? (
            <p className="max-w-[30rem] text-sm leading-6 text-white/60">
              {description}
            </p>
          ) : null}
        </div>
        {ctaHref ? (
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70 transition-colors hover:text-white"
          >
            {ctaLabel}
            <ArrowRight className="size-4" />
          </Link>
        ) : null}
      </div>

      <div className={cn("grid gap-3 sm:gap-4", sectionGridClass)}>
        {items.map((series) => {
          const title = String(series?.title || "Story").trim();
          const creatorName = resolveSeriesCreatorName(series);
          const meta = buildSeriesMeta(series);
          const chips = getPrimaryGenres(series?.genres, 2);
          const label = buildSeriesCardLabel(series, section);

          return (
            <Link
              key={series.id}
              href={`/series/${encodeURIComponent(series.id)}`}
              className="group overflow-hidden rounded-[22px] border border-white/10 bg-[#111111] text-left transition-all duration-200 hover:border-white/18 hover:bg-[#171717]"
            >
              <div className="relative aspect-[3/4] overflow-hidden bg-[#0b0b0b]">
                {series?.coverUrl ? (
                  <Image
                    src={series.coverUrl}
                    alt={buildCoverAltText(series)}
                    fill
                    sizes="(max-width: 768px) 45vw, 240px"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="h-full w-full bg-[linear-gradient(180deg,#171717,#0b0b0b)]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                <div className="absolute left-3 top-3 rounded-full border border-white/12 bg-black/70 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-white/82 backdrop-blur">
                  {label}
                </div>
              </div>

              <div className="space-y-2 p-3 sm:p-4">
                <div className="space-y-1">
                  <p className="line-clamp-2 text-[0.98rem] font-semibold leading-5 tracking-[-0.02em] text-white sm:text-[1.04rem]">
                    {title}
                  </p>
                  {creatorName ? (
                    <p className="line-clamp-1 text-xs text-white/55">
                      {creatorName}
                    </p>
                  ) : null}
                </div>

                {chips.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {chips.map((chip) => (
                      <span
                        key={`${series.id}-${chip}`}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-white/68"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                ) : null}

                {meta ? (
                  <p className="line-clamp-1 text-xs text-white/45">{meta}</p>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function HomeHero({ featuredSeries, featuredReadHref }) {
  if (!featuredSeries) {
    return (
      <section className="border-b border-white/10 bg-[#0b0b0b]">
        <div className="mx-auto max-w-[1180px] px-4 py-10 sm:px-6 sm:py-14">
          <div className="rounded-[28px] border border-white/10 bg-[#111111] p-6 sm:p-8">
            <p className="text-sm text-white/65">Nothing featured yet.</p>
          </div>
        </div>
      </section>
    );
  }

  const title = String(featuredSeries?.title || "Featured").trim();
  const creatorName = resolveSeriesCreatorName(featuredSeries);
  const genres = getPrimaryGenres(featuredSeries?.genres, 3);
  const summary = buildHeroSummary(featuredSeries);
  const meta = buildSeriesMeta(featuredSeries);

  return (
    <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top,#1a1a1a_0%,#0b0b0b_55%,#050505_100%)]">
      <div className="mx-auto grid max-w-[1180px] gap-6 px-4 py-6 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center lg:gap-10">
        <div className="order-2 space-y-5 lg:order-1 lg:space-y-6">
          <div className="space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
              Featured
            </p>
            <h1 className="max-w-[11ch] text-[2rem] font-semibold leading-[1.02] tracking-[-0.05em] text-white sm:text-[2.75rem] lg:text-[3.5rem]">
              {title}
            </h1>
            <p className="max-w-[34rem] text-[0.96rem] leading-7 text-white/68 sm:text-[1rem]">
              {summary}
            </p>
          </div>

          {genres.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {genres.map((genre) => (
                <span
                  key={`featured-${genre}`}
                  className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-white/82"
                >
                  {genre}
                </span>
              ))}
            </div>
          ) : null}

          {meta ? (
            <p className="text-sm text-white/45">{meta}</p>
          ) : creatorName ? (
            <p className="text-sm text-white/45">{creatorName}</p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={featuredReadHref}
              data-testid="home-hero-primary-cta"
              className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-black transition-transform duration-150 hover:scale-[1.01]"
            >
              {getStartReadingLabel(featuredSeries, 1)} Free
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/comics"
              className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-white/14 bg-white/[0.03] px-5 text-sm font-medium text-white/78 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              Browse Comics
            </Link>
          </div>
        </div>

        <div className="order-1 mx-auto w-full max-w-[260px] lg:order-2 lg:max-w-[320px]">
          <div className="relative aspect-[3/4] overflow-hidden rounded-[26px] border border-white/12 bg-[#111111] shadow-[0_20px_70px_rgba(0,0,0,0.45)]">
            {featuredSeries?.coverUrl ? (
              <Image
                src={featuredSeries.coverUrl}
                alt={buildCoverAltText(featuredSeries)}
                fill
                sizes="(max-width: 1024px) 260px, 320px"
                className="object-cover"
                priority
              />
            ) : (
              <div className="h-full w-full bg-[linear-gradient(180deg,#181818,#0b0b0b)]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/10 to-transparent" />
          </div>
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
    if (canonicalHomeView.featuredSeries || !seriesList.length) {
      return;
    }

    setCanonicalHomeView(
      createCanonicalHomeView(seriesList, homepageSlots, initialFeaturedSeriesId),
    );
  }, [
    canonicalHomeView.featuredSeries,
    homepageSlots,
    initialFeaturedSeriesId,
    seriesList,
  ]);

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

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <main>
        {loading ? (
          <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 sm:py-10">
            <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#111111] p-5 sm:p-7">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
                <div className="space-y-4">
                  <div className="h-4 w-20 animate-pulse rounded-full bg-white/10" />
                  <div className="h-16 max-w-[24rem] animate-pulse rounded-[18px] bg-white/10" />
                  <div className="h-20 max-w-[34rem] animate-pulse rounded-[18px] bg-white/[0.06]" />
                  <div className="h-12 w-44 animate-pulse rounded-full bg-white/10" />
                </div>
                <div className="mx-auto aspect-[3/4] w-full max-w-[260px] animate-pulse rounded-[24px] bg-white/[0.06]" />
              </div>
            </div>
          </div>
        ) : (
          <HomeHero
            featuredSeries={featuredSeries}
            featuredReadHref={featuredReadHref}
          />
        )}

        <div className="mx-auto max-w-[1180px] px-4 pb-10 pt-2 sm:px-6 sm:pb-14 sm:pt-4">
          <HomeSection
            title="Trending now"
            description="Start here if you want the stories people are opening first."
            ctaLabel="See all"
            ctaHref="/rankings"
            items={trendingItems}
            section="trending"
          />
          <HomeSection
            title="New updates"
            description="Fresh updates and recent drops."
            ctaLabel="Browse all"
            ctaHref="/search?sort=updated"
            items={newUpdateItems}
            section="updates"
          />
          <HomeSection
            title="Completed reads"
            description="Finished stories when you want a full binge."
            ctaLabel="More finished series"
            ctaHref="/search?status=Completed&sort=popular"
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
