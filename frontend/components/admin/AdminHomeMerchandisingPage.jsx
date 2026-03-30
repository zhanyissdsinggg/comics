"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, BookOpen, Copy, Flame, RefreshCw, Search, Sparkles, Star, Zap } from "lucide-react";

import { cn } from "@/lib/utils";
import SurfacePanel from "@/components/common/SurfacePanel";

import AdminShell from "./AdminShell";
import { useAdminAuth } from "./AuthContext";
import Skeleton from "../common/Skeleton";
import { adminFetchJson } from "../../lib/adminApiClient";
import { apiGet } from "../../lib/apiClient";
import {
  buildHomeHeroItems,
  getHomeEditorialSnapshot,
  getHomeHeroCandidates,
  getLibraryReturnCandidates,
  getReaderProof,
} from "../../lib/homeMerchandising";
import { getAdminSeriesReadiness } from "../../lib/adminSeriesReadiness";
import { getStorefrontSlotDisplayMeta, normalizeStorefrontSlotToken } from "../../lib/storefrontSlots";

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeSeries(entry, index) {
  const source = entry && typeof entry === "object" ? entry : {};
  return {
    id: String(source.id || `series-${index + 1}`),
    title: String(source.title || "Untitled series"),
    author: String(source.author || ""),
    type: source.type === "novel" ? "novel" : "comic",
    status: String(source.status || "Ongoing"),
    adult: Boolean(source.adult),
    description: String(source.description || ""),
    coverUrl: String(source.coverUrl || source.coverImage || ""),
    coverTone: String(source.coverTone || "default"),
    bannerUrl: String(source.bannerUrl || ""),
    badge: String(source.badge || ""),
    badges: Array.isArray(source.badges) ? source.badges.filter(Boolean) : [],
    genres: Array.isArray(source.genres) ? source.genres.filter(Boolean) : [],
    episodeCount: toNumber(source.episodeCount ?? source?._count?.episodes ?? source.totalEpisodes),
    latestEpisodeId: String(source.latestEpisodeId || ""),
    freeEpisodeCount: toNumber(source.freeEpisodeCount),
    hasFreeEpisodes: Boolean(source.hasFreeEpisodes || toNumber(source.freeEpisodeCount) > 0),
    rating: toNumber(source.rating),
    ratingCount: toNumber(source.ratingCount),
    followers: toNumber(source.followers),
    views: toNumber(source.views),
    isPublished: source.isPublished !== undefined ? Boolean(source.isPublished) : true,
    updatedAt: source.updatedAt || source.createdAt || null,
  };
}

function normalizeSlot(entry, index) {
  const source = entry && typeof entry === "object" ? entry : {};
  return {
    id: String(source.id || `slot-${index + 1}`),
    slot: String(source.slot || source.name || source.id || `slot-${index + 1}`),
    name: String(source.name || source.slot || source.id || `slot-${index + 1}`),
    seriesIds: Array.isArray(source.seriesIds)
      ? source.seriesIds.map((item) => String(item || "").trim()).filter(Boolean)
      : [],
  };
}

function formatDateLabel(value) {
  if (!value) {
    return "No recent update";
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return "No recent update";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(parsed));
}

function formatCompactNumber(value) {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(Math.max(0, toNumber(value)));
}

function formatPercentValue(value) {
  return `${toNumber(value).toFixed(2)}%`;
}

function formatSeriesStatusLabel(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "completed") {
    return "Completed";
  }
  if (normalized === "ongoing") {
    return "Ongoing";
  }
  if (normalized === "hiatus") {
    return "Hiatus";
  }
  if (normalized === "cancelled") {
    return "Cancelled";
  }
  return String(value || "Status not set").trim() || "Status not set";
}

function normalizePerformance(entry) {
  const source = entry && typeof entry === "object" ? entry : {};
  return {
    totalImpressions: toNumber(source.totalImpressions),
    totalClicks: toNumber(source.totalClicks),
    totalConversions: toNumber(source.totalConversions),
    avgCtr: toNumber(source.avgCtr),
    avgConversionRate: toNumber(source.avgConversionRate),
  };
}

function buildPerformanceQuery(windowKey) {
  if (windowKey === "all") {
    return "";
  }

  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setHours(0, 0, 0, 0);

  if (windowKey === "7d") {
    startDate.setDate(startDate.getDate() - 6);
  } else {
    startDate.setDate(startDate.getDate() - 29);
  }

  const params = new URLSearchParams();
  params.set("startDate", startDate.toISOString());
  params.set("endDate", endDate.toISOString());
  return params.toString();
}

function getPerformanceState(performance) {
  if (performance.totalImpressions <= 0) {
    return { tone: "rose", label: "No signal yet" };
  }
  if (performance.totalConversions > 0 || performance.avgCtr >= 2) {
    return { tone: "emerald", label: "Healthy" };
  }
  if (performance.totalClicks > 0) {
    return { tone: "amber", label: "Needs attention" };
  }
  return { tone: "rose", label: "Weak response" };
}

function getToneClasses(tone) {
  if (tone === "emerald") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (tone === "amber") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (tone === "rose") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-sky-200 bg-sky-50 text-sky-700";
}

function ActionButton({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition",
        "border-black/8 bg-white text-slate-700 hover:border-black/12 hover:bg-[rgba(250,248,244,0.96)] hover:text-slate-950",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function MetricCard({ label, value, hint, tone = "blue" }) {
  const toneClasses = {
    blue: "border-[rgba(47,88,198,0.14)] bg-[rgba(47,88,198,0.08)]",
    emerald: "border-emerald-200 bg-emerald-50/90",
    cyan: "border-sky-200 bg-sky-50/90",
    amber: "border-amber-200 bg-amber-50/90",
    rose: "border-rose-200 bg-rose-50/90",
  };

  return (
    <div
      className={cn(
        "rounded-[24px] border px-5 py-5 shadow-[0_12px_24px_rgba(15,23,42,0.03)]",
        toneClasses[tone] || toneClasses.blue,
      )}
    >
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-xs leading-6 text-slate-500">{hint}</p>
    </div>
  );
}

function MiniMetric({ label, value, hint }) {
  return (
    <div className="rounded-[22px] border border-black/8 bg-[rgba(250,247,241,0.76)] px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
      {hint ? <p className="mt-1 text-xs leading-6 text-slate-500">{hint}</p> : null}
    </div>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="rounded-[24px] border border-dashed border-black/10 bg-[rgba(250,247,241,0.72)] px-5 py-10 text-center">
      <p className="text-base font-semibold text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function LoadingView() {
  return (
    <AdminShell
      title="Collections"
      subtitle="Turn homepage slots into calm editorial placements instead of noisy dashboard widgets."
    >
      <div className="space-y-6">
        <Skeleton className="h-48 rounded-[32px]" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={`merchandising-stat-${index}`} className="h-32 rounded-[28px]" />
          ))}
        </div>
        <Skeleton className="h-[34rem] rounded-[28px]" />
        <Skeleton className="h-[36rem] rounded-[28px]" />
      </div>
    </AdminShell>
  );
}

const PERFORMANCE_WINDOWS = [
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "all", label: "All time" },
];

function dedupeSeriesPool(seriesPool) {
  const seen = new Set();
  return (Array.isArray(seriesPool) ? seriesPool : []).filter((series) => {
    const seriesId = String(series?.id || "").trim();
    if (!seriesId || seen.has(seriesId)) {
      return false;
    }
    seen.add(seriesId);
    return true;
  });
}

function getSlotReplacementCandidates(slot, heroCandidates) {
  const currentIds = new Set(Array.isArray(slot?.currentIds) ? slot.currentIds : []);
  const heroSeriesPool = (Array.isArray(heroCandidates) ? heroCandidates : []).map((entry) => entry.series).filter(Boolean);
  const slotRecommended = Array.isArray(slot?.recommendedSeries) ? slot.recommendedSeries : [];

  let specializedPool = [];
  if (slot?.id === "home-free-start") {
    specializedPool = heroSeriesPool.filter(
      (series) => Boolean(series?.hasFreeEpisodes) || toNumber(series?.freeEpisodeCount) > 0,
    );
  } else if (slot?.id === "home-binge-ready") {
    specializedPool = heroSeriesPool.filter(
      (series) => String(series?.status || "").toLowerCase() === "completed",
    );
  } else if (slot?.id === "home-breakout") {
    specializedPool = heroSeriesPool.filter((series) => {
      const badges = [series?.badge, ...(Array.isArray(series?.badges) ? series.badges : [])]
        .filter(Boolean)
        .map((badge) => String(badge).trim().toUpperCase());
      return badges.includes("HOT") || badges.includes("NEW");
    });
  } else {
    specializedPool = heroSeriesPool;
  }

  return dedupeSeriesPool([...slotRecommended, ...specializedPool])
    .filter((series) => !currentIds.has(series.id))
    .slice(0, 3);
}

function buildSlotOptimizationPlan(slot, replacementCandidates) {
  const replacementIds = replacementCandidates.map((series) => series.id).filter(Boolean);
  const readinessEntries = (Array.isArray(slot?.currentSeries) ? slot.currentSeries : []).map((series) => ({
    series,
    readiness: getAdminSeriesReadiness(series),
  }));
  const weakestEntry =
    [...readinessEntries].sort((left, right) => left.readiness.score - right.readiness.score)[0] || null;
  const hasReplacementCandidates = replacementCandidates.length > 0;
  const performanceLoaded = !slot?.current?.id || Boolean(slot?.performanceLoaded);
  const impressions = toNumber(slot?.performance?.totalImpressions);
  const ctr = toNumber(slot?.performance?.avgCtr);
  const conversionRate = toNumber(slot?.performance?.avgConversionRate);

  if (!slot?.current) {
    return {
      priority: 100,
      tone: "rose",
      title: "This slot is still empty",
      detail: "Fill key homepage positions first so important discovery entry points are not wasted.",
      actionType: "apply",
      actionLabel: "Apply recommendation",
      actionIds: Array.isArray(slot?.recommendedIds) ? slot.recommendedIds : [],
      replacementCandidates,
      replacementIds,
    };
  }

  if (!slot?.aligned) {
    return {
      priority: 90,
      tone: "amber",
      title: "Current setup is off-plan",
      detail: "Align the slot to the current editorial recommendation before deciding whether the content or the position is the real issue.",
      actionType: "apply",
      actionLabel: "Sync to recommendation",
      actionIds: Array.isArray(slot?.recommendedIds) ? slot.recommendedIds : [],
      replacementCandidates,
      replacementIds,
    };
  }

  if (weakestEntry && !weakestEntry.readiness.isReady) {
    return {
      priority: 80,
      tone: "amber",
      title: "The live title still needs setup",
      detail: `${weakestEntry.series.title} is still missing ${weakestEntry.readiness.topIssues.join(", ")}. Fix the title before asking the slot to do more work.`,
      actionType: "edit",
      actionLabel: "Open title setup",
      actionSeriesId: weakestEntry.series.id,
      replacementCandidates,
      replacementIds,
    };
  }

  if (!performanceLoaded) {
    return {
      priority: 40,
      tone: "cyan",
      title: "Performance data is still syncing",
      detail: "The placement is live, but attribution has not settled yet. Hold the setup and review again once the signal returns.",
      actionType: "review",
      actionLabel: "Wait for data",
      actionIds: [],
      replacementCandidates,
      replacementIds,
    };
  }

  if (impressions <= 0) {
    return {
      priority: 70,
      tone: "amber",
      title: "No exposure is coming through",
      detail: "Confirm that the slot is actually live on the page and that tracking is returning usable data.",
      actionType: hasReplacementCandidates ? "copy" : "review",
      actionLabel: hasReplacementCandidates ? "Copy backup IDs" : "Review placement",
      actionIds: replacementIds,
      replacementCandidates,
      replacementIds,
    };
  }

  if (ctr < 2 && hasReplacementCandidates) {
    return {
      priority: 60,
      tone: "amber",
      title: "Click-through is soft",
      detail: `CTR is only ${formatPercentValue(ctr)}. Prepare stronger backup titles for the next editorial test.`,
      actionType: "copy",
      actionLabel: "Copy backup IDs",
      actionIds: replacementIds,
      replacementCandidates,
      replacementIds,
    };
  }

  if (conversionRate > 0 && conversionRate < 10 && hasReplacementCandidates) {
    return {
      priority: 50,
      tone: "amber",
      title: "The click lands, but the handoff is weak",
      detail: `Conversion is ${formatPercentValue(conversionRate)}. Test titles that better match the promise of the slot.`,
      actionType: "copy",
      actionLabel: "Copy backup IDs",
      actionIds: replacementIds,
      replacementCandidates,
      replacementIds,
    };
  }

  return {
    priority: 10,
    tone: "emerald",
    title: "This slot is stable",
    detail: "The content and the slot are aligned well enough to keep observing without changing course.",
    actionType: "review",
    actionLabel: "Keep watching",
    actionIds: [],
    replacementCandidates,
    replacementIds,
  };
}

export default function AdminHomeMerchandisingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdminAuth();
  const [seriesList, setSeriesList] = useState([]);
  const [slots, setSlots] = useState([]);
  const [hotKeywords, setHotKeywords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState([]);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [savingSlot, setSavingSlot] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [performanceWindow, setPerformanceWindow] = useState("30d");
  const [slotPerformanceMap, setSlotPerformanceMap] = useState({});
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [performanceNotice, setPerformanceNotice] = useState("");

  const loadSlotsOnly = async () => {
    const { response, data } = await adminFetchJson("/api/admin/recommendations/slots?limit=100", {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(data?.message || data?.error || "Failed to load recommendation slots.");
    }
    const nextSlots = Array.isArray(data?.slots) ? data.slots.filter(Boolean).map(normalizeSlot) : [];
    setSlots(nextSlots);
    return nextSlots;
  };

  useEffect(() => {
    if (!isAuthenticated) {
      if (!isLoading) {
        setLoading(false);
      }
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");
        setWarnings([]);

        const [seriesResult, slotsResult, hotResult] = await Promise.allSettled([
          adminFetchJson("/api/admin/series", { cache: "no-store" }),
          adminFetchJson("/api/admin/recommendations/slots?limit=100", { cache: "no-store" }),
          apiGet("/api/search/hot?adult=0&window=day", {
            cacheMs: 0,
            bust: true,
            suppressAuthModal: true,
          }),
        ]);

        if (cancelled) {
          return;
        }

        if (seriesResult.status !== "fulfilled" || !seriesResult.value.response.ok) {
          const message =
            seriesResult.status === "fulfilled"
              ? seriesResult.value.data?.message || seriesResult.value.data?.error || "Failed to load title data."
              : seriesResult.reason instanceof Error
                ? seriesResult.reason.message
                : "Failed to load title data.";
          setError(message);
          setSeriesList([]);
          setSlots([]);
          setHotKeywords([]);
          setLoading(false);
          return;
        }

        const nextSeries = Array.isArray(seriesResult.value.data?.series)
          ? seriesResult.value.data.series.filter(Boolean).map(normalizeSeries)
          : [];
        setSeriesList(nextSeries);

        const nextWarnings = [];
        if (slotsResult.status === "fulfilled" && slotsResult.value.response.ok) {
          setSlots(
            Array.isArray(slotsResult.value.data?.slots)
              ? slotsResult.value.data.slots.filter(Boolean).map(normalizeSlot)
              : [],
          );
        } else {
          setSlots([]);
          nextWarnings.push("Recommendation slots did not load, so this page is showing editorial guidance without saved slot state.");
        }

        if (hotResult.status === "fulfilled" && hotResult.value.ok) {
          setHotKeywords(Array.isArray(hotResult.value.data?.keywords) ? hotResult.value.data.keywords : []);
        } else {
          setHotKeywords([]);
          nextWarnings.push("Search heat signals are unavailable right now, but the rest of the merchandising workspace still works.");
        }

        setWarnings(nextWarnings);
        setLoading(false);
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Failed to load home merchandising data.");
        setSeriesList([]);
        setSlots([]);
        setHotKeywords([]);
        setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading]);

  const publishedSeries = useMemo(() => seriesList.filter((series) => series.isPublished), [seriesList]);
  const seriesById = useMemo(() => new Map(seriesList.map((series) => [series.id, series])), [seriesList]);
  const editorialSnapshot = useMemo(() => getHomeEditorialSnapshot(publishedSeries), [publishedSeries]);
  const heroItems = useMemo(() => buildHomeHeroItems(publishedSeries).slice(0, 6), [publishedSeries]);
  const heroCandidates = useMemo(() => getHomeHeroCandidates(publishedSeries, { limit: 6 }), [publishedSeries]);
  const libraryReturnCandidates = useMemo(
    () =>
      getLibraryReturnCandidates(publishedSeries, {
        homepageSlots: slots,
        includeLibraryReturnSlot: false,
        limit: 6,
      }),
    [publishedSeries, slots],
  );

  const hotSignals = useMemo(
    () =>
      (Array.isArray(hotKeywords) ? hotKeywords : []).filter(Boolean).slice(0, 6).map((item, index) => ({
        id: `${typeof item === "string" ? item : item.keyword || item.label || "keyword"}-${index}`,
        label: typeof item === "string" ? item : item.keyword || item.label || "Search term",
        detail:
          item && typeof item === "object"
            ? item.growthLabel || item.badge || (typeof item.count === "number" ? `${item.count.toLocaleString()} searches` : "Search signal")
            : "Search signal",
      })),
    [hotKeywords],
  );

  const slotBlueprints = useMemo(() => {
    const slotRecommendationMap = {
      "home-hero": heroItems.map((item) => item.seriesId).filter(Boolean),
      "home-free-start": editorialSnapshot.freeStartPick?.id ? [editorialSnapshot.freeStartPick.id] : [],
      "home-binge-ready": editorialSnapshot.completedPick?.id ? [editorialSnapshot.completedPick.id] : [],
      "home-breakout": editorialSnapshot.breakoutPick?.id ? [editorialSnapshot.breakoutPick.id] : [],
      "library-return": libraryReturnCandidates.map((entry) => entry.series?.id).filter(Boolean),
    };

    return Object.entries(slotRecommendationMap).map(([slotId, recommendedIds]) => {
      const slotMeta = getStorefrontSlotDisplayMeta(slotId);
      return {
        id: slotId,
        label: slotMeta.label,
        hint: slotMeta.hint,
        recommendedIds,
      };
    });
  }, [editorialSnapshot, heroItems, libraryReturnCandidates]);

  const slotCards = useMemo(
    () =>
      slotBlueprints.map((slot) => {
        const current =
          slots.find((item) =>
            [item.id, item.slot, item.name]
              .map(normalizeStorefrontSlotToken)
              .includes(normalizeStorefrontSlotToken(slot.id)),
          ) || null;
        const currentIds = Array.isArray(current?.seriesIds) ? current.seriesIds : [];
        const recommendedSeries = slot.recommendedIds.map((id) => seriesById.get(id)).filter(Boolean);
        const currentSeries = currentIds.map((id) => seriesById.get(id)).filter(Boolean);
        const aligned =
          current &&
          currentIds.length === slot.recommendedIds.length &&
          currentIds.every((id, index) => id === slot.recommendedIds[index]);

        return {
          ...slot,
          current,
          currentIds,
          currentSeries,
          recommendedSeries,
          aligned: Boolean(aligned),
          state: !current ? "rose" : aligned ? "emerald" : "amber",
          stateLabel: !current ? "Not set" : aligned ? "Aligned" : "Needs sync",
          canApplyRecommendation: slot.recommendedIds.length > 0,
          actionLabel: !current ? "Apply recommendation" : aligned ? "Already aligned" : "Sync to recommendation",
        };
      }),
    [seriesById, slotBlueprints, slots],
  );

  const slotCoverageCount = useMemo(() => slotCards.filter((item) => item.current).length, [slotCards]);
  const slotIssueCount = useMemo(() => slotCards.filter((item) => !item.aligned).length, [slotCards]);
  const trackedCurrentSlots = useMemo(() => slotCards.filter((slot) => slot.current?.id), [slotCards]);
  const slotPerformanceCards = useMemo(
    () =>
      trackedCurrentSlots.map((slot) => ({
        ...slot,
        performance: slot.current?.id
          ? slotPerformanceMap[slot.current.id] || normalizePerformance(null)
          : normalizePerformance(null),
      })),
    [slotPerformanceMap, trackedCurrentSlots],
  );
  const performanceSummary = useMemo(
    () =>
      slotPerformanceCards.reduce(
        (summary, slot) => ({
          totalImpressions: summary.totalImpressions + slot.performance.totalImpressions,
          totalClicks: summary.totalClicks + slot.performance.totalClicks,
          totalConversions: summary.totalConversions + slot.performance.totalConversions,
        }),
        { totalImpressions: 0, totalClicks: 0, totalConversions: 0 },
      ),
    [slotPerformanceCards],
  );
  const summaryCtr = useMemo(
    () =>
      performanceSummary.totalImpressions > 0
        ? (performanceSummary.totalClicks / performanceSummary.totalImpressions) * 100
        : 0,
    [performanceSummary],
  );
  const summaryConversionRate = useMemo(
    () =>
      performanceSummary.totalClicks > 0
        ? (performanceSummary.totalConversions / performanceSummary.totalClicks) * 100
        : 0,
    [performanceSummary],
  );
  const slotOptimizationCards = useMemo(
    () =>
      slotCards
        .map((slot) => {
          const performanceLoaded =
            !slot.current?.id || Object.prototype.hasOwnProperty.call(slotPerformanceMap, slot.current.id);
          const performance =
            slot.current?.id && performanceLoaded
              ? slotPerformanceMap[slot.current.id] || normalizePerformance(null)
              : normalizePerformance(null);
          const enrichedSlot = { ...slot, performance, performanceLoaded };
          return {
            ...enrichedSlot,
            plan: buildSlotOptimizationPlan(enrichedSlot, getSlotReplacementCandidates(enrichedSlot, heroCandidates)),
          };
        })
        .sort((left, right) => right.plan.priority - left.plan.priority),
    [heroCandidates, slotCards, slotPerformanceMap],
  );
  const urgentOptimizationCount = useMemo(
    () => slotOptimizationCards.filter((slot) => slot.plan.priority >= 60).length,
    [slotOptimizationCards],
  );
  const readyHeroCount = useMemo(
    () => heroCandidates.filter(({ series }) => getAdminSeriesReadiness(series).isReady).length,
    [heroCandidates],
  );

  useEffect(() => {
    if (!isAuthenticated) {
      setSlotPerformanceMap({});
      setPerformanceNotice("");
      setPerformanceLoading(false);
      return;
    }

    if (trackedCurrentSlots.length === 0) {
      setSlotPerformanceMap({});
      setPerformanceNotice("");
      setPerformanceLoading(false);
      return;
    }

    let cancelled = false;

    async function loadSlotPerformance() {
      try {
        setPerformanceLoading(true);
        setPerformanceNotice("");

        const query = buildPerformanceQuery(performanceWindow);
        const results = await Promise.allSettled(
          trackedCurrentSlots.map((slot) =>
            adminFetchJson(
              `/api/admin/recommendations/slots/${slot.current.id}/performance${query ? `?${query}` : ""}`,
              { cache: "no-store" },
            ),
          ),
        );

        if (cancelled) {
          return;
        }

        const nextPerformanceMap = {};
        let failedCount = 0;

        results.forEach((result, index) => {
          const slotId = trackedCurrentSlots[index]?.current?.id;
          if (!slotId) {
            return;
          }

          if (result.status === "fulfilled" && result.value.response.ok) {
            nextPerformanceMap[slotId] = normalizePerformance(result.value.data?.performance);
            return;
          }

          nextPerformanceMap[slotId] = normalizePerformance(null);
          failedCount += 1;
        });

        setSlotPerformanceMap(nextPerformanceMap);

        if (failedCount === trackedCurrentSlots.length) {
          setPerformanceNotice("Performance data is unavailable right now, so keep using the editorial plan until attribution returns.");
        } else if (failedCount > 0) {
          setPerformanceNotice("Some slot metrics did not load, but the rest of the signal is still usable.");
        }
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setSlotPerformanceMap({});
        setPerformanceNotice(
          loadError instanceof Error ? loadError.message : "Failed to load slot performance.",
        );
      } finally {
        if (!cancelled) {
          setPerformanceLoading(false);
        }
      }
    }

    void loadSlotPerformance();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, performanceWindow, trackedCurrentSlots]);

  const handleCopyIds = async (label, ids) => {
    if (!Array.isArray(ids) || ids.length === 0) {
      setFeedback({ type: "error", message: `${label} does not have any IDs ready to copy.` });
      return;
    }
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      setFeedback({ type: "error", message: "Clipboard copy is not available in this browser." });
      return;
    }
    try {
      await navigator.clipboard.writeText(ids.join("\n"));
      setFeedback({ type: "success", message: `${label} IDs copied.` });
    } catch (copyError) {
      setFeedback({
        type: "error",
        message: copyError instanceof Error ? copyError.message : "Copy failed. Please try again.",
      });
    }
  };

  const handleApplyRecommendation = async (slot) => {
    if (!slot?.id || slot.recommendedIds.length === 0) {
      setFeedback({ type: "error", message: `${slot?.label || "This slot"} does not have a recommended title yet.` });
      return;
    }
    try {
      setSavingSlot(slot.id);
      setFeedback({ type: "", message: "" });
      const targetUrl = slot.current
        ? `/api/admin/recommendations/slots/${slot.current.id}`
        : "/api/admin/recommendations/slots";
      const requestMethod = slot.current ? "PATCH" : "POST";
      const { response, data } = await adminFetchJson(targetUrl, {
        method: requestMethod,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot: slot.current?.slot || slot.id,
          name: slot.current?.name || slot.label,
          seriesIds: slot.recommendedIds,
        }),
      });
      if (!response.ok) {
        setFeedback({
          type: "error",
          message: data?.message || data?.error || `${slot.label} could not be saved.`,
        });
        return;
      }
      await loadSlotsOnly();
      setFeedback({
        type: "success",
        message: slot.current ? `${slot.label} synced to the current editorial recommendation.` : `${slot.label} created.`,
      });
    } catch (saveError) {
      setFeedback({
        type: "error",
        message: saveError instanceof Error ? saveError.message : `${slot.label} could not be saved.`,
      });
    } finally {
      setSavingSlot("");
    }
  };

  const handleRefreshSlots = async () => {
    try {
      setRefreshing(true);
      await loadSlotsOnly();
      setFeedback({ type: "success", message: "Recommendation slots refreshed." });
    } catch (refreshError) {
      setFeedback({
        type: "error",
        message: refreshError instanceof Error ? refreshError.message : "Failed to refresh recommendation slots.",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const openSeriesPreview = (seriesId) => {
    if (!seriesId || typeof window === "undefined") {
      return;
    }
    window.open(`/series/${seriesId}`, "_blank", "noopener,noreferrer");
  };

  if (isLoading || loading) {
    return <LoadingView />;
  }

  return (
    <AdminShell
      title="Collections"
      subtitle="Manage homepage hero, start-here lanes, and editorial collections like part of the same story-first product."
      actions={
        <div className="flex flex-wrap gap-2">
          <ActionButton
            onClick={() => {
              if (typeof window !== "undefined") {
                window.open("/", "_blank", "noopener,noreferrer");
              }
            }}
          >
            <ArrowUpRight className="h-4 w-4" />
            View live home
          </ActionButton>
          <ActionButton onClick={() => router.push("/admin/recommendations")}>
            <Sparkles className="h-4 w-4" />
            Open recommendation tools
          </ActionButton>
        </div>
      }
    >
      <div className="space-y-6">
        {error ? (
          <div className="rounded-[24px] border border-rose-200 bg-rose-50/90 px-5 py-4 text-sm text-rose-700 shadow-[var(--gush-shadow-soft)]">
            Collection workspace failed to load: {error}
          </div>
        ) : null}

        {warnings.length > 0 ? (
          <div className="space-y-3">
            {warnings.map((warning) => (
              <div
                key={warning}
                className="rounded-[24px] border border-amber-200 bg-amber-50/90 px-5 py-4 text-sm text-amber-800 shadow-[var(--gush-shadow-soft)]"
              >
                {warning}
              </div>
            ))}
          </div>
        ) : null}

        {feedback.message ? (
          <div
            className={cn(
              "rounded-[24px] border px-5 py-4 text-sm shadow-[var(--gush-shadow-soft)]",
              feedback.type === "error"
                ? "border-rose-200 bg-rose-50/90 text-rose-700"
                : "border-emerald-200 bg-emerald-50/90 text-emerald-700",
            )}
          >
            {feedback.message}
          </div>
        ) : null}

        <SurfacePanel appearance="light" tone="highlight" accent="blue" className="p-0">
          <div className="grid gap-6 px-5 py-5 sm:px-6 sm:py-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Editorial collections
              </p>
              <h2 className="mt-3 text-[2rem] font-semibold tracking-tight text-slate-950 sm:text-[2.45rem]">
                Tighten the few placements that shape the home page most.
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
                The home page should feel edited, not noisy. Keep hero, start-here, binge-ready, breakout,
                and library return aligned with what readers can actually enjoy right now.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <ActionButton onClick={() => void handleRefreshSlots()}>
                  <RefreshCw className={cn("h-4 w-4", refreshing ? "animate-spin" : "")} />
                  {refreshing ? "Refreshing..." : "Refresh slots"}
                </ActionButton>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <MetricCard label="Live titles" value={publishedSeries.length.toLocaleString()} hint="Titles eligible for editorial placement." tone="blue" />
              <MetricCard label="Filled slots" value={slotCoverageCount.toLocaleString()} hint="Key home placements already configured." tone="emerald" />
              <MetricCard label="Slots to fix" value={slotIssueCount.toLocaleString()} hint="Missing or misaligned placements that still need attention." tone="amber" />
              <MetricCard label="Hero-ready titles" value={readyHeroCount.toLocaleString()} hint="Strong candidates that can carry a larger home-page moment." tone={readyHeroCount > 0 ? "cyan" : "rose"} />
            </div>
          </div>
        </SurfacePanel>

        <SurfacePanel appearance="light" accent="blue" className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[1.35rem] font-semibold tracking-tight text-slate-950">
                Slot health
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Start with the few placements that define the home page, then move into smaller thematic lanes.
              </p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {slotCards.map((slot) => (
              <article
                key={slot.id}
                className="rounded-[28px] border border-black/8 bg-white/82 px-5 py-5 shadow-[0_12px_24px_rgba(15,23,42,0.03)]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[1.2rem] font-semibold tracking-tight text-slate-950">{slot.label}</h3>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getToneClasses(slot.state)}`}>
                    {slot.stateLabel}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{slot.hint}</p>

                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Recommended titles
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {slot.recommendedSeries.length > 0 ? (
                        slot.recommendedSeries.map((series) => (
                          <span key={`${slot.id}-recommended-${series.id}`} className="inline-flex items-center rounded-full border border-black/8 bg-[rgba(250,247,241,0.92)] px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {series.title}
                          </span>
                        ))
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          No strong title yet
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Current setup
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {slot.currentSeries.length > 0 ? (
                        slot.currentSeries.map((series) => (
                          <span key={`${slot.id}-current-${series.id}`} className="inline-flex items-center rounded-full border border-black/8 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {series.title}
                          </span>
                        ))
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-black/8 bg-[rgba(250,247,241,0.92)] px-2.5 py-1 text-xs font-semibold text-slate-500">
                          Not configured yet
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <ActionButton
                    onClick={() => void handleApplyRecommendation(slot)}
                    className={cn(
                      slot.canApplyRecommendation
                        ? "border-[rgba(47,88,198,0.14)] bg-[rgba(47,88,198,0.08)] text-[var(--gush-accent,#2f58c6)]"
                        : "opacity-60",
                    )}
                    disabled={!slot.canApplyRecommendation || savingSlot === slot.id || slot.aligned}
                  >
                    <RefreshCw className={cn("h-4 w-4", savingSlot === slot.id ? "animate-spin" : "")} />
                    {savingSlot === slot.id ? "Saving..." : slot.actionLabel}
                  </ActionButton>
                  <ActionButton onClick={() => void handleCopyIds(`${slot.label} recommendation`, slot.recommendedIds)}>
                    <Copy className="h-4 w-4" />
                    Copy recommended IDs
                  </ActionButton>
                </div>
              </article>
            ))}
          </div>
        </SurfacePanel>

        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <SurfacePanel appearance="light" accent="cyan" className="space-y-5">
            <div>
              <h2 className="text-[1.35rem] font-semibold tracking-tight text-slate-950">
                Editorial picks
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Keep the main lanes easy to understand and clearly purposeful.
              </p>
            </div>

            <div className="grid gap-4">
              {[
                { id: "free", label: "Start here", icon: Zap, series: editorialSnapshot.freeStartPick },
                { id: "binge", label: "Binge-ready", icon: BookOpen, series: editorialSnapshot.completedPick },
                { id: "breakout", label: "Breakout", icon: Flame, series: editorialSnapshot.breakoutPick },
                { id: "return", label: "Library return", icon: Star, series: libraryReturnCandidates[0]?.series || null },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.id} className="rounded-[24px] border border-black/8 bg-white px-4 py-4 shadow-[0_12px_24px_rgba(15,23,42,0.03)]">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-black/8 bg-[rgba(250,247,241,0.92)] text-[var(--gush-accent,#2f58c6)]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-950">{item.label}</p>
                        <p className="mt-2 text-base font-semibold text-slate-900">
                          {item.series?.title || "No strong title yet"}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {item.series
                            ? `${item.series.type === "novel" ? "Novel" : "Comic"} | ${formatSeriesStatusLabel(item.series.status)} | Updated ${formatDateLabel(item.series.updatedAt)}`
                            : "Tighten title readiness first so this lane can carry a stronger editorial recommendation."}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </SurfacePanel>

          <SurfacePanel appearance="light" accent="amber" className="space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[1.35rem] font-semibold tracking-tight text-slate-950">
                  Search signals
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Use search heat to judge whether breakout and start-here lanes are catching real reader demand.
                </p>
              </div>
              <Search className="mt-1 h-5 w-5 text-amber-500" />
            </div>

            {hotSignals.length === 0 ? (
              <EmptyState
                title="No search signal available"
                description="When the hot search feed returns, it will show up here as a quick editorial input."
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {hotSignals.map((signal) => (
                  <div key={signal.id} className="rounded-[24px] border border-black/8 bg-white px-4 py-4 shadow-[0_12px_24px_rgba(15,23,42,0.03)]">
                    <p className="text-sm font-semibold text-slate-950">{signal.label}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{signal.detail}</p>
                  </div>
                ))}
              </div>
            )}
          </SurfacePanel>
        </div>

        <SurfacePanel appearance="light" accent="blue" className="space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-[1.35rem] font-semibold tracking-tight text-slate-950">
                Live slot performance
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Watch whether key placements are actually creating exposure, clicks, and clean handoff into reading.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {PERFORMANCE_WINDOWS.map((window) => (
                <ActionButton
                  key={window.id}
                  onClick={() => setPerformanceWindow(window.id)}
                  className={performanceWindow === window.id ? "border-[rgba(47,88,198,0.14)] bg-[rgba(47,88,198,0.08)] text-[var(--gush-accent,#2f58c6)]" : ""}
                >
                  {window.label}
                </ActionButton>
              ))}
            </div>
          </div>

          {performanceNotice ? (
            <div className="rounded-[24px] border border-amber-200 bg-amber-50/90 px-5 py-4 text-sm text-amber-800">
              {performanceNotice}
            </div>
          ) : null}

          {trackedCurrentSlots.length === 0 ? (
            <EmptyState
              title="Configure slots before reading performance"
              description="Once key placements are live, this section will show exposure, click-through, and handoff quality."
            />
          ) : performanceLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={`performance-metric-${index}`} className="h-32 rounded-[28px]" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <MetricCard label="Tracked slots" value={trackedCurrentSlots.length.toLocaleString()} hint="Configured placements with current performance data." tone="cyan" />
                <MetricCard label="Impressions" value={formatCompactNumber(performanceSummary.totalImpressions)} hint="Total exposure in the selected window." />
                <MetricCard label="Clicks" value={formatCompactNumber(performanceSummary.totalClicks)} hint="Reader click-through from those slots." />
                <MetricCard label="Conversions" value={formatCompactNumber(performanceSummary.totalConversions)} hint="The tracked action after a click." tone={performanceSummary.totalConversions > 0 ? "emerald" : "amber"} />
                <MetricCard label="CTR" value={formatPercentValue(summaryCtr)} hint={`Conversion ${formatPercentValue(summaryConversionRate)}`} tone={summaryCtr >= 2 ? "emerald" : summaryCtr > 0 ? "amber" : "rose"} />
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                {slotPerformanceCards.map((slot) => {
                  const performanceState = getPerformanceState(slot.performance);
                  const linkedTitles = slot.currentSeries.slice(0, 2).map((series) => series.title);

                  return (
                    <article
                      key={`${slot.id}-performance`}
                      className="rounded-[28px] border border-black/8 bg-white/82 px-5 py-5 shadow-[0_12px_24px_rgba(15,23,42,0.03)]"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[1.2rem] font-semibold tracking-tight text-slate-950">{slot.label}</h3>
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getToneClasses(performanceState.tone)}`}>
                          {performanceState.label}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {linkedTitles.length > 0
                          ? `Current titles: ${linkedTitles.join(" / ")}${slot.currentSeries.length > linkedTitles.length ? ` and ${slot.currentSeries.length - linkedTitles.length} more` : ""}`
                          : "The slot is configured, but the current title data could not be resolved."}
                      </p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <MiniMetric label="Impressions" value={formatCompactNumber(slot.performance.totalImpressions)} />
                        <MiniMetric label="Clicks" value={formatCompactNumber(slot.performance.totalClicks)} />
                        <MiniMetric label="Conversions" value={formatCompactNumber(slot.performance.totalConversions)} />
                        <MiniMetric label="CTR" value={formatPercentValue(slot.performance.avgCtr)} />
                        <MiniMetric label="Conversion" value={formatPercentValue(slot.performance.avgConversionRate)} />
                        <MiniMetric label="Slot ID" value={slot.id} hint="Tracking reference" />
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </SurfacePanel>

        <SurfacePanel appearance="light" accent="emerald" className="space-y-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-[1.35rem] font-semibold tracking-tight text-slate-950">
                Optimization queue
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Review configuration, title readiness, and recent performance together so fixes happen in the right order.
              </p>
            </div>
            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
              {urgentOptimizationCount} high-priority items
            </span>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {slotOptimizationCards.map((slot) => (
              <article
                key={`${slot.id}-optimization`}
                className="rounded-[28px] border border-black/8 bg-white/82 px-5 py-5 shadow-[0_12px_24px_rgba(15,23,42,0.03)]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[1.2rem] font-semibold tracking-tight text-slate-950">{slot.label}</h3>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getToneClasses(slot.plan.tone)}`}>
                    {slot.plan.title}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-600">{slot.plan.detail}</p>

                {slot.current ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <MiniMetric label="Impressions" value={formatCompactNumber(slot.performance.totalImpressions)} />
                    <MiniMetric label="CTR" value={formatPercentValue(slot.performance.avgCtr)} />
                    <MiniMetric label="Conversion" value={formatPercentValue(slot.performance.avgConversionRate)} />
                  </div>
                ) : null}

                {slot.plan.replacementCandidates.length > 0 ? (
                  <div className="mt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Backup titles
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {slot.plan.replacementCandidates.map((series) => (
                        <span key={`${slot.id}-replacement-${series.id}`} className="inline-flex items-center rounded-full border border-black/8 bg-[rgba(250,247,241,0.92)] px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {series.title}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-2">
                  {slot.plan.actionType === "apply" ? (
                    <ActionButton
                      onClick={() => void handleApplyRecommendation(slot)}
                      className="border-[rgba(47,88,198,0.14)] bg-[rgba(47,88,198,0.08)] text-[var(--gush-accent,#2f58c6)]"
                      disabled={savingSlot === slot.id || !slot.canApplyRecommendation}
                    >
                      <RefreshCw className={cn("h-4 w-4", savingSlot === slot.id ? "animate-spin" : "")} />
                      {savingSlot === slot.id ? "Saving..." : slot.plan.actionLabel}
                    </ActionButton>
                  ) : null}

                  {slot.plan.actionType === "edit" && slot.plan.actionSeriesId ? (
                    <ActionButton onClick={() => router.push(`/admin/series/${slot.plan.actionSeriesId}`)}>
                      <BookOpen className="h-4 w-4" />
                      {slot.plan.actionLabel}
                    </ActionButton>
                  ) : null}

                  {slot.plan.actionType === "copy" ? (
                    <ActionButton onClick={() => void handleCopyIds(`${slot.label} backup`, slot.plan.actionIds)}>
                      <Copy className="h-4 w-4" />
                      {slot.plan.actionLabel}
                    </ActionButton>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </SurfacePanel>

        <SurfacePanel appearance="light" accent="amber" className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[1.35rem] font-semibold tracking-tight text-slate-950">
                Hero candidates
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                These titles are the closest to a confident homepage spotlight. Do not burn the hero on half-ready work.
              </p>
            </div>
            <Star className="mt-1 h-5 w-5 text-amber-500" />
          </div>

          {heroCandidates.length === 0 ? (
            <EmptyState
              title="No strong hero candidates yet"
              description="Tighten cover art, credits, summary, and episodes on live titles before pushing harder at the top of home."
            />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {heroCandidates.map(({ series, score, reasons }) => {
                const readiness = getAdminSeriesReadiness(series);
                return (
                  <article
                    key={series.id}
                    className="rounded-[28px] border border-black/8 bg-white/82 px-5 py-5 shadow-[0_12px_24px_rgba(15,23,42,0.03)]"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[1.25rem] font-semibold tracking-tight text-slate-950">{series.title}</h3>
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getToneClasses(readiness.tone)}`}>
                        {readiness.statusLabel}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-black/8 bg-[rgba(250,247,241,0.92)] px-2.5 py-1 text-xs font-semibold text-slate-600">
                        Candidate score {Math.round(score)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {series.author ? `Creator: ${series.author}` : "Creator: not listed yet"} |{" "}
                      {series.type === "novel" ? "Novel" : "Comic"} | {formatSeriesStatusLabel(series.status)} |
                      {" "}Updated {formatDateLabel(series.updatedAt)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {reasons.map((reason) => (
                        <span key={`${series.id}-${reason}`} className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          {reason}
                        </span>
                      ))}
                      {readiness.missingItems.slice(0, 2).map((item) => (
                        <span key={`${series.id}-${item.id}`} className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          Missing {item.label}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <MiniMetric label="Episodes" value={series.episodeCount} />
                      <MiniMetric label="Reader signal" value={formatCompactNumber(getReaderProof(series))} />
                      <MiniMetric label="Readiness" value={readiness.score} />
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <ActionButton onClick={() => router.push(`/admin/series/${series.id}`)}>
                        <BookOpen className="h-4 w-4" />
                        Edit title
                      </ActionButton>
                      <ActionButton onClick={() => openSeriesPreview(series.id)}>
                        <ArrowUpRight className="h-4 w-4" />
                        View live page
                      </ActionButton>
                      <ActionButton onClick={() => void handleCopyIds(series.title, [series.id])}>
                        <Copy className="h-4 w-4" />
                        Copy ID
                      </ActionButton>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </SurfacePanel>
      </div>
    </AdminShell>
  );
}
