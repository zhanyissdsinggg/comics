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
  loading: () => <div className="sticky top-0 z-40 h-[72px] border-b border-white/5 bg-neutral-950/90" />,
});
const HomeRailsContainer = dynamic(() => import("./HomeRailsContainer"), {
  loading: () => (
    <div className="space-y-10">
      <div className="h-72 rounded-[28px] bg-neutral-900/60" />
      <div className="h-72 rounded-[28px] bg-neutral-900/60" />
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
      className="group flex w-full items-center gap-3 rounded-[24px] border border-white/10 bg-black/20 p-3 text-left transition hover:border-white/20 hover:bg-white/[0.05]"
    >
      <div className="h-16 w-11 shrink-0 overflow-hidden rounded-[14px] border border-white/10 bg-neutral-900">
        <Cover
          tone={item.coverTone}
          coverUrl={item.coverUrl}
          className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{item.title}</p>
        <p className="mt-1 truncate text-xs text-neutral-400">{item.meta}</p>
      </div>
      <ArrowRight className="size-4 shrink-0 text-neutral-500 transition group-hover:translate-x-1 group-hover:text-white" />
    </button>
  );
}

function HomeEntryCard({ card, onOpenSeries, onOpenCollection }) {
  const Icon = card.icon;

  return (
    <Card className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,24,39,0.92),rgba(10,14,22,0.98))] py-0 shadow-[0_26px_90px_rgba(0,0,0,0.28)]">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="max-w-[18rem]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">{card.eyebrow}</p>
            <h2 className="mt-3 font-display text-[1.7rem] font-semibold tracking-tight text-white">{card.title}</h2>
            <p className="mt-2 text-sm leading-7 text-neutral-300">{card.description}</p>
          </div>
          <div className="flex size-11 shrink-0 items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.05] text-white">
            <Icon className="size-5" />
          </div>
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
          className="mt-5 h-11 rounded-full border-white/10 bg-white/[0.04] px-5 text-sm font-semibold text-white hover:border-white/20 hover:bg-white/[0.08]"
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
    const trendingItems = leaderboardItems.slice(0, 3).map((item) => ({
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
      .slice(0, 3)
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
      .slice(0, 3)
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
        title: "Trending Now",
        description: "The fastest way to land on something readers are already opening.",
        ctaLabel: "Open the chart",
        href: "/rankings?type=popular&window=week",
        icon: Flame,
        entryPoint: "HOME_TRENDING_CARD",
        items: trendingItems,
      },
      {
        id: "start-free",
        eyebrow: "Easy entry",
        title: "Start Free",
        description: "Try the hook first, then decide what deserves your time.",
        ctaLabel: "Browse free chapters",
        href: "/rankings?type=ttf&window=all",
        icon: BookOpenText,
        entryPoint: "HOME_FREE_CARD",
        items: freeItems,
      },
      {
        id: "completed",
        eyebrow: "No waiting",
        title: "Completed Series",
        description: "Finished runs for readers who would rather binge than babysit updates.",
        ctaLabel: "See finished runs",
        href: "/search?status=Completed&sort=popular",
        icon: CheckCircle2,
        entryPoint: "HOME_COMPLETED_CARD",
        items: completedItems,
      },
    ].filter((card) => card.items.length > 0);
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
    <div className="min-h-screen bg-transparent">
      <SiteHeader />
      <main className="mx-auto max-w-[1320px] px-4 pb-24 sm:px-6 sm:pb-10 lg:px-8">
        <section className="py-4 md:py-6">
          {loading ? (
            <div className="aspect-[21/10] w-full animate-pulse rounded-[36px] bg-neutral-800 sm:aspect-[21/9] md:aspect-[21/8]" />
          ) : featuredSeries ? (
            <Card className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,17,24,0.92),rgba(8,11,18,0.98))] py-0 shadow-[0_30px_110px_rgba(0,0,0,0.36)]">
              {featuredBannerUrl ? (
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-30"
                  style={{ backgroundImage: `url(${featuredBannerUrl})` }}
                />
              ) : null}
              <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(8,11,18,0.94)_18%,rgba(8,11,18,0.74)_56%,rgba(8,11,18,0.94)_100%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_28%),radial-gradient(circle_at_78%_18%,rgba(255,255,255,0.08),transparent_24%)]" />
              <CardContent className="relative grid gap-8 p-5 sm:p-7 xl:grid-cols-[1.15fr_0.85fr] xl:items-end xl:p-8">
                <div className="max-w-3xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">Today&apos;s spotlight</p>
                  <h1 className="mt-4 max-w-3xl font-display text-[2.4rem] font-semibold tracking-tight text-white sm:text-[3rem] xl:text-[3.55rem]">
                    Find a comic worth getting obsessed with.
                  </h1>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-neutral-200 sm:text-base">
                    Start with <span className="font-semibold text-white">{featuredSeries.title}</span>, sample free chapters, or jump straight into a finished binge.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {featuredSignals.map((signal) => (
                      <span
                        key={signal}
                        className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-neutral-100"
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
                      className="h-11 rounded-full bg-white px-5 text-sm font-semibold text-neutral-950 hover:bg-neutral-200"
                    >
                      Start Reading
                    </Button>
                    <Button
                      type="button"
                      size="lg"
                      variant="outline"
                      onClick={() => router.push("/rankings?type=ttf&window=all")}
                      className="h-11 rounded-full border-white/10 bg-white/[0.04] px-5 text-sm font-semibold text-white hover:border-white/20 hover:bg-white/[0.08]"
                    >
                      Browse Free Chapters
                    </Button>
                  </div>

                  <div className="mt-8 rounded-[28px] border border-white/10 bg-black/20 p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">Featured series</p>
                        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white sm:text-[2rem]">
                          {featuredSeries.title}
                        </h2>
                        {featuredSeries.author ? (
                          <p className="mt-1 text-sm text-neutral-400">by {featuredSeries.author}</p>
                        ) : null}
                      </div>
                      {Number(featuredSeries.ratingCount || 0) > 0 ? (
                        <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-neutral-200">
                          {formatCompactNumber(featuredSeries.ratingCount)} ratings
                        </span>
                      ) : null}
                    </div>
                    {featuredSeries.description ? (
                      <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-300">{featuredSeries.description}</p>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-[220px_1fr] xl:grid-cols-[248px_1fr]">
                  <div className="overflow-hidden rounded-[28px] border border-white/10 bg-neutral-900 shadow-[0_20px_70px_rgba(0,0,0,0.3)]">
                    <Cover tone={featuredSeries.coverTone} coverUrl={featuredSeries.coverUrl} className="aspect-[3/4] w-full" />
                  </div>
                  <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">Why start here</p>
                    <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-white">{featuredSeries.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-neutral-300">
                      {String(featuredSeries.status || "").toLowerCase() === "completed"
                        ? "A finished run is the easiest way to trust the site with your time."
                        : Number(featuredSeries.freeEpisodeCount || 0) > 0
                          ? `${Number(featuredSeries.freeEpisodeCount || 0)} free chapter${Number(featuredSeries.freeEpisodeCount || 0) === 1 ? "" : "s"} make this an easy first click.`
                          : "Strong reader momentum and a clean entry point make this a safer first read than a random catalog card."}
                    </p>

                    <div className="mt-6 space-y-3">
                      {formatRating(featuredSeries.rating) ? (
                        <div className="rounded-[20px] border border-white/10 bg-black/20 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">Reader signal</p>
                          <p className="mt-1 text-sm text-white">
                            {formatRating(featuredSeries.rating)} stars from {formatCompactNumber(featuredSeries.ratingCount)} readers
                          </p>
                        </div>
                      ) : null}
                      <div className="rounded-[20px] border border-white/10 bg-black/20 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">Reading pace</p>
                        <p className="mt-1 text-sm text-white">{getReadingState(featuredSeries)}</p>
                      </div>
                      <div className="rounded-[20px] border border-white/10 bg-black/20 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">What to do next</p>
                        <p className="mt-1 text-sm text-white">Hit the featured title first, then use the three lanes below to keep browsing fast.</p>
                      </div>
                    </div>
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
            <Card className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,24,39,0.92),rgba(10,14,22,0.98))] py-0 shadow-[0_26px_90px_rgba(0,0,0,0.28)]">
              <CardContent className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[1.02fr_0.98fr] xl:items-center">
                <div className="max-w-3xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">Continue reading</p>
                  <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">Jump back into {resumeSeries.title}.</h2>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-neutral-200 sm:text-base">
                    {resumeSpotlight?.progressPercent > 0 ? `${formatEpisodeLabel(resumeSpotlight.episodeId)} is ${formatPercent(resumeSpotlight.progressPercent)} complete.` : `${formatEpisodeLabel(resumeSpotlight?.episodeId)} is still the fastest way back into the story.`}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {[["Continue", continueItems.length], ["History", recentHistoryItems.length], ["Following", followedSeriesIds.length]].map(([label, value], index) => (
                      <span key={String(label)} className={`rounded-full border px-3 py-1.5 text-sm ${index === 0 ? "border-emerald-400/30 bg-emerald-400/[0.08] text-emerald-100" : "border-white/10 bg-white/[0.04] text-neutral-200"}`}>
                        <span className="font-semibold text-white">{Number(value).toLocaleString()}</span>
                        <span className="ml-2 text-neutral-400">{label}</span>
                      </span>
                    ))}
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button type="button" size="lg" onClick={goResume} className="h-11 rounded-full bg-white px-5 text-sm font-semibold text-neutral-950 hover:bg-neutral-200">Continue {formatEpisodeLabel(resumeSpotlight?.episodeId)}</Button>
                    <Button type="button" size="lg" variant="outline" onClick={() => router.push(`/series/${resumeSeries.id}`)} className="h-11 rounded-full border-white/10 bg-white/[0.04] px-5 text-sm font-semibold text-white hover:border-white/20 hover:bg-white/[0.08]">Open series page</Button>
                    <Button type="button" size="lg" variant="outline" onClick={() => router.push("/library")} className="h-11 rounded-full border-white/10 bg-black/20 px-5 text-sm font-semibold text-neutral-200 hover:border-white/20 hover:bg-white/[0.06]">Open library</Button>
                  </div>
                </div>
                <div className="rounded-[28px] border border-white/10 bg-black/20 p-4 sm:p-5">
                  <div className="grid gap-4 sm:grid-cols-[148px_1fr]">
                    <div className="aspect-[3/4] rounded-[24px] border border-white/10 bg-neutral-900 bg-cover bg-center shadow-[0_20px_50px_rgba(0,0,0,0.22)]" style={resumeSeries.coverUrl ? { backgroundImage: `linear-gradient(180deg,rgba(12,18,24,0.04),rgba(12,18,24,0.24)), url(${resumeSeries.coverUrl})` } : undefined} />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">Up next</p>
                      <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-white">{resumeSeries.title}</h3>
                      <p className="mt-3 text-sm text-neutral-300">{formatEpisodeLabel(resumeSpotlight?.episodeId)}{resumeSpotlight?.progressPercent > 0 ? ` / ${formatPercent(resumeSpotlight.progressPercent)} complete` : " / Ready to reopen"}</p>
                      {Array.isArray(resumeSeries.genres) && resumeSeries.genres.length > 0 ? <p className="mt-2 text-sm text-neutral-400">{resumeSeries.genres.slice(0, 3).join(" / ")}</p> : null}
                      <div className="mt-4 flex flex-wrap gap-2">
                        {resumeSeries.badge ? <Badge variant="outline" className="rounded-full border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white">{resumeSeries.badge}</Badge> : null}
                        {followedSeriesIds.includes(resumeSeries.id) ? <Badge variant="outline" className="rounded-full border-emerald-400/20 bg-emerald-400/[0.1] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-emerald-200">Following</Badge> : null}
                        {resumeSeries.status ? <Badge variant="outline" className="rounded-full border-white/10 bg-black/20 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-neutral-300">{resumeSeries.status}</Badge> : null}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        ) : null}

        {homeEntryCards.length > 0 ? (
          <section className="mb-12 grid gap-4 lg:grid-cols-3">
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">Keep browsing</p>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white sm:text-[2.2rem]">More good reads, less homepage clutter.</h2>
            <p className="mt-3 text-sm leading-7 text-neutral-300">Below the spotlight, the shelves stay focused on a few strong lanes instead of explaining the platform to you.</p>
          </div>
          <Button
            type="button"
            size="lg"
            variant="outline"
            onClick={() => router.push("/search")}
            className="h-11 rounded-full border-white/10 bg-white/[0.04] px-5 text-sm font-semibold text-white hover:border-white/20 hover:bg-white/[0.08]"
          >
            <Compass className="size-4" />
            Browse all series
          </Button>
        </section>

        {loading ? (
          <div className="space-y-10">
            <div className="h-72 rounded-[28px] bg-neutral-900/60" />
            <div className="h-72 rounded-[28px] bg-neutral-900/60" />
          </div>
        ) : (
          <HomeRailsContainer />
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
