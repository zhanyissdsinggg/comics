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
    <div className="sticky top-0 z-40 border-b border-[color:var(--gush-border)] bg-[rgba(255,255,255,0.94)] backdrop-blur-lg">
      <div className="mx-auto flex min-h-[58px] max-w-[1320px] items-center justify-between gap-3 px-3 py-2 sm:min-h-[64px] sm:px-6 sm:py-2.5 lg:px-8">
        <div className="h-10 w-28 rounded-full border border-[color:var(--gush-border)] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.05)]" />
        <div className="hidden h-10 flex-1 rounded-full border border-[color:var(--gush-border)] bg-white md:block" />
        <div className="h-10 w-24 rounded-full border border-[color:var(--gush-border)] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.05)]" />
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
      <div className="h-56 rounded-[28px] border border-[color:var(--gush-border)] bg-white shadow-[0_18px_40px_rgba(0,0,0,0.05)]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`home-section-skeleton-${index}`}
            className="h-72 rounded-[26px] border border-[color:var(--gush-border)] bg-white shadow-[0_18px_40px_rgba(0,0,0,0.05)]"
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

function getSeriesFormat(series) {
  return String(series?.type || series?.seriesType || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
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
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[28px] border border-[color:var(--gush-border)] bg-white shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
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
          className="absolute inset-0 bg-[linear-gradient(135deg,rgba(243,244,246,1),rgba(228,232,238,1),rgba(248,248,250,1))]"
          role="img"
          aria-label={coverAltText}
        />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(15,23,42,0.54))]" />
      <div className="absolute left-3 top-3 rounded-full border border-[color:var(--gush-border)] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--gush-ink-faint)] shadow-[0_10px_22px_rgba(15,23,42,0.06)]">
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

function HeroMiniCover({ series, className = "" }) {
  if (!series) {
    return null;
  }

  const coverUrl = String(series?.coverUrl || "").trim();
  const coverAltText = buildHeroCoverAltText(series);

  return (
    <div
      className={cn(
        "relative aspect-[3/4] overflow-hidden rounded-[24px] border border-[color:var(--gush-border)] bg-white shadow-[0_14px_32px_rgba(15,23,42,0.06)]",
        className,
      )}
    >
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
          className="absolute inset-0 bg-[linear-gradient(135deg,rgba(243,244,246,1),rgba(228,232,238,1),rgba(248,248,250,1))]"
          role="img"
          aria-label={coverAltText}
        />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(15,23,42,0.32))]" />
      <div className="absolute inset-[1px] rounded-[23px] border border-white/30" />
    </div>
  );
}

function HeroVisualStack({
  series,
  eyebrow,
  isResume = false,
  companionItems = [],
}) {
  const hasSeries = Boolean(series);
  const leftCompanion = companionItems[0] || null;
  const rightCompanion = companionItems[1] || null;

  return (
    <div className="relative mx-auto hidden min-h-[25rem] w-full max-w-[372px] xl:block">
      <div className="absolute inset-x-12 top-2 h-24 rounded-full bg-[radial-gradient(circle,rgba(15,23,42,0.05),transparent_72%)] blur-3xl" />

      {leftCompanion ? (
        <div className="absolute left-2 top-[4.6rem] w-[8.7rem] -rotate-[8deg]">
          <HeroMiniCover series={leftCompanion} />
        </div>
      ) : (
        <div className="absolute left-6 top-16 h-[11.5rem] w-[8.2rem] rounded-[30px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(247,247,249,1),rgba(255,255,255,1))] shadow-[0_18px_40px_rgba(15,23,42,0.05)]" />
      )}

      {rightCompanion ? (
        <div className="absolute bottom-7 left-11 w-[7.7rem] rotate-[8deg]">
          <HeroMiniCover series={rightCompanion} />
        </div>
      ) : (
        <div className="absolute bottom-6 left-12 h-[9.6rem] w-[7.2rem] rounded-[26px] border border-[color:var(--gush-border)] bg-white shadow-[0_14px_32px_rgba(15,23,42,0.05)]" />
      )}

      {hasSeries ? (
        <div className="absolute right-8 top-7 w-[16.2rem]">
          <HeroCoverPreview
            series={series}
            eyebrow={isResume ? "Continue" : eyebrow}
          />
        </div>
      ) : (
        <div className="absolute right-10 top-8 flex h-[21rem] w-[15.8rem] items-end overflow-hidden rounded-[32px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(247,247,249,1))] p-5 shadow-[0_20px_46px_rgba(15,23,42,0.08)]">
          <div className="relative">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[color:var(--gush-ink-faint)]">
              Lead shelf
            </p>
            <p className="mt-3 max-w-[10rem] text-[1.8rem] font-semibold leading-[0.96] tracking-[-0.05em] text-[color:var(--gush-ink-strong)]">
              A story worth opening.
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
      <div
        className={cn(
          "relative aspect-[3/4] w-[76px] shrink-0 overflow-hidden rounded-[20px] shadow-[0_14px_28px_rgba(15,23,42,0.08)]",
          isLight
            ? "border border-[color:var(--gush-border)] bg-white"
            : "border border-white/10 bg-neutral-900 shadow-[0_18px_28px_rgba(0,0,0,0.22)]",
        )}
      >
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
            className={cn(
              "absolute inset-0",
              isLight
                ? "bg-[linear-gradient(135deg,rgba(243,244,246,1),rgba(228,232,238,1),rgba(248,248,250,1))]"
                : "bg-[linear-gradient(135deg,rgba(11,17,30,0.96),rgba(73,96,171,0.48),rgba(244,201,138,0.22))]",
            )}
            role="img"
            aria-label={coverAltText}
          />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,12,18,0.04),rgba(8,12,18,0.32))]" />
        <div
          className={cn(
            "absolute inset-[1px] rounded-[19px]",
            isLight ? "border border-white/30" : "border border-white/10",
          )}
        />
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

    return signals.filter(Boolean).slice(0, 2);
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

  const excludedShelfIds = useMemo(
    () =>
      new Set(
        [
          heroSeries?.id,
          ...featuredSeriesItems.map((item) => item.id),
          ...startHereItems.map((item) => item.id),
        ]
          .map((value) => String(value || "").trim())
          .filter(Boolean),
      ),
    [featuredSeriesItems, heroSeries?.id, startHereItems],
  );

  const comicSpotlightItems = useMemo(
    () =>
      dedupeSeries([...editorialSnapshot.safeCatalog, ...seriesList])
        .filter((series) => {
          const seriesId = String(series?.id || "").trim();
          return (
            seriesId &&
            !excludedShelfIds.has(seriesId) &&
            getSeriesFormat(series) === "comic"
          );
        })
        .slice(0, 4)
        .map((series) => buildHomeShelfItem(series))
        .filter(Boolean),
    [editorialSnapshot.safeCatalog, excludedShelfIds, seriesList],
  );

  const novelSpotlightItems = useMemo(
    () =>
      dedupeSeries([...editorialSnapshot.safeCatalog, ...seriesList])
        .filter((series) => {
          const seriesId = String(series?.id || "").trim();
          return (
            seriesId &&
            !excludedShelfIds.has(seriesId) &&
            getSeriesFormat(series) === "novel"
          );
        })
        .slice(0, 4)
        .map((series) => buildHomeShelfItem(series))
        .filter(Boolean),
    [editorialSnapshot.safeCatalog, excludedShelfIds, seriesList],
  );

  const showCatalogFallback = !loading && !featuredSeries;

  const homepageFallbackCards = useMemo(
    () => [
      {
        id: "featured-series",
        eyebrow: "Browse",
        title: "Featured Stories",
        description: "",
        label: "Browse Stories",
        href: "/search",
      },
      {
        id: "browse-comics",
        eyebrow: "Formats",
        title: "Comics and Novels",
        description: "",
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

  const heroEyebrow = resumeSeries ? "Continue" : "Lead Story";
  const heroHeading = resumeSeries
    ? "Pick up where you left off."
    : "Start with a story worth opening.";
  const heroSummary = resumeSeries
    ? ""
    : "";
  const primaryHeroCtaLabel = resumeSeries
    ? "Continue Reading"
    : heroSeries?.id
      ? "Start Reading"
      : "Browse Stories";

  return (
    <div className="gush-page-shell gush-home-shell overflow-hidden">
      <div className="gush-page-ambient h-[clamp(21rem,42vw,34rem)]" />
      <SiteHeader variant="home" />

      <main className="gush-page-main gush-page-main--wide">
        <section className="pb-12 pt-2 md:pb-14">
          {loading ? (
            <div className="aspect-[5/6] w-full animate-pulse rounded-[38px] border border-[color:var(--gush-border)] bg-white shadow-[0_18px_42px_rgba(15,23,42,0.06)] sm:aspect-[21/11] lg:aspect-[21/8]" />
          ) : (
            <Card className="relative min-h-[470px] overflow-hidden rounded-[48px] border border-[color:var(--gush-border)] bg-white py-0 text-[color:var(--gush-ink-strong)] shadow-[0_24px_60px_rgba(15,23,42,0.08)] ring-0">
              {featuredBannerUrl ? (
                <div
                  className="absolute inset-y-0 right-0 hidden w-[46%] bg-cover bg-center opacity-[0.12] xl:block"
                  style={{ backgroundImage: `url(${featuredBannerUrl})` }}
                />
              ) : null}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,23,42,0.05),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(148,163,184,0.08),transparent_22%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.98)_0%,rgba(255,255,255,0.94)_52%,rgba(255,255,255,0.82)_100%)]" />

              <CardContent className="relative grid h-full min-h-[470px] gap-8 p-6 sm:p-8 xl:min-h-[590px] xl:grid-cols-[minmax(0,0.98fr)_minmax(320px,0.8fr)] xl:gap-10 xl:p-12">
                <div className="flex h-full flex-col justify-between">
                  <div className="max-w-[46rem] xl:pr-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="rounded-full border border-[color:var(--gush-border)] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--gush-ink-faint)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                        {heroEyebrow}
                      </p>
                    </div>

                    <h1 className="mt-6 max-w-[9.1ch] text-[3.2rem] font-semibold leading-[0.84] tracking-[-0.074em] text-[color:var(--gush-ink-strong)] sm:text-[4.25rem] xl:text-[6.1rem]">
                      {heroHeading}
                    </h1>

                    {heroSummary ? (
                      <p className="mt-5 max-w-[29rem] text-[0.96rem] leading-7 text-[color:var(--gush-ink-soft)]">
                        {heroSummary}
                      </p>
                    ) : null}

                    {heroMetaLine ? (
                      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--gush-ink-faint)]">
                        {heroMetaLine}
                      </p>
                    ) : null}

                    {heroGenrePills.length > 0 || heroSignals.length > 0 ? (
                      <div className="mt-5 flex flex-wrap gap-2.5">
                        {heroGenrePills.map((genre) => (
                          <span
                            key={`hero-genre-${genre}`}
                            className="inline-flex items-center whitespace-nowrap rounded-full border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-3 py-1 text-[11px] font-medium text-[color:var(--gush-ink-soft)]"
                          >
                            {genre}
                          </span>
                        ))}
                        {heroSignals.map((signal) => (
                          <span
                            key={signal.id}
                            className="rounded-full border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-3 py-1 text-[11px] font-medium text-[color:var(--gush-ink-soft)]"
                          >
                            {signal.content}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-9 flex flex-wrap items-center gap-4">
                      <Link
                        href={primaryHeroHref}
                        className={cn(
                          buttonVariants({ size: "lg" }),
                          "h-12 rounded-full px-6 text-sm font-semibold shadow-[0_14px_30px_rgba(15,23,42,0.12)]",
                        )}
                      >
                        {primaryHeroCtaLabel}
                        <ArrowRight className="size-4" />
                      </Link>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[color:var(--gush-ink-soft)]">
                      <button
                        type="button"
                        onClick={() => router.push("/comics")}
                        className="font-medium transition hover:text-[color:var(--gush-ink-strong)]"
                      >
                        Comics
                      </button>
                      <span
                        aria-hidden="true"
                        className="h-1 w-1 rounded-full bg-[color:var(--gush-border-strong)]"
                      />
                      <button
                        type="button"
                        onClick={() => router.push("/novels")}
                        className="font-medium transition hover:text-[color:var(--gush-ink-strong)]"
                      >
                        Novels
                      </button>
                      <span
                        aria-hidden="true"
                        className="h-1 w-1 rounded-full bg-[color:var(--gush-border-strong)]"
                      />
                      <button
                        type="button"
                        onClick={() => router.push("/creators")}
                        className="font-medium transition hover:text-[color:var(--gush-ink-strong)]"
                      >
                        Creators
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex h-full flex-col justify-between gap-6 xl:items-end">
                  <HeroVisualStack
                    series={heroSeries}
                    eyebrow="Featured"
                    isResume={resumeSeries}
                    companionItems={heroRailItems}
                  />

                  {hasHeroRailItems ? (
                    <div className="w-full rounded-[32px] border border-[color:var(--gush-border)] bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] xl:max-w-[360px]">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--gush-ink-faint)]">
                            Next on the shelf
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => router.push("/search")}
                          className="h-auto rounded-full px-0 py-0 text-sm font-semibold text-[color:var(--gush-ink-soft)] hover:bg-transparent hover:text-[color:var(--gush-ink-strong)]"
                        >
                          View all
                          <ArrowRight className="size-4" />
                        </Button>
                      </div>

                      <div className="mt-4 divide-y divide-[color:var(--gush-border-faint)]">
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
                                    ? "Comics"
                                    : "Novels"
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
                  ) : null}
                </div>
              </CardContent>
            </Card>
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
          comicSpotlightItems={comicSpotlightItems}
          novelSpotlightItems={novelSpotlightItems}
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
          onComicSpotlightItemClick={(item) =>
            openHomeSeries(
              item.id,
              "HOME_COMIC_SPOTLIGHT",
              `home_comic_spotlight_${item.id}`,
            )
          }
          onNovelSpotlightItemClick={(item) =>
            openHomeSeries(
              item.id,
              "HOME_NOVEL_SPOTLIGHT",
              `home_novel_spotlight_${item.id}`,
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
