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
    <div className="sticky top-0 z-40 border-b border-white/10 bg-[rgba(9,9,11,0.66)] backdrop-blur-xl">
      <div className="mx-auto flex min-h-[58px] max-w-[1320px] items-center justify-between gap-3 px-3 py-2 sm:min-h-[64px] sm:px-6 sm:py-2.5 lg:px-8">
        <div className="h-10 w-28 rounded-full border border-white/10 bg-white/[0.06] shadow-[0_16px_32px_rgba(0,0,0,0.18)]" />
        <div className="hidden h-10 flex-1 rounded-full border border-white/10 bg-white/[0.04] md:block" />
        <div className="h-10 w-24 rounded-full border border-white/10 bg-white/[0.06] shadow-[0_16px_32px_rgba(0,0,0,0.18)]" />
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
      <div className="h-56 rounded-[28px] border border-black/8 bg-white/86 shadow-[0_18px_40px_rgba(0,0,0,0.05)]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`home-section-skeleton-${index}`}
            className="h-72 rounded-[26px] border border-black/8 bg-white/84 shadow-[0_18px_40px_rgba(0,0,0,0.05)]"
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
    .join(" / ");
}

function buildCleanSeriesMetaLabel(series, creatorName) {
  return buildSeriesMetaLabel(series, creatorName);
}

function buildHeroFactRows(series, creatorName, spotlightEpisodeId) {
  const rows = [];

  if (creatorName) {
    rows.push({
      id: "creator",
      label: "Creator",
      value: creatorName,
    });
  }

  const formatLabel = formatDisplayLabel(
    series?.type || series?.seriesType || "",
  );
  if (formatLabel) {
    rows.push({
      id: "format",
      label: "Format",
      value: formatLabel,
    });
  }

  const stateLabel = getReadingState(series);
  if (spotlightEpisodeId) {
    rows.push({
      id: "chapter",
      label: "Current",
      value: formatEpisodeLabel(spotlightEpisodeId),
    });
  } else if (stateLabel) {
    rows.push({
      id: "status",
      label: "Status",
      value: stateLabel,
    });
  }

  return rows.slice(0, 3);
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
    metaLabel: buildCleanSeriesMetaLabel(series, creatorName),
    badge: "",
  };
}

function HeroCoverPreview({ series, eyebrow }) {
  const coverUrl = String(series?.coverUrl || "").trim();
  const badgeLabel = eyebrow || "Featured";
  const coverAltText = buildHeroCoverAltText(series);

  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(20,20,24,0.98),rgba(6,6,8,0.98))] shadow-[0_28px_70px_rgba(0,0,0,0.3)]">
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
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,6,8,0.04),rgba(6,6,8,0.58))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(41,151,255,0.18),transparent_30%)]" />
      <div className="absolute left-3 top-3 rounded-full border border-white/12 bg-[rgba(255,255,255,0.08)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/72 shadow-[0_10px_24px_rgba(0,0,0,0.2)] backdrop-blur-sm">
        {badgeLabel}
      </div>
      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
        <p className="line-clamp-2 text-lg font-semibold tracking-[-0.04em] text-white drop-shadow-[0_8px_20px_rgba(0,0,0,0.4)]">
          {series?.title || "Story"}
        </p>
      </div>
    </div>
  );
}

function HeroVisualStack({ series, eyebrow, isResume = false }) {
  const hasSeries = Boolean(series);

  return (
    <div className="relative mx-auto hidden min-h-[25rem] w-full max-w-[372px] xl:block">
      <div className="absolute right-2 top-4 h-[14rem] w-[10rem] rounded-[34px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] shadow-[0_24px_60px_rgba(0,0,0,0.24)] backdrop-blur-xl" />
      <div className="absolute left-6 top-16 h-[11.5rem] w-[8.2rem] rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,rgba(41,151,255,0.22),rgba(255,255,255,0.04))] opacity-90 shadow-[0_24px_54px_rgba(0,0,0,0.24)]" />
      <div className="absolute inset-x-10 top-0 h-32 rounded-full bg-[radial-gradient(circle,rgba(41,151,255,0.24),transparent_68%)] blur-3xl" />
      <div className="absolute bottom-6 left-12 h-[9.6rem] w-[7.2rem] rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))] shadow-[0_18px_42px_rgba(0,0,0,0.18)] backdrop-blur-xl" />

      {hasSeries ? (
        <div className="absolute right-10 top-8 w-[15.8rem]">
          <HeroCoverPreview
            series={series}
            eyebrow={isResume ? "Continue" : eyebrow}
          />
        </div>
      ) : (
        <div className="absolute right-10 top-8 flex h-[21rem] w-[15.8rem] items-end overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,17,20,0.96),rgba(8,8,10,0.98))] p-5 shadow-[0_26px_70px_rgba(0,0,0,0.28)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(41,151,255,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_28%)]" />
          <div className="relative">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/44">
              Editorial shelf
            </p>
            <p className="mt-3 max-w-[10rem] text-[1.8rem] font-semibold leading-[0.96] tracking-[-0.05em] text-white">
              Featured stories settle here.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function HomeQuickPickCard({ item, eyebrow, onClick, tone = "dark" }) {
  const coverUrl = String(item?.coverUrl || "").trim();
  const coverAltText = buildHeroCoverAltText(item);
  const metaLine = item?.metaLabel || item?.author || item?.eyebrow || "";
  const isLight = tone === "light";

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-[24px] px-1 py-3 text-left transition-all duration-300 hover:-translate-y-0.5"
    >
      <div className="relative aspect-[3/4] w-[76px] shrink-0 overflow-hidden rounded-[20px] border border-white/10 bg-neutral-900 shadow-[0_18px_28px_rgba(0,0,0,0.22)]">
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
        <div className="absolute inset-[1px] rounded-[19px] border border-white/10" />
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-[10px] font-semibold uppercase tracking-[0.22em]",
            isLight ? "text-[color:var(--gush-ink-faint)]" : "text-white/38",
          )}
        >
          {eyebrow}
        </p>
        <p
          className={cn(
            "mt-2 line-clamp-2 text-sm font-semibold leading-5",
            isLight ? "text-[color:var(--gush-ink-strong)]" : "text-white",
          )}
        >
          {item?.title || "Story"}
        </p>
        {metaLine ? (
          <p
            className={cn(
              "mt-1 line-clamp-1 text-xs",
              isLight ? "text-[color:var(--gush-ink-soft)]" : "text-white/56",
            )}
          >
            {metaLine}
          </p>
        ) : null}
      </div>

      <ArrowRight
        className={cn(
          "size-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1",
          isLight
            ? "text-[color:var(--gush-ink-faint)] group-hover:text-[color:var(--gush-ink-strong)]"
            : "text-white/40 group-hover:text-white/82",
        )}
      />
    </button>
  );
}

function isPositiveCount(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
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
    () => buildCleanSeriesMetaLabel(heroSeries, heroCreatorName),
    [heroCreatorName, heroSeries],
  );
  const heroFactRows = useMemo(
    () =>
      buildHeroFactRows(
        heroSeries,
        heroCreatorName,
        resumeSpotlight?.episodeId || "",
      ),
    [heroCreatorName, heroSeries, resumeSpotlight?.episodeId],
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
  const hasHeroRailItems = heroRailItems.length > 0;

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
  const showHeroMetrics = useMemo(
    () =>
      isPositiveCount(editorialSnapshot?.seriesCount) ||
      isPositiveCount(editorialSnapshot?.genreCount) ||
      isPositiveCount(editorialSnapshot?.completedSeriesCount),
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
          "Open the current editorial shelf and start with what is surfaced right now.",
        label: "Browse Series",
        href: "/search",
      },
      {
        id: "browse-comics",
        eyebrow: "Formats",
        title: "Comics and Novels",
        description: "Choose a format first, then keep exploring from there.",
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
    ? "Pick the story back up without losing the thread."
    : "Comics and novels, with less noise around them.";
  const heroSummary = resumeSeries
    ? "Your next episode is already waiting."
    : "One lead title. Calmer shelves. More room to read.";
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
  const heroSupportTitle = heroSeries?.title || "Editorial shelf";

  return (
    <div className="gush-page-shell gush-home-shell overflow-hidden">
      <div className="gush-page-ambient h-[clamp(21rem,42vw,34rem)]" />
      <SiteHeader variant="home" />

      <main className="gush-page-main gush-page-main--wide">
        <section className="pb-12 pt-2 md:pb-14">
          {loading ? (
            <div className="aspect-[5/6] w-full animate-pulse rounded-[38px] border border-white/10 bg-[rgba(10,10,12,0.88)] shadow-[0_30px_70px_rgba(0,0,0,0.24)] sm:aspect-[21/11] lg:aspect-[21/8]" />
          ) : (
            <div
              className={cn(
                "grid gap-6",
                hasHeroRailItems &&
                  "xl:grid-cols-[minmax(0,1.24fr)_minmax(280px,0.76fr)] xl:items-start",
              )}
            >
              <Card className="relative min-h-[470px] overflow-hidden rounded-[48px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,10,12,0.98),rgba(18,18,20,0.94))] py-0 text-white shadow-[0_42px_110px_rgba(0,0,0,0.32)] ring-0 backdrop-blur-[30px]">
                {featuredBannerUrl ? (
                  <div
                    className="absolute inset-y-0 right-0 hidden w-[46%] bg-cover bg-center opacity-[0.22] xl:block"
                    style={{ backgroundImage: `url(${featuredBannerUrl})` }}
                  />
                ) : null}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(41,151,255,0.18),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_22%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,8,10,0.95)_0%,rgba(8,8,10,0.88)_50%,rgba(8,8,10,0.56)_100%)]" />

                <CardContent className="relative grid h-full min-h-[470px] gap-8 p-6 sm:p-8 xl:min-h-[590px] xl:grid-cols-[minmax(0,0.98fr)_minmax(320px,0.8fr)] xl:gap-10 xl:p-12">
                  <div className="flex h-full flex-col justify-between">
                    <div className="max-w-[46rem] xl:pr-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/54 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                          {heroEyebrow}
                        </p>
                      </div>

                      <h1 className="mt-6 max-w-[8.1ch] text-[3.2rem] font-semibold leading-[0.84] tracking-[-0.074em] text-white sm:text-[4.25rem] xl:text-[6.28rem]">
                        {heroHeading}
                      </h1>
                      {heroSummary ? (
                        <p className="mt-5 max-w-[26rem] text-[0.98rem] leading-8 text-white/66">
                          {heroSummary}
                        </p>
                      ) : null}

                      <div className="mt-9 flex flex-wrap items-center gap-4">
                        <Link
                          href={primaryHeroHref}
                          className={cn(
                            buttonVariants({ size: "lg" }),
                            "h-12 rounded-full px-6 text-sm font-semibold shadow-[0_20px_40px_rgba(0,113,227,0.22)]",
                          )}
                        >
                          {primaryHeroCtaLabel}
                          <ArrowRight className="size-4" />
                        </Link>
                      </div>

                      {showHeroMetrics ? (
                        <div className="mt-10 flex max-w-[33rem] flex-wrap divide-x divide-white/10 overflow-hidden rounded-full border border-white/10 bg-white/[0.04] px-2 py-2 shadow-[0_18px_40px_rgba(0,0,0,0.14)] backdrop-blur-xl">
                          {heroMetrics.map((metric) => (
                            <div
                              key={`hero-inline-${metric.id}`}
                              className="min-w-[6.8rem] px-3 py-2 first:pl-3"
                            >
                              <p className="text-[1.14rem] font-semibold tracking-tight text-white">
                                {metric.value}
                              </p>
                              <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-white/38">
                                {metric.label}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex h-full flex-col justify-between gap-6 xl:items-end">
                    <HeroVisualStack
                      series={heroSeries}
                      eyebrow="Featured"
                      isResume={resumeSeries}
                    />

                    <div className="w-full rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.04))] p-5 shadow-[0_24px_54px_rgba(0,0,0,0.18)] backdrop-blur-xl xl:max-w-[360px]">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/42">
                        {heroSupportLabel}
                      </p>
                      <h2 className="mt-3 text-[1.95rem] font-semibold tracking-[-0.055em] text-white">
                        {heroSupportTitle}
                      </h2>
                      {heroMetaLine ? (
                        <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/42">
                          {heroMetaLine}
                        </p>
                      ) : null}
                      <p className="mt-4 text-sm leading-7 text-white/64">
                        {heroFeatureSummary}
                      </p>

                      <div className="mt-5 flex flex-wrap gap-2.5">
                        {heroGenrePills.map((genre) => (
                          <span
                            key={`hero-genre-${genre}`}
                            className="inline-flex items-center whitespace-nowrap rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-medium text-white/66"
                          >
                            {genre}
                          </span>
                        ))}
                        {heroSignals.slice(0, 2).map((signal) => (
                          <span
                            key={signal.id}
                            className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-medium text-white/66"
                          >
                            {signal.content}
                          </span>
                        ))}
                      </div>

                      {heroFactRows.length > 0 ? (
                        <div className="mt-6 border-t border-white/10 pt-5">
                          <div className="grid gap-3">
                            {heroFactRows.map((row) => (
                              <div
                                key={row.id}
                                className="flex items-center justify-between gap-4"
                              >
                                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/38">
                                  {row.label}
                                </span>
                                <span className="text-sm font-medium text-right text-white/78">
                                  {row.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {hasHeroRailItems ? (
                <div className="grid gap-5 xl:pt-6">
                  <div className="rounded-[36px] border border-[color:var(--gush-border)] bg-[rgba(255,255,255,0.82)] p-5 shadow-[0_20px_44px_rgba(0,0,0,0.06)] backdrop-blur-xl">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--gush-ink-faint)]">
                          Read Next
                        </p>
                        <p className="mt-2 text-sm text-[color:var(--gush-ink-soft)]">
                          A quieter short list when you want the next strong
                          pick.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => router.push("/search")}
                        className="h-auto rounded-full px-0 py-0 text-sm font-semibold text-[color:var(--gush-ink-soft)] hover:bg-transparent hover:text-[color:var(--gush-ink-strong)]"
                      >
                        Browse
                        <ArrowRight className="size-4" />
                      </Button>
                    </div>

                    <div className="mt-5 divide-y divide-[color:var(--gush-border-faint)]">
                      {heroRailItems.map((item, index) => (
                        <div
                          key={`hero-rail-${item.id}`}
                          className="py-1.5 first:pt-0 last:pb-0"
                        >
                          <HomeQuickPickCard
                            item={item}
                            eyebrow={
                              index === 0
                                ? "Featured"
                                : index === 1
                                  ? "Start Here"
                                  : "Later"
                            }
                            tone="light"
                            onClick={() =>
                              openHomeSeries(
                                item.id,
                                "HOME_HERO_RAIL",
                                `home_hero_rail_${item.id}`,
                              )
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
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
