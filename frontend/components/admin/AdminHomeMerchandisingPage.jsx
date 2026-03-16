"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, BookOpen, Copy, Flame, RefreshCw, Search, Sparkles, Star, Zap } from "lucide-react";
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
import {
  getStorefrontSlotDisplayMeta,
  normalizeStorefrontSlotToken,
} from "../../lib/storefrontSlots";

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeSeries(entry, index) {
  const source = entry && typeof entry === "object" ? entry : {};
  return {
    id: String(source.id || `series-${index + 1}`),
    title: String(source.title || "未命名作品"),
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
    return "暂无";
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return "暂无";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(parsed));
}

function formatCompactNumber(value) {
  return new Intl.NumberFormat("zh-CN", {
    notation: value >= 10000 ? "compact" : "standard",
    maximumFractionDigits: value >= 10000 ? 1 : 0,
  }).format(Math.max(0, toNumber(value)));
}

function formatPercentValue(value) {
  return `${toNumber(value).toFixed(2)}%`;
}

function formatSeriesStatusLabel(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "completed") {
    return "已完结";
  }
  if (normalized === "ongoing") {
    return "连载中";
  }
  if (normalized === "hiatus") {
    return "暂停中";
  }
  if (normalized === "cancelled") {
    return "已停更";
  }
  return String(value || "状态未知").trim() || "状态未知";
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
    return { tone: "rose", label: "暂无归因" };
  }
  if (performance.totalConversions > 0 || performance.avgCtr >= 2) {
    return { tone: "emerald", label: "表现健康" };
  }
  if (performance.totalClicks > 0) {
    return { tone: "amber", label: "需要优化" };
  }
  return { tone: "rose", label: "响应偏弱" };
}

function MiniMetric({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-neutral-500">{hint}</p> : null}
    </div>
  );
}

const PERFORMANCE_WINDOWS = [
  { id: "7d", label: "近 7 天" },
  { id: "30d", label: "近 30 天" },
  { id: "all", label: "全部" },
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
  const weakestEntry = [...readinessEntries].sort((left, right) => left.readiness.score - right.readiness.score)[0] || null;
  const hasReplacementCandidates = replacementCandidates.length > 0;
  const performanceLoaded = !slot?.current?.id || Boolean(slot?.performanceLoaded);
  const impressions = toNumber(slot?.performance?.totalImpressions);
  const ctr = toNumber(slot?.performance?.avgCtr);
  const conversionRate = toNumber(slot?.performance?.avgConversionRate);

  if (!slot?.current) {
    return {
      priority: 100,
      tone: "rose",
      title: "这个首页位还没上线",
      detail: "先把关键位补上，避免首页流量入口空转。",
      actionType: "apply",
      actionLabel: "一键补位",
      actionIds: Array.isArray(slot?.recommendedIds) ? slot.recommendedIds : [],
      replacementCandidates,
      replacementIds,
    };
  }

  if (!slot?.aligned) {
    return {
      priority: 90,
      tone: "amber",
      title: "当前配置偏离首页建议",
      detail: "先同步到当前首页建议，再判断是内容问题还是位置问题。",
      actionType: "apply",
      actionLabel: "一键对齐",
      actionIds: Array.isArray(slot?.recommendedIds) ? slot.recommendedIds : [],
      replacementCandidates,
      replacementIds,
    };
  }

  if (weakestEntry && !weakestEntry.readiness.isReady) {
    return {
      priority: 80,
      tone: "amber",
      title: "当前在跑的作品素材还没补齐",
      detail: `${weakestEntry.series.title} 还缺 ${weakestEntry.readiness.topIssues.join("、")}，会直接拖累首页点击和转化。`,
      actionType: "edit",
      actionLabel: "去补作品素材",
      actionSeriesId: weakestEntry.series.id,
      replacementCandidates,
      replacementIds,
    };
  }

  if (!performanceLoaded) {
    return {
      priority: 40,
      tone: "cyan",
      title: "表现数据还在同步",
      detail: "配置和素材已经就位，等归因数据返回后，再判断是否需要换稿或调位。",
      actionType: "review",
      actionLabel: "等待数据",
      actionIds: [],
      replacementCandidates,
      replacementIds,
    };
  }

  if (impressions <= 0) {
    return {
      priority: 70,
      tone: "amber",
      title: "这个首页位还没拿到曝光",
      detail: "先确认推荐位是否已真正上屏，或检查追踪归因是否正常返回。",
      actionType: hasReplacementCandidates ? "copy" : "review",
      actionLabel: hasReplacementCandidates ? "复制替换候选 ID" : "继续观察",
      actionIds: replacementIds,
      replacementCandidates,
      replacementIds,
    };
  }

  if (ctr < 2 && hasReplacementCandidates) {
    return {
      priority: 60,
      tone: "amber",
      title: "点击率偏低，建议准备替换候选",
      detail: `当前点击率只有 ${formatPercentValue(ctr)}，可以准备更强候选做下一轮测试。`,
      actionType: "copy",
      actionLabel: "复制替换候选 ID",
      actionIds: replacementIds,
      replacementCandidates,
      replacementIds,
    };
  }

  if (conversionRate > 0 && conversionRate < 10 && hasReplacementCandidates) {
    return {
      priority: 50,
      tone: "amber",
      title: "点击还行，但转化偏弱",
      detail: `当前转化率 ${formatPercentValue(conversionRate)}，可以优先测试更适合承接付费或免费开篇的作品。`,
      actionType: "copy",
      actionLabel: "复制替换候选 ID",
      actionIds: replacementIds,
      replacementCandidates,
      replacementIds,
    };
  }

  return {
    priority: 10,
    tone: "emerald",
    title: "当前状态稳定",
    detail: "这个首页位当前表现和配置都比较稳，可以继续观察。",
    actionType: "review",
    actionLabel: "保持观察",
    actionIds: [],
    replacementCandidates,
    replacementIds,
  };
}

function getToneClasses(tone) {
  if (tone === "emerald") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-200";
  }
  if (tone === "amber") {
    return "border-amber-500/25 bg-amber-500/10 text-amber-200";
  }
  if (tone === "rose") {
    return "border-rose-500/25 bg-rose-500/10 text-rose-200";
  }
  return "border-cyan-500/25 bg-cyan-500/10 text-cyan-200";
}

function LoadingView() {
  return (
    <AdminShell title="首页编排" subtitle="让首页最关键的几个位真正变成可运营资产。">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={`merchandising-stat-${index}`} className="h-32 rounded-3xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-3xl" />
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    </AdminShell>
  );
}

function StatCard({ label, value, hint, tone = "neutral" }) {
  const tones = {
    neutral: "border-neutral-800 bg-neutral-900/70 text-white",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-white",
    cyan: "border-cyan-500/20 bg-cyan-500/10 text-white",
    amber: "border-amber-500/20 bg-amber-500/10 text-white",
    rose: "border-rose-500/20 bg-rose-500/10 text-white",
  };

  return (
    <div className={`rounded-3xl border px-5 py-5 ${tones[tone] || tones.neutral}`}>
      <p className="text-sm text-neutral-300">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-xs text-neutral-400">{hint}</p>
    </div>
  );
}

function EmptyPanel({ title, description }) {
  return (
    <div className="rounded-3xl border border-dashed border-neutral-700 bg-neutral-900/40 px-5 py-10 text-center">
      <p className="text-base font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm text-neutral-400">{description}</p>
    </div>
  );
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
      throw new Error(data?.message || data?.error || "推荐位加载失败。");
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
              ? seriesResult.value.data?.message || seriesResult.value.data?.error || "作品数据加载失败。"
              : seriesResult.reason instanceof Error
                ? seriesResult.reason.message
                : "作品数据加载失败。";
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
          nextWarnings.push("推荐位暂时没有加载成功，本页先按首页规则给出建议。");
        }

        if (hotResult.status === "fulfilled" && hotResult.value.ok) {
          setHotKeywords(Array.isArray(hotResult.value.data?.keywords) ? hotResult.value.data.keywords : []);
        } else {
          setHotKeywords([]);
          nextWarnings.push("热搜信号暂时没有拿到，其余首页编排能力仍可继续使用。");
        }

        setWarnings(nextWarnings);
        setLoading(false);
      } catch (loadError) {
        if (cancelled) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "首页编排数据加载失败。");
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
        label: typeof item === "string" ? item : item.keyword || item.label || "热搜词",
        hint:
          typeof item === "object" && item
            ? item.growthLabel || item.badge || (typeof item.count === "number" ? `${item.count.toLocaleString()} 次搜索` : "热搜信号")
            : "热搜信号",
      })),
    [hotKeywords],
  );

  const slotBlueprints = useMemo(
    () => {
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
    },
    [editorialSnapshot, heroItems, libraryReturnCandidates],
  );

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
          stateLabel: !current ? "缺失" : aligned ? "已对齐" : "待对齐",
          canApplyRecommendation: slot.recommendedIds.length > 0,
          actionLabel: !current ? "一键补位" : aligned ? "已与建议一致" : "一键对齐",
        };
      }),
    [seriesById, slotBlueprints, slots],
  );

  const slotCoverageCount = useMemo(
    () => slotCards.filter((item) => item.current).length,
    [slotCards],
  );
  const slotIssueCount = useMemo(
    () => slotCards.filter((item) => !item.aligned).length,
    [slotCards],
  );
  const trackedCurrentSlots = useMemo(
    () => slotCards.filter((slot) => slot.current?.id),
    [slotCards],
  );
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
        {
          totalImpressions: 0,
          totalClicks: 0,
          totalConversions: 0,
        },
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
          const enrichedSlot = {
            ...slot,
            performance,
            performanceLoaded,
          };
          return {
            ...enrichedSlot,
            plan: buildSlotOptimizationPlan(
              enrichedSlot,
              getSlotReplacementCandidates(enrichedSlot, heroCandidates),
            ),
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
          setPerformanceNotice("首页位表现暂时没有加载成功，先继续完成编排。");
        } else if (failedCount > 0) {
          setPerformanceNotice("部分首页位表现数据加载失败，其余数据仍可作为参考。");
        }
      } catch (loadError) {
        if (cancelled) {
          return;
        }
        setSlotPerformanceMap({});
        setPerformanceNotice(
          loadError instanceof Error ? loadError.message : "首页位表现数据加载失败。",
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
      setFeedback({ type: "error", message: `${label} 还没有可复制的作品 ID。` });
      return;
    }
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      setFeedback({ type: "error", message: "当前环境不支持复制，请手动处理。" });
      return;
    }
    try {
      await navigator.clipboard.writeText(ids.join("\n"));
      setFeedback({ type: "success", message: `${label} 的作品 ID 已复制。` });
    } catch (copyError) {
      setFeedback({
        type: "error",
        message: copyError instanceof Error ? copyError.message : "复制失败，请稍后再试。",
      });
    }
  };

  const handleApplyRecommendation = async (slot) => {
    if (!slot?.id || slot.recommendedIds.length === 0) {
      setFeedback({ type: "error", message: `${slot?.label || "该推荐位"} 还没有可同步的作品。` });
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
          message: data?.message || data?.error || `${slot.label}${slot.current ? "同步" : "创建"}失败。`,
        });
        return;
      }
      await loadSlotsOnly();
      setFeedback({
        type: "success",
        message: slot.current ? `${slot.label} 已同步到建议配置。` : `${slot.label} 已创建。`,
      });
    } catch (saveError) {
      setFeedback({
        type: "error",
        message: saveError instanceof Error ? saveError.message : `${slot.label}${slot.current ? "同步" : "创建"}失败。`,
      });
    } finally {
      setSavingSlot("");
    }
  };

  const handleRefreshSlots = async () => {
    try {
      setRefreshing(true);
      await loadSlotsOnly();
      setFeedback({ type: "success", message: "推荐位数据已刷新。" });
    } catch (refreshError) {
      setFeedback({
        type: "error",
        message: refreshError instanceof Error ? refreshError.message : "推荐位刷新失败。",
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
      title="首页编排"
      subtitle="让首页英雄位、免费开篇位、完结位和爆款位真正变成可运营资产。"
      actions={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.open("/", "_blank", "noopener,noreferrer");
              }
            }}
            className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-400/50 hover:bg-emerald-500/15"
          >
            预览首页
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/recommendations")}
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
          >
            打开推荐管理
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {error ? (
          <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
            首页编排数据加载失败：{error}
          </div>
        ) : null}

        {feedback.message ? (
          <div
            className={`rounded-3xl border px-5 py-4 text-sm ${
              feedback.type === "error"
                ? "border-rose-500/30 bg-rose-500/10 text-rose-100"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
            }`}
          >
            {feedback.message}
          </div>
        ) : null}

        {warnings.map((warning) => (
          <div
            key={warning}
            className="rounded-3xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm text-amber-100"
          >
            {warning}
          </div>
        ))}

        <section className="rounded-3xl border border-neutral-800 bg-neutral-900/50 p-6 backdrop-blur-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300/80">首页编排</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">把首页最赚钱、最影响点击的几个位先收口。</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">
            头部美国漫画站的首页不是简单堆作品，而是每个入口都有明确任务。英雄位抓眼球，免费开篇位拉首点，完结追读位承接长阅读，爆款位负责把热度留在站内。
          </p>
          <button
            type="button"
            onClick={handleRefreshSlots}
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            刷新推荐位
          </button>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="已发布作品" value={publishedSeries.length.toLocaleString()} hint="当前能进入首页编排池的作品" />
          <StatCard
            label="首页位覆盖"
            value={`${slotCoverageCount}/${slotCards.length}`}
            hint="四个关键首页位已配置的数量"
            tone={slotCoverageCount === slotCards.length ? "emerald" : "amber"}
          />
          <StatCard
            label="待修复首页位"
            value={slotIssueCount.toLocaleString()}
            hint="缺失或未与建议配置对齐的首页位"
            tone={slotIssueCount === 0 ? "emerald" : "amber"}
          />
          <StatCard label="英雄位候选" value={heroItems.length.toLocaleString()} hint="首屏轮播可用候选数" tone="cyan" />
          <StatCard label="就绪候选" value={readyHeroCount.toLocaleString()} hint="资料完整、适合强推的候选" tone={readyHeroCount > 0 ? "emerald" : "rose"} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-3xl border border-neutral-800 bg-neutral-900/50 p-6 backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-white">关键首页位体检</h2>
                <p className="mt-2 text-sm text-neutral-400">先补齐四个关键首页位，再去做更细的主题位。</p>
              </div>
              <Search className="mt-1 h-5 w-5 text-emerald-300" />
            </div>

            <div className="mt-5 space-y-4">
              {slotCards.map((slot) => (
                <article key={slot.id} className="rounded-3xl border border-white/10 bg-black/10 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">{slot.label}</h3>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getToneClasses(slot.state)}`}>
                      {slot.stateLabel}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-neutral-300">{slot.id}</span>
                  </div>
                  <p className="mt-3 text-sm text-neutral-400">{slot.hint}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.2em] text-neutral-500">建议作品</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {slot.recommendedSeries.length > 0 ? slot.recommendedSeries.map((series) => (
                      <span key={`${slot.id}-recommended-${series.id}`} className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-200">
                        {series.title}
                      </span>
                    )) : <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200">当前还没有合适作品</span>}
                  </div>
                  <p className="mt-4 text-xs uppercase tracking-[0.2em] text-neutral-500">当前配置</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {slot.currentSeries.length > 0 ? slot.currentSeries.map((series) => (
                      <span key={`${slot.id}-current-${series.id}`} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-neutral-300">
                        {series.title}
                      </span>
                    )) : <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-neutral-400">暂未配置</span>}
                  </div>
                  {slot.current && !slot.aligned ? (
                    <p className="mt-4 text-sm text-amber-200">
                      当前推荐位内容和首页建议不一致，建议直接一键对齐，避免首页入口和实际运营目标脱节。
                    </p>
                  ) : null}
                  <div className="mt-5 flex flex-wrap gap-2">
                    {!slot.aligned ? (
                      <button
                        type="button"
                        onClick={() => void handleApplyRecommendation(slot)}
                        disabled={savingSlot === slot.id || !slot.canApplyRecommendation}
                        className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-400/50 hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {savingSlot === slot.id ? (slot.current ? "同步中..." : "创建中...") : slot.actionLabel}
                      </button>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-2 text-sm font-semibold text-emerald-200">
                        {slot.actionLabel}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleCopyIds(slot.label, slot.recommendedIds)}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
                    >
                      <Copy className="h-4 w-4" />
                      复制建议 ID
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <section className="rounded-3xl border border-neutral-800 bg-neutral-900/50 p-6 backdrop-blur-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-white">首页重点卡位</h2>
                  <p className="mt-2 text-sm text-neutral-400">免费开篇、完结追读、爆款新作，是最值得长期盯住的三刀。</p>
                </div>
                <Sparkles className="mt-1 h-5 w-5 text-cyan-300" />
              </div>
              <div className="mt-5 space-y-3">
                {[
                  { id: "free", label: "免费开篇", icon: Zap, series: editorialSnapshot.freeStartPick },
                  { id: "binge", label: "完结追读", icon: BookOpen, series: editorialSnapshot.completedPick },
                  { id: "breakout", label: "爆款新作", icon: Flame, series: editorialSnapshot.breakoutPick },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-2xl border border-white/10 bg-black/20 p-2.5 text-white">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{item.label}</p>
                          <p className="mt-2 text-base font-semibold text-white">{item.series?.title || "当前还没有合适作品"}</p>
                          <p className="mt-2 text-sm leading-6 text-neutral-400">
                            {item.series
                              ? `${Array.isArray(item.series.genres) && item.series.genres.length > 0 ? item.series.genres.slice(0, 2).join(" / ") : "待补标签"} · 最近更新 ${formatDateLabel(item.series.updatedAt)}`
                              : "先补作品资料和章节，首页卡位才不会浪费流量。"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-3xl border border-neutral-800 bg-neutral-900/50 p-6 backdrop-blur-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-white">热搜信号</h2>
                  <p className="mt-2 text-sm text-neutral-400">热搜词最适合拿来判断爆款位和榜单位有没有接住需求。</p>
                </div>
                <Flame className="mt-1 h-5 w-5 text-amber-300" />
              </div>
              <div className="mt-5 flex flex-wrap gap-2.5">
                {hotSignals.length > 0 ? hotSignals.map((signal) => (
                  <button
                    key={signal.id}
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        window.open(`/search?q=${encodeURIComponent(signal.label)}`, "_blank", "noopener,noreferrer");
                      }
                    }}
                    className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-left transition hover:border-white/20 hover:bg-white/[0.08]"
                  >
                    <span className="block text-sm font-semibold text-white">{signal.label}</span>
                    <span className="mt-1 block text-[11px] uppercase tracking-[0.2em] text-neutral-500">{signal.hint}</span>
                  </button>
                )) : <EmptyPanel title="当前没有热搜信号" description="热搜接口恢复后，这里会回到实时热点视图。" />}
              </div>
            </section>
          </div>
        </section>

        <section className="rounded-3xl border border-neutral-800 bg-neutral-900/50 p-6 backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">首页位表现</h2>
              <p className="mt-2 max-w-3xl text-sm text-neutral-400">
                别只看首页位排了什么，还要看这些位置最近到底有没有带来曝光、点击和转化。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {PERFORMANCE_WINDOWS.map((window) => (
                <button
                  key={window.id}
                  type="button"
                  onClick={() => setPerformanceWindow(window.id)}
                  className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                    performanceWindow === window.id
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                      : "border-white/10 bg-white/[0.04] text-neutral-200 hover:border-white/20 hover:bg-white/[0.08]"
                  }`}
                >
                  {window.label}
                </button>
              ))}
            </div>
          </div>

          {performanceNotice ? (
            <div className="mt-5 rounded-3xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
              {performanceNotice}
            </div>
          ) : null}

          {trackedCurrentSlots.length === 0 ? (
            <div className="mt-5">
              <EmptyPanel
                title="先配置首页位，再看表现"
                description="当前还没有首页推荐位在跑，等关键位补齐后，这里会显示最近的曝光、点击和转化。"
              />
            </div>
          ) : performanceLoading ? (
            <div className="mt-5 space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={`merchandising-performance-stat-${index}`} className="h-32 rounded-3xl" />
                ))}
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                {Array.from({ length: Math.min(2, trackedCurrentSlots.length) }).map((_, index) => (
                  <Skeleton key={`merchandising-performance-card-${index}`} className="h-64 rounded-3xl" />
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <StatCard
                  label="活跃首页位"
                  value={trackedCurrentSlots.length.toLocaleString()}
                  hint="当前已配置并正在追踪表现的首页位"
                  tone="cyan"
                />
                <StatCard
                  label="总曝光"
                  value={formatCompactNumber(performanceSummary.totalImpressions)}
                  hint="所选时间窗口内首页位累计曝光"
                />
                <StatCard
                  label="总点击"
                  value={formatCompactNumber(performanceSummary.totalClicks)}
                  hint="首页位带来的累计点击"
                />
                <StatCard
                  label="总转化"
                  value={formatCompactNumber(performanceSummary.totalConversions)}
                  hint="点击后发生的目标动作"
                  tone={performanceSummary.totalConversions > 0 ? "emerald" : "amber"}
                />
                <StatCard
                  label="综合点击率"
                  value={formatPercentValue(summaryCtr)}
                  hint={`综合转化率 ${formatPercentValue(summaryConversionRate)}`}
                  tone={summaryCtr >= 2 ? "emerald" : summaryCtr > 0 ? "amber" : "rose"}
                />
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                {slotPerformanceCards.map((slot) => {
                  const performanceState = getPerformanceState(slot.performance);
                  const linkedTitles = slot.currentSeries.slice(0, 2).map((series) => series.title);

                  return (
                    <article key={`${slot.id}-performance`} className="rounded-3xl border border-white/10 bg-black/10 p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-white">{slot.label}</h3>
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getToneClasses(performanceState.tone)}`}>
                          {performanceState.label}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-neutral-300">
                          {slot.currentIds.length} 个作品 ID
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-neutral-400">
                        {linkedTitles.length > 0
                          ? `当前重点作品：${linkedTitles.join(" / ")}${slot.currentSeries.length > linkedTitles.length ? ` 等 ${slot.currentSeries.length} 部` : ""}`
                          : "当前位已配置，但暂时没有匹配到可识别的作品信息。"}
                      </p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <MiniMetric label="曝光" value={formatCompactNumber(slot.performance.totalImpressions)} />
                        <MiniMetric label="点击" value={formatCompactNumber(slot.performance.totalClicks)} />
                        <MiniMetric label="转化" value={formatCompactNumber(slot.performance.totalConversions)} />
                        <MiniMetric label="点击率" value={formatPercentValue(slot.performance.avgCtr)} />
                        <MiniMetric label="转化率" value={formatPercentValue(slot.performance.avgConversionRate)} />
                        <MiniMetric label="状态" value={performanceState.label} hint={slot.id} />
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>

        <section className="rounded-3xl border border-neutral-800 bg-neutral-900/50 p-6 backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">首页位优化建议</h2>
              <p className="mt-2 max-w-3xl text-sm text-neutral-400">
                把当前配置、作品素材和最近表现放在一起看，先处理最容易拖累首页点击和转化的坑位。
              </p>
            </div>
            <span className="inline-flex w-fit items-center rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-semibold text-neutral-200">
              优先处理 {urgentOptimizationCount} 个
            </span>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {slotOptimizationCards.map((slot) => {
              const plan = slot.plan;
              const currentTitles = slot.currentSeries.map((series) => series.title).filter(Boolean);

              return (
                <article key={`${slot.id}-optimization`} className="rounded-3xl border border-white/10 bg-black/10 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">{slot.label}</h3>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getToneClasses(plan.tone)}`}>
                      {plan.title}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-neutral-300">
                      优先级 {plan.priority}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-neutral-400">{plan.detail}</p>

                  {slot.current ? (
                    <>
                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <MiniMetric label="曝光" value={formatCompactNumber(slot.performance.totalImpressions)} />
                        <MiniMetric label="点击率" value={formatPercentValue(slot.performance.avgCtr)} />
                        <MiniMetric label="转化率" value={formatPercentValue(slot.performance.avgConversionRate)} />
                      </div>
                      <p className="mt-4 text-xs uppercase tracking-[0.2em] text-neutral-500">当前配置</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {currentTitles.length > 0 ? currentTitles.map((title) => (
                          <span key={`${slot.id}-optimization-current-${title}`} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-neutral-300">
                            {title}
                          </span>
                        )) : (
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-neutral-400">
                            当前已上线，但暂时没有匹配到作品资料
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-dashed border-rose-500/30 bg-rose-500/10 px-4 py-4 text-sm text-rose-100">
                      这个首页位当前还没上屏，建议先补位，别让首页入口继续空着。
                    </div>
                  )}

                  {plan.replacementCandidates.length > 0 ? (
                    <>
                      <p className="mt-4 text-xs uppercase tracking-[0.2em] text-neutral-500">替换候选</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {plan.replacementCandidates.map((series) => (
                          <span key={`${slot.id}-replacement-${series.id}`} className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-xs text-cyan-200">
                            {series.title}
                          </span>
                        ))}
                      </div>
                    </>
                  ) : null}

                  <div className="mt-5 flex flex-wrap gap-2">
                    {plan.actionType === "apply" ? (
                      <button
                        type="button"
                        onClick={() => void handleApplyRecommendation(slot)}
                        disabled={savingSlot === slot.id || !slot.canApplyRecommendation}
                        className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-400/50 hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <RefreshCw className={`h-4 w-4 ${savingSlot === slot.id ? "animate-spin" : ""}`} />
                        {savingSlot === slot.id ? (slot.current ? "同步中..." : "创建中...") : plan.actionLabel}
                      </button>
                    ) : null}

                    {plan.actionType === "edit" && plan.actionSeriesId ? (
                      <button
                        type="button"
                        onClick={() => router.push(`/admin/series/${plan.actionSeriesId}`)}
                        className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-sm font-semibold text-amber-100 transition hover:border-amber-400/50 hover:bg-amber-500/15"
                      >
                        <BookOpen className="h-4 w-4" />
                        {plan.actionLabel}
                      </button>
                    ) : null}

                    {plan.actionType === "copy" ? (
                      <button
                        type="button"
                        onClick={() => void handleCopyIds(`${slot.label} 替换候选`, plan.actionIds)}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
                      >
                        <Copy className="h-4 w-4" />
                        {plan.actionLabel}
                      </button>
                    ) : null}

                    {plan.actionType === "review" ? (
                      <span className={`inline-flex items-center rounded-full border px-3.5 py-2 text-sm font-semibold ${getToneClasses(plan.tone)}`}>
                        {plan.actionLabel}
                      </span>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-neutral-800 bg-neutral-900/50 p-6 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-white">英雄位候选</h2>
              <p className="mt-2 text-sm text-neutral-400">这些作品最像首页首屏轮播。别把半成品塞进首屏浪费流量。</p>
            </div>
            <Star className="mt-1 h-5 w-5 text-amber-300" />
          </div>

          <div className="mt-5 space-y-4">
            {heroCandidates.length === 0 ? (
              <EmptyPanel title="暂无可用于首页编排的作品" description="先补齐已发布作品的封面、章节、简介和标签，再来做首页强推。" />
            ) : (
              heroCandidates.map(({ series, score, reasons }) => {
                const readiness = getAdminSeriesReadiness(series);
                return (
                  <article key={series.id} className="rounded-3xl border border-white/10 bg-black/10 p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-semibold text-white">{series.title}</h3>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getToneClasses(readiness.tone)}`}>
                        {readiness.statusLabel}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-neutral-300">
                        候选分 {Math.round(score)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-neutral-400">
                      {series.author ? `作者 / 工作室：${series.author}` : "作者 / 工作室：未填写"} · {series.type === "novel" ? "小说" : "漫画"} · {formatSeriesStatusLabel(series.status)} · 最近更新 {formatDateLabel(series.updatedAt)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {reasons.map((reason) => (
                        <span key={`${series.id}-${reason}`} className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-200">
                          {reason}
                        </span>
                      ))}
                      {readiness.missingItems.slice(0, 2).map((item) => (
                        <span key={`${series.id}-missing-${item.id}`} className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200">
                          待补：{item.label}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <p className="text-xs text-neutral-500">章节数</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{series.episodeCount}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <p className="text-xs text-neutral-500">读者信号</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{formatCompactNumber(getReaderProof(series))}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <p className="text-xs text-neutral-500">前台就绪分</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{readiness.score}</p>
                      </div>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => router.push(`/admin/series/${series.id}`)}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
                      >
                        <BookOpen className="h-4 w-4" />
                        编辑作品
                      </button>
                      <button
                        type="button"
                        onClick={() => openSeriesPreview(series.id)}
                        className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-400/50 hover:bg-emerald-500/15"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                        前台预览
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleCopyIds(series.title, [series.id])}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
                      >
                        <Copy className="h-4 w-4" />
                        复制作品 ID
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
