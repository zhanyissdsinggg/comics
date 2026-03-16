"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Copy,
  Edit3,
  Eye,
  Search,
  Users,
} from "lucide-react";
import AdminShell from "./AdminShell";
import { useAdminAuth } from "./AuthContext";
import Skeleton from "../common/Skeleton";
import { adminFetchJson } from "../../lib/adminApiClient";
import { buildAdminCreatorAudit } from "../../lib/adminCreatorAudit";

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCompactCount(value) {
  return new Intl.NumberFormat("zh-CN", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(Math.max(0, toNumber(value)));
}

function formatDateLabel(value) {
  if (!value) {
    return "最近无更新";
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return "最近无更新";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(parsed));
}

function getErrorMessage(data, response) {
  return data?.message || data?.error || `请求失败，状态码 ${response.status}。`;
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
  return String(value || "未设置状态").trim() || "未设置状态";
}

function LoadingView() {
  return (
    <AdminShell title="创作者管理" subtitle="聚合作者、工作室与作品归因，方便运营统一维护。">
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={`creator-admin-stat-${index}`} className="h-32 rounded-3xl" />
          ))}
        </div>
        <Skeleton className="h-28 rounded-3xl" />
        <div className="grid gap-4 xl:grid-cols-2">
          <Skeleton className="h-72 rounded-3xl" />
          <Skeleton className="h-72 rounded-3xl" />
        </div>
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    </AdminShell>
  );
}

function StatCard({ title, value, hint, tone = "emerald" }) {
  const tones = {
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
    blue: "border-sky-500/20 bg-sky-500/10 text-sky-200",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-200",
    rose: "border-rose-500/20 bg-rose-500/10 text-rose-200",
  };

  return (
    <div className={`rounded-3xl border px-5 py-5 ${tones[tone] || tones.emerald}`}>
      <p className="text-sm text-neutral-300">{title}</p>
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

export default function AdminCreatorsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdminAuth();
  const [seriesList, setSeriesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState("all");
  const [expandedCreators, setExpandedCreators] = useState([]);
  const [copyFeedback, setCopyFeedback] = useState({ slug: "", type: "", message: "" });

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

        const { response, data } = await adminFetchJson("/api/admin/series", {
          cache: "no-store",
        });

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setSeriesList([]);
          setError(getErrorMessage(data, response));
          setLoading(false);
          return;
        }

        setSeriesList(Array.isArray(data?.series) ? data.series.filter(Boolean) : []);
        setLoading(false);
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setSeriesList([]);
        setError(loadError instanceof Error ? loadError.message : "创作者数据加载失败。");
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    if (!copyFeedback.message) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setCopyFeedback({ slug: "", type: "", message: "" });
    }, 2200);

    return () => window.clearTimeout(timeoutId);
  }, [copyFeedback.message]);

  const audit = useMemo(() => buildAdminCreatorAudit(seriesList), [seriesList]);
  const coverageRate = useMemo(() => {
    if (!audit.stats.totalSeries) {
      return 0;
    }

    return Math.round((audit.stats.attributedSeriesCount / audit.stats.totalSeries) * 100);
  }, [audit.stats.attributedSeriesCount, audit.stats.totalSeries]);

  const filteredCreators = useMemo(() => {
    const normalizedQuery = String(query || "").trim().toLowerCase();

    return audit.creators.filter((creator) => {
      if (quickFilter === "naming-risk" && !creator.hasNamingRisk) {
        return false;
      }
      if (quickFilter === "with-unpublished" && creator.unpublishedCount <= 0) {
        return false;
      }
      if (quickFilter === "published-clean" && (creator.unpublishedCount > 0 || creator.hasNamingRisk)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        creator.name,
        creator.spotlightSeries?.title,
        ...creator.variants,
        ...creator.topGenres,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [audit.creators, query, quickFilter]);

  const namingRiskPreview = useMemo(() => audit.namingRiskCreators.slice(0, 6), [audit.namingRiskCreators]);
  const missingAuthorPreview = useMemo(() => audit.missingAuthorSeries.slice(0, 8), [audit.missingAuthorSeries]);

  const handleOpenSeries = (seriesId) => {
    if (!seriesId) {
      return;
    }

    router.push(`/admin/series/${seriesId}#creator`);
  };

  const handleOpenCreator = (creatorPath) => {
    if (!creatorPath || typeof window === "undefined") {
      return;
    }

    window.open(creatorPath, "_blank", "noopener,noreferrer");
  };

  const handleOpenStorefrontSeries = (seriesId) => {
    if (!seriesId || typeof window === "undefined") {
      return;
    }

    window.open(`/series/${seriesId}`, "_blank", "noopener,noreferrer");
  };

  const handleOpenSeriesLibraryByCreator = (creatorName) => {
    const nextCreatorName = String(creatorName || "").trim();
    if (!nextCreatorName) {
      return;
    }

    router.push(`/admin/series?q=${encodeURIComponent(nextCreatorName)}`);
  };

  const handleToggleCreatorExpanded = (creatorSlug) => {
    if (!creatorSlug) {
      return;
    }

    setExpandedCreators((current) =>
      current.includes(creatorSlug)
        ? current.filter((item) => item !== creatorSlug)
        : [...current, creatorSlug],
    );
  };

  const handleCopyCreatorName = async (creator) => {
    const canonicalName = String(creator?.name || "").trim();
    if (!canonicalName) {
      setCopyFeedback({ slug: String(creator?.slug || ""), type: "error", message: "没有可复制的创作者名。" });
      return;
    }

    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      setCopyFeedback({ slug: String(creator?.slug || ""), type: "error", message: "当前环境不支持剪贴板复制。" });
      return;
    }

    try {
      await navigator.clipboard.writeText(canonicalName);
      setCopyFeedback({ slug: String(creator?.slug || ""), type: "success", message: `已复制规范创作者名：${canonicalName}` });
    } catch {
      setCopyFeedback({ slug: String(creator?.slug || ""), type: "error", message: "复制失败，请稍后再试。" });
    }
  };

  if (isLoading || loading) {
    return <LoadingView />;
  }

  return (
    <AdminShell
      title="创作者管理"
      subtitle="把创作者名、工作室名和作品归因统一起来，前台创作者页面才能稳定、好用、可运营。"
      actions={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => router.push("/admin/series")}
            className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-400/50 hover:bg-emerald-500/15"
          >
            去作品库处理
          </button>
          <button
            type="button"
            onClick={() => handleOpenCreator("/creators")}
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
          >
            打开前台创作者中心
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {error ? (
          <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
            创作者数据加载失败：{error}
          </div>
        ) : null}

        {copyFeedback.message ? (
          <div
            className={`rounded-3xl border px-5 py-4 text-sm ${
              copyFeedback.type === "error"
                ? "border-rose-500/30 bg-rose-500/10 text-rose-100"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
            }`}
          >
            {copyFeedback.message}
          </div>
        ) : null}

        <section className="rounded-3xl border border-neutral-800 bg-neutral-900/50 p-6 backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300/80">运营重点</p>
              <h2 className="text-2xl font-semibold text-white">先补齐创作者归因，再统一命名，前台创作者体系才会真正稳定。</h2>
              <p className="max-w-3xl text-sm leading-7 text-neutral-400">
                这个页面会把作品库里的作者 / 工作室字段聚合成一个运营视图。你可以先抓缺作者作品，再清理同一位创作者的多种写法，最后回看前台创作者页是否自然。
              </p>
            </div>
            <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">创作者归因覆盖率</p>
              <p className="mt-2 text-3xl font-semibold text-white">{coverageRate}%</p>
              <p className="mt-1 text-xs text-neutral-300">
                {audit.stats.attributedSeriesCount} / {audit.stats.totalSeries} 部作品已接入创作者归因
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-4">
          <StatCard
            title="创作者总数"
            value={audit.stats.creatorCount.toLocaleString()}
            hint="当前作品库里已经能聚合成创作者页的作者 / 工作室数量。"
            tone="emerald"
          />
          <StatCard
            title="已归因作品"
            value={audit.stats.attributedSeriesCount.toLocaleString()}
            hint="已经填了作者字段的作品数，前台创作者入口会直接使用这些数据。"
            tone="blue"
          />
          <StatCard
            title="缺作者作品"
            value={audit.stats.missingAuthorSeriesCount.toLocaleString()}
            hint="这些作品前台没法稳定进入创作者发现链路，建议优先补齐。"
            tone="amber"
          />
          <StatCard
            title="命名待清理"
            value={audit.stats.namingRiskCreatorCount.toLocaleString()}
            hint="同一个作者出现多种写法，会把前台流量拆散。"
            tone="rose"
          />
        </section>

        <section className="rounded-3xl border border-neutral-800 bg-neutral-900/50 p-6 backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-white">筛选创作者目录</h2>
              <p className="text-sm text-neutral-400">按关键词和运营状态过滤，优先处理风险最大的创作者归因问题。</p>
            </div>
            <p className="text-sm text-neutral-400">当前可见 {filteredCreators.length.toLocaleString()} 个创作者聚合项</p>
          </div>

          <div className="mt-5 flex flex-col gap-4">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索作者名、工作室名、作品名或主类型"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-emerald-400/40"
              />
            </label>

            <div className="flex flex-wrap gap-2.5">
              {[
                { id: "all", label: "全部" },
                { id: "naming-risk", label: "命名待清理" },
                { id: "with-unpublished", label: "含未发布作品" },
                { id: "published-clean", label: "已发布且较干净" },
              ].map((item) => {
                const isActive = quickFilter === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setQuickFilter(item.id)}
                    className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                      isActive
                        ? "border-white bg-white text-neutral-950"
                        : "border-white/10 bg-white/[0.04] text-neutral-300 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-3xl border border-neutral-800 bg-neutral-900/50 p-6 backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-white">命名待清理</h2>
                <p className="mt-2 text-sm text-neutral-400">
                  同一作者如果出现多种写法，前台创作者聚合页会被拆散，这里优先列出需要统一命名的项。
                </p>
              </div>
              <AlertTriangle className="mt-1 h-5 w-5 text-amber-300" />
            </div>

            <div className="mt-5 space-y-3">
              {namingRiskPreview.length === 0 ? (
                <EmptyPanel
                  title="当前没有命名冲突"
                  description="作者命名目前比较干净，前台创作者聚合不容易被拆散。"
                />
              ) : (
                namingRiskPreview.map((creator) => (
                  <div
                    key={creator.slug}
                    className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold text-white">{creator.name}</p>
                          <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200">
                            {creator.variants.length} 种写法
                          </span>
                        </div>
                        <p className="text-sm text-neutral-400">
                          关联 {creator.titleCount} 部作品，其中已发布 {creator.publishedCount} 部，未发布 {creator.unpublishedCount} 部。
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {creator.variants.map((variant) => (
                            <span
                              key={`${creator.slug}-${variant}`}
                              className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-neutral-300"
                            >
                              {variant}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenSeries(creator.spotlightSeries?.id)}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
                      >
                        <Edit3 className="h-4 w-4" />
                        打开主作品编辑
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyCreatorName(creator)}
                        className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                          copyFeedback.slug === creator.slug && copyFeedback.type === "success"
                            ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-100"
                            : "border-white/10 bg-white/[0.04] text-neutral-100 hover:border-white/20 hover:bg-white/[0.08]"
                        }`}
                      >
                        <Copy className="h-4 w-4" />
                        {copyFeedback.slug === creator.slug && copyFeedback.type === "success" ? "已复制规范名" : "复制规范创作者名"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-neutral-800 bg-neutral-900/50 p-6 backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-white">待补作者作品</h2>
                <p className="mt-2 text-sm text-neutral-400">
                  这些作品还没填作者字段，前台作品页、创作者页和作者发现入口都吃不到完整信息。
                </p>
              </div>
              <Users className="mt-1 h-5 w-5 text-sky-300" />
            </div>

            <div className="mt-5 space-y-3">
              {missingAuthorPreview.length === 0 ? (
                <EmptyPanel
                  title="当前没有缺作者作品"
                  description="作品库里的作者字段已经比较完整，这一块目前不需要优先处理。"
                />
              ) : (
                missingAuthorPreview.map((series) => (
                  <div
                    key={series.id}
                    className="flex flex-col gap-3 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold text-white">{series.title}</p>
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-neutral-300">
                          {series.id}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs ${
                            series.isPublished
                              ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                              : "border border-amber-500/20 bg-amber-500/10 text-amber-200"
                          }`}
                        >
                          {series.isPublished ? "已发布" : "未发布"}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-400">
                        {series.type === "novel" ? "小说" : "漫画"} · {formatSeriesStatusLabel(series.status)} · 更新于 {formatDateLabel(series.updatedAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenSeries(series.id)}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
                    >
                      <Edit3 className="h-4 w-4" />
                      去补作者字段
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-neutral-800 bg-neutral-900/50 p-6 backdrop-blur-xl">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-white">创作者目录</h2>
              <p className="text-sm text-neutral-400">
                这里是后台运营视角下的创作者聚合。你可以同时看作品覆盖、发布状态、命名风险和前台落地页。
              </p>
            </div>
            <p className="text-sm text-neutral-400">
              未发布作品 {audit.stats.unpublishedSeriesCount} 部 · 命名风险 {audit.stats.namingRiskCreatorCount} 个
            </p>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {filteredCreators.length === 0 ? (
              <div className="xl:col-span-2">
                <EmptyPanel
                  title="当前筛选下没有创作者项"
                  description="可以清空关键词，或者切回“全部”查看完整创作者目录。"
                />
              </div>
            ) : (
              filteredCreators.map((creator) => {
                const isExpanded = expandedCreators.includes(creator.slug);

                return (
                <article
                  key={creator.slug}
                  className="rounded-3xl border border-white/10 bg-black/10 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-semibold text-white">{creator.name}</h3>
                        {creator.hasNamingRisk ? (
                          <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200">
                            命名待清理
                          </span>
                        ) : (
                          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-200">
                            命名稳定
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-neutral-400">
                        主作品：{creator.spotlightSeries?.title || "暂无"} · 最近更新 {formatDateLabel(creator.latestUpdatedAt)}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {creator.topGenres.map((genre) => (
                          <span
                            key={`${creator.slug}-${genre}`}
                            className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-neutral-300"
                          >
                            {genre}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid min-w-[220px] gap-2 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <p className="text-xs text-neutral-500">关联作品</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{creator.titleCount}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <p className="text-xs text-neutral-500">读者信号</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{formatCompactCount(creator.readerProof)}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <p className="text-xs text-neutral-500">已发布</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{creator.publishedCount}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <p className="text-xs text-neutral-500">未发布</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{creator.unpublishedCount}</p>
                      </div>
                    </div>
                  </div>

                  {creator.variants.length > 1 ? (
                    <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-4">
                      <p className="text-sm font-semibold text-amber-100">同一位创作者当前存在多种写法，建议统一：</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {creator.variants.map((variant) => (
                          <span
                            key={`${creator.slug}-variant-${variant}`}
                            className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-neutral-300"
                          >
                            {variant}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenSeries(creator.spotlightSeries?.id)}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
                    >
                      <Edit3 className="h-4 w-4" />
                      编辑主作品
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenSeriesLibraryByCreator(creator.name)}
                      className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3.5 py-2 text-sm font-semibold text-sky-200 transition hover:border-sky-400/50 hover:bg-sky-500/15"
                    >
                      <Search className="h-4 w-4" />
                      在作品库筛此作者
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyCreatorName(creator)}
                      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                        copyFeedback.slug === creator.slug && copyFeedback.type === "success"
                          ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-100"
                          : "border-white/10 bg-white/[0.04] text-neutral-100 hover:border-white/20 hover:bg-white/[0.08]"
                      }`}
                    >
                      <Copy className="h-4 w-4" />
                      {copyFeedback.slug === creator.slug && copyFeedback.type === "success" ? "已复制规范名" : "复制规范创作者名"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenCreator(creator.path)}
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-400/50 hover:bg-emerald-500/15"
                    >
                      <Eye className="h-4 w-4" />
                      打开前台创作者页
                    </button>
                    {creator.spotlightSeries?.id ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window === "undefined") {
                            return;
                          }

                          window.open(`/series/${creator.spotlightSeries.id}`, "_blank", "noopener,noreferrer");
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                        查看前台主作品
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => handleToggleCreatorExpanded(creator.slug)}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      {isExpanded ? "收起关联作品" : `展开关联作品（${creator.titleCount}）`}
                    </button>
                  </div>

                  {isExpanded ? (
                    <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-white">关联作品清单</p>
                          <p className="text-sm text-neutral-400">
                            从这里可以直接进作品详情修作者字段，或者去作品库看这位作者当前的聚合结果。
                          </p>
                        </div>
                        <p className="text-xs text-neutral-500">共 {creator.series.length} 部作品</p>
                      </div>

                      <div className="mt-4 space-y-3">
                        {creator.series.map((series) => (
                          <div
                            key={`${creator.slug}-${series.id}`}
                            className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 xl:flex-row xl:items-center xl:justify-between"
                          >
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-base font-semibold text-white">{series.title}</p>
                                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-neutral-300">
                                  {series.id}
                                </span>
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs ${
                                    series.isPublished
                                      ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                                      : "border border-amber-500/20 bg-amber-500/10 text-amber-200"
                                  }`}
                                >
                                  {series.isPublished ? "已发布" : "未发布"}
                                </span>
                              </div>
                              <p className="text-sm text-neutral-400">
                                {series.type === "novel" ? "小说" : "漫画"} · {formatSeriesStatusLabel(series.status)} · 更新于 {formatDateLabel(series.updatedAt)}
                              </p>
                              <p className="text-xs text-neutral-500">
                                当前作者字段：
                                <span className={series.author ? "text-neutral-300" : "text-amber-200"}>
                                  {series.author || "未填写"}
                                </span>
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenSeries(series.id)}
                                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
                              >
                                <Edit3 className="h-4 w-4" />
                                编辑作品
                              </button>
                              {series.isPublished ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenStorefrontSeries(series.id)}
                                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
                                >
                                  <ArrowUpRight className="h-4 w-4" />
                                  前台作品页
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </article>
                );
              })
            )}
          </div>

          {audit.creators.length === 0 && audit.missingAuthorSeries.length === 0 ? (
            <div className="mt-5">
              <EmptyPanel
                title="当前还没有创作者数据"
                description="先去作品详情页补作者字段，前台和后台的创作者体系才会逐步建立起来。"
              />
            </div>
          ) : null}

          <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] px-5 py-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">运营建议</p>
                <p className="text-sm leading-6 text-neutral-400">
                  先处理“缺作者作品”，再处理“命名待清理”，最后抽样检查前台创作者聚合页是否自然。这样投入最少，前台改善最快。
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-200">
                  <CheckCircle2 className="h-4 w-4" />
                  优先补作者字段
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200">
                  <BookOpen className="h-4 w-4" />
                  再统一作者命名
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
