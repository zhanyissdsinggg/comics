/**
 * Home page shell focused on story discovery first, with cleaner shelves below.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  BookOpenText,
  CheckCircle2,
  Compass,
  Flame,
  Gift,
  Sparkles,
} from "lucide-react";
import Cover from "../common/Cover";
import { HomeDataProvider, useHomeData } from "./HomeDataProvider";
import { useFollowStore } from "../../store/useFollowStore";
import { useHistoryStore } from "../../store/useHistoryStore";
import { useProgressStore } from "../../store/useProgressStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useBrandingStore } from "../../store/useBrandingStore";
import { trackEvent } from "../../lib/trackEvent";
import { consumeCommerceSuccessForPath, getCommerceSuccessPresentation } from "../../lib/commerceSuccess";
import { buildPathWithAttribution } from "../../lib/paymentAttribution";
import { STOREFRONT_TERMS } from "../../lib/storefrontCopy";
import { buildHomeHeroItems, getHomeEditorialSnapshot, getSeriesScore } from "../../lib/homeMerchandising";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const LoginPrompt = dynamic(() => import("../auth/LoginPrompt"), { ssr: false });
const CommerceSuccessBanner = dynamic(() => import("../common/CommerceSuccessBanner"));
const SiteHeader = dynamic(() => import("../layout/SiteHeader"), {
  ssr: false,
  loading: () => <div className="sticky top-0 z-40 h-[72px] border-b border-black/6 bg-[rgba(246,247,251,0.82)] backdrop-blur-xl" />,
});
const HomeRailsContainer = dynamic(() => import("./HomeRailsContainer"), {
  loading: () => (
    <div className="space-y-10">
      <div className="h-72 rounded-[28px] bg-white/80 shadow-[0_18px_40px_rgba(15,23,42,0.06)]" />
      <div className="h-72 rounded-[28px] bg-white/80 shadow-[0_18px_40px_rgba(15,23,42,0.06)]" />
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
  return !Number.isFinite(numeric) || numeric <= 0 ? "0%" : `${Math.round((numeric <= 1 ? numeric : numeric / 100) * 100)}%`;
}

function formatCompactNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "0";
  }
  if (numeric >= 1000000) {
    return `${(numeric / 1000000).toFixed(numeric >= 10000000 ? 0 : 1).replace(/\.0$/, "")}M`;
  }
  if (numeric >= 1000) {
    return `${(numeric / 1000).toFixed(numeric >= 10000 ? 0 : 1).replace(/\.0$/, "")}K`;
  }
  return numeric.toLocaleString();
}

function formatRating(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }
  return numeric.toFixed(1).replace(/\.0$/, "");
}

function getReadingState(series) {
  const freeEpisodeCount = Number(series?.freeEpisodeCount || 0);
  const completed = String(series?.status || "").toLowerCase() === "completed";
  if (completed) {
    return "Completed series";
  }
  if (freeEpisodeCount > 0) {
    return `${freeEpisodeCount} free chapter${freeEpisodeCount === 1 ? "" : "s"}`;
  }
  return "Updated weekly";
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

function SpotlightItem({ item, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-[22px] border border-black/6 bg-white/72 p-3 text-left shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition hover:border-black/10 hover:bg-white"
    >
      <div className="h-16 w-11 shrink-0 overflow-hidden rounded-[14px] border border-black/6 bg-slate-200">
        <Cover
          tone={item.coverTone}
          coverUrl={item.coverUrl}
          className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{item.title}</p>
        <p className="mt-1 truncate text-xs text-slate-500">{item.meta}</p>
      </div>
      <ArrowRight className="size-4 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-slate-900" />
    </button>
  );
}

function HomeEntryCard({ card, onOpenSeries, onOpenCollection }) {
  return (
    <Card className="overflow-hidden rounded-[30px] border border-black/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,249,252,0.98))] py-0 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
      <CardContent className="p-5 sm:p-6">
        <div className="max-w-[20rem]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">{card.eyebrow}</p>
          <h2 className="mt-3 font-display text-[1.75rem] font-semibold tracking-tight text-slate-950">{card.title}</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">{card.description}</p>
        </div>

        <div className="mt-6 space-y-3">
          {card.items.map((item) => (
            <SpotlightItem
              key={item.id}
              item={item}
              onClick={() => onOpenSeries(item.id, card.entryPoint, `${card.entryPoint}_${item.id}`)}
            />
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenCollection(card.href)}
          className="mt-5 h-11 rounded-full border-black/8 bg-white px-5 text-sm font-semibold text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]"
        >
          {card.ctaLabel}
          <ArrowRight className="size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { followedSeriesIds, loadFollowed } = useFollowStore();
  const { items: historyItems, loadHistory } = useHistoryStore();
  const { bySeriesId: progressMap, loadProgress } = useProgressStore();
  const { isSignedIn } = useAuthStore();
  const { branding } = useBrandingStore();
  const { loading, seriesList, homepageSlots } = useHomeData();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [commerceNotice, setCommerceNotice] = useState(null);

  useEffect(() => {
    if (isSignedIn) {
      loadFollowed();
      loadHistory();
      loadProgress();
    }
  }, [isSignedIn, loadFollowed, loadHistory, loadProgress]);

  useEffect(() => {
    const reason = searchParams.get("reason");
    const openLogin = searchParams.get("openLogin");
    const returnTo = searchParams.get("returnTo") || "/";
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
  }, [searchParams, router]);
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
  const seriesById = useMemo(() => new Map(seriesList.map((series) => [series.id, series])), [seriesList]);
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
  const featuredSignals = useMemo(() => {
    if (!featuredSeries) {
      return [];
    }

    const signals = [];
    if (Array.isArray(featuredSeries.genres)) {
      signals.push(...featuredSeries.genres.slice(0, 3));
    }
    const ratingLabel = formatRating(featuredSeries.rating);
    if (ratingLabel && Number(featuredSeries.ratingCount || 0) > 0) {
      signals.push(`${ratingLabel} stars`);
    }
    signals.push(getReadingState(featuredSeries));
    return signals;
  }, [featuredSeries]);
  const heroSupportingItems = useMemo(
    () =>
      heroItems
        .slice(1, 2)
        .map((item) => seriesById.get(item.seriesId))
        .filter(Boolean)
        .map((series) => ({
          id: series.id,
          title: series.title,
          meta:
            Array.isArray(series.genres) && series.genres.length > 0
              ? series.genres.slice(0, 2).join(" / ")
              : getReadingState(series),
          coverUrl: series.coverUrl,
          coverTone: series.coverTone,
        })),
    [heroItems, seriesById],
  );

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
  const leaderboardItems = useMemo(() => {
    const seen = new Set();
    return [
      editorialSnapshot.breakoutPick,
      editorialSnapshot.freeStartPick,
      editorialSnapshot.completedPick,
      ...editorialSnapshot.safeCatalog,
    ]
      .filter(Boolean)
      .filter((series) => {
        const seriesId = String(series?.id || "").trim();
        if (!seriesId || seen.has(seriesId)) {
          return false;
        }
        seen.add(seriesId);
        return true;
      })
      .map((series) => {
        const hasFree = Boolean(series?.hasFreeEpisodes || Number(series?.freeEpisodeCount) > 0);
        const completed = String(series?.status || "").toLowerCase() === "completed";
        const badgeTokens = [series?.badge, ...(Array.isArray(series?.badges) ? series.badges : [])]
          .filter(Boolean)
          .map((badge) => String(badge).trim().toUpperCase());
        return {
          id: series.id,
          title: series.title,
          coverUrl: series.coverUrl,
          coverTone: series.coverTone,
          statusLabel: completed
            ? "Completed series"
            : hasFree
              ? `${Number(series?.freeEpisodeCount || 0)} free chapter${Number(series?.freeEpisodeCount || 0) === 1 ? "" : "s"}`
              : "Updated weekly",
          meta:
            Array.isArray(series?.genres) && series.genres.length > 0
              ? series.genres.slice(0, 2).join(" / ")
              : series.author || "Featured series",
          score:
            getSeriesScore(series) +
            (hasFree ? 90 : 0) +
            (completed ? 70 : 0) +
            (badgeTokens.includes("HOT") ? 140 : 0) +
            (badgeTokens.includes("NEW") ? 90 : 0),
        };
      })
      .sort((left, right) => right.score - left.score)
      .slice(0, 6);
  }, [editorialSnapshot]);

  const homeEntryCards = useMemo(() => {
    const trendingItems = leaderboardItems.slice(0, 2).map((item) => ({
      id: item.id,
      title: item.title,
      meta: item.statusLabel,
      coverUrl: item.coverUrl,
      coverTone: item.coverTone,
    }));

    const freeItems = dedupeSeries([
      editorialSnapshot.freeStartPick,
      ...editorialSnapshot.safeCatalog
        .filter((series) => Number(series?.freeEpisodeCount || 0) > 0 || series?.hasFreeEpisodes)
        .sort((left, right) => {
          const freeDelta = Number(right?.freeEpisodeCount || 0) - Number(left?.freeEpisodeCount || 0);
          if (freeDelta !== 0) {
            return freeDelta;
          }
          return getSeriesScore(right) - getSeriesScore(left);
        }),
    ])
      .slice(0, 2)
      .map((series) => ({
        id: series.id,
        title: series.title,
        meta: `${Number(series?.freeEpisodeCount || 0)} free chapter${Number(series?.freeEpisodeCount || 0) === 1 ? "" : "s"}`,
        coverUrl: series.coverUrl,
        coverTone: series.coverTone,
      }));

    const completedItems = dedupeSeries([
      editorialSnapshot.completedPick,
      ...editorialSnapshot.safeCatalog
        .filter((series) => String(series?.status || "").toLowerCase() === "completed")
        .sort((left, right) => getSeriesScore(right) - getSeriesScore(left)),
    ])
      .slice(0, 2)
      .map((series) => ({
        id: series.id,
        title: series.title,
        meta: `${Number(series?.episodeCount || 0).toLocaleString()} episodes`,
        coverUrl: series.coverUrl,
        coverTone: series.coverTone,
      }));

    return [
      {
        id: "trending",
        eyebrow: "Right now",
        title: "Trending",
        description: "Start with what already has real reader momentum.",
        ctaLabel: "See all",
        href: "/rankings?type=popular&window=week",
        icon: Flame,
        entryPoint: "HOME_TRENDING_CARD",
        items: trendingItems,
      },
      {
        id: "start-free",
        eyebrow: "Easy entry",
        title: "Start Free",
        description: "Try the first few chapters before you commit.",
        ctaLabel: "See free chapters",
        href: "/rankings?type=ttf&window=all",
        icon: BookOpenText,
        entryPoint: "HOME_FREE_CARD",
        items: freeItems,
      },
      {
        id: "completed",
        eyebrow: "No waiting",
        title: "Finished Series",
        description: "For readers who would rather binge than wait.",
        ctaLabel: "See finished series",
        href: "/search?status=Completed&sort=popular",
        icon: CheckCircle2,
        entryPoint: "HOME_COMPLETED_CARD",
        items: completedItems,
      },
    ]
      .filter((card) => card.items.length > 0)
      .slice(0, 2);
  }, [editorialSnapshot, leaderboardItems]);

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

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f4f6fb] text-slate-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[38rem] bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.14),transparent_24%),radial-gradient(circle_at_78%_10%,rgba(255,255,255,0.72),transparent_22%),linear-gradient(180deg,#eef2f9_0%,#f4f6fb_72%)]" />
      <SiteHeader variant="home" />
      <main className="relative mx-auto max-w-[1320px] px-4 pb-24 sm:px-6 sm:pb-12 lg:px-8">
        <section className="py-4 md:py-6">
          {loading ? (
            <div className="aspect-[21/10] w-full animate-pulse rounded-[40px] bg-white/80 shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:aspect-[21/9] md:aspect-[21/8]" />
          ) : featuredSeries ? (
            <Card className="relative overflow-hidden rounded-[40px] border border-black/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,248,252,0.98))] py-0 shadow-[0_24px_56px_rgba(15,23,42,0.08)]">
              {featuredBannerUrl ? (
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-[0.08]"
                  style={{ backgroundImage: `url(${featuredBannerUrl})` }}
                />
              ) : null}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.08),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.72),rgba(247,249,252,0.96))]" />
              <CardContent className="relative grid gap-8 p-5 sm:p-7 xl:grid-cols-[1.04fr_0.96fr] xl:items-start xl:p-8">
                <div className="max-w-3xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Featured this week</p>
                  <h1 className="mt-4 max-w-3xl font-display text-[2.45rem] font-semibold tracking-tight text-slate-950 sm:text-[3.1rem] xl:text-[3.8rem]">
                    Read something worth staying up for.
                  </h1>
                  <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                    Start with <span className="font-semibold text-slate-950">{featuredSeries.title}</span>, try a few free chapters, or jump straight into a finished series.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2.5">
                    {featuredSignals.map((signal) => (
                      <span
                        key={signal}
                        className="rounded-full border border-black/6 bg-white/72 px-3 py-1.5 text-xs font-medium text-slate-700"
                      >
                        {signal}
                      </span>
                    ))}
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button
                      type="button"
                      size="lg"
                      onClick={() => openHomeSeries(featuredSeries.id, "HOME_HERO", "home_hero_primary")}
                      className="h-11 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      Start reading
                    </Button>
                    <Button
                      type="button"
                      size="lg"
                      variant="outline"
                      onClick={() => router.push("/rankings?type=ttf&window=all")}
                      className="h-11 rounded-full border-black/8 bg-white px-5 text-sm font-semibold text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]"
                    >
                      See free chapters
                    </Button>
                  </div>

                  <div className="mt-8 rounded-[30px] border border-black/6 bg-white/72 p-5 shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Today&apos;s pick</p>
                        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]">
                          {featuredSeries.title}
                        </h2>
                        {featuredSeries.author ? (
                          <p className="mt-1 text-sm text-slate-500">by {featuredSeries.author}</p>
                        ) : null}
                      </div>
                      {Number(featuredSeries.ratingCount || 0) > 0 ? (
                        <span className="rounded-full border border-black/6 bg-[#f8f9fc] px-3 py-1.5 text-xs font-medium text-slate-700">
                          {formatCompactNumber(featuredSeries.ratingCount)} ratings
                        </span>
                      ) : null}
                    </div>
                    {featuredSeries.description ? (
                      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{featuredSeries.description}</p>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-[228px_1fr] xl:grid-cols-[264px_1fr]">
                  <div className="overflow-hidden rounded-[30px] border border-black/6 bg-slate-200 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
                    <Cover tone={featuredSeries.coverTone} coverUrl={featuredSeries.coverUrl} className="aspect-[3/4] w-full" />
                  </div>
                  <div className="space-y-4">
                    <div className="rounded-[30px] border border-black/6 bg-white/76 p-5 shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Why this one</p>
                    <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-slate-950">{featuredSeries.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      {String(featuredSeries.status || "").toLowerCase() === "completed"
                        ? "A finished run is the easiest way to trust the site with your time."
                        : Number(featuredSeries.freeEpisodeCount || 0) > 0
                          ? `${Number(featuredSeries.freeEpisodeCount || 0)} free chapter${Number(featuredSeries.freeEpisodeCount || 0) === 1 ? "" : "s"} make it easy to know fast if it is for you.`
                          : "A strong hook and clear reader momentum make this a better first click than a random catalog pick."}
                    </p>

                    <div className="mt-6 space-y-3">
                      {formatRating(featuredSeries.rating) ? (
                        <div className="rounded-[20px] border border-black/6 bg-[#f8f9fc] p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Reader signal</p>
                          <p className="mt-1 text-sm text-slate-900">
                            {formatRating(featuredSeries.rating)} stars from {formatCompactNumber(featuredSeries.ratingCount)} readers
                          </p>
                        </div>
                      ) : null}
                      <div className="rounded-[20px] border border-black/6 bg-[#f8f9fc] p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Reading pace</p>
                        <p className="mt-1 text-sm text-slate-900">{getReadingState(featuredSeries)}</p>
                      </div>
                    </div>
                  </div>
                    {heroSupportingItems.length > 0 ? (
                      <div className="rounded-[30px] border border-black/6 bg-white/76 p-5 shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">One more pick</p>
                        <div className="mt-4 space-y-3">
                          {heroSupportingItems.map((item) => (
                            <SpotlightItem
                              key={item.id}
                              item={item}
                              onClick={() => openHomeSeries(item.id, "HOME_HERO_SECONDARY", `home_hero_secondary_${item.id}`)}
                            />
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </section>

        {commerceNotice ? (
          <div className="mb-8">
            <CommerceSuccessBanner notice={commerceNotice} onDismiss={() => setCommerceNotice(null)} />
          </div>
        ) : null}

        {isSignedIn && resumeSeries ? (
          <section className="mb-10">
            <Card className="overflow-hidden rounded-[32px] border border-black/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,248,252,0.98))] py-0 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
              <CardContent className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[1.02fr_0.98fr] xl:items-center">
                <div className="max-w-3xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Continue reading</p>
                  <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Pick up where you left off.</h2>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                    {resumeSpotlight?.progressPercent > 0 ? `${formatEpisodeLabel(resumeSpotlight.episodeId)} is ${formatPercent(resumeSpotlight.progressPercent)} complete.` : `${formatEpisodeLabel(resumeSpotlight?.episodeId)} is still the fastest way back into the story.`}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {[["Continue", continueItems.length], ["History", recentHistoryItems.length], ["Following", followedSeriesIds.length]].map(([label, value], index) => (
                      <span key={String(label)} className={`rounded-full border px-3 py-1.5 text-sm ${index === 0 ? "border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.08)] text-slate-800" : "border-black/6 bg-white/72 text-slate-700"}`}>
                        <span className="font-semibold text-slate-950">{Number(value).toLocaleString()}</span>
                        <span className="ml-2 text-slate-500">{label}</span>
                      </span>
                    ))}
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button type="button" size="lg" onClick={goResume} className="h-11 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-slate-800">Continue reading</Button>
                    <Button type="button" size="lg" variant="outline" onClick={() => router.push(`/series/${resumeSeries.id}`)} className="h-11 rounded-full border-black/8 bg-white px-5 text-sm font-semibold text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]">Open series</Button>
                    <Button type="button" size="lg" variant="outline" onClick={() => router.push("/library")} className="h-11 rounded-full border-black/8 bg-white px-5 text-sm font-semibold text-slate-700 hover:border-black/12 hover:bg-[#f8f9fc]">Library</Button>
                  </div>
                </div>
                <div className="rounded-[28px] border border-black/6 bg-white/72 p-4 sm:p-5">
                  <div className="grid gap-4 sm:grid-cols-[148px_1fr]">
                    <div className="aspect-[3/4] rounded-[24px] border border-black/6 bg-neutral-900 bg-cover bg-center shadow-[0_16px_32px_rgba(15,23,42,0.08)]" style={resumeSeries.coverUrl ? { backgroundImage: `linear-gradient(180deg,rgba(12,18,24,0.04),rgba(12,18,24,0.24)), url(${resumeSeries.coverUrl})` } : undefined} />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Up next</p>
                      <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-slate-950">{resumeSeries.title}</h3>
                      <p className="mt-3 text-sm text-slate-600">{formatEpisodeLabel(resumeSpotlight?.episodeId)}{resumeSpotlight?.progressPercent > 0 ? ` / ${formatPercent(resumeSpotlight.progressPercent)} complete` : " / Ready to reopen"}</p>
                      {Array.isArray(resumeSeries.genres) && resumeSeries.genres.length > 0 ? <p className="mt-2 text-sm text-slate-500">{resumeSeries.genres.slice(0, 3).join(" / ")}</p> : null}
                      <div className="mt-4 flex flex-wrap gap-2">
                        {resumeSeries.badge ? <Badge variant="outline" className="rounded-full border-black/8 bg-white px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-700">{resumeSeries.badge}</Badge> : null}
                        {followedSeriesIds.includes(resumeSeries.id) ? <Badge variant="outline" className="rounded-full border-[rgba(47,107,255,0.16)] bg-[rgba(47,107,255,0.08)] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-800">Following</Badge> : null}
                        {resumeSeries.status ? <Badge variant="outline" className="rounded-full border-black/8 bg-[#f8f9fc] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">{resumeSeries.status}</Badge> : null}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        ) : null}

        {homeEntryCards.length > 0 ? (
          <section className="mb-12 grid gap-4 lg:grid-cols-2">
            {homeEntryCards.map((card) => (
              <HomeEntryCard
                key={card.id}
                card={card}
                onOpenSeries={openHomeSeries}
                onOpenCollection={(href) => router.push(href)}
              />
            ))}
          </section>
        ) : null}

        <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Keep browsing</p>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2.2rem]">A few more picks. Nothing extra.</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">The shelves below stay short on purpose, so browsing still feels calm.</p>
          </div>
          <Button
            type="button"
            size="lg"
            variant="outline"
            onClick={() => router.push("/search")}
            className="h-11 rounded-full border-black/8 bg-white px-5 text-sm font-semibold text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]"
          >
            <Compass className="size-4" />
            Browse all series
          </Button>
        </section>

        {loading ? (
          <div className="space-y-10">
            <div className="h-72 rounded-[28px] bg-white/80 shadow-[0_18px_40px_rgba(15,23,42,0.06)]" />
            <div className="h-72 rounded-[28px] bg-white/80 shadow-[0_18px_40px_rgba(15,23,42,0.06)]" />
          </div>
        ) : (
          <HomeRailsContainer appearance="light" />
        )}

        <LoginPrompt
          isOpen={showLoginPrompt}
          onClose={() => setShowLoginPrompt(false)}
          eyebrow={STOREFRONT_TERMS.readerBenefits}
          title="Save your library and pick up where you left off"
          message="Sign in to sync your library, keep your progress, claim rewards, and make every return visit faster."
          returnTo="/"
          primaryLabel="Sign in and sync"
          secondaryLabel="Create free account"
          features={[
            { icon: BookOpen, text: "Resume chapters and keep your library synced across devices" },
            { icon: Gift, text: "Claim daily rewards, mission payouts, and bonus points" },
            { icon: Sparkles, text: "Get better picks based on what you actually read" },
          ]}
        />
      </main>
    </div>
  );
}

export default function HomePage() {
  return <HomeDataProvider><HomeContent /></HomeDataProvider>;
}
