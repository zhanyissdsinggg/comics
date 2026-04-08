/**
 * Home page shell focused on fast story discovery for mobile-first storefront traffic.
 */

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
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
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const LoginPrompt = dynamic(() => import("../auth/LoginPrompt"), {
  ssr: false,
});
const CommerceSuccessBanner = dynamic(
  () => import("../common/CommerceSuccessBanner"),
);
const SiteHeader = dynamic(() => import("../layout/SiteHeader"), {
  ssr: false,
  loading: () => (
    <div className="sticky top-0 z-40 border-b border-[color:var(--gush-border)] bg-[rgba(251,247,241,0.68)] backdrop-blur-xl dark:border-white/10 dark:bg-[rgba(14,18,27,0.66)]">
      <div className="mx-auto flex min-h-[58px] max-w-[1320px] items-center justify-between gap-3 px-3 py-2 sm:min-h-[64px] sm:px-6 sm:py-2.5 lg:px-8">
        <div className="h-10 w-28 rounded-full border border-[color:var(--gush-border)] bg-[rgba(255,253,249,0.92)] shadow-[0_10px_24px_rgba(15,23,42,0.035)] dark:border-white/10 dark:bg-white/[0.06] dark:shadow-[0_16px_32px_rgba(0,0,0,0.18)]" />
        <div className="hidden h-10 flex-1 rounded-full border border-[color:var(--gush-border)] bg-[rgba(255,253,249,0.84)] md:block dark:border-white/10 dark:bg-white/[0.04]" />
        <div className="h-10 w-24 rounded-full border border-[color:var(--gush-border)] bg-[rgba(255,253,249,0.92)] shadow-[0_10px_24px_rgba(15,23,42,0.035)] dark:border-white/10 dark:bg-white/[0.06] dark:shadow-[0_16px_32px_rgba(0,0,0,0.18)]" />
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
      <div className="h-56 rounded-[28px] border border-[color:var(--gush-border)] bg-[rgba(255,253,249,0.84)] shadow-[0_18px_40px_rgba(37,28,19,0.04)]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`home-section-skeleton-${index}`}
            className="h-72 rounded-[26px] border border-[color:var(--gush-border)] bg-[rgba(255,253,249,0.82)] shadow-[0_18px_40px_rgba(37,28,19,0.04)]"
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
    .map(
      (segment) =>
        segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase(),
    )
    .join(" ");
}

function buildHeroCoverAltText(series) {
  const title = String(series?.title || "")
    .replace(/\s+/g, " ")
    .trim();
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
  return [
    creatorName,
    formatDisplayLabel(series?.type || series?.seriesType || ""),
    getReadingState(series),
  ]
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
    metaLabel: buildSeriesMetaLabel(series, creatorName).replace(
      /\s\u8DEF\s/g,
      " • ",
    ),
    badge: "",
  };
}

function HeroCoverPreview({ series, eyebrow }) {
  const coverUrl = String(series?.coverUrl || "").trim();
  const badgeLabel = eyebrow || "Featured";
  const coverAltText = buildHeroCoverAltText(series);

  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[28px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,253,249,0.98),rgba(243,236,227,0.94))] shadow-[0_18px_38px_rgba(37,28,19,0.08)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(16,21,31,0.92),rgba(11,16,24,0.98))] dark:shadow-[0_26px_60px_rgba(0,0,0,0.28)]">
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
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(14,18,24,0.08),rgba(14,18,24,0.44))]" />
      <div className="absolute left-3 top-3 rounded-full border border-white/65 bg-[rgba(255,253,249,0.88)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--gush-ink-soft)] shadow-[0_8px_18px_rgba(37,28,19,0.08)] backdrop-blur-sm dark:border-white/12 dark:bg-[rgba(12,17,26,0.55)] dark:text-white/80">
        {badgeLabel}
      </div>
      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
        <p className="line-clamp-2 font-display text-lg font-semibold tracking-tight text-white drop-shadow-[0_8px_20px_rgba(0,0,0,0.4)]">
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
      className="group flex w-full items-center gap-3 rounded-[24px] border border-[color:var(--gush-border)] bg-[rgba(255,253,249,0.8)] p-3 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-[color:var(--gush-border-strong)] hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/16 dark:hover:bg-white/[0.07]"
    >
      <div className="relative aspect-[3/4] w-[72px] shrink-0 overflow-hidden rounded-[18px] border border-[color:var(--gush-border)] bg-neutral-900 dark:border-white/10">
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
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,12,18,0.04),rgba(8,12,18,0.42))]" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--gush-ink-faint)] dark:text-white/42">
          {eyebrow}
        </p>
        <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-[color:var(--gush-ink-strong)] dark:text-white">
          {item?.title || "Story"}
        </p>
        {metaLine ? (
          <p className="mt-1 line-clamp-1 text-xs text-[color:var(--gush-ink-soft)] dark:text-white/56">
            {metaLine}
          </p>
        ) : null}
      </div>

      <ArrowRight className="size-4 shrink-0 text-[color:var(--gush-ink-faint)] transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[color:var(--gush-ink-strong)] dark:text-white/46 dark:group-hover:text-white/82" />
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
    setCommerceNotice(
      getCommerceSuccessPresentation(consumeCommerceSuccessForPath("/")),
    );
  }, []);

  const heroItems = useMemo(
    () =>
      buildHomeHeroItems(seriesList, {
        bannerUrl: branding?.homeBannerUrl,
        homepageSlots,
      }),
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
    featuredHero?.bannerUrl ||
    branding?.homeBannerUrl ||
    featuredSeries?.bannerUrl ||
    null;

  const progressEntries = useMemo(
    () =>
      Object.entries(progressMap || {}).sort(
        ([, left], [, right]) =>
          toTimestamp(right?.updatedAt) - toTimestamp(left?.updatedAt),
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
  const resumeSeries = resumeSpotlight
    ? seriesById.get(resumeSpotlight.seriesId) || null
    : null;
  const heroSeries = resumeSeries || featuredSeries || null;
  const heroGenrePills = useMemo(
    () => getPrimaryGenres(heroSeries?.genres, 2),
    [heroSeries?.genres],
  );
  const heroCreatorName = useMemo(
    () => (heroSeries ? resolveSeriesCreatorName(heroSeries) : ""),
    [heroSeries],
  );
  const heroMetaLine = useMemo(
    () =>
      buildSeriesMetaLabel(heroSeries, heroCreatorName).replace(
        /\s\u8DEF\s/g,
        " • ",
      ),
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
        .filter(
          (series) =>
            String(series?.id || "").trim() !==
            String(heroSeries?.id || "").trim(),
        )
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
        .filter(
          (series) =>
            String(series?.id || "").trim() !==
            String(heroSeries?.id || "").trim(),
        )
        .slice(0, 4)
        .map((series) => buildHomeShelfItem(series))
        .filter(Boolean),
    [editorialSnapshot, heroSeries?.id],
  );

  const heroRailItems = useMemo(() => {
    const seen = new Set();
    return [...featuredSeriesItems, ...startHereItems]
      .filter((item) => {
        const itemId = String(item?.id || "").trim();
        if (
          !itemId ||
          itemId === String(heroSeries?.id || "").trim() ||
          seen.has(itemId)
        ) {
          return false;
        }
        seen.add(itemId);
        return true;
      })
      .slice(0, 3);
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
        value: Number(
          editorialSnapshot?.completedSeriesCount || 0,
        ).toLocaleString(),
      },
    ],
    [
      editorialSnapshot?.completedSeriesCount,
      editorialSnapshot?.genreCount,
      editorialSnapshot?.seriesCount,
    ],
  );

  const showCatalogFallback = !loading && !featuredSeries;

  const homepageFallbackCards = useMemo(
    () => [
      {
        id: "featured-series",
        eyebrow: "Browse",
        title: "Featured Series",
        description:
          "Open the current editorial shelf and start with what is being surfaced right now.",
        label: "Browse Series",
        href: "/search",
      },
      {
        id: "browse-comics",
        eyebrow: "Formats",
        title: "Comics and Novels",
        description:
          "Jump into the format that fits how you like to read, then keep exploring from there.",
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

  const primaryHeroHref = useMemo(() => {
    if (resumeSpotlight?.seriesId) {
      const targetPath = resumeSpotlight.episodeId
        ? `/read/${resumeSpotlight.seriesId}/${resumeSpotlight.episodeId}`
        : `/series/${resumeSpotlight.seriesId}`;

      return buildPathWithAttribution(targetPath, {
        entryPoint: "HOME_RETURN_LANE",
        campaignId: "resume_spotlight",
        sourcePath: "/",
        sourceSeriesId: resumeSpotlight.seriesId,
        sourceEpisodeId: resumeSpotlight.episodeId || undefined,
        returnTo: targetPath,
      });
    }

    if (heroSeries?.id) {
      const targetPath = `/series/${heroSeries.id}`;
      return buildPathWithAttribution(targetPath, {
        entryPoint: "HOME_HERO_CARD",
        campaignId: `home_hero_card_${heroSeries.id}`,
        sourcePath: "/",
        sourceSeriesId: heroSeries.id,
        returnTo: targetPath,
      });
    }

    return "/search";
  }, [heroSeries?.id, resumeSpotlight?.episodeId, resumeSpotlight?.seriesId]);

  const heroEyebrow = resumeSeries ? "Continue Reading" : "Original Stories";
  const heroHeading = resumeSeries
    ? "Return to the story without losing the thread."
    : "A quieter home for comics and novels.";
  const heroSummary = resumeSeries
    ? "Your place stays saved, so the next episode is already waiting."
    : "One strong lead, calmer shelves, and more room to stay with a story.";
  const heroFeatureEyebrow = resumeSeries ? "Current Read" : "Now Featuring";
  const heroFeatureSummary =
    clampText(heroSeries?.description, 150) ||
    (resumeSeries
      ? "Your next chapter is already waiting in the library."
      : "A focused place to start, stay, or browse more slowly.");
  const primaryHeroCtaLabel = resumeSeries
    ? "Continue Reading"
    : heroSeries?.id
      ? "Start Reading"
      : "Browse Stories";
  const heroSupportLabel = resumeSeries ? "Reading Notes" : "Lead Story";
  const heroSupportTitle = heroSeries?.title || "Featured story";

  return (
    <div className="gush-page-shell gush-home-shell overflow-hidden">
      <div className="gush-page-ambient h-[clamp(21rem,42vw,34rem)]" />
      <SiteHeader variant="home" />

      <main className="gush-page-main gush-page-main--wide">
        <section className="pb-10 pt-2 md:pb-12">
          {loading ? (
            <div className="aspect-[5/6] w-full animate-pulse rounded-[38px] border border-[color:var(--gush-border)] bg-[rgba(255,253,249,0.84)] shadow-[0_24px_54px_rgba(37,28,19,0.05)] sm:aspect-[21/11] lg:aspect-[21/8]" />
          ) : (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.28fr)_minmax(320px,0.72fr)] xl:items-stretch">
              <Card className="relative min-h-[440px] overflow-hidden rounded-[42px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,253,249,0.995),rgba(244,236,226,0.97))] py-0 shadow-[0_34px_88px_rgba(37,28,19,0.09)] ring-0 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(16,21,31,0.94),rgba(11,16,24,0.98))] dark:shadow-[0_34px_96px_rgba(0,0,0,0.28)]">
                {featuredBannerUrl ? (
                  <div
                    className="absolute inset-y-0 right-0 hidden w-[46%] bg-cover bg-center opacity-[0.16] xl:block dark:opacity-[0.2]"
                    style={{ backgroundImage: `url(${featuredBannerUrl})` }}
                  />
                ) : null}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(215,177,130,0.2),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(109,123,171,0.12),transparent_24%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(215,177,130,0.12),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(109,123,171,0.18),transparent_22%)]" />

                <CardContent className="relative grid h-full min-h-[440px] gap-8 p-6 sm:p-8 xl:min-h-[560px] xl:grid-cols-[minmax(0,1.12fr)_minmax(250px,0.72fr)] xl:gap-10 xl:p-12">
                  <div className="flex h-full flex-col justify-between">
                    <div className="max-w-[46rem]">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <p className="rounded-full border border-[color:var(--gush-border)] bg-[rgba(255,253,249,0.78)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--gush-ink-faint)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:border-white/10 dark:bg-white/[0.04] dark:text-white/46">
                          {heroEyebrow}
                        </p>
                        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[color:var(--gush-ink-faint)] dark:text-white/42">
                          Editorial shelves, clearer starts
                        </p>
                      </div>

                      <h1 className="mt-5 max-w-4xl font-display text-[3rem] font-semibold leading-[0.9] tracking-[-0.06em] text-[color:var(--gush-ink-strong)] sm:text-[3.8rem] xl:text-[5.6rem] dark:text-white">
                        {heroHeading}
                      </h1>
                      {heroSummary ? (
                        <p className="mt-5 max-w-2xl text-[0.98rem] leading-8 text-[color:var(--gush-ink-soft)] dark:text-white/68">
                          {heroSummary}
                        </p>
                      ) : null}

                      <div className="mt-8 flex flex-wrap items-center gap-3">
                        <Link
                          href={primaryHeroHref}
                          className={cn(
                            buttonVariants({ size: "lg" }),
                            "h-12 rounded-full bg-[color:var(--gush-ink-strong)] px-6 text-sm font-semibold text-white shadow-[var(--gush-shadow-button)] hover:bg-[#241d18] dark:bg-white dark:text-slate-950 dark:hover:bg-neutral-200",
                          )}
                        >
                          {primaryHeroCtaLabel}
                          <ArrowRight className="size-4" />
                        </Link>
                      </div>
                    </div>

                    <div className="mt-10 rounded-[32px] border border-[color:var(--gush-border)] bg-[rgba(255,252,247,0.74)] p-5 shadow-[0_18px_42px_rgba(37,28,19,0.05)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-[30rem]">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--gush-ink-faint)] dark:text-white/42">
                            {heroSupportLabel}
                          </p>
                          <h2 className="mt-3 font-display text-[2rem] font-semibold tracking-[-0.05em] text-[color:var(--gush-ink-strong)] dark:text-white">
                            {heroSupportTitle}
                          </h2>
                          {heroMetaLine ? (
                            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--gush-ink-faint)] dark:text-white/46">
                              {heroMetaLine}
                            </p>
                          ) : null}
                          <p className="mt-4 text-sm leading-7 text-[color:var(--gush-ink-soft)] dark:text-white/68">
                            {heroFeatureSummary}
                          </p>
                        </div>

                        <div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-[22rem] lg:grid-cols-1">
                          {heroMetrics.map((metric) => (
                            <div
                              key={metric.id}
                              className="rounded-[22px] border border-[color:var(--gush-border)] bg-[rgba(255,253,249,0.74)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.76)] dark:border-white/10 dark:bg-white/[0.04]"
                            >
                              <p className="text-[1.24rem] font-semibold tracking-tight text-[color:var(--gush-ink-strong)] dark:text-white">
                                {metric.value}
                              </p>
                              <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--gush-ink-faint)] dark:text-white/42">
                                {metric.label}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2.5">
                        {heroGenrePills.map((genre) => (
                          <span
                            key={`hero-genre-${genre}`}
                            className="inline-flex items-center whitespace-nowrap rounded-full border border-[color:var(--gush-border)] bg-[rgba(255,255,255,0.7)] px-3 py-1 text-[11px] font-medium text-[color:var(--gush-ink-soft)] dark:border-white/10 dark:bg-white/[0.04] dark:text-white/68"
                          >
                            {genre}
                          </span>
                        ))}
                        {heroSignals.slice(0, 2).map((signal) => (
                          <span
                            key={signal.id}
                            className="rounded-full border border-[color:var(--gush-border)] bg-[rgba(255,253,249,0.72)] px-3 py-1 text-[11px] font-medium text-[color:var(--gush-ink-soft)] dark:border-white/10 dark:bg-white/[0.04] dark:text-white/66"
                          >
                            {signal.content}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex h-full flex-col gap-4 xl:items-end">
                    {heroSeries ? (
                      <div className="w-full max-w-[310px]">
                        <HeroCoverPreview
                          series={heroSeries}
                          eyebrow={resumeSeries ? "Continue" : "Featured"}
                        />
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4">
                {heroSeries ? (
                  <Card className="overflow-hidden rounded-[34px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,253,249,0.99),rgba(246,240,231,0.96))] py-0 shadow-[0_20px_48px_rgba(37,28,19,0.05)] ring-0 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(16,21,31,0.92),rgba(11,16,24,0.98))] dark:shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
                    <CardContent className="p-5 sm:p-6">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--gush-ink-faint)] dark:text-white/42">
                        On The Desk
                      </p>
                      <div className="mt-4 space-y-4">
                        <div>
                          <h2 className="font-display text-[2rem] font-semibold tracking-[-0.05em] text-[color:var(--gush-ink-strong)] dark:text-white">
                            {heroSeries?.title || "Featured story"}
                          </h2>

                          {heroMetaLine ? (
                            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--gush-ink-faint)] dark:text-white/46">
                              {heroMetaLine}
                            </p>
                          ) : null}
                        </div>

                        <p className="text-sm leading-7 text-[color:var(--gush-ink-soft)] dark:text-white/68">
                          {resumeSeries
                            ? "Your saved place, the latest chapter, and the next calm step all stay in one lane."
                            : "A single lead to open first, then a cleaner handoff into the rest of the shelf."}
                        </p>

                        <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-[rgba(255,255,255,0.68)] p-4 dark:border-white/10 dark:bg-white/[0.04]">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--gush-ink-faint)] dark:text-white/42">
                            {heroFeatureEyebrow}
                          </p>
                          <p className="mt-2 text-sm leading-7 text-[color:var(--gush-ink-soft)] dark:text-white/66">
                            {heroFeatureSummary}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                {heroRailItems.length > 0 ? (
                  <Card className="overflow-hidden rounded-[32px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,253,249,0.99),rgba(246,240,231,0.96))] py-0 shadow-[0_20px_48px_rgba(37,28,19,0.05)] ring-0 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(16,21,31,0.92),rgba(11,16,24,0.98))] dark:shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
                    <CardContent className="p-5 sm:p-6">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--gush-ink-faint)] dark:text-white/42">
                          Read Next
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => router.push("/search")}
                          className="h-auto rounded-full px-0 py-0 text-sm font-semibold text-[color:var(--gush-ink-soft)] hover:bg-transparent hover:text-[color:var(--gush-ink-strong)] dark:text-white/56 dark:hover:text-white"
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
                            eyebrow={
                              index === 0
                                ? "Featured"
                                : index === 1
                                  ? "Continue"
                                  : "Next"
                            }
                            onClick={() =>
                              openHomeSeries(
                                item.id,
                                "HOME_HERO_RAIL",
                                `home_hero_rail_${item.id}`,
                              )
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
            openHomeSeries(
              item.id,
              "HOME_FEATURED_SERIES",
              `home_featured_series_${item.id}`,
            )
          }
          onStartHereItemClick={(item) =>
            openHomeSeries(
              item.id,
              "HOME_START_HERE",
              `home_start_here_${item.id}`,
            )
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

export default function HomePage({
  initialSearchParams = {},
  initialHomeData = null,
}) {
  return (
    <HomeDataProvider initialData={initialHomeData}>
      <HomeContent initialSearchParams={initialSearchParams} />
    </HomeDataProvider>
  );
}
