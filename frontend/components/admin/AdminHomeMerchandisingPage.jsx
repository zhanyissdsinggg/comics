"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, BookOpen, Copy, Flame, RefreshCw, Search, Sparkles, Star, Zap } from "lucide-react";

import { cn } from "@/lib/utils";
import SurfacePanel from "@/components/common/SurfacePanel";

import AdminShell from "./AdminShell";
import { useAdminAuth } from "./AuthContext";
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
import {
  ActionButton,
  EmptyState,
  getToneClasses,
  LoadingView,
  MetricCard,
  MiniMetric,
} from "./home-merchandising/blocks";
import {
  HeroCandidatesSection,
  OptimizationQueueSection,
  PerformanceOverviewSection,
} from "./home-merchandising/sections";
import {
  buildPerformanceQuery,
  buildSlotOptimizationPlan,
  formatCompactNumber,
  formatDateLabel,
  formatPercentValue,
  formatSeriesStatusLabel,
  getPerformanceState,
  getSlotReplacementCandidates,
  normalizePerformance,
  normalizeSeries,
  normalizeSlot,
  PERFORMANCE_WINDOWS,
  toNumber,
} from "./home-merchandising/utils";

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
      setFeedback({ type: "error", message: `${label} 当前没有可复制的作品编号。` });
      return;
    }
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      setFeedback({ type: "error", message: "当前浏览器不支持直接复制到剪贴板。"});
      return;
    }
    try {
      await navigator.clipboard.writeText(ids.join("\n"));
      setFeedback({ type: "success", message: `${label} 的作品编号已复制。` });
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
      subtitle="把首页主视觉、起步推荐和回访入口放进同一套编排工作流。"
      actions={
        <div className="flex flex-wrap gap-2">
          <ActionButton
            onClick={() => router.push("/admin/recommendations")}
            className="border-[color:var(--gush-border-strong)] bg-[linear-gradient(180deg,#ffffff,#f5f5f7)] text-slate-950 shadow-[0_8px_18px_rgba(15,23,42,0.035)]"
          >
            <Sparkles className="h-4 w-4" />
            打开发现配置
          </ActionButton>
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
        </div>
      }
    >
      <div className="space-y-6">
        {error ? (
          <div className="rounded-[24px] border border-rose-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,241,242,0.95))] px-5 py-4 text-sm text-rose-700 shadow-[0_12px_28px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02]">
            首页编排工作台加载失败：{error}
          </div>
        ) : null}

        {warnings.length > 0 ? (
          <div className="space-y-3">
            {warnings.map((warning) => (
              <div
                key={warning}
                className="rounded-[24px] border border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,251,235,0.95))] px-5 py-4 text-sm text-amber-800 shadow-[0_12px_28px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02]"
              >
                {warning}
              </div>
            ))}
          </div>
        ) : null}

        {feedback.message ? (
          <div
            className={cn(
              "rounded-[24px] border px-5 py-4 text-sm shadow-[0_12px_28px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02]",
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
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">
                主视觉、起步推荐和回访入口先用最稳的作品。
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <ActionButton
                  onClick={() => void handleRefreshSlots()}
                  className="border-[color:var(--gush-border-strong)] bg-[linear-gradient(180deg,#ffffff,#f5f5f7)] text-slate-950 shadow-[0_8px_18px_rgba(15,23,42,0.035)]"
                >
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
                  先看关键入口，再处理次级位置。
                </p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {slotCards.map((slot) => (
              <article
                key={slot.id}
                className="rounded-[28px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,247,249,0.92))] px-5 py-5 shadow-[0_14px_32px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02]"
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
                          <span key={`${slot.id}-recommended-${series.id}`} className="inline-flex items-center rounded-full border border-[color:var(--gush-border)] bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-[0_4px_12px_rgba(15,23,42,0.025)]">
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
                          <span key={`${slot.id}-current-${series.id}`} className="inline-flex items-center rounded-full border border-[color:var(--gush-border)] bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {series.title}
                          </span>
                        ))
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-[color:var(--gush-border)] bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 shadow-[0_4px_12px_rgba(15,23,42,0.025)]">
                          尚未配置
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  <ActionButton
                    onClick={() => void handleApplyRecommendation(slot)}
                    className={cn(
                      slot.canApplyRecommendation
                        ? "border-[color:var(--gush-border-strong)] bg-[linear-gradient(180deg,#ffffff,#f5f5f7)] text-slate-950 shadow-[0_8px_18px_rgba(15,23,42,0.035)]"
                        : "opacity-60",
                    )}
                    disabled={!slot.canApplyRecommendation || savingSlot === slot.id || slot.aligned}
                    >
                      <RefreshCw className={cn("h-4 w-4", savingSlot === slot.id ? "animate-spin" : "")} />
                      {savingSlot === slot.id ? "保存中..." : slot.actionLabel}
                  </ActionButton>
                  <ActionButton onClick={() => void handleCopyIds(`${slot.label} 建议方案`, slot.recommendedIds)}>
                    <Copy className="h-4 w-4" />
                    复制建议作品编号
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
                  这些入口要让编辑和读者都一眼看懂。
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
                  <div key={item.id} className="rounded-[24px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,247,249,0.92))] px-4 py-4 shadow-[0_14px_32px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02]">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-[color:var(--gush-border)] bg-white text-slate-950 shadow-[0_6px_16px_rgba(15,23,42,0.03)]">
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
                  用真实搜索关注点辅助判断入口方向。
                </p>
              </div>
              <Search className="mt-1 h-5 w-5 text-amber-500" />
            </div>

            {hotSignals.length === 0 ? (
              <EmptyState
                title="当前没有搜索关注点"
                description="当前没有可用热搜数据。"
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {hotSignals.map((signal) => (
                  <div key={signal.id} className="rounded-[24px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,247,249,0.92))] px-4 py-4 shadow-[0_14px_32px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02]">
                    <p className="text-sm font-semibold text-slate-950">{signal.label}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{signal.detail}</p>
                  </div>
                ))}
              </div>
            )}
          </SurfacePanel>
        </div>

        <PerformanceOverviewSection
          performanceWindow={performanceWindow}
          setPerformanceWindow={setPerformanceWindow}
          performanceNotice={performanceNotice}
          trackedCurrentSlots={trackedCurrentSlots}
          performanceLoading={performanceLoading}
          performanceSummary={performanceSummary}
          summaryCtr={summaryCtr}
          summaryConversionRate={summaryConversionRate}
          slotPerformanceCards={slotPerformanceCards}
        />

        <OptimizationQueueSection
          urgentOptimizationCount={urgentOptimizationCount}
          slotOptimizationCards={slotOptimizationCards}
          handleApplyRecommendation={handleApplyRecommendation}
          savingSlot={savingSlot}
          openSeriesEditor={(seriesId) => router.push(`/admin/series/${seriesId}`)}
          handleCopyIds={handleCopyIds}
        />

        <HeroCandidatesSection
          heroCandidates={heroCandidates}
          getReaderProof={getReaderProof}
          openSeriesEditor={(seriesId) => router.push(`/admin/series/${seriesId}`)}
          openSeriesPreview={openSeriesPreview}
          handleCopyIds={handleCopyIds}
        />
      </div>
    </AdminShell>
  );
}

