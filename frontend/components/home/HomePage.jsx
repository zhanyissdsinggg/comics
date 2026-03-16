/**
 * Home page shell: hero, genre chips and recommendation rails.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, Gift, Sparkles } from "lucide-react";
import { HomeDataProvider, useHomeData } from "./HomeDataProvider";
import { useFollowStore } from "../../store/useFollowStore";
import { useHistoryStore } from "../../store/useHistoryStore";
import { useProgressStore } from "../../store/useProgressStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useBrandingStore } from "../../store/useBrandingStore";
import { trackEvent } from "../../lib/trackEvent";
import { siteConfig } from "../../lib/siteConfig";
import {
  consumeCommerceSuccessForPath,
  getCommerceSuccessPresentation,
} from "../../lib/commerceSuccess";
import { buildPathWithAttribution } from "../../lib/paymentAttribution";
import { STOREFRONT_TERMS } from "../../lib/storefrontCopy";
import {
  buildHomeHeroItems,
  getHomeEditorialSnapshot,
  getHomeEditorialStats,
  getReaderProof,
  getSeriesScore,
} from "../../lib/homeMerchandising";

const LoginPrompt = dynamic(() => import("../auth/LoginPrompt"), {
  ssr: false,
});
const CommerceSuccessBanner = dynamic(() => import("../common/CommerceSuccessBanner"));
const StorefrontContinuationStrip = dynamic(() => import("../common/StorefrontContinuationStrip"));
const StorefrontEventHub = dynamic(() => import("../common/StorefrontEventHub"));
const StorefrontPathwaysGrid = dynamic(() => import("../common/StorefrontPathwaysGrid"));

const GENRE_CHIPS = [
  { id: "all", label: "All" },
  { id: "action", label: "Action" },
  { id: "romance", label: "Romance" },
  { id: "fantasy", label: "Fantasy" },
  { id: "drama", label: "Drama" },
  { id: "thriller", label: "Thriller" },
  { id: "comedy", label: "Comedy" },
  { id: "sci-fi", label: "Sci-Fi" },
  { id: "horror", label: "Horror" },
];

const HOME_PILLARS = ["Start free", "Find your next binge", "Pick up fast"];

function toTimestamp(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const parsed = Date.parse(value || "");
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatEpisodeLabel(episodeId) {
  const raw = String(episodeId || "").trim();
  if (!raw) {
    return "Episode";
  }

  const match = raw.match(/(\d+)(?!.*\d)/);
  return match ? `Episode ${match[1]}` : raw;
}

function SkeletonRail() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-36 animate-pulse rounded bg-neutral-800" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="aspect-[3/4] animate-pulse rounded-xl bg-neutral-800" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-neutral-800" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-neutral-800" />
          </div>
        ))}
      </div>
    </div>
  );
}

function HeroBannerSkeleton() {
  return (
    <div className="aspect-[21/9] w-full animate-pulse rounded-2xl bg-neutral-800 sm:aspect-[21/8] md:aspect-[21/7]" />
  );
}

const SiteHeader = dynamic(() => import("../layout/SiteHeader"), {
  ssr: false,
  loading: () => <div className="sticky top-0 z-40 h-[72px] border-b border-white/5 bg-neutral-950/90" />,
});

const HeroCarousel = dynamic(() => import("./HeroCarousel"), {
  loading: () => <HeroBannerSkeleton />,
});

const HomeRailsContainer = dynamic(() => import("./HomeRailsContainer"), {
  loading: () => (
    <div className="space-y-10">
      <SkeletonRail />
      <SkeletonRail />
      <SkeletonRail />
    </div>
  ),
});

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { followedSeriesIds, loadFollowed } = useFollowStore();
  const { branding } = useBrandingStore();
  const { items: historyItems, loadHistory } = useHistoryStore();
  const { bySeriesId: progressMap, loadProgress } = useProgressStore();
  const { isSignedIn } = useAuthStore();
  const { loading, seriesList, hotKeywords, homepageSlots, hotWindow, setHotWindow } = useHomeData();

  const [activeGenre, setActiveGenre] = useState("all");
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
    [homepageSlots, seriesList, branding?.homeBannerUrl],
  );

  const editorialSnapshot = useMemo(
    () => getHomeEditorialSnapshot(seriesList, { homepageSlots }),
    [homepageSlots, seriesList],
  );

  const seriesById = useMemo(
    () => new Map(seriesList.map((series) => [series.id, series])),
    [seriesList],
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
          if (!series || !progress?.lastEpisodeId) {
            return null;
          }

          return {
            seriesId,
            episodeId: progress.lastEpisodeId,
            title: series.title,
            progressPercent: Number(progress.percent || 0),
            updatedAt: toTimestamp(progress.updatedAt),
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
          if (!series || !entry?.episodeId) {
            return null;
          }

          return {
            seriesId: entry.seriesId,
            episodeId: entry.episodeId,
            title: series.title,
            updatedAt: toTimestamp(entry.createdAt),
          };
        })
        .filter(Boolean)
        .sort((left, right) => right.updatedAt - left.updatedAt),
    [historyItems, seriesById],
  );

  const resumeSpotlight = continueItems[0] || recentHistoryItems[0] || null;
  const resumeSeries = useMemo(
    () => (resumeSpotlight ? seriesById.get(resumeSpotlight.seriesId) || null : null),
    [resumeSpotlight, seriesById],
  );

  const returnLaneCompanions = useMemo(() => {
    if (!resumeSeries) {
      return [];
    }

    const seedGenres = Array.isArray(resumeSeries.genres) ? resumeSeries.genres : [];

    return seriesList
      .filter((series) => series.id !== resumeSeries.id)
      .map((series) => {
        const overlap = Array.isArray(series.genres)
          ? series.genres.filter((genre) => seedGenres.includes(genre)).length
          : 0;

        return {
          series,
          score: overlap * 5 + getSeriesScore(series) + getReaderProof(series) / 1000,
        };
      })
      .sort((left, right) => right.score - left.score)
      .slice(0, 3)
      .map(({ series }) => series);
  }, [resumeSeries, seriesList]);

  const returnLaneStats = useMemo(
    () => [
      {
        label: "Continue",
        value: continueItems.length.toLocaleString(),
        hint: continueItems.length > 0 ? "Active reading threads ready to resume." : "Your next active thread will surface here.",
      },
      {
        label: "History",
        value: recentHistoryItems.length.toLocaleString(),
        hint: recentHistoryItems.length > 0 ? "Recent reading visits still warm." : "Recent visits appear once you open chapters.",
      },
      {
        label: "Following",
        value: followedSeriesIds.length.toLocaleString(),
        hint: followedSeriesIds.length > 0 ? "Saved series that can pull you back in." : "Followed titles will stack here once saved.",
      },
    ],
    [continueItems.length, followedSeriesIds.length, recentHistoryItems.length],
  );

  const handleResumeSpotlight = () => {
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

  const editorialStats = useMemo(
    () => getHomeEditorialStats(seriesList, { loading }),
    [loading, seriesList],
  );

  const editorialCards = useMemo(() => {
    if (!Array.isArray(seriesList) || seriesList.length === 0) {
      return [];
    }
    const { completedPick, freeStartPick, breakoutPick, adultCount } = editorialSnapshot;

    return [
      completedPick
        ? {
            id: "completed-pick",
            eyebrow: "Weekend binge",
            title: completedPick.title,
            description: "Completed series with enough momentum to carry a full-session read.",
            meta: `${completedPick.status || "Completed"} · ${Number(completedPick.rating || 0).toFixed(1)} rating`,
            cta: "Open binge pick",
            onClick: () => router.push(`/series/${completedPick.id}`),
          }
        : null,
      freeStartPick
        ? {
            id: "free-start-pick",
            eyebrow: "Free-to-start",
            title: freeStartPick.title,
            description: "A cleaner first click for new readers who want to sample before spending.",
            meta: `${freeStartPick.freeEpisodeCount || 0} free episodes available`,
            cta: "Start free preview",
            onClick: () => router.push(`/series/${freeStartPick.id}`),
          }
        : null,
      breakoutPick
        ? {
            id: "breakout-pick",
            eyebrow: "Breakout launch",
            title: breakoutPick.title,
            description: "Recent heat from the catalog that deserves front-page attention.",
            meta: breakoutPick.genres?.slice(0, 2).join(" · ") || "Fresh release",
            cta: "Open breakout title",
            onClick: () => router.push(`/series/${breakoutPick.id}`),
          }
        : null,
      {
        id: "adult-hub",
        eyebrow: "Protected 18+ lane",
        title: adultCount > 0 ? `${adultCount} mature titles behind the gate` : "18+ titles stay protected",
        description: "Browse mature titles in a separate lane with clear access rules and less accidental friction.",
        meta: "Sign-in and age confirmation required",
        cta: "Open 18+ hub",
        onClick: () => router.push("/adult"),
      },
    ].filter(Boolean);
  }, [editorialSnapshot, router, seriesList]);

  const discoverySignals = useMemo(() => {
    const keywordItems = Array.isArray(hotKeywords) ? hotKeywords.filter(Boolean).slice(0, 8) : [];

    return keywordItems.map((item, index) => {
      if (typeof item === "string") {
        return {
          id: `${item}-${index}`,
          label: item,
          hint: "Trending search",
        };
      }

      return {
        id: `${item.keyword || item.label || "keyword"}-${index}`,
        label: item.keyword || item.label || "Trending",
        hint:
          item.growthLabel ||
          item.badge ||
          (typeof item.count === "number" ? `${item.count.toLocaleString()} searches` : "Trending search"),
      };
    });
  }, [hotKeywords]);

  const homeEventCards = useMemo(() => {
    if (!Array.isArray(seriesList) || seriesList.length === 0) {
      return [];
    }
    const {
      completedPick,
      freeStartPick,
      breakoutPick,
      completedSeriesCount,
      freeStartSeriesCount,
    } = editorialSnapshot;
    const leadSignal = discoverySignals[0] || null;

    return [
      {
        id: "weekend-desk",
        eyebrow: "Weekend binge",
        title: completedPick
          ? `Binge ${completedPick.title} without waiting on the next update.`
          : "Completed series are the easiest way into a long reading session.",
        description: completedPick
          ? "Finished stories are a great pick when you want payoff, momentum, and no release gap between chapters."
          : "Completed runs are the cleanest entry point when readers want depth, payoff, and no waiting.",
        signalLabel: "Completed",
        signalValue: completedSeriesCount.toLocaleString(),
        signalHint: "Finished runs ready for full-session reading",
        ctaLabel: "Browse completed",
        onClick: () => router.push("/search?status=Completed&sort=popular"),
        accentClass:
          "group border-white/10 bg-white/[0.04] text-neutral-100 hover:border-white/20 hover:bg-white/[0.08]",
      },
      {
        id: "free-start-desk",
        eyebrow: STOREFRONT_TERMS.freeStart,
        title: freeStartPick
          ? `${freeStartPick.title} is an easy place to start for free.`
          : "Free episodes should be the first click for brand-new readers.",
        description: freeStartPick
          ? "Free episodes make the first click easier and let readers decide whether they want more."
          : "Put free chapters up front so readers can sample the story before they spend.",
        signalLabel: "Openers",
        signalValue: freeStartSeriesCount.toLocaleString(),
        signalHint: "Series with free episodes available",
        ctaLabel: freeStartPick ? "Open free-start pick" : "Open free unlock chart",
        onClick: () => {
          if (!freeStartPick?.id) {
            router.push("/rankings?type=ttf&window=all");
            return;
          }

          const targetPath = `/series/${freeStartPick.id}`;
          router.push(
            buildPathWithAttribution(targetPath, {
              entryPoint: "HOME_EVENT_HUB",
              campaignId: "free_start_lane",
              sourcePath: "/",
              sourceSeriesId: freeStartPick.id,
              returnTo: targetPath,
            }),
          );
        },
        accentClass:
          "group border-emerald-400/30 bg-emerald-400/10 text-emerald-200 hover:border-emerald-300/50 hover:bg-emerald-400/15",
      },
      {
        id: "breakout-radar",
        eyebrow: "Trending now",
        title: breakoutPick
          ? `${breakoutPick.title} is climbing fast this week.`
          : "See what's gaining heat before the rest of the catalog catches up.",
        description: leadSignal
          ? `Readers are already searching for ${leadSignal.label}. This is the moment to jump into what's hot.`
          : "Fresh momentum works best when it leads straight into a chart, a series page, or your next follow.",
        signalLabel: "Live signal",
        signalValue: leadSignal?.label || "HOT",
        signalHint: leadSignal?.hint || "Trending search momentum",
        ctaLabel: "Open weekly chart",
        onClick: () => router.push("/rankings?type=popular&window=week"),
        accentClass:
          "group border-white/10 bg-white/[0.04] text-neutral-100 hover:border-white/20 hover:bg-white/[0.08]",
      },
    ];
  }, [discoverySignals, editorialSnapshot, router, seriesList]);

  const onboardingCards = useMemo(() => {
    const freeStartCard = editorialCards.find((card) => card.id === "free-start-pick");
    const breakoutCard = editorialCards.find((card) => card.id === "breakout-pick");
    const completedCard = editorialCards.find((card) => card.id === "completed-pick");

    return [
      {
        id: "start-free",
        eyebrow: "New reader path",
        title: freeStartCard ? `Start with ${freeStartCard.title}` : "Start with a free preview lane",
        description: freeStartCard
          ? "Free episodes give new readers a clean first click before they have to think about points or plans."
          : "Free-to-start titles let first-time visitors sample the product before spending.",
        cta: freeStartCard ? "Open free preview" : "Browse free-start titles",
        onClick: freeStartCard?.onClick || (() => router.push("/search?sort=popular")),
        accentClass:
          "border-emerald-400/30 bg-emerald-400/10 text-emerald-200 hover:border-emerald-300/50 hover:bg-emerald-400/15",
      },
      {
        id: "keep-progress",
        eyebrow: isSignedIn ? "Return path" : "Account perks",
        title: isSignedIn ? "Jump back in without searching" : "Save progress, rewards, and your library",
        description: isSignedIn
          ? "Returning readers should be able to reach unfinished chapters, rewards, and their saved shelf in one tap."
          : "Signing in should clearly pay off: synced progress, daily rewards, and faster return visits.",
        cta: isSignedIn ? "Open library" : "Sign in free",
        onClick: isSignedIn ? () => router.push("/library") : () => setShowLoginPrompt(true),
        accentClass:
          "border-white/10 bg-white/[0.04] text-neutral-100 hover:border-white/20 hover:bg-white/[0.08]",
      },
      {
        id: "momentum",
        eyebrow: "Live momentum",
        title: breakoutCard ? `See why ${breakoutCard.title} is trending` : "See what's trending this week",
        description: breakoutCard
          ? "A fast-rising title is often the easiest way to turn casual browsing into a confident first read."
          : "Charts are the fastest way to show readers what everyone is opening right now.",
        cta: "Open weekly chart",
        onClick: () => router.push("/rankings?type=popular&window=week"),
        accentClass:
          "border-white/10 bg-white/[0.04] text-neutral-100 hover:border-white/20 hover:bg-white/[0.08]",
      },
      {
        id: "value-path",
        eyebrow: "Spend-smart path",
        title: completedCard ? `Compare plans before you unlock more of ${completedCard.title}` : "Compare plans before you unlock more",
        description:
          "Show points, free unlock value, and membership savings before the paywall becomes a surprise.",
        cta: STOREFRONT_TERMS.compareMembership,
        onClick: () => router.push("/subscribe"),
        accentClass:
          "border-white/10 bg-white/[0.04] text-neutral-100 hover:border-white/20 hover:bg-white/[0.08]",
      },
    ];
  }, [editorialCards, isSignedIn, router]);

  return (
    <div className="min-h-screen bg-transparent">
      <SiteHeader />

      <main className="mx-auto max-w-[1280px] px-4 pb-24 sm:px-6 sm:pb-8 lg:px-8">
        <div className="py-4 md:py-6">
          {loading ? <HeroBannerSkeleton /> : <HeroCarousel items={heroItems} />}
        </div>

        {commerceNotice ? (
          <div className="mb-8">
            <CommerceSuccessBanner
              notice={commerceNotice}
              onDismiss={() => setCommerceNotice(null)}
            />
          </div>
        ) : null}

        {isSignedIn && resumeSeries ? (
          <section className="mb-8 overflow-hidden rounded-[32px] border border-emerald-400/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.12),rgba(255,255,255,0.03))] px-5 py-6 shadow-[0_24px_100px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:px-7 sm:py-8 lg:px-10">
            <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr] xl:items-start">
              <div className="max-w-3xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-emerald-300/85">
                  Continue reading
                </p>
                <h2 className="mt-4 font-display text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
                  Jump back into {resumeSeries.title}.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-neutral-200 sm:text-base">
                  {resumeSpotlight?.progressPercent > 0
                    ? `${formatEpisodeLabel(resumeSpotlight.episodeId)} is already ${resumeSpotlight.progressPercent}% complete. The best return experience is one tap back into the exact chapter where momentum was building.`
                    : `${formatEpisodeLabel(resumeSpotlight?.episodeId)} is still your freshest thread. Resume first, then widen discovery after the story has you again.`}
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleResumeSpotlight}
                    className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200"
                  >
                    Continue {formatEpisodeLabel(resumeSpotlight?.episodeId)}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/series/${resumeSeries.id}`)}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
                  >
                    Open series page
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/library")}
                    className="rounded-full border border-white/10 bg-black/20 px-5 py-2.5 text-sm font-semibold text-neutral-200 transition hover:border-white/20 hover:bg-white/[0.06]"
                  >
                    Open library
                  </button>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {returnLaneStats.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4 shadow-[0_18px_60px_rgba(0,0,0,0.14)] backdrop-blur-lg"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">
                        {stat.label}
                      </p>
                      <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-white">
                        {stat.value}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-neutral-400">{stat.hint}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-black/20 p-5 shadow-[0_24px_100px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:p-6">
                <div className="grid gap-4 sm:grid-cols-[132px_1fr]">
                  <div
                    className="aspect-[3/4] rounded-[24px] border border-white/10 bg-neutral-900 bg-cover bg-center shadow-[0_20px_60px_rgba(0,0,0,0.24)]"
                    style={
                      resumeSeries.coverUrl
                        ? {
                            backgroundImage: `linear-gradient(180deg,rgba(12,18,24,0.04),rgba(12,18,24,0.24)), url(${resumeSeries.coverUrl})`,
                          }
                        : undefined
                    }
                  />

                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                      Reading thread
                    </p>
                    <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-white">
                      {resumeSeries.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-neutral-300">
                      {formatEpisodeLabel(resumeSpotlight?.episodeId)}{resumeSpotlight?.progressPercent > 0 ? ` · ${resumeSpotlight.progressPercent}% complete` : " · Ready to reopen"}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-neutral-400">
                      {Array.isArray(resumeSeries.genres) && resumeSeries.genres.length > 0
                        ? resumeSeries.genres.slice(0, 3).join(" · ")
                        : "Creator-led premium reading thread"}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {resumeSeries.badge ? (
                        <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                          {resumeSeries.badge}
                        </span>
                      ) : null}
                      {followedSeriesIds.includes(resumeSeries.id) ? (
                        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
                          Following
                        </span>
                      ) : null}
                      {resumeSeries.status ? (
                        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-300">
                          {resumeSeries.status}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <StorefrontContinuationStrip
                  series={resumeSeries}
                  similarItems={returnLaneCompanions}
                  sourcePath="/"
                  returnTo="/"
                  entryPoint="HOME_RETURN_LANE"
                  compact
                  className="mt-6"
                />
              </div>
            </div>
          </section>
        ) : null}

        <section className="relative mb-8 overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] px-5 py-6 shadow-[0_24px_100px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:px-7 sm:py-8 lg:px-10 lg:py-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_34%),radial-gradient(circle_at_88%_18%,rgba(34,211,238,0.12),transparent_22%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-emerald-300/85">
                Featured this week
              </p>
              <h1 className="mt-4 font-display text-4xl font-semibold leading-[0.95] tracking-tight text-white sm:text-5xl lg:text-[3.65rem]">
                Start free, find your next binge, and pick up right where you left off.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-neutral-200 sm:text-base">
                Official comics and novels with cleaner discovery, faster return paths, and less storefront clutter.
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-400">
                Browse weekly hits, free starts, creator pages, and premium series without losing the thread of what you want to read next.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                onClick={() => router.push("/search")}
                className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200"
              >
                  Browse all series
                </button>
                <button
                  type="button"
                onClick={() => router.push("/rankings?type=popular&window=week")}
                className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
              >
                  See what's trending
                </button>
              </div>

              <div className="mt-6 flex flex-wrap gap-2.5">
                {HOME_PILLARS.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-200"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {editorialStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4 shadow-[0_18px_60px_rgba(0,0,0,0.14)] backdrop-blur-lg"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-400">
                    {stat.label}
                  </p>
                  <p className="mt-3 font-display text-3xl font-semibold tracking-tight text-white">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-neutral-400">{stat.hint}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <StorefrontEventHub
          eyebrow="Happening now"
          title="Start with what's hot right now."
          description="Fresh updates, free starts, and breakout hits make the first click easier when you do not know where to begin."
          events={homeEventCards}
          className="mb-10"
        />

        <section className="mb-10 grid gap-4 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
          <div className="min-w-0 rounded-[28px] border border-white/10 bg-white/[0.03] px-5 py-5 backdrop-blur-xl sm:px-6 sm:py-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-emerald-300/85">
              Browse by genre
            </p>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Pick a mood and let the shelf do the rest.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-neutral-400">
              Jump from romance to thriller to fantasy without losing your place or falling into a dead-end browse.
            </p>
          </div>

          <div className="min-w-0 rounded-[28px] border border-white/10 bg-black/20 px-4 py-4 backdrop-blur-xl sm:px-5">
            <div className="flex items-center justify-between gap-3 px-2">
              <p className="text-sm font-semibold text-white">Shortcut filters</p>
              <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Live catalog</p>
            </div>
            <div className="mt-4 flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {GENRE_CHIPS.map((chip) => {
                const isActive = activeGenre === chip.id;

                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setActiveGenre(chip.id)}
                    className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300 ${
                      isActive
                        ? "bg-white text-neutral-950 shadow-[0_12px_40px_rgba(255,255,255,0.16)]"
                        : "border border-white/10 bg-white/[0.04] text-neutral-300 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mb-10 grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5 shadow-[0_24px_100px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-emerald-300/85">
                  Trending searches
                </p>
                <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-white">
                  See what readers are searching right now.
                </h2>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/20 p-1">
                {[
                  { id: "day", label: "Today" },
                  { id: "week", label: "This week" },
                ].map((option) => {
                  const isActive = hotWindow === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setHotWindow(option.id)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        isActive ? "bg-white text-neutral-950" : "text-neutral-300 hover:text-white"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-neutral-400">
              Hot keywords are one of the fastest ways to jump from casual browsing into a stronger first read.
            </p>

            <div className="mt-5 flex flex-wrap gap-2.5">
              {discoverySignals.length > 0 ? (
                discoverySignals.map((keyword) => (
                  <button
                    key={keyword.id}
                    type="button"
                    onClick={() => router.push(`/search?q=${encodeURIComponent(keyword.label)}`)}
                    className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-left transition hover:border-white/20 hover:bg-white/[0.08]"
                  >
                    <span className="block text-sm font-semibold text-white">{keyword.label}</span>
                    <span className="mt-1 block text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                      {keyword.hint}
                    </span>
                  </button>
                ))
              ) : (
                <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4 text-sm text-neutral-400">
                  Trending searches are still loading.
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {editorialCards.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={card.onClick}
                className="rounded-[28px] border border-white/10 bg-black/20 p-5 text-left shadow-[0_24px_100px_rgba(0,0,0,0.18)] backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.04]"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                  {card.eyebrow}
                </p>
                <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-white">
                  {card.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-neutral-300">{card.description}</p>
                <p className="mt-4 text-xs uppercase tracking-[0.2em] text-neutral-500">{card.meta}</p>
                <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white">
                  <span>{card.cta}</span>
                  <span aria-hidden="true">&gt;</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="mb-10 rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5 shadow-[0_24px_100px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-emerald-300/85">
                {STOREFRONT_TERMS.startHere}
              </p>
              <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Give every reader an easy next step.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">
                Whether someone is brand new or halfway through a binge, the next click should feel obvious.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/search")}
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
            >
              Browse full catalog
            </button>
          </div>

          <StorefrontPathwaysGrid cards={onboardingCards} className="mt-6" />
        </section>

        {loading ? (
          <div className="space-y-10">
            <SkeletonRail />
            <SkeletonRail />
            <SkeletonRail />
          </div>
        ) : (
          <HomeRailsContainer activeGenre={activeGenre} onResetGenre={() => setActiveGenre("all")} />
        )}
      </main>

      <LoginPrompt
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        eyebrow={STOREFRONT_TERMS.readerBenefits}
        title="Save your library and pick up where you left off"
        message="Sign in to sync your shelf, keep your progress, claim rewards, and make every return visit faster."
        returnTo="/"
        primaryLabel="Sign in and sync"
        secondaryLabel="Create free account"
        features={[
          { icon: BookOpen, text: "Resume chapters and keep your shelf synced across devices" },
          { icon: Gift, text: "Claim daily rewards, mission payouts, and bonus points" },
          { icon: Sparkles, text: "Get stronger discovery rails based on what you actually read" },
        ]}
      />
    </div>
  );
}

export default function HomePage() {
  return (
    <HomeDataProvider>
      <HomeContent />
    </HomeDataProvider>
  );
}
