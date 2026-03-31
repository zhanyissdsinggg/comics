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
import { resolveSeriesCreatorName } from "../../lib/creatorIdentity";
import { getStorefrontSlotDisplayMeta, normalizeStorefrontSlotToken } from "../../lib/storefrontSlots";

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
    creatorCredits: Array.isArray(source.creatorCredits) ? source.creatorCredits.filter(Boolean) : [],
    type: source.type === "novel" ? "novel" : "comic",
    status: String(source.status || "Ongoing"),
    adult: Boolean(source.adult),
    description: String(source.description || ""),
    coverUrl: String(source.coverUrl || source.coverImage || ""),
    coverTone: String(source.coverTone || "default"),
    bannerUrl: String(source.bannerUrl || ""),
    genres: Array.isArray(source.genres) ? source.genres.filter(Boolean) : [],
    episodeCount: toNumber(source.episodeCount ?? source?._count?.episodes ?? source.totalEpisodes),
    latestEpisodeId: String(source.latestEpisodeId || ""),
    freeEpisodeCount: toNumber(source.freeEpisodeCount),
    hasFreeEpisodes: Boolean(source.hasFreeEpisodes || toNumber(source.freeEpisodeCount) > 0),
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
    return "暂无更新";
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return "暂无更新";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(parsed));
}

function formatCompactNumber(value) {
  return new Intl.NumberFormat("zh-CN", {
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
  return String(value || "状态未设置").trim() || "状态未设置";
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
    return { tone: "rose", label: "暂无反馈" };
  }
  if (performance.totalConversions > 0 || performance.avgCtr >= 2) {
    return { tone: "emerald", label: "状态稳定" };
  }
  if (performance.totalClicks > 0) {
    return { tone: "amber", label: "需要跟进" };
  }
  return { tone: "rose", label: "反馈偏弱" };
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
      title="首页编排"
      subtitle="把首页推荐位当成编辑工作区来维护，而不是当成一堆喧闹指标卡。"
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
  { id: "7d", label: "近 7 天" },
  { id: "30d", label: "近 30 天" },
  { id: "all", label: "全部时间" },
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
      const updatedAt = Date.parse(series?.updatedAt || "");
      const isRecent = !Number.isNaN(updatedAt) && updatedAt >= Date.now() - 21 * 24 * 60 * 60 * 1000;
      const episodeCount = toNumber(series?.episodeCount);
      return isRecent || (episodeCount > 0 && episodeCount <= 24);
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
      title: "推荐位仍未配置",
      detail: "先把关键首页入口补上，别让真正承接发现流量的位置继续空着。",
      actionType: "apply",
      actionLabel: "应用当前建议",
      actionIds: Array.isArray(slot?.recommendedIds) ? slot.recommendedIds : [],
      replacementCandidates,
      replacementIds,
    };
  }

  if (!slot?.aligned) {
    return {
      priority: 90,
      tone: "amber",
      title: "当前配置和方案不一致",
      detail: "先把推荐位对齐到当前编排方案，再判断问题出在内容本身还是入口位置。",
      actionType: "apply",
      actionLabel: "同步当前建议",
      actionIds: Array.isArray(slot?.recommendedIds) ? slot.recommendedIds : [],
      replacementCandidates,
      replacementIds,
    };
  }

  if (weakestEntry && !weakestEntry.readiness.isReady) {
    return {
      priority: 80,
      tone: "amber",
      title: "当前作品资料还没补稳",
      detail: `${weakestEntry.series.title} 仍缺 ${weakestEntry.readiness.topIssues.join("、")}。先把作品页补稳，再期待推荐位替它扛表现。`,
      actionType: "edit",
      actionLabel: "去补作品资料",
      actionSeriesId: weakestEntry.series.id,
      replacementCandidates,
      replacementIds,
    };
  }

  if (!performanceLoaded) {
    return {
      priority: 40,
      tone: "cyan",
      title: "表现数据还在回传",
      detail: "推荐位已经上线，但归因还没稳定，先不要急着动，等数据回齐再看。",
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
      title: "当前没有拿到曝光",
      detail: "先确认这个推荐位是否真的在前台生效，以及埋点是否正常回传。",
      actionType: hasReplacementCandidates ? "copy" : "review",
      actionLabel: hasReplacementCandidates ? "复制备选作品 ID" : "检查推荐位状态",
      actionIds: replacementIds,
      replacementCandidates,
      replacementIds,
    };
  }

  if (ctr < 2 && hasReplacementCandidates) {
    return {
      priority: 60,
      tone: "amber",
      title: "点击承接偏弱",
      detail: `CTR 只有 ${formatPercentValue(ctr)}，下一轮编排前应该先准备更强的备选作品。`,
      actionType: "copy",
      actionLabel: "复制备选作品 ID",
      actionIds: replacementIds,
      replacementCandidates,
      replacementIds,
    };
  }

  if (conversionRate > 0 && conversionRate < 10 && hasReplacementCandidates) {
    return {
      priority: 50,
      tone: "amber",
      title: "点进去了，但后续承接偏弱",
      detail: `转化率只有 ${formatPercentValue(conversionRate)}，要换更符合推荐位承诺的作品来试。`,
      actionType: "copy",
      actionLabel: "复制备选作品 ID",
      actionIds: replacementIds,
      replacementCandidates,
      replacementIds,
    };
  }

  return {
    priority: 10,
    tone: "emerald",
    title: "当前推荐位状态稳定",
    detail: "内容与入口已经基本匹配，可以继续观察，不必急着调整。",
    actionType: "review",
    actionLabel: "继续观察",
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
      throw new Error(data?.message || data?.error || "推荐位配置加载失败。");
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
          nextWarnings.push("推荐位配置暂时没有加载成功，当前页面只展示编排建议，不代表已保存的线上状态。");
        }

        if (hotResult.status === "fulfilled" && hotResult.value.ok) {
          setHotKeywords(Array.isArray(hotResult.value.data?.keywords) ? hotResult.value.data.keywords : []);
        } else {
          setHotKeywords([]);
          nextWarnings.push("搜索关注点暂时不可用，不过首页编排的其他区块仍可正常使用。");
        }

        setWarnings(nextWarnings);
        setLoading(false);
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "首页编排工作台加载失败。");
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
        label: typeof item === "string" ? item : item.keyword || item.label || "搜索词",
        detail:
          item && typeof item === "object"
            ? item.growthLabel || (typeof item.count === "number" ? `${item.count.toLocaleString()} 次搜索` : "搜索关注点")
            : "搜索关注点",
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
          stateLabel: !current ? "未配置" : aligned ? "已对齐" : "待同步",
          canApplyRecommendation: slot.recommendedIds.length > 0,
          actionLabel: !current ? "应用当前建议" : aligned ? "已经对齐" : "同步当前建议",
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
          setPerformanceNotice("表现数据暂时不可用，先按当前编排方案维护，等归因恢复后再判断。");
        } else if (failedCount > 0) {
          setPerformanceNotice("部分推荐位指标暂时没有回传，但其余数据仍可参考。");
        }
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setSlotPerformanceMap({});
        setPerformanceNotice(
          loadError instanceof Error ? loadError.message : "推荐位表现数据加载失败。",
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
      setFeedback({ type: "error", message: `${label} 当前没有可复制的作品 ID。` });
      return;
    }
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      setFeedback({ type: "error", message: "当前浏览器不支持直接复制到剪贴板。"});
      return;
    }
    try {
      await navigator.clipboard.writeText(ids.join("\n"));
      setFeedback({ type: "success", message: `${label} 的作品 ID 已复制。` });
    } catch (copyError) {
      setFeedback({
        type: "error",
        message: copyError instanceof Error ? copyError.message : "复制失败，请稍后重试。",
      });
    }
  };

  const handleApplyRecommendation = async (slot) => {
    if (!slot?.id || slot.recommendedIds.length === 0) {
      setFeedback({ type: "error", message: `${slot?.label || "当前推荐位"} 还没有可用的建议作品。` });
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
          message: data?.message || data?.error || `${slot.label} 保存失败。`,
        });
        return;
      }
      await loadSlotsOnly();
      setFeedback({
        type: "success",
        message: slot.current ? `${slot.label} 已同步到当前编排建议。` : `${slot.label} 已创建。`,
      });
    } catch (saveError) {
      setFeedback({
        type: "error",
        message: saveError instanceof Error ? saveError.message : `${slot.label} 保存失败。`,
      });
    } finally {
      setSavingSlot("");
    }
  };

  const handleRefreshSlots = async () => {
    try {
      setRefreshing(true);
      await loadSlotsOnly();
      setFeedback({ type: "success", message: "推荐位配置已刷新。" });
    } catch (refreshError) {
      setFeedback({
        type: "error",
        message: refreshError instanceof Error ? refreshError.message : "推荐位配置刷新失败。",
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
      subtitle="把首页主视觉、起步推荐和回访入口当成同一套内容编排工作来维护。"
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
            查看线上首页
          </ActionButton>
          <ActionButton onClick={() => router.push("/admin/recommendations")}>
            <Sparkles className="h-4 w-4" />
            打开发现配置
          </ActionButton>
        </div>
      }
    >
      <div className="space-y-6">
        {error ? (
          <div className="rounded-[24px] border border-rose-200 bg-rose-50/90 px-5 py-4 text-sm text-rose-700 shadow-[var(--gush-shadow-soft)]">
            首页编排工作台加载失败：{error}
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
                首页编排基线
              </p>
              <h2 className="mt-3 text-[2rem] font-semibold tracking-tight text-slate-950 sm:text-[2.45rem]">
                先收紧真正决定首页观感的几个入口。
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
                首页要像经过编辑，而不是像乱摆出来的广告位。先保证主视觉、起步推荐、追更回访和短链路入口都能接住真实可读内容。
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <ActionButton onClick={() => void handleRefreshSlots()}>
                  <RefreshCw className={cn("h-4 w-4", refreshing ? "animate-spin" : "")} />
                  {refreshing ? "刷新中..." : "刷新推荐位"}
                </ActionButton>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <MetricCard label="可编排作品" value={publishedSeries.length.toLocaleString()} hint="当前可以进入首页编排池的已上线作品。" tone="blue" />
              <MetricCard label="已配置推荐位" value={slotCoverageCount.toLocaleString()} hint="关键首页入口中已经配置完成的数量。" tone="emerald" />
              <MetricCard label="待处理推荐位" value={slotIssueCount.toLocaleString()} hint="仍需补齐或重新对齐的首页入口。" tone="amber" />
              <MetricCard label="可上主视觉的作品" value={readyHeroCount.toLocaleString()} hint="足够完整，能承担首页强曝光的作品。" tone={readyHeroCount > 0 ? "cyan" : "rose"} />
            </div>
          </div>
        </SurfacePanel>

        <SurfacePanel appearance="light" accent="blue" className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[1.35rem] font-semibold tracking-tight text-slate-950">
                推荐位状态
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                先把最影响首页观感的几个入口看清楚，再去处理次级主题位。
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
                          建议作品
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
                          还没有足够稳的候选作品
                        </span>
                      )}
                    </div>
                  </div>

                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          当前配置
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
                          尚未配置
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
                      {savingSlot === slot.id ? "保存中..." : slot.actionLabel}
                  </ActionButton>
                  <ActionButton onClick={() => void handleCopyIds(`${slot.label} 建议方案`, slot.recommendedIds)}>
                    <Copy className="h-4 w-4" />
                    复制建议作品 ID
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
                重点入口推荐
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                这些入口要让编辑和读者都一眼看懂，不要靠花哨标签硬撑。
              </p>
            </div>

            <div className="grid gap-4">
              {[
                { id: "free", label: "从这里开始", icon: Zap, series: editorialSnapshot.freeStartPick },
                { id: "binge", label: "适合连看", icon: BookOpen, series: editorialSnapshot.completedPick },
                { id: "breakout", label: "近期亮点", icon: Flame, series: editorialSnapshot.breakoutPick },
                { id: "return", label: "继续读这部", icon: Star, series: libraryReturnCandidates[0]?.series || null },
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
                          {item.series?.title || "还没有足够稳的作品"}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {item.series
                            ? `${item.series.type === "novel" ? "小说" : "漫画"} | ${formatSeriesStatusLabel(item.series.status)} | 更新于 ${formatDateLabel(item.series.updatedAt)}`
                            : "先把作品资料补稳，这个入口才能挂上更有把握的推荐。"}
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
                  搜索关注点
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                  用真实搜索关注点判断“近期亮点”和“从这里开始”这些入口是不是跟上了读者需求。
              </p>
              </div>
              <Search className="mt-1 h-5 w-5 text-amber-500" />
            </div>

            {hotSignals.length === 0 ? (
              <EmptyState
                title="当前没有搜索关注点"
                description="热搜数据恢复后，这里会继续作为首页编排的辅助参考。"
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
                推荐位表现
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                看关键入口是否真正拿到曝光、点击和后续阅读承接，而不是只看表面配置。
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
              title="先完成推荐位配置"
              description="关键入口上线后，这里才会有曝光、点击和承接质量的真实数据。"
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
                <MetricCard label="已跟踪推荐位" value={trackedCurrentSlots.length.toLocaleString()} hint="当前已配置且有表现数据的入口数量。" tone="cyan" />
                <MetricCard label="曝光" value={formatCompactNumber(performanceSummary.totalImpressions)} hint="所选时间范围内的总曝光。" />
                <MetricCard label="点击" value={formatCompactNumber(performanceSummary.totalClicks)} hint="这些推荐位带来的点击量。" />
                <MetricCard label="转化" value={formatCompactNumber(performanceSummary.totalConversions)} hint="点击后的被跟踪动作。" tone={performanceSummary.totalConversions > 0 ? "emerald" : "amber"} />
                <MetricCard label="点击率" value={formatPercentValue(summaryCtr)} hint={`转化率 ${formatPercentValue(summaryConversionRate)}`} tone={summaryCtr >= 2 ? "emerald" : summaryCtr > 0 ? "amber" : "rose"} />
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
                          ? `当前作品：${linkedTitles.join(" / ")}${slot.currentSeries.length > linkedTitles.length ? `，另有 ${slot.currentSeries.length - linkedTitles.length} 部` : ""}`
                          : "推荐位已经配置，但当前作品数据没有成功解析出来。"}
                      </p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <MiniMetric label="曝光" value={formatCompactNumber(slot.performance.totalImpressions)} />
                        <MiniMetric label="点击" value={formatCompactNumber(slot.performance.totalClicks)} />
                        <MiniMetric label="转化" value={formatCompactNumber(slot.performance.totalConversions)} />
                        <MiniMetric label="点击率" value={formatPercentValue(slot.performance.avgCtr)} />
                        <MiniMetric label="转化率" value={formatPercentValue(slot.performance.avgConversionRate)} />
                        <MiniMetric label="推荐位 ID" value={slot.id} hint="追踪参考" />
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
                待优化队列
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                把推荐位配置、作品完整度和最近表现放在一起看，避免修错顺序。
              </p>
            </div>
            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
              {urgentOptimizationCount} 个高优先级项
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
                    <MiniMetric label="曝光" value={formatCompactNumber(slot.performance.totalImpressions)} />
                    <MiniMetric label="点击率" value={formatPercentValue(slot.performance.avgCtr)} />
                    <MiniMetric label="转化率" value={formatPercentValue(slot.performance.avgConversionRate)} />
                  </div>
                ) : null}

                {slot.plan.replacementCandidates.length > 0 ? (
                  <div className="mt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      备选作品
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
                      {savingSlot === slot.id ? "保存中..." : slot.plan.actionLabel}
                    </ActionButton>
                  ) : null}

                  {slot.plan.actionType === "edit" && slot.plan.actionSeriesId ? (
                    <ActionButton onClick={() => router.push(`/admin/series/${slot.plan.actionSeriesId}`)}>
                      <BookOpen className="h-4 w-4" />
                      {slot.plan.actionLabel}
                    </ActionButton>
                  ) : null}

                  {slot.plan.actionType === "copy" ? (
                    <ActionButton onClick={() => void handleCopyIds(`${slot.label} 备选方案`, slot.plan.actionIds)}>
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
                主视觉候选作品
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                这些作品最接近能稳稳接住首页强曝光，但别把主视觉位浪费在半成品上。
              </p>
            </div>
            <Star className="mt-1 h-5 w-5 text-amber-500" />
          </div>

          {heroCandidates.length === 0 ? (
            <EmptyState
              title="当前还没有足够稳的主视觉候选"
              description="先把封面、署名、简介和章节补稳，再考虑把作品推到首页最强入口。"
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
                        候选分 {Math.round(score)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {resolveSeriesCreatorName(series)
                        ? `署名：${resolveSeriesCreatorName(series)}`
                        : "署名待补"}{" "}
                      |{" "}
                      {series.type === "novel" ? "小说" : "漫画"} | {formatSeriesStatusLabel(series.status)} |
                      {" "}更新于 {formatDateLabel(series.updatedAt)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {reasons.map((reason) => (
                        <span key={`${series.id}-${reason}`} className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          {reason}
                        </span>
                      ))}
                      {readiness.missingItems.slice(0, 2).map((item) => (
                        <span key={`${series.id}-${item.id}`} className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          缺：{item.label}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <MiniMetric label="章节数" value={series.episodeCount} />
                      <MiniMetric label="内容基础" value={formatCompactNumber(getReaderProof(series))} />
                      <MiniMetric label="就绪分" value={readiness.score} />
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <ActionButton onClick={() => router.push(`/admin/series/${series.id}`)}>
                        <BookOpen className="h-4 w-4" />
                        编辑作品
                      </ActionButton>
                      <ActionButton onClick={() => openSeriesPreview(series.id)}>
                        <ArrowUpRight className="h-4 w-4" />
                        查看前台页
                      </ActionButton>
                      <ActionButton onClick={() => void handleCopyIds(series.title, [series.id])}>
                        <Copy className="h-4 w-4" />
                        复制作品 ID
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

