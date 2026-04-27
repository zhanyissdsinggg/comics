/**
 * Home page shell focused on fast story discovery for mobile-first storefront traffic.
 */

"use client";

import Link from "next/link";
import Image from "next/image";
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
    <div className="sticky top-0 z-40 border-b-4 border-[#FFE500] bg-black/90 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[58px] max-w-[1320px] items-center justify-between gap-3 px-3 py-2 sm:min-h-[64px] sm:px-6 sm:py-2.5 lg:px-8">
        <div className="h-10 w-28 animate-pulse rounded-full border-2 border-white/20 bg-white/10" />
        <div className="hidden h-10 flex-1 animate-pulse rounded-full border-2 border-white/20 bg-white/10 md:block" />
        <div className="h-10 w-24 animate-pulse rounded-full border-2 border-white/20 bg-white/10" />
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
      <div className="h-56 rounded-[28px] border-[3px] border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`home-section-skeleton-${index}`}
            className="h-72 rounded-[26px] border-[3px] border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
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

function HeroRailPreviewCard({ item, tone = "light", onClick }) {
  const coverUrl = String(item?.coverUrl || "").trim();
  const title = String(item?.title || "Story").trim();
  const meta = String(item?.metaLabel || item?.author || item?.eyebrow || "")
    .replace(/\s+/g, " ")
    .trim();
  const isLight = tone === "light";

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 text-left"
    >
        <div
          className={cn(
            "relative aspect-[3/4] w-[82px] shrink-0 overflow-hidden border-[3px] border-black bg-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 group-hover:translate-x-0.5 group-hover:translate-y-0.5 group-hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
            isLight
            ? ""
            : "border-white/20 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
          )}
        >
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={buildHeroCoverAltText(item)}
            fill
            sizes="82px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className={cn(
              "h-full w-full",
              isLight
                ? "bg-[linear-gradient(135deg,#f3f4f6,#e5e7eb,#f8fafc)]"
                : "bg-[linear-gradient(135deg,#111827,#0f172a,#3f3f46)]",
            )}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-[10px] font-black uppercase tracking-[0.18em]",
            isLight ? "text-black/55" : "text-white/50",
          )}
        >
          Next
        </p>
        <p
          className={cn(
            "mt-2 line-clamp-2 text-sm font-black leading-5 tracking-[-0.02em]",
            isLight ? "text-black" : "text-white",
          )}
        >
          {title}
        </p>
        {meta ? (
          <p
            className={cn(
              "mt-1 line-clamp-1 text-[11px] font-semibold",
              isLight ? "text-black/68" : "text-white/60",
            )}
          >
            {meta}
          </p>
        ) : null}
      </div>
      <ArrowRight
        className={cn(
          "size-4 shrink-0 transition-transform group-hover:translate-x-1",
          isLight ? "text-black/55" : "text-white/60",
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
  const { loading, seriesList, homepageSlots, hotKeywords } = useHomeData();
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
        title: "Featured",
        description: "",
        label: "Stories",
        href: "/search",
      },
      {
        id: "browse-comics",
        eyebrow: "Formats",
        title: "Formats",
        description: "",
        label: "Comics",
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

  const heroEyebrow = resumeSeries ? "Continue" : "Featured";
  const heroDescription = String(heroSeries?.description || "").trim();
  const primaryHeroCtaLabel = resumeSeries
    ? "Continue"
    : "Start Reading";

  return (
    <div className="min-h-screen overflow-hidden bg-white text-black">
      <SiteHeader variant="home" />

      <main className="relative">
        <section className="p-0">
          {loading ? (
            <div className="aspect-[5/6] w-full animate-pulse rounded-[34px] border border-black/10 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:aspect-[21/11] lg:aspect-[21/8]" />
          ) : (
            <section className="relative overflow-hidden border-b border-black/8 bg-[linear-gradient(180deg,#ffffff_0%,#f7f8fa_100%)]">
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    "radial-gradient(circle, #000 2px, transparent 2px)",
                  backgroundSize: "24px 24px",
                }}
              />
              <div className="absolute -right-8 top-10 hidden h-32 w-32 rounded-full border border-black/8 bg-[#f3f4f6] md:block" />
              <div className="absolute bottom-14 left-4 hidden h-20 w-20 rotate-12 rounded-[28px] border border-black/8 bg-[#f8fafc] md:block" />

              <div className="relative mx-auto grid min-h-[480px] max-w-7xl gap-7 px-4 py-8 md:px-8 md:py-20 lg:grid-cols-[minmax(0,1fr)_420px] xl:min-h-[640px]">
                <div className="flex flex-col justify-center">
                  <div className="inline-block w-fit rounded-full border border-black/10 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-black/62 sm:px-4 sm:py-2 sm:text-sm">
                    {resumeSeries ? "Continue" : "Featured"}
                  </div>

                  <h1 className="mt-5 max-w-[8.8ch] text-[clamp(2.35rem,10vw,6.4rem)] font-black uppercase leading-[0.86] tracking-[-0.06em] text-black">
                    {resumeSeries
                      ? "Keep reading"
                      : "Original comics and novels."}
                  </h1>

                  <h2 className="mt-4 text-base font-semibold tracking-[-0.01em] text-black/72 sm:text-lg">Start here.</h2>

                  {heroMetaLine ? (
                    <div className="mt-4 max-w-[30rem]">
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-black/58">
                        {heroMetaLine}
                      </p>
                    </div>
                  ) : null}

                  {heroGenrePills.length > 0 || heroSignals.length > 0 ? (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {heroGenrePills.map((genre) => (
                        <span
                          key={`hero-genre-${genre}`}
                          className="rounded-full border border-black/10 bg-[#f8fafc] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-black/72 sm:px-3 sm:text-[11px]"
                        >
                          {genre}
                        </span>
                      ))}
                      {heroSignals.slice(0, 2).map((signal, index) => (
                        <span
                          key={signal.id}
                          className={cn(
                            "rounded-full border border-black/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-black/72 sm:px-3 sm:text-[11px]",
                            index % 2 === 0 ? "bg-[#f8fafc]" : "bg-white",
                          )}
                        >
                          {signal.content}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                    <Link
                      href={primaryHeroHref}
                      data-testid="home-hero-primary-cta"
                      className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full border border-black bg-black px-5 py-3 text-sm font-semibold tracking-[0.02em] text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)] transition-all hover:bg-black/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black sm:w-auto sm:px-6 sm:text-base"
                    >
                      {primaryHeroCtaLabel}
                      <ArrowRight className="size-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => router.push("/search")}
                      className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-black/12 bg-white px-4 py-2 text-xs font-semibold tracking-[0.02em] text-black/72 transition-all hover:border-black/18 hover:bg-black/[0.03] hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black sm:min-h-0 sm:w-auto sm:text-sm"
                    >
                      Browse
                    </button>
                  </div>

                  <div className="mt-6 grid grid-cols-3 gap-2.5 text-[11px] font-black uppercase tracking-[0.08em] text-black sm:flex sm:flex-wrap sm:items-center sm:gap-3 sm:text-sm">
                    <button
                      type="button"
                      onClick={() => router.push("/comics")}
                      className="inline-flex min-h-[42px] items-center justify-center rounded-full border border-black/10 bg-white px-3 py-1.5 text-center shadow-[0_8px_18px_rgba(15,23,42,0.06)] transition-all hover:border-black/16 hover:bg-black/[0.03]"
                    >
                      Comics
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push("/novels")}
                      className="inline-flex min-h-[42px] items-center justify-center rounded-full border border-black/10 bg-white px-3 py-1.5 text-center shadow-[0_8px_18px_rgba(15,23,42,0.06)] transition-all hover:border-black/16 hover:bg-black/[0.03]"
                    >
                      Novels
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push("/creators")}
                      className="inline-flex min-h-[42px] items-center justify-center rounded-full border border-black/10 bg-white px-3 py-1.5 text-center shadow-[0_8px_18px_rgba(15,23,42,0.06)] transition-all hover:border-black/16 hover:bg-black/[0.03]"
                    >
                      Creators
                    </button>
                  </div>
                </div>

                <div className="relative flex items-center justify-center lg:justify-end">
                  {heroRailItems[0] ? (
                    <div className="absolute left-0 top-6 hidden w-36 -rotate-6 xl:block">
                      <HeroRailPreviewCard
                        item={heroRailItems[0]}
                        tone="dark"
                        onClick={() =>
                          openHomeSeries(
                            heroRailItems[0].id,
                            "HOME_HERO_RAIL",
                            `home_hero_rail_${heroRailItems[0].id}`,
                          )
                        }
                      />
                    </div>
                  ) : null}

                  <div className="relative w-full max-w-[300px] overflow-hidden rounded-[32px] border border-black/10 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.12)] sm:max-w-[340px] lg:max-w-[390px]">
                    <div className="relative aspect-[3/4] w-full">
                      {heroSeries?.coverUrl ? (
                        <Image
                          src={heroSeries.coverUrl}
                          alt={buildHeroCoverAltText(heroSeries)}
                          fill
                          sizes="(max-width: 640px) 300px, (max-width: 1024px) 340px, 390px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-[linear-gradient(135deg,#111827,#374151,#0f172a)]" />
                      )}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/86 via-black/18 to-transparent" />
                    <div className="absolute left-3 top-3 rounded-full border border-black/10 bg-white/92 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-black/72 sm:left-4 sm:top-4 sm:px-3 sm:text-xs">
                      {resumeSeries ? "Resume" : heroEyebrow}
                    </div>
                    <div className="absolute bottom-3 right-3 rounded-full border border-black/10 bg-white/92 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-black/72 sm:bottom-4 sm:right-4 sm:px-3 sm:text-xs">
                      {heroSeries?.latestEpisodeId ? formatEpisodeLabel(heroSeries.latestEpisodeId) : "Featured"}
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                      <p className="line-clamp-2 text-[1.45rem] font-black uppercase leading-[0.94] tracking-[-0.04em] text-white sm:text-[1.8rem]">
                        {heroSeries?.title || "Featured"}
                      </p>
                      {heroCreatorName ? (
                        <p className="mt-2 text-xs font-black uppercase tracking-[0.12em] text-white/80">
                          {heroCreatorName}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {heroRailItems[1] ? (
                    <div className="absolute bottom-6 right-0 hidden w-36 rotate-6 xl:block">
                      <HeroRailPreviewCard
                        item={heroRailItems[1]}
                        tone="dark"
                        onClick={() =>
                          openHomeSeries(
                            heroRailItems[1].id,
                            "HOME_HERO_RAIL",
                            `home_hero_rail_${heroRailItems[1].id}`,
                          )
                        }
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
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
          hotKeywords={hotKeywords}
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
          title="Sign in"
          message=""
          returnTo="/"
          primaryLabel="Sign In"
          secondaryLabel="Create Account"
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
