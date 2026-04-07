/**
 * Home page shell focused on fast story discovery for mobile-first storefront traffic.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { HomeDataProvider, useHomeData } from "./HomeDataProvider";
import { useHistoryStore } from "../../store/useHistoryStore";
import { useProgressStore } from "../../store/useProgressStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useBrandingStore } from "../../store/useBrandingStore";
import { trackEvent } from "../../lib/trackEvent";
import {
  consumeCommerceSuccessForPath,
  getCommerceSuccessPresentation,
} from "../../lib/commerceSuccess";
import { buildPathWithAttribution } from "../../lib/paymentAttribution";
import {
  buildHomeHeroItems,
  getHomeEditorialSnapshot,
} from "../../lib/homeMerchandising";
import { resolveSeriesCreatorName } from "../../lib/creatorIdentity";
import { normalizeGenreList } from "../../lib/coverPresentation";
import { getSearchParam } from "../../lib/pageSearchParams";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const LoginPrompt = dynamic(() => import("../auth/LoginPrompt"), { ssr: false });
const CommerceSuccessBanner = dynamic(() => import("../common/CommerceSuccessBanner"));
const SiteHeader = dynamic(() => import("../layout/SiteHeader"), {
  ssr: false,
  loading: () => (
    <div className="sticky top-0 z-40 border-b border-white/6 bg-[rgba(8,12,18,0.56)] backdrop-blur-xl">
      <div className="mx-auto flex min-h-[58px] max-w-[1320px] items-center justify-between gap-3 px-3 py-2 sm:min-h-[64px] sm:px-6 sm:py-2.5 lg:px-8">
        <div className="h-10 w-28 rounded-full border border-white/10 bg-white/[0.05] shadow-[0_16px_32px_rgba(0,0,0,0.18)]" />
        <div className="hidden h-10 flex-1 rounded-full border border-white/8 bg-white/[0.04] md:block" />
        <div className="h-10 w-24 rounded-full border border-white/10 bg-white/[0.05] shadow-[0_16px_32px_rgba(0,0,0,0.18)]" />
      </div>
    </div>
  ),
});
const SiteFooter = dynamic(() => import("../layout/SiteFooter"), {
  ssr: false,
  loading: () => <div className="h-24" aria-hidden="true" />,
});
const HomeContentSections = dynamic(() => import("./HomeContentSections"), {
  ssr: false,
  loading: () => (
    <div className="space-y-8 md:space-y-10">
      <div className="h-56 rounded-[28px] bg-white/80 shadow-[0_18px_40px_rgba(15,23,42,0.05)]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`home-section-skeleton-${index}`}
            className="h-72 rounded-[26px] bg-white/78 shadow-[0_18px_40px_rgba(15,23,42,0.05)]"
          />
        ))}
      </div>
    </div>
  ),
});

function toTimestamp(value) {
  const parsed = typeof value === "number" ? value : Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatEpisodeLabel(value) {
  const match = String(value || "").match(/(\d+)(?!.*\d)/);
  return match ? `Episode ${match[1]}` : "Episode";
}

function formatPercent(value) {
  const numeric = Number(value);
  return !Number.isFinite(numeric) || numeric <= 0
    ? "0%"
    : `${Math.round((numeric <= 1 ? numeric : numeric / 100) * 100)}%`;
}

function clampText(value, limit = 180) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  if (text.length <= limit) {
    return text;
  }
  return `${text.slice(0, limit).trimEnd()}...`;
}

function getReadingState(series) {
  const completed = String(series?.status || "").toLowerCase() === "completed";
  return completed ? "Completed" : "";
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

function getPrimaryGenres(genres, limit = 2) {
  return normalizeGenreList(genres).slice(0, limit);
}

function formatDisplayLabel(value) {
  const normalized = String(value || "")
    .replace(/[_-]+/g, " ")
    .trim();

  if (!normalized) {
    return "";
  }

  return normalized
    .split(/\s+/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");
}

function buildHeroCoverAltText(series) {
  const title = String(series?.title || "").replace(/\s+/g, " ").trim();
  const seriesType = String(series?.type || series?.seriesType || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  if (title && (seriesType === "comic" || seriesType === "novel")) {
    return `${seriesType.charAt(0).toUpperCase()}${seriesType.slice(1)} cover image for ${title}`;
  }

  if (title) {
    return `Cover image for ${title}`;
  }

  if (seriesType === "comic" || seriesType === "novel") {
    return `${seriesType.charAt(0).toUpperCase()}${seriesType.slice(1)} cover image`;
  }

  return "Series cover image";
}

function buildSeriesMetaLabel(series, creatorName) {
  return [creatorName, formatDisplayLabel(series?.type || series?.seriesType || ""), getReadingState(series)]
    .filter(Boolean)
    .join(" · ");
}

function buildHomeShelfItem(series) {
  if (!series?.id) {
    return null;
  }

  const creatorName = resolveSeriesCreatorName(series);

  return {
    id: series.id,
    title: series.title,
    coverUrl: series.coverUrl,
    coverTone: series.coverTone,
    genres: getPrimaryGenres(series?.genres, 1),
    type: series?.type || "",
    seriesType: series?.type || "",
    status: series?.status || "",
    author: creatorName,
    adult: Boolean(series?.adult),
    subtitle: "",
    eyebrow: creatorName,
    statusLabel: "",
    metaLabel: buildSeriesMetaLabel(series, creatorName),
    badge: "",
  };
}

function HeroCoverPreview({ series, eyebrow }) {
  const coverUrl = String(series?.coverUrl || "").trim();
  const badgeLabel = eyebrow || "Featured";
  const coverAltText = buildHeroCoverAltText(series);

  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[24px] border border-black/6 bg-neutral-900">
      {coverUrl ? (
        <img
          src={coverUrl}
          alt={coverAltText}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div
          className="absolute inset-0 bg-[linear-gradient(135deg,rgba(17,24,39,0.92),rgba(49,87,214,0.38),rgba(245,158,11,0.18))]"
          role="img"
          aria-label={coverAltText}
        />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,15,28,0.16),rgba(10,15,28,0.62))]" />
      <div className="absolute left-3 top-3 rounded-full border border-white/16 bg-[rgba(12,18,30,0.46)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/90 backdrop-blur-sm">
        {badgeLabel}
      </div>
      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
        <p className="line-clamp-2 font-display text-lg font-semibold tracking-tight">
          {series?.title || "Story"}
        </p>
      </div>
    </div>
  );
}

function HomeQuickPickCard({ item, eyebrow, onClick }) {
  const coverUrl = String(item?.coverUrl || "").trim();
  const coverAltText = buildHeroCoverAltText(item);
  const metaLine = item?.metaLabel || item?.author || item?.eyebrow || "";

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.04)] p-3 text-left transition-all duration-300 hover:border-white/16 hover:bg-[rgba(255,255,255,0.07)]"
    >
      <div className="relative aspect-[3/4] w-[72px] shrink-0 overflow-hidden rounded-[18px] border border-white/10 bg-neutral-900">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={coverAltText}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div
            className="absolute inset-0 bg-[linear-gradient(135deg,rgba(11,17,30,0.96),rgba(73,96,171,0.48),rgba(244,201,138,0.22))]"
            role="img"
            aria-label={coverAltText}
          />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,12,18,0.04),rgba(8,12,18,0.54))]" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/42">
          {eyebrow}
        </p>
        <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-white">
          {item?.title || "Story"}
        </p>
        {metaLine ? (
          <p className="mt-1 line-clamp-1 text-xs text-white/56">{metaLine}</p>
        ) : null}
      </div>

      <ArrowRight className="size-4 shrink-0 text-white/46 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-white/82" />
    </button>
  );
}

function HomeContent({ initialSearchParams = {} }) {
  const router = useRouter();
  const { items: historyItems, loadHistory } = useHistoryStore();
  const { bySeriesId: progressMap, loadProgress } = useProgressStore();
  const { isSignedIn } = useAuthStore();
  const { branding } = useBrandingStore();
  const { loading, seriesList, homepageSlots } = useHomeData();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [commerceNotice, setCommerceNotice] = useState(null);

  useEffect(() => {
    if (isSignedIn) {
      loadHistory();
      loadProgress();
    }
  }, [isSignedIn, loadHistory, loadProgress]);

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
    setCommerceNotice(getCommerceSuccessPresentation(consumeCommerceSuccessForPath("/")));
  }, []);

  const heroItems = useMemo(
    () => buildHomeHeroItems(seriesList, { bannerUrl: branding?.homeBannerUrl, homepageSlots }),
    [branding?.homeBannerUrl, homepageSlots, seriesList],
  );

  const editorialSnapshot = useMemo(
    () => getHomeEditorialSnapshot(seriesList, { homepageSlots }),
    [homepageSlots, seriesList],
  );

  const seriesById = useMemo(
    () => new Map(seriesList.map((series) => [series.id, series])),
    [seriesList],
  );

  const featuredHero = heroItems[0] || null;
  const featuredSeries =
    (featuredHero?.seriesId ? seriesById.get(featuredHero.seriesId) : null) ||
    editorialSnapshot.breakoutPick ||
    editorialSnapshot.freeStartPick ||
    editorialSnapshot.completedPick ||
    seriesList[0] ||
    null;

  const featuredBannerUrl =
    featuredHero?.bannerUrl || branding?.homeBannerUrl || featuredSeries?.bannerUrl || null;

  const progressEntries = useMemo(
    () =>
      Object.entries(progressMap || {}).sort(
        ([, left], [, right]) => toTimestamp(right?.updatedAt) - toTimestamp(left?.updatedAt),
      ),
    [progressMap],
  );

  const continueItems = useMemo(
    () =>
      progressEntries
        .map(([seriesId, progress]) => {
          const series = seriesById.get(seriesId);
          return !series || !progress?.lastEpisodeId
            ? null
            : {
                seriesId,
                episodeId: progress.lastEpisodeId,
                progressPercent: Number(progress.percent || 0),
              };
        })
        .filter(Boolean),
    [progressEntries, seriesById],
  );

  const recentHistoryItems = useMemo(
    () =>
      (Array.isArray(historyItems) ? historyItems : [])
        .map((entry) => {
          const series = seriesById.get(entry?.seriesId);
          return !series || !entry?.episodeId
            ? null
            : {
                seriesId: entry.seriesId,
                episodeId: entry.episodeId,
                updatedAt: toTimestamp(entry.createdAt),
              };
        })
        .filter(Boolean)
        .sort((left, right) => right.updatedAt - left.updatedAt),
    [historyItems, seriesById],
  );

  const resumeSpotlight = continueItems[0] || recentHistoryItems[0] || null;
  const resumeSeries = resumeSpotlight ? seriesById.get(resumeSpotlight.seriesId) || null : null;
  const heroSeries = resumeSeries || featuredSeries || null;
  const heroGenrePills = useMemo(() => getPrimaryGenres(heroSeries?.genres, 2), [heroSeries?.genres]);
  const heroCreatorName = useMemo(
    () => (heroSeries ? resolveSeriesCreatorName(heroSeries) : ""),
    [heroSeries],
  );
  const heroMetaLine = useMemo(
    () => buildSeriesMetaLabel(heroSeries, heroCreatorName),
    [heroCreatorName, heroSeries],
  );

  const heroSignals = useMemo(() => {
    if (!heroSeries) {
      return [];
    }

    const signals = [];

    if (resumeSpotlight?.episodeId) {
      signals.push({
        id: `episode-${resumeSpotlight.episodeId}`,
        content: `${formatEpisodeLabel(resumeSpotlight.episodeId)}${
          resumeSpotlight.progressPercent > 0
            ? ` / ${formatPercent(resumeSpotlight.progressPercent)} complete`
            : ""
        }`,
      });
    }

    const stateLabel = getReadingState(heroSeries);
    if (stateLabel) {
      signals.push({
        id: `state-${String(heroSeries.status || "default").toLowerCase()}`,
        content: stateLabel,
      });
    }

    return signals.filter(Boolean).slice(0, 3);
  }, [heroSeries, resumeSpotlight]);

  const featuredSeriesItems = useMemo(
    () =>
      dedupeSeries([
        editorialSnapshot.breakoutPick,
        editorialSnapshot.completedPick,
        ...editorialSnapshot.safeCatalog,
      ])
        .filter((series) => String(series?.id || "").trim() !== String(heroSeries?.id || "").trim())
        .slice(0, 4)
        .map((series) => buildHomeShelfItem(series))
        .filter(Boolean),
    [editorialSnapshot, heroSeries?.id],
  );

  const startHereItems = useMemo(
    () =>
      dedupeSeries([
        editorialSnapshot.freeStartPick,
        ...(Array.isArray(editorialSnapshot.startHereSeries)
          ? editorialSnapshot.startHereSeries
          : []),
      ])
        .filter((series) => String(series?.id || "").trim() !== String(heroSeries?.id || "").trim())
        .slice(0, 4)
        .map((series) => buildHomeShelfItem(series))
        .filter(Boolean),
    [editorialSnapshot, heroSeries?.id],
  );

  const heroRailItems = useMemo(() => {
    const seen = new Set();
    return [...featuredSeriesItems, ...startHereItems].filter((item) => {
      const itemId = String(item?.id || "").trim();
      if (!itemId || itemId === String(heroSeries?.id || "").trim() || seen.has(itemId)) {
        return false;
      }
      seen.add(itemId);
      return true;
    }).slice(0, 3);
  }, [featuredSeriesItems, heroSeries?.id, startHereItems]);

  const heroMetrics = useMemo(
    () => [
      {
        id: "series",
        label: "Series",
        value: Number(editorialSnapshot?.seriesCount || 0).toLocaleString(),
      },
      {
        id: "genres",
        label: "Genres",
        value: Number(editorialSnapshot?.genreCount || 0).toLocaleString(),
      },
      {
        id: "completed",
        label: "Finished",
        value: Number(editorialSnapshot?.completedSeriesCount || 0).toLocaleString(),
      },
    ],
    [editorialSnapshot?.completedSeriesCount, editorialSnapshot?.genreCount, editorialSnapshot?.seriesCount],
  );

  const showCatalogFallback = !loading && !featuredSeries;

  const homepageFallbackCards = useMemo(
    () => [
      {
        id: "featured-series",
        title: "Featured Series",
        label: "Browse Series",
        href: "/search",
      },
      {
        id: "browse-comics",
        title: "Comics and Novels",
        label: "Browse Comics",
        href: "/comics",
      },
    ],
    [],
  );

  const openHomeSeries = (seriesId, entryPoint, campaignId) => {
    if (!seriesId) {
      return;
    }

    const targetPath = `/series/${seriesId}`;
    router.push(
      buildPathWithAttribution(targetPath, {
        entryPoint,
        campaignId,
        sourcePath: "/",
        sourceSeriesId: seriesId,
        returnTo: targetPath,
      }),
    );
  };

  const goResume = () => {
    if (!resumeSpotlight?.seriesId) {
      router.push("/library");
      return;
    }

    const targetPath = resumeSpotlight.episodeId
      ? `/read/${resumeSpotlight.seriesId}/${resumeSpotlight.episodeId}`
      : `/series/${resumeSpotlight.seriesId}`;

    router.push(
      buildPathWithAttribution(targetPath, {
        entryPoint: "HOME_RETURN_LANE",
        campaignId: "resume_spotlight",
        sourcePath: "/",
        sourceSeriesId: resumeSpotlight.seriesId,
        sourceEpisodeId: resumeSpotlight.episodeId || undefined,
        returnTo: targetPath,
      }),
    );
  };

  const openHeroCardCta = () => {
    if (!heroSeries?.id) {
      return;
    }

    if (resumeSeries) {
      goResume();
      return;
    }

    openHomeSeries(heroSeries.id, "HOME_HERO_CARD", `home_hero_card_${heroSeries.id}`);
  };

  const openPrimaryHeroCta = () => {
    if (resumeSeries) {
      goResume();
      return;
    }

    openHeroCardCta();
  };

  const heroEyebrow = resumeSeries ? "Continue Reading" : "Featured";
  const heroSummary = resumeSeries
    ? "Pick up where you left off."
    : clampText(heroSeries?.description, 170);

  return (
    <div className="gush-page-shell gush-home-shell overflow-hidden">
      <div className="gush-page-ambient h-[clamp(21rem,42vw,34rem)]" />
      <SiteHeader variant="home" />

      <main className="gush-page-main gush-page-main--wide">
        <section className="pb-10 pt-2 md:pb-12">
          {loading ? (
            <div className="aspect-[5/6] w-full animate-pulse rounded-[36px] bg-white/80 shadow-[0_20px_44px_rgba(15,23,42,0.06)] sm:aspect-[21/11] lg:aspect-[21/8]" />
          ) : (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.46fr)_minmax(320px,0.64fr)] xl:items-stretch">
              <Card className="relative min-h-[420px] overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(180deg,#111723,#0c1018)] py-0 text-white shadow-[0_32px_90px_rgba(0,0,0,0.3)] ring-0">
                {featuredBannerUrl ? (
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-[0.44]"
                    style={{ backgroundImage: `url(${featuredBannerUrl})` }}
                  />
                ) : null}
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,13,20,0.92)_0%,rgba(9,13,20,0.84)_44%,rgba(9,13,20,0.54)_74%,rgba(9,13,20,0.24)_100%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(77,106,215,0.28),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(244,201,138,0.16),transparent_24%)]" />

                <CardContent className="relative grid h-full gap-8 p-5 sm:p-7 xl:min-h-[520px] xl:grid-cols-[minmax(0,1.02fr)_220px] xl:p-10">
                  <div className="flex flex-col justify-end">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/50">
                      {heroEyebrow}
                    </p>
                    <h1 className="mt-4 max-w-3xl font-display text-[2.5rem] font-semibold leading-[0.94] tracking-[-0.045em] text-white sm:text-[3.2rem] xl:text-[4.45rem]">
                      {heroSeries?.title || "Original comics and novels"}
                    </h1>

                    {heroMetaLine ? (
                      <p className="mt-4 text-[12px] font-semibold uppercase tracking-[0.18em] text-white/56">
                        {heroMetaLine}
                      </p>
                    ) : null}

                    {heroSummary ? (
                      <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72 sm:text-[0.98rem]">
                        {heroSummary}
                      </p>
                    ) : null}

                    <div className="mt-5 flex flex-wrap gap-2.5">
                      {heroGenrePills.map((genre) => (
                        <span
                          key={`hero-genre-${genre}`}
                          className="inline-flex items-center whitespace-nowrap rounded-full border border-white/12 bg-white/[0.08] px-3 py-1 text-xs font-medium text-white/74 backdrop-blur-sm"
                        >
                          {genre}
                        </span>
                      ))}
                      {heroSignals.slice(0, 2).map((signal) => (
                        <span
                          key={signal.id}
                          className="rounded-full border border-white/10 bg-black/16 px-3 py-1 text-xs font-medium text-white/68"
                        >
                          {signal.content}
                        </span>
                      ))}
                    </div>

                    <div className="mt-7 flex flex-wrap items-center gap-3">
                      <Button
                        type="button"
                        size="lg"
                        onClick={openPrimaryHeroCta}
                        className="h-12 rounded-full bg-[var(--gush-home-accent)] px-6 text-sm font-semibold text-slate-950 shadow-[0_18px_34px_rgba(0,0,0,0.22)] hover:bg-[#ffd6a0]"
                      >
                        {resumeSeries ? "Continue Reading" : "Read Now"}
                        <ArrowRight className="size-4" />
                      </Button>
                    </div>

                  </div>

                  {heroSeries ? (
                    <div className="hidden xl:flex xl:items-end xl:justify-end">
                      <div className="w-full max-w-[210px]">
                        <HeroCoverPreview
                          series={heroSeries}
                          eyebrow={resumeSeries ? "Continue Reading" : "Featured"}
                        />
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <div className="grid gap-4">
                <Card className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,17,26,0.95),rgba(12,17,26,0.88))] py-0 text-white shadow-[0_24px_70px_rgba(0,0,0,0.22)] ring-0">
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/46">
                          Overview
                        </p>
                      </div>
                      <span className="inline-flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-[var(--gush-home-accent)]">
                        <Sparkles className="size-4" />
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-2.5">
                      {heroMetrics.map((metric) => (
                        <div
                          key={metric.id}
                          className="rounded-[20px] border border-white/10 bg-white/[0.05] px-3 py-3"
                        >
                          <p className="text-lg font-semibold tracking-tight text-white">
                            {metric.value}
                          </p>
                          <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.16em] text-white/46">
                            {metric.label}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => router.push("/comics")}
                        className="h-auto rounded-full px-0 py-0 text-sm font-semibold text-white/62 hover:bg-transparent hover:text-white"
                      >
                        Browse Comics
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => router.push("/novels")}
                        className="h-auto rounded-full px-0 py-0 text-sm font-semibold text-white/62 hover:bg-transparent hover:text-white"
                      >
                        Browse Novels
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => router.push("/creators")}
                        className="h-auto rounded-full px-0 py-0 text-sm font-semibold text-white/62 hover:bg-transparent hover:text-white"
                      >
                        View Creators
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {heroRailItems.length > 0 ? (
                  <Card className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,17,26,0.95),rgba(12,17,26,0.9))] py-0 text-white shadow-[0_24px_70px_rgba(0,0,0,0.22)] ring-0">
                    <CardContent className="p-5 sm:p-6">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/46">
                          Next Up
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => router.push("/search")}
                          className="h-auto rounded-full px-0 py-0 text-sm font-semibold text-white/56 hover:bg-transparent hover:text-white"
                        >
                          Browse
                          <ArrowRight className="size-4" />
                        </Button>
                      </div>

                      <div className="mt-5 space-y-3">
                        {heroRailItems.map((item, index) => (
                          <HomeQuickPickCard
                            key={`hero-rail-${item.id}`}
                            item={item}
                            eyebrow={index === 0 ? "Featured" : index === 1 ? "Continue" : "Next"}
                            onClick={() =>
                              openHomeSeries(item.id, "HOME_HERO_RAIL", `home_hero_rail_${item.id}`)
                            }
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </div>
          )}
        </section>

        {commerceNotice ? (
          <div className="mb-8 md:mb-10">
            <CommerceSuccessBanner
              notice={commerceNotice}
              onDismiss={() => setCommerceNotice(null)}
            />
          </div>
        ) : null}

        <HomeContentSections
          showCatalogFallback={showCatalogFallback}
          homepageFallbackCards={homepageFallbackCards}
          featuredSeriesItems={featuredSeriesItems}
          startHereItems={startHereItems}
          onFallbackClick={(href) => router.push(href)}
          onBrowseAllSeries={() => router.push("/search")}
          onFeaturedItemClick={(item) =>
            openHomeSeries(item.id, "HOME_FEATURED_SERIES", `home_featured_series_${item.id}`)
          }
          onStartHereItemClick={(item) =>
            openHomeSeries(item.id, "HOME_START_HERE", `home_start_here_${item.id}`)
          }
          onGuideClick={(href) => router.push(href)}
        />

        <LoginPrompt
          isOpen={showLoginPrompt}
          onClose={() => setShowLoginPrompt(false)}
          eyebrow=""
          title="Save your library"
          message="Sign in to sync your library and reading progress."
          returnTo="/"
          primaryLabel="Sign in and sync"
          secondaryLabel="Create free account"
          showFeatures={false}
        />
      </main>

      <SiteFooter
        tone="light"
        variant="compact"
        pathname="/"
        showTagline={false}
      />
    </div>
  );
}

export default function HomePage({ initialSearchParams = {}, initialHomeData = null }) {
  return (
    <HomeDataProvider initialData={initialHomeData}>
      <HomeContent initialSearchParams={initialSearchParams} />
    </HomeDataProvider>
  );
}
