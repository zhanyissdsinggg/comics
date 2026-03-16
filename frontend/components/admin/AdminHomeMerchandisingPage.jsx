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
  getReaderProof,
} from "../../lib/homeMerchandising";
import { getAdminSeriesReadiness } from "../../lib/adminSeriesReadiness";

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
    name: String(source.name || source.slot || source.id || `slot-${index + 1}`),
    seriesIds: Array.isArray(source.seriesIds)
      ? source.seriesIds.map((item) => String(item || "").trim()).filter(Boolean)
      : [],
  };
}

function normalizeSlotToken(value) {
  return String(value || "").trim().toLowerCase();
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
  const [creatingSlot, setCreatingSlot] = useState("");
  const [refreshing, setRefreshing] = useState(false);

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
    () => [
      {
        id: "home-hero",
        label: "首页英雄位",
        hint: "首屏轮播位",
        recommendedIds: heroItems.map((item) => item.seriesId).filter(Boolean),
      },
      {
        id: "home-free-start",
        label: "免费开篇位",
        hint: "新客首点位",
        recommendedIds: editorialSnapshot.freeStartPick?.id ? [editorialSnapshot.freeStartPick.id] : [],
      },
      {
        id: "home-binge-ready",
        label: "完结 binge 位",
        hint: "周末长阅读位",
        recommendedIds: editorialSnapshot.completedPick?.id ? [editorialSnapshot.completedPick.id] : [],
      },
      {
        id: "home-breakout",
        label: "爆款新作位",
        hint: "热度承接位",
        recommendedIds: editorialSnapshot.breakoutPick?.id ? [editorialSnapshot.breakoutPick.id] : [],
      },
    ],
    [editorialSnapshot, heroItems],
  );

  const slotCards = useMemo(
    () =>
      slotBlueprints.map((slot) => {
        const current =
          slots.find((item) =>
            [item.id, item.name].map(normalizeSlotToken).includes(normalizeSlotToken(slot.id)),
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
          state: !current ? "rose" : aligned ? "emerald" : "amber",
          stateLabel: !current ? "缺失" : aligned ? "已对齐" : "待对齐",
        };
      }),
    [seriesById, slotBlueprints, slots],
  );

  const readyHeroCount = useMemo(
    () => heroCandidates.filter(({ series }) => getAdminSeriesReadiness(series).isReady).length,
    [heroCandidates],
  );

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

  const handleCreateSlot = async (slot) => {
    if (!slot?.id || slot.recommendedIds.length === 0) {
      setFeedback({ type: "error", message: `${slot?.label || "该推荐位"} 还没有可创建的作品。` });
      return;
    }
    try {
      setCreatingSlot(slot.id);
      setFeedback({ type: "", message: "" });
      const { response, data } = await adminFetchJson("/api/admin/recommendations/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: slot.id, seriesIds: slot.recommendedIds }),
      });
      if (!response.ok) {
        setFeedback({ type: "error", message: data?.message || data?.error || `${slot.label} 创建失败。` });
        return;
      }
      await loadSlotsOnly();
      setFeedback({ type: "success", message: `${slot.label} 已创建。` });
    } catch (createError) {
      setFeedback({
        type: "error",
        message: createError instanceof Error ? createError.message : `${slot.label} 创建失败。`,
      });
    } finally {
      setCreatingSlot("");
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
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300/80">Home merchandising</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">把首页最赚钱、最影响点击的几个位先收口。</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">
            头部美国漫画站的首页不是简单堆作品，而是每个入口都有明确任务。英雄位抓眼球，免费开篇位拉首点，完结位承接 binge，爆款位负责把热度留在站内。
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

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="已发布作品" value={publishedSeries.length.toLocaleString()} hint="当前能进入首页编排池的作品" />
          <StatCard
            label="首页位覆盖"
            value={`${slotCards.filter((item) => item.current).length}/${slotCards.length}`}
            hint="四个关键首页位已配置的数量"
            tone={slotCards.every((item) => item.current) ? "emerald" : "amber"}
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
                  <div className="mt-5 flex flex-wrap gap-2">
                    {!slot.current ? (
                      <button
                        type="button"
                        onClick={() => void handleCreateSlot(slot)}
                        disabled={creatingSlot === slot.id || slot.recommendedIds.length === 0}
                        className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-400/50 hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {creatingSlot === slot.id ? "创建中..." : "一键补位"}
                      </button>
                    ) : null}
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
                  <p className="mt-2 text-sm text-neutral-400">免费开篇、完结 binge、爆款新作，是最值得长期盯住的三刀。</p>
                </div>
                <Sparkles className="mt-1 h-5 w-5 text-cyan-300" />
              </div>
              <div className="mt-5 space-y-3">
                {[
                  { id: "free", label: "免费开篇", icon: Zap, series: editorialSnapshot.freeStartPick },
                  { id: "binge", label: "完结 binge", icon: BookOpen, series: editorialSnapshot.completedPick },
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
                      {series.author ? `作者 / 工作室：${series.author}` : "作者 / 工作室：未填写"} · {series.type === "novel" ? "小说" : "漫画"} · {series.status || "状态未知"} · 最近更新 {formatDateLabel(series.updatedAt)}
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
