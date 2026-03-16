/**
 * Home page shell: hero, discovery desk, return lane, and recommendation rails.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, BookOpen, Compass, Gift, Sparkles } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
const SECTION_CARD_CLASS =
  "relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,24,39,0.92),rgba(10,14,22,0.98))] shadow-[0_26px_90px_rgba(0,0,0,0.28)]";
const INNER_CARD_CLASS =
  "rounded-[26px] border border-white/10 bg-white/[0.03] shadow-[0_18px_60px_rgba(0,0,0,0.18)]";
const SECTION_EYEBROW_CLASS =
  "text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85";

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

function formatPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "0%";
  }

  return `${Math.round((numeric <= 1 ? numeric : numeric / 100) * 100)}%`;
}

function SectionEyebrow({ children, className = "" }) {
  return <p className={cn(SECTION_EYEBROW_CLASS, className)}>{children}</p>;
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
    <div className="aspect-[21/9] w-full animate-pulse rounded-[32px] bg-neutral-800 sm:aspect-[21/8] md:aspect-[21/7]" />
  );
}

function StatTile({ stat, accent = false, compact = false }) {
  return (
    <Card
      className={cn(
        "rounded-[24px] border py-0 shadow-none",
        accent
          ? "border-emerald-400/20 bg-emerald-400/[0.08]"
          : "border-white/10 bg-black/20",
      )}
    >
      <CardContent className={cn(compact ? "p-4" : "p-5")}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">
          {stat.label}
        </p>
        <p className="mt-3 font-display text-3xl font-semibold tracking-tight text-white">
          {stat.value}
        </p>
        <p className="mt-2 text-sm leading-6 text-neutral-400">{stat.hint}</p>
      </CardContent>
    </Card>
  );
}

function EditorialPickCard({ card }) {
  return (
    <Card className={cn(INNER_CARD_CLASS, "h-full py-0 transition-transform duration-300 hover:-translate-y-1 hover:border-white/20")}>
      <CardContent className="flex h-full flex-col p-6">
        <Badge
          variant="outline"
          className="w-fit rounded-full border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-neutral-200"
        >
          {card.eyebrow}
        </Badge>
        <h3 className="mt-4 font-display text-2xl font-semibold tracking-tight text-white">
          {card.title}
        </h3>
        <p className="mt-3 text-sm leading-7 text-neutral-300">{card.description}</p>
        <p className="mt-4 text-xs uppercase tracking-[0.2em] text-neutral-500">{card.meta}</p>
        <Button
          type="button"
          variant="ghost"
          onClick={card.onClick}
          className="mt-auto h-10 justify-start gap-2 px-0 text-sm font-semibold text-white hover:bg-transparent hover:text-emerald-200"
        >
          {card.cta}
          <ArrowUpRight className="size-4" />
        </Button>
      </CardContent>
    </Card>
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
        hint:
          continueItems.length > 0
            ? "Active reading threads ready to resume."
            : "Your next active thread will surface here.",
      },
      {
        label: "History",
        value: recentHistoryItems.length.toLocaleString(),
        hint:
          recentHistoryItems.length > 0
            ? "Recent reading visits still warm."
            : "Recent visits appear once you open chapters.",
      },
      {
        label: "Following",
        value: followedSeriesIds.length.toLocaleString(),
        hint:
          followedSeriesIds.length > 0
            ? "Saved series that can pull you back in."
            : "Followed titles will stack here once saved.",
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
            description: "Completed series that are easy to binge in one sitting.",
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
        eyebrow: "18+ section",
        title:
          adultCount > 0
            ? `${adultCount} mature titles in the 18+ section`
            : "18+ titles are available behind the age gate",
        description:
          "Browse mature titles in a separate section with clear access rules and less friction once access is confirmed.",
        meta: "Sign-in and age confirmation required",
        cta: "Open 18+ page",
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
          (typeof item.count === "number"
            ? `${item.count.toLocaleString()} searches`
            : "Trending search"),
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
          ? "Finished stories are a great pick when you want payoff and no gap between chapters."
          : "Completed runs are the cleanest entry point when readers want depth, payoff, and no waiting.",
        signalLabel: "Completed",
        signalValue: completedSeriesCount.toLocaleString(),
        signalHint: "Finished runs ready for full-session reading",
        ctaLabel: "Browse completed",
        onClick: () => router.push("/search?status=Completed&sort=popular"),
        accentClass: "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]",
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
          "border-emerald-400/25 bg-emerald-400/[0.08] hover:border-emerald-300/45 hover:bg-emerald-400/[0.12]",
      },
      {
        id: "breakout-radar",
        eyebrow: "Trending now",
        title: breakoutPick
          ? `${breakoutPick.title} is climbing fast this week.`
          : "See what's gaining heat before the rest of the catalog catches up.",
        description: leadSignal
          ? `Readers are already searching for ${leadSignal.label}. This is the moment to jump into what's hot.`
          : "Fresh interest works best when it leads straight into a chart, a series page, or your next follow.",
        signalLabel: "Live signal",
        signalValue: leadSignal?.label || "HOT",
        signalHint: leadSignal?.hint || "Trending searches right now",
        ctaLabel: "Open weekly chart",
        onClick: () => router.push("/rankings?type=popular&window=week"),
        accentClass:
          "border-sky-400/20 bg-sky-400/[0.07] hover:border-sky-300/35 hover:bg-sky-400/[0.11]",
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
        title: freeStartCard ? `Start with ${freeStartCard.title}` : "Start with a free preview",
        description: freeStartCard
          ? "Free episodes give new readers a clean first click before they have to think about points or plans."
          : "Free-to-start titles let first-time visitors sample the product before spending.",
        cta: freeStartCard ? "Open free preview" : "Browse free-start titles",
        onClick: freeStartCard?.onClick || (() => router.push("/search?sort=popular")),
        accentClass:
          "border-emerald-400/25 bg-emerald-400/[0.08] hover:border-emerald-300/45 hover:bg-emerald-400/[0.12]",
      },
      {
        id: "keep-progress",
        eyebrow: isSignedIn ? "Return path" : "Account perks",
        title: isSignedIn ? "Jump back in without searching" : "Save progress, rewards, and your library",
        description: isSignedIn
          ? "Returning readers should be able to reach unfinished chapters, rewards, and their saved library in one tap."
          : "Signing in should clearly pay off: synced progress, daily rewards, and faster return visits.",
        cta: isSignedIn ? "Open library" : "Sign in free",
        onClick: isSignedIn ? () => router.push("/library") : () => setShowLoginPrompt(true),
        accentClass: "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]",
      },
      {
        id: "momentum",
        eyebrow: "Trending now",
        title: breakoutCard ? `See why ${breakoutCard.title} is trending` : "See what's trending this week",
        description: breakoutCard
          ? "A fast-rising title is often the easiest way to turn casual browsing into a confident first read."
          : "Charts are the fastest way to show readers what everyone is opening right now.",
        cta: "Open weekly chart",
        onClick: () => router.push("/rankings?type=popular&window=week"),
        accentClass:
          "border-sky-400/20 bg-sky-400/[0.07] hover:border-sky-300/35 hover:bg-sky-400/[0.11]",
      },
      {
        id: "value-path",
        eyebrow: "Plans & points",
        title: completedCard
          ? `Compare plans before you unlock more of ${completedCard.title}`
          : "Compare plans before you unlock more",
        description:
          "Show points, free unlock value, and membership savings before the paywall becomes a surprise.",
        cta: STOREFRONT_TERMS.compareMembership,
        onClick: () => router.push("/subscribe"),
        accentClass: "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]",
      },
    ];
  }, [editorialCards, isSignedIn, router]);

  return (
    <div className="min-h-screen bg-transparent">
      <SiteHeader />

      <main className="mx-auto max-w-[1320px] px-4 pb-24 sm:px-6 sm:pb-10 lg:px-8">
        <section className="py-4 md:py-6">
          {loading ? <HeroBannerSkeleton /> : <HeroCarousel items={heroItems} />}
        </section>

        {commerceNotice ? (
          <div className="mb-8">
            <CommerceSuccessBanner
              notice={commerceNotice}
              onDismiss={() => setCommerceNotice(null)}
            />
          </div>
        ) : null}

        {isSignedIn && resumeSeries ? (
          <section className="mb-10">
            <Card className={cn(SECTION_CARD_CLASS, "py-0")}>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_34%),radial-gradient(circle_at_85%_10%,rgba(56,189,248,0.12),transparent_24%)]" />
              <CardContent className="relative grid gap-5 p-5 sm:p-6 xl:grid-cols-[1.06fr_0.94fr] xl:items-start">
                <div className="max-w-3xl">
                  <SectionEyebrow>Return lane</SectionEyebrow>
                  <h2 className="mt-4 font-display text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
                    Jump back into {resumeSeries.title}.
                  </h2>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-neutral-200 sm:text-base">
                    {resumeSpotlight?.progressPercent > 0
                      ? `${formatEpisodeLabel(resumeSpotlight.episodeId)} is already ${formatPercent(resumeSpotlight.progressPercent)} complete. One tap gets you back to the exact chapter where you stopped.`
                      : `${formatEpisodeLabel(resumeSpotlight?.episodeId)} is still the easiest place to pick back up before you browse for something new.`}
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button
                      type="button"
                      size="lg"
                      onClick={handleResumeSpotlight}
                      className="h-11 rounded-full bg-white px-5 text-sm font-semibold text-neutral-950 hover:bg-neutral-200"
                    >
                      Continue {formatEpisodeLabel(resumeSpotlight?.episodeId)}
                    </Button>
                    <Button
                      type="button"
                      size="lg"
                      variant="outline"
                      onClick={() => router.push(`/series/${resumeSeries.id}`)}
                      className="h-11 rounded-full border-white/10 bg-white/[0.04] px-5 text-sm font-semibold text-white hover:border-white/20 hover:bg-white/[0.08]"
                    >
                      Open series page
                    </Button>
                    <Button
                      type="button"
                      size="lg"
                      variant="outline"
                      onClick={() => router.push("/library")}
                      className="h-11 rounded-full border-white/10 bg-black/20 px-5 text-sm font-semibold text-neutral-200 hover:border-white/20 hover:bg-white/[0.06]"
                    >
                      Open library
                    </Button>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    {returnLaneStats.map((stat, index) => (
                      <StatTile
                        key={stat.label}
                        stat={stat}
                        compact
                        accent={index === 0}
                      />
                    ))}
                  </div>
                </div>

                <Card className={cn(INNER_CARD_CLASS, "py-0")}>
                  <CardContent className="p-5 sm:p-6">
                    <div className="grid gap-4 sm:grid-cols-[132px_1fr]">
                      <div
                        className="aspect-[3/4] rounded-[24px] border border-white/10 bg-neutral-900 bg-cover bg-center shadow-[0_20px_50px_rgba(0,0,0,0.22)]"
                        style={
                          resumeSeries.coverUrl
                            ? {
                                backgroundImage: `linear-gradient(180deg,rgba(12,18,24,0.04),rgba(12,18,24,0.24)), url(${resumeSeries.coverUrl})`,
                              }
                            : undefined
                        }
                      />

                      <div className="min-w-0">
                        <SectionEyebrow className="text-emerald-200/90">Next up</SectionEyebrow>
                        <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-white">
                          {resumeSeries.title}
                        </h3>
                        <p className="mt-3 text-sm leading-7 text-neutral-300">
                          {formatEpisodeLabel(resumeSpotlight?.episodeId)}
                          {resumeSpotlight?.progressPercent > 0
                            ? ` · ${formatPercent(resumeSpotlight.progressPercent)} complete`
                            : " · Ready to reopen"}
                        </p>
                        <p className="mt-3 text-sm leading-7 text-neutral-400">
                          {Array.isArray(resumeSeries.genres) && resumeSeries.genres.length > 0
                            ? resumeSeries.genres.slice(0, 3).join(" · ")
                            : "Premium series ready to resume"}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {resumeSeries.badge ? (
                            <Badge
                              variant="outline"
                              className="rounded-full border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white"
                            >
                              {resumeSeries.badge}
                            </Badge>
                          ) : null}
                          {followedSeriesIds.includes(resumeSeries.id) ? (
                            <Badge
                              variant="outline"
                              className="rounded-full border-emerald-400/20 bg-emerald-400/[0.1] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-emerald-200"
                            >
                              Following
                            </Badge>
                          ) : null}
                          {resumeSeries.status ? (
                            <Badge
                              variant="outline"
                              className="rounded-full border-white/10 bg-black/20 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-neutral-300"
                            >
                              {resumeSeries.status}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <Separator className="my-6 bg-white/10" />

                    <StorefrontContinuationStrip
                      series={resumeSeries}
                      similarItems={returnLaneCompanions}
                      sourcePath="/"
                      returnTo="/"
                      entryPoint="HOME_RETURN_LANE"
                      compact
                    />
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </section>
        ) : null}

        <section className="mb-10 grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
          <Card className={cn(SECTION_CARD_CLASS, "py-0")}>
            <CardContent className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="rounded-full border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white"
                >
                  Featured this week
                </Badge>
                <Badge
                  variant="outline"
                  className="rounded-full border-emerald-400/20 bg-emerald-400/[0.1] px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-200"
                >
                  {siteConfig.siteName}
                </Badge>
              </div>

              <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[0.96] tracking-tight text-white sm:text-5xl">
                A cleaner storefront for official comics, novels, and premium drops.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-neutral-200 sm:text-base">
                Start free, catch breakout launches, and pick up unfinished chapters without
                digging through clutter.
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-400">
                The homepage now behaves more like a modern American content platform: clearer
                hierarchy, stronger merchandising, and fewer decorative layers fighting for
                attention.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  type="button"
                  size="lg"
                  onClick={() => router.push("/search")}
                  className="h-11 rounded-full bg-white px-5 text-sm font-semibold text-neutral-950 hover:bg-neutral-200"
                >
                  <Compass className="size-4" />
                  Browse all series
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  onClick={() => router.push("/rankings?type=popular&window=week")}
                  className="h-11 rounded-full border-white/10 bg-white/[0.04] px-5 text-sm font-semibold text-white hover:border-white/20 hover:bg-white/[0.08]"
                >
                  See what's trending
                  <ArrowUpRight className="size-4" />
                </Button>
              </div>

              <Separator className="my-6 bg-white/10" />

              <div className="flex flex-wrap gap-2.5">
                {HOME_PILLARS.map((item) => (
                  <Badge
                    key={item}
                    variant="outline"
                    className="rounded-full border-white/10 bg-white/[0.04] px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-neutral-200"
                  >
                    {item}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className={cn(SECTION_CARD_CLASS, "py-0")}>
            <CardContent className="p-5 sm:p-6">
              <SectionEyebrow>Discovery desk</SectionEyebrow>
              <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white">
                Browse like a storefront, not a spreadsheet.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-300">
                Use live genre shortcuts to focus the recommendation rails below while the desk
                stats keep the catalog readable at a glance.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {editorialStats.map((stat, index) => (
                  <StatTile
                    key={stat.label}
                    stat={stat}
                    accent={index === 0}
                  />
                ))}
              </div>

              <Separator className="my-6 bg-white/10" />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Catalog filters</p>
                  <p className="mt-1 text-sm text-neutral-400">
                    Pick a mood and the rails below will narrow in real time.
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="rounded-full border-white/10 bg-black/20 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-neutral-300"
                >
                  {GENRE_CHIPS.find((chip) => chip.id === activeGenre)?.label || "All"} active
                </Badge>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {GENRE_CHIPS.map((chip) => {
                  const isActive = activeGenre === chip.id;

                  return (
                    <Button
                      key={chip.id}
                      type="button"
                      variant={isActive ? "default" : "outline"}
                      onClick={() => setActiveGenre(chip.id)}
                      className={cn(
                        "h-10 rounded-full px-4 text-sm font-semibold",
                        isActive
                          ? "bg-white text-neutral-950 hover:bg-neutral-200"
                          : "border-white/10 bg-white/[0.04] text-neutral-200 hover:border-white/20 hover:bg-white/[0.08] hover:text-white",
                      )}
                    >
                      {chip.label}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </section>

        <StorefrontEventHub
          eyebrow="Happening now"
          title="Start with what's hot right now."
          description="Fresh updates, free starts, and breakout hits make the first click easier when you do not know where to begin."
          events={homeEventCards}
          className="mb-10"
        />

        <section className="mb-10 grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
          <Card className={cn(SECTION_CARD_CLASS, "py-0")}>
            <CardContent className="p-5 sm:p-6">
              <Tabs value={hotWindow} onValueChange={setHotWindow} className="w-full">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="max-w-2xl">
                    <SectionEyebrow>Trending searches</SectionEyebrow>
                    <CardTitle className="mt-4 font-display text-3xl font-semibold tracking-tight text-white">
                      See what readers are searching right now.
                    </CardTitle>
                    <CardDescription className="mt-3 text-sm leading-7 text-neutral-300">
                      Search momentum is one of the fastest ways to turn casual browsing into a
                      stronger first read.
                    </CardDescription>
                  </div>

                  <TabsList
                    variant="line"
                    className="h-auto rounded-full border border-white/10 bg-white/[0.04] p-1"
                  >
                    <TabsTrigger
                      value="day"
                      className="h-8 flex-none rounded-full px-3 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-300 after:hidden data-[active]:bg-white data-[active]:text-neutral-950"
                    >
                      Today
                    </TabsTrigger>
                    <TabsTrigger
                      value="week"
                      className="h-8 flex-none rounded-full px-3 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-300 after:hidden data-[active]:bg-white data-[active]:text-neutral-950"
                    >
                      This week
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="day" className="hidden" />
                <TabsContent value="week" className="hidden" />
              </Tabs>

              <div className="mt-6 flex flex-wrap gap-2.5">
                {discoverySignals.length > 0 ? (
                  discoverySignals.map((keyword) => (
                    <Button
                      key={keyword.id}
                      type="button"
                      variant="outline"
                      onClick={() => router.push(`/search?q=${encodeURIComponent(keyword.label)}`)}
                      className="h-auto rounded-[22px] border-white/10 bg-white/[0.04] px-4 py-3 text-left hover:border-white/20 hover:bg-white/[0.08]"
                    >
                      <span className="block text-sm font-semibold text-white">{keyword.label}</span>
                      <span className="mt-1 block text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                        {keyword.hint}
                      </span>
                    </Button>
                  ))
                ) : (
                  <Card className="w-full rounded-[24px] border border-white/10 bg-black/20 py-0 shadow-none">
                    <CardContent className="p-4 text-sm text-neutral-400">
                      Trending searches are still loading.
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {editorialCards.map((card) => (
              <EditorialPickCard key={card.id} card={card} />
            ))}
          </div>
        </section>

        <Card className={cn(SECTION_CARD_CLASS, "mb-10 py-0")}>
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <SectionEyebrow>{STOREFRONT_TERMS.startHere}</SectionEyebrow>
                <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white">
                  Give every reader an easy next step.
                </h2>
                <p className="mt-3 text-sm leading-7 text-neutral-300">
                  Whether someone is brand new or halfway through a binge, the next click should
                  feel obvious and worth taking.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/search")}
                className="h-11 rounded-full border-white/10 bg-white/[0.04] px-5 text-sm font-semibold text-white hover:border-white/20 hover:bg-white/[0.08]"
              >
                Browse full catalog
              </Button>
            </div>

            <StorefrontPathwaysGrid cards={onboardingCards} className="mt-6" />
          </CardContent>
        </Card>

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
