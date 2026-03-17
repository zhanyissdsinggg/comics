/**
 * Home page shell: hero, quick-start, return lane, and recommendation rails.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Clock3,
  Compass,
  Flame,
  Gift,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
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
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const LoginPrompt = dynamic(() => import("../auth/LoginPrompt"), {
  ssr: false,
});
const CommerceSuccessBanner = dynamic(() => import("../common/CommerceSuccessBanner"));
const StorefrontContinuationStrip = dynamic(() => import("../common/StorefrontContinuationStrip"));

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
const SIGNAL_TILE_CLASS =
  "group relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,18,26,0.95),rgba(7,10,16,0.98))] text-left shadow-[0_22px_80px_rgba(0,0,0,0.22)] transition-all duration-300 hover:-translate-y-1 hover:border-white/18 hover:shadow-[0_26px_90px_rgba(0,0,0,0.28)]";

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

function SignalTile({ tile }) {
  const Icon = tile.icon;

  return (
    <button type="button" onClick={tile.onClick} className={SIGNAL_TILE_CLASS}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.1),transparent_34%),linear-gradient(180deg,transparent,rgba(255,255,255,0.02))]" />
      <div className="relative flex h-full flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white">
            <Icon className="size-5" />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-neutral-500">
            Jump in
          </span>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200/85">
            {tile.eyebrow}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{tile.value}</p>
          <h3 className="mt-3 text-base font-semibold text-white">{tile.title}</h3>
          <p className="mt-2 text-sm leading-6 text-neutral-400">{tile.description}</p>
        </div>

        <div className="mt-auto flex items-center gap-2 text-sm font-semibold text-white">
          {tile.cta}
          <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
        </div>
      </div>
    </button>
  );
}

function SpotlightFeatureCard({ card, featured = false }) {
  return (
    <button
      type="button"
      onClick={card.onClick}
      className={cn(
        "group relative overflow-hidden rounded-[30px] border text-left shadow-[0_22px_80px_rgba(0,0,0,0.22)] transition-all duration-300 hover:-translate-y-1",
        featured
          ? "min-h-[420px] border-white/12 bg-neutral-950 hover:border-white/22"
          : "min-h-[200px] border-white/10 bg-[linear-gradient(180deg,rgba(14,18,28,0.95),rgba(8,10,16,0.98))] hover:border-white/18",
      )}
    >
      {card.coverUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-[1.03]"
          style={{
            backgroundImage: `linear-gradient(180deg,rgba(5,8,13,0.06),rgba(5,8,13,0.84)), url(${card.coverUrl})`,
          }}
        />
      ) : null}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_30%),linear-gradient(180deg,rgba(6,10,16,0.08),rgba(6,10,16,0.86))]" />

      <div className="relative flex h-full flex-col justify-end p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="rounded-full border-white/12 bg-black/25 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white"
          >
            {card.eyebrow}
          </Badge>
          {card.meta ? (
            <Badge
              variant="outline"
              className="rounded-full border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-neutral-200"
            >
              {card.meta}
            </Badge>
          ) : null}
        </div>

        <h3
          className={cn(
            "max-w-2xl font-display font-semibold tracking-tight text-white",
            featured ? "text-3xl leading-tight sm:text-4xl" : "text-2xl",
          )}
        >
          {card.title}
        </h3>
        <p className={cn("mt-3 max-w-2xl text-neutral-200", featured ? "text-sm leading-7 sm:text-base" : "text-sm leading-6")}>
          {card.description}
        </p>

        <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-white">
          {card.cta}
          <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </div>
      </div>
    </button>
  );
}

function WeeklyRankItem({ item, index, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-[24px] border border-white/8 bg-black/20 p-3 text-left transition-all duration-300 hover:border-white/18 hover:bg-white/[0.04]"
    >
      <div className="flex w-11 shrink-0 flex-col items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.04] py-2">
        <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">No.</span>
        <span className="mt-1 text-lg font-semibold text-white">{String(index + 1).padStart(2, "0")}</span>
      </div>

      <div
        className="h-20 w-14 shrink-0 rounded-[16px] border border-white/10 bg-neutral-900 bg-cover bg-center"
        style={
          item.coverUrl
            ? {
                backgroundImage: `linear-gradient(180deg,rgba(9,12,18,0.02),rgba(9,12,18,0.2)), url(${item.coverUrl})`,
              }
            : undefined
        }
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {item.badge ? (
            <Badge
              variant="outline"
              className="rounded-full border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-neutral-200"
            >
              {item.badge}
            </Badge>
          ) : null}
          <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-200/80">
            {item.statusLabel}
          </span>
        </div>
        <h3 className="mt-2 truncate text-base font-semibold text-white">{item.title}</h3>
        <p className="mt-1 truncate text-sm text-neutral-400">{item.meta}</p>
      </div>

      <ArrowRight className="size-4 shrink-0 text-neutral-500 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-white" />
    </button>
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
  const { loading, seriesList, hotKeywords, homepageSlots } = useHomeData();

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

  const handleLeaderboardOpen = (seriesId) => {
    const targetPath = `/series/${seriesId}`;
    router.push(
      buildPathWithAttribution(targetPath, {
        entryPoint: "HOME_LEADERBOARD",
        campaignId: "homepage_leaderboard",
        sourcePath: "/",
        sourceSeriesId: seriesId,
        returnTo: targetPath,
      }),
    );
  };

  const editorialStats = useMemo(
    () => getHomeEditorialStats(seriesList, { loading }),
    [loading, seriesList],
  );
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
      },
    ];
  }, [discoverySignals, editorialSnapshot, router, seriesList]);

  const priorityStats = useMemo(() => editorialStats.slice(0, 3), [editorialStats]);
  const quickSearchSignals = useMemo(() => discoverySignals.slice(0, 6), [discoverySignals]);

  const spotlightCards = useMemo(() => {
    const orderedCards = ["free-start-desk", "breakout-radar", "weekend-desk"]
      .map((cardId) => homeEventCards.find((card) => card.id === cardId))
      .filter(Boolean);

    return orderedCards.map((card) => {
      if (card.id === "free-start-desk") {
        return {
          ...card,
          coverUrl:
            editorialSnapshot.freeStartPick?.coverUrl ||
            editorialSnapshot.breakoutPick?.coverUrl ||
            null,
          meta: editorialSnapshot.freeStartPick?.freeEpisodeCount
            ? `${editorialSnapshot.freeStartPick.freeEpisodeCount} free episodes`
            : "Fastest first click",
          cta: card.ctaLabel,
        };
      }

      if (card.id === "breakout-radar") {
        return {
          ...card,
          coverUrl: editorialSnapshot.breakoutPick?.coverUrl || null,
          meta: quickSearchSignals[0]?.label || "Trending this week",
          cta: card.ctaLabel,
        };
      }

      return {
        ...card,
        coverUrl: editorialSnapshot.completedPick?.coverUrl || null,
        meta:
          editorialSnapshot.completedPick?.status ||
          `${editorialSnapshot.completedSeriesCount.toLocaleString()} completed runs`,
        cta: card.ctaLabel,
      };
    });
  }, [editorialSnapshot, homeEventCards, quickSearchSignals]);

  const leadSpotlightCard = spotlightCards[0] || null;
  const supportSpotlightCards = useMemo(() => spotlightCards.slice(1, 3), [spotlightCards]);

  const leaderboardItems = useMemo(() => {
    const seen = new Set();
    const featuredPool = [
      editorialSnapshot.breakoutPick,
      editorialSnapshot.freeStartPick,
      editorialSnapshot.completedPick,
      ...editorialSnapshot.safeCatalog,
    ].filter(Boolean);

    return featuredPool
      .filter((series) => {
        const seriesId = String(series?.id || "").trim();
        if (!seriesId || seen.has(seriesId)) {
          return false;
        }
        seen.add(seriesId);
        return true;
      })
      .map((series) => {
        const badgeTokens = [series?.badge, ...(Array.isArray(series?.badges) ? series.badges : [])]
          .filter(Boolean)
          .map((badge) => String(badge).trim().toUpperCase());
        const hasFreeEpisodes = Boolean(series?.hasFreeEpisodes || Number(series?.freeEpisodeCount) > 0);
        const isCompleted = String(series?.status || "").toLowerCase() === "completed";

        return {
          id: series.id,
          title: series.title,
          coverUrl: series.coverUrl,
          badge: badgeTokens[0] || null,
          statusLabel: hasFreeEpisodes
            ? `${Number(series?.freeEpisodeCount || 0)} free eps`
            : isCompleted
              ? "Completed"
              : "Weekly return",
          meta:
            Array.isArray(series?.genres) && series.genres.length > 0
              ? series.genres.slice(0, 2).join(" / ")
              : "Official release",
          score:
            getSeriesScore(series) +
            getReaderProof(series) / 90 +
            (hasFreeEpisodes ? 90 : 0) +
            (isCompleted ? 70 : 0) +
            (badgeTokens.includes("HOT") ? 140 : 0) +
            (badgeTokens.includes("NEW") ? 90 : 0),
        };
      })
      .sort((left, right) => right.score - left.score)
      .slice(0, 5);
  }, [editorialSnapshot]);

  const signalTiles = useMemo(
    () => [
      {
        id: "tile-free",
        icon: Gift,
        eyebrow: STOREFRONT_TERMS.freeStart,
        value: editorialSnapshot.freeStartSeriesCount.toLocaleString(),
        title: "Start with free episodes",
        description: "The best comic storefronts always make the first sample obvious.",
        cta: "Browse free starts",
        onClick: () => router.push("/rankings?type=ttf&window=all"),
      },
      {
        id: "tile-trending",
        icon: Flame,
        eyebrow: "Trending now",
        value: quickSearchSignals[0]?.label || "HOT",
        title: "See what is climbing this week",
        description:
          quickSearchSignals[0]?.hint || "Weekly heat should feel one tap away from the homepage.",
        cta: "Open weekly chart",
        onClick: () => router.push("/rankings?type=popular&window=week"),
      },
      {
        id: "tile-completed",
        icon: Clock3,
        eyebrow: "Binge-ready",
        value: editorialSnapshot.completedSeriesCount.toLocaleString(),
        title: "Finished runs for longer sessions",
        description: "Completed stories are still one of the easiest conversion paths for new readers.",
        cta: "Browse completed",
        onClick: () => router.push("/search?status=Completed&sort=popular"),
      },
      {
        id: "tile-library",
        icon: isSignedIn ? ShieldCheck : Search,
        eyebrow: isSignedIn ? "Reader library" : "Reader perks",
        value: isSignedIn
          ? followedSeriesIds.length.toLocaleString()
          : priorityStats[0]?.value || editorialSnapshot.seriesCount.toLocaleString(),
        title: isSignedIn ? "Pick up your saved titles fast" : "Sign in, save progress, return faster",
        description: isSignedIn
          ? "Followed titles, progress sync, and quick returns should never be buried."
          : "Accounts make rewards, synced progress, and library recovery much easier.",
        cta: isSignedIn ? "Open library" : "Sign in free",
        onClick: isSignedIn ? () => router.push("/library") : () => setShowLoginPrompt(true),
      },
    ],
    [editorialSnapshot, followedSeriesIds.length, isSignedIn, priorityStats, quickSearchSignals, router],
  );

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
                            ? ` / ${formatPercent(resumeSpotlight.progressPercent)} complete`
                            : " / Ready to reopen"}
                        </p>
                        <p className="mt-3 text-sm leading-7 text-neutral-400">
                          {Array.isArray(resumeSeries.genres) && resumeSeries.genres.length > 0
                            ? resumeSeries.genres.slice(0, 3).join(" / ")
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

        <section className="mb-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {signalTiles.map((tile) => (
            <SignalTile key={tile.id} tile={tile} />
          ))}
        </section>

        <section className="mb-12 grid gap-4 xl:grid-cols-[1.08fr_0.92fr] xl:items-start">
          <Card className={cn(SECTION_CARD_CLASS, "py-0")}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_28%),radial-gradient(circle_at_75%_0%,rgba(244,114,182,0.1),transparent_24%)]" />
            <CardContent className="relative p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="rounded-full border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white"
                >
                  Spotlight
                </Badge>
                <Badge
                  variant="outline"
                  className="rounded-full border-emerald-400/20 bg-emerald-400/[0.1] px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-200"
                >
                  {siteConfig.siteName}
                </Badge>
              </div>

              <h1 className="mt-4 max-w-4xl font-display text-4xl font-semibold leading-[0.94] tracking-tight text-white sm:text-5xl">
                Official drops, fast starts, and chart leaders should all feel one tap away.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-neutral-200 sm:text-base">
                The strongest comics platforms do not read like landing pages. They feel like a
                living storefront: clear entry points, visible heat, and shelves that keep pulling
                you forward.
              </p>

              <div className="mt-6 flex flex-wrap gap-2.5">
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

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {priorityStats.map((stat, index) => (
                  <StatTile key={stat.label} stat={stat} compact accent={index === 0} />
                ))}
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-[1.04fr_0.96fr]">
                {leadSpotlightCard ? (
                  <SpotlightFeatureCard card={leadSpotlightCard} featured />
                ) : (
                  <Card className={cn(INNER_CARD_CLASS, "min-h-[420px] py-0")}>
                    <CardContent className="flex h-full flex-col justify-end p-6">
                      <SectionEyebrow>{STOREFRONT_TERMS.startHere}</SectionEyebrow>
                      <h3 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white">
                        Fresh picks are loading.
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-neutral-300">
                        Once the catalog responds, this area becomes the strongest editorial entry
                        point on the page.
                      </p>
                    </CardContent>
                  </Card>
                )}

                <div className="grid gap-4">
                  {supportSpotlightCards.map((card) => (
                    <SpotlightFeatureCard key={card.id} card={card} />
                  ))}

                  <Card className={cn(INNER_CARD_CLASS, "py-0")}>
                    <CardContent className="p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">Genre shortcuts</p>
                          <p className="mt-1 text-sm text-neutral-400">
                            Filter the shelves below without flattening the homepage into a bland
                            search screen.
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
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={cn(SECTION_CARD_CLASS, "py-0")}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_28%),radial-gradient(circle_at_0%_80%,rgba(250,204,21,0.1),transparent_28%)]" />
            <CardContent className="relative p-5 sm:p-6">
              <SectionEyebrow>This week</SectionEyebrow>
              <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-[2.15rem]">
                    Chart leaders and live search heat.
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-neutral-300">
                    This is the part most top comics sites get right: readers can see what is hot
                    before they decide where to commit their time.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/rankings?type=popular&window=week")}
                  className="h-11 rounded-full border-white/10 bg-white/[0.04] px-5 text-sm font-semibold text-white hover:border-white/20 hover:bg-white/[0.08]"
                >
                  <Star className="size-4" />
                  Open full chart
                </Button>
              </div>

              <div className="mt-6 space-y-3">
                {leaderboardItems.map((item, index) => (
                  <WeeklyRankItem
                    key={item.id}
                    item={item}
                    index={index}
                    onClick={() => handleLeaderboardOpen(item.id)}
                  />
                ))}
              </div>

              <Separator className="my-6 bg-white/10" />

              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Live search signals</p>
                  <p className="mt-1 text-sm text-neutral-400">
                    Trending terms help readers pivot fast without landing on an empty search page.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.push("/search")}
                  className="h-10 justify-start gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 text-sm font-semibold text-white hover:border-white/20 hover:bg-white/[0.06]"
                >
                  <Search className="size-4" />
                  Explore search
                </Button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2.5">
                {quickSearchSignals.length > 0 ? (
                  quickSearchSignals.map((keyword) => (
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
        </section>

        <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <SectionEyebrow>{siteConfig.siteName} shelves</SectionEyebrow>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white sm:text-[2.2rem]">
              Browse the homepage like a real comics storefront.
            </h2>
            <p className="mt-3 text-sm leading-7 text-neutral-300">
              Scrollable shelves, creator links, and genre-aware lanes are what make leading
              platforms feel alive instead of static.
            </p>
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
