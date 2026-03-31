"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Edit3,
  Eye,
  Search,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import SurfacePanel from "@/components/common/SurfacePanel";

import AdminShell from "./AdminShell";
import { useAdminAuth } from "./AuthContext";
import Skeleton from "../common/Skeleton";
import { adminFetchJson } from "../../lib/adminApiClient";

const EMPTY_AUDIT = {
  creators: [],
  missingAuthorSeries: [],
  legacyAuthorOnlySeries: [],
  namingRiskCreators: [],
  stats: {
    totalSeries: 0,
    creatorCount: 0,
    attributedSeriesCount: 0,
    structuredCreatorSeriesCount: 0,
    legacyAuthorOnlySeriesCount: 0,
    missingAuthorSeriesCount: 0,
    namingRiskCreatorCount: 0,
    unpublishedSeriesCount: 0,
  },
};

function formatPercent(value) {
  const parsed = Number(value);
  const safeValue = Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
  return `${safeValue}%`;
}

function formatDateLabel(value) {
  if (!value) {
    return "暂无更新时间";
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return "暂无更新时间";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
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
    return "休更中";
  }
  if (normalized === "cancelled") {
    return "已下线";
  }
  return String(value || "状态待补充").trim() || "状态待补充";
}

function getSeriesMetadataSummary(series) {
  const genreCount = (Array.isArray(series?.genres) ? series.genres : [])
    .map((genre) => String(genre || "").trim())
    .filter(Boolean).length;

  return [
    series?.coverUrl ? "封面已就绪" : "封面待补",
    String(series?.description || "").trim() ? "简介已填写" : "简介待补",
    genreCount > 0 ? `${genreCount} 个标签` : "标签待补",
  ].join(" · ");
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

function PillButton({ active = false, children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-full border px-3.5 py-2 text-sm font-semibold transition",
        active
          ? "border-[rgba(47,88,198,0.14)] bg-[rgba(47,88,198,0.08)] text-[var(--gush-accent,#2f58c6)]"
          : "border-black/8 bg-white text-slate-600 hover:border-black/12 hover:bg-[rgba(250,248,244,0.96)] hover:text-slate-950",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function MetricCard({ title, value, hint, tone = "blue" }) {
  const toneClasses = {
    blue: "border-[rgba(47,88,198,0.14)] bg-[rgba(47,88,198,0.08)]",
    emerald: "border-emerald-200 bg-emerald-50/90",
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
      <p className="text-sm text-slate-600">{title}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-xs leading-6 text-slate-500">{hint}</p>
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

function StatusPill({ children, tone = "slate" }) {
  const toneClasses = {
    slate: "border-black/8 bg-[rgba(250,247,241,0.92)] text-slate-600",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    blue: "border-[rgba(47,88,198,0.14)] bg-[rgba(47,88,198,0.08)] text-[var(--gush-accent,#2f58c6)]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        toneClasses[tone] || toneClasses.slate,
      )}
    >
      {children}
    </span>
  );
}

function LoadingView() {
  return (
    <AdminShell
      title="创作者"
      subtitle="核对创作者命名、公开署名覆盖率，以及仍待补齐署名的作品。"
    >
      <div className="space-y-6">
        <Skeleton className="h-48 rounded-[32px]" />
        <div className="grid gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={`creator-metric-${index}`} className="h-32 rounded-[28px]" />
          ))}
        </div>
        <Skeleton className="h-32 rounded-[28px]" />
        <div className="grid gap-6 xl:grid-cols-2">
          <Skeleton className="h-80 rounded-[28px]" />
          <Skeleton className="h-80 rounded-[28px]" />
        </div>
        <Skeleton className="h-[28rem] rounded-[28px]" />
      </div>
    </AdminShell>
  );
}

export default function AdminCreatorsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdminAuth();
  const [audit, setAudit] = useState(EMPTY_AUDIT);
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

        const { response, data } = await adminFetchJson("/api/admin/creators/audit", {
          cache: "no-store",
        });

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setAudit(EMPTY_AUDIT);
          setError(getErrorMessage(data, response));
          setLoading(false);
          return;
        }

        setAudit(data?.audit && typeof data.audit === "object" ? data.audit : EMPTY_AUDIT);
        setLoading(false);
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setAudit(EMPTY_AUDIT);
        setError(loadError instanceof Error ? loadError.message : "创作者巡检数据加载失败。");
        setLoading(false);
      }
    }

    void load();
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

  const namingRiskPreview = useMemo(
    () => audit.namingRiskCreators.slice(0, 6),
    [audit.namingRiskCreators],
  );
  const missingCreatorPreview = useMemo(
    () => audit.missingAuthorSeries.slice(0, 8),
    [audit.missingAuthorSeries],
  );
  const legacyAuthorPreview = useMemo(
    () => (Array.isArray(audit.legacyAuthorOnlySeries) ? audit.legacyAuthorOnlySeries.slice(0, 8) : []),
    [audit.legacyAuthorOnlySeries],
  );

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
    const normalizedCreator = String(creatorName || "").trim();
    if (!normalizedCreator) {
      return;
    }

    router.push(`/admin/series?q=${encodeURIComponent(normalizedCreator)}`);
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
      setCopyFeedback({
        slug: String(creator?.slug || ""),
        type: "error",
        message: "当前没有可复制的规范创作者名称。",
      });
      return;
    }

    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      setCopyFeedback({
        slug: String(creator?.slug || ""),
        type: "error",
        message: "当前浏览器不支持剪贴板复制。",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(canonicalName);
      setCopyFeedback({
        slug: String(creator?.slug || ""),
        type: "success",
        message: `已复制规范创作者名称：${canonicalName}`,
      });
    } catch {
      setCopyFeedback({
        slug: String(creator?.slug || ""),
        type: "error",
        message: "复制失败，请稍后重试。",
      });
    }
  };

  if (isLoading || loading) {
    return <LoadingView />;
  }

  return (
    <AdminShell
      title="创作者"
      subtitle="把命名、团队署名和作品归属补扎实，后台和前台的创作者层才会可信。"
      actions={
        <div className="flex flex-wrap gap-2">
          <ActionButton onClick={() => router.push("/admin/series")}>打开作品列表</ActionButton>
          <ActionButton onClick={() => handleOpenCreator("/creators")}>
            <Eye className="h-4 w-4" />
            查看前台创作者页
          </ActionButton>
        </div>
      }
    >
      <div className="space-y-6">
        {error ? (
          <div className="rounded-[24px] border border-rose-200 bg-rose-50/90 px-5 py-4 text-sm text-rose-700 shadow-[var(--gush-shadow-soft)]">
            创作者巡检加载失败：{error}
          </div>
        ) : null}

        {copyFeedback.message ? (
          <div
            className={cn(
              "rounded-[24px] border px-5 py-4 text-sm shadow-[var(--gush-shadow-soft)]",
              copyFeedback.type === "error"
                ? "border-rose-200 bg-rose-50/90 text-rose-700"
                : "border-emerald-200 bg-emerald-50/90 text-emerald-700",
            )}
          >
            {copyFeedback.message}
          </div>
        ) : null}

        <SurfacePanel appearance="light" tone="highlight" accent="blue" className="p-0">
          <div className="grid gap-6 px-5 py-5 sm:px-6 sm:py-6 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                创作者身份
              </p>
              <h2 className="mt-3 text-[2rem] font-semibold tracking-tight text-slate-950 sm:text-[2.45rem]">
                先补齐署名，再收命名。
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
                这个页面把公开创作者署名变成可执行的后台工作台。先处理还没有公开署名的作品，
                再合并重复拼写，前台创作者层才会清楚、稳定、可信。
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <StatusPill tone="blue">内容优先后台</StatusPill>
                <StatusPill tone="amber">
                  仍有 {audit.stats.missingAuthorSeriesCount} 部作品缺少创作者署名
                </StatusPill>
                <StatusPill tone={audit.stats.legacyAuthorOnlySeriesCount > 0 ? "amber" : "emerald"}>
                  {audit.stats.legacyAuthorOnlySeriesCount} 部作品仍停留在旧 author 兼容层
                </StatusPill>
                <StatusPill tone={audit.stats.namingRiskCreatorCount > 0 ? "rose" : "emerald"}>
                  {audit.stats.namingRiskCreatorCount} 处命名风险
                </StatusPill>
              </div>
            </div>

            <div className="rounded-[24px] border border-[rgba(47,88,198,0.14)] bg-white/86 px-5 py-5 shadow-[0_12px_24px_rgba(15,23,42,0.03)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                覆盖率
              </p>
              <p className="mt-3 text-[2.4rem] font-semibold tracking-tight text-slate-950">
                {coverageRate}%
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {audit.stats.totalSeries} 部作品里，已有 {audit.stats.attributedSeriesCount} 部通过真实 credits
                接入前台创作者层；另外 {audit.stats.legacyAuthorOnlySeriesCount} 部还停留在旧 author 兼容层。
              </p>
            </div>
          </div>
        </SurfacePanel>

        <div className="grid gap-4 lg:grid-cols-4">
          <MetricCard
            title="创作者条目"
            value={audit.stats.creatorCount.toLocaleString()}
            hint="已经进入真实 Creator / SeriesCredit 模型、可以稳定聚合展示的创作者或团队条目。"
            tone="blue"
          />
          <MetricCard
            title="真实 credits 已接入"
            value={audit.stats.structuredCreatorSeriesCount.toLocaleString()}
            hint="这部分作品已经能稳定进入前台创作者目录和作品页署名区。"
            tone="emerald"
          />
          <MetricCard
            title="旧 author 兼容层"
            value={audit.stats.legacyAuthorOnlySeriesCount.toLocaleString()}
            hint="这些作品还没真正迁到 Creator / SeriesCredit，只是暂时靠旧 author 字段兜底。"
            tone="amber"
          />
          <MetricCard
            title="缺少公开署名"
            value={audit.stats.missingAuthorSeriesCount.toLocaleString()}
            hint="这些作品目前既没有真实 credits，也没有可接受的公开署名。"
            tone="rose"
          />
        </div>

        <SurfacePanel appearance="light" accent="blue" className="space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-[1.35rem] font-semibold tracking-tight text-slate-950">
                筛选创作者目录
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                可以按创作者名、作品标题或题材搜索，优先处理风险最高的署名问题。
              </p>
            </div>
            <p className="text-sm text-slate-500">
              当前共显示 {filteredCreators.length.toLocaleString()} 个创作者条目
            </p>
          </div>

          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索创作者、团队、作品标题或题材"
              className="w-full rounded-full border border-black/8 bg-white px-11 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--gush-accent,#2f58c6)]"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {[
              { id: "all", label: "全部创作者" },
              { id: "naming-risk", label: "命名待清理" },
              { id: "with-unpublished", label: "含草稿作品" },
              { id: "published-clean", label: "已发布且稳定" },
            ].map((item) => (
              <PillButton
                key={item.id}
                active={quickFilter === item.id}
                onClick={() => setQuickFilter(item.id)}
              >
                {item.label}
              </PillButton>
            ))}
          </div>
        </SurfacePanel>

        <div className="grid gap-6 xl:grid-cols-2">
          <SurfacePanel appearance="light" accent="amber" className="space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[1.35rem] font-semibold tracking-tight text-slate-950">
                  命名清理
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  先处理这里，避免前台创作者目录把同一人拆成多个公开条目。
                </p>
              </div>
              <AlertTriangle className="mt-1 h-5 w-5 text-amber-500" />
            </div>

            {namingRiskPreview.length === 0 ? (
              <EmptyState
                title="当前没有命名冲突"
                description="现有创作者命名已经足够稳定，前台目录不会被拆散。"
              />
            ) : (
              <div className="space-y-3">
                {namingRiskPreview.map((creator) => (
                  <div
                    key={creator.slug}
                    className="rounded-[24px] border border-amber-200 bg-amber-50/70 px-5 py-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold text-slate-950">{creator.name}</p>
                          <StatusPill tone="amber">发现 {creator.variants.length} 种写法</StatusPill>
                        </div>
                        <p className="text-sm leading-6 text-slate-600">
                          关联 {creator.titleCount} 部作品，其中 {creator.publishedCount} 部已发布，
                          {creator.unpublishedCount} 部仍是草稿。
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {creator.variants.map((variant) => (
                            <StatusPill key={`${creator.slug}-${variant}`} tone="slate">
                              {variant}
                            </StatusPill>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <ActionButton onClick={() => handleOpenSeries(creator.spotlightSeries?.id)}>
                          <Edit3 className="h-4 w-4" />
                          编辑代表作品
                        </ActionButton>
                        <ActionButton onClick={() => handleCopyCreatorName(creator)}>
                          <Copy className="h-4 w-4" />
                          {copyFeedback.slug === creator.slug && copyFeedback.type === "success"
                            ? "已复制"
                            : "复制规范名称"}
                        </ActionButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SurfacePanel>

          <SurfacePanel appearance="light" accent="cyan" className="space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[1.35rem] font-semibold tracking-tight text-slate-950">
                  缺少创作者署名的作品
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  这些作品还没有可用于前台作品页和创作者发现层的公开创作者身份。
                </p>
              </div>
              <Users className="mt-1 h-5 w-5 text-cyan-500" />
            </div>

            {missingCreatorPreview.length === 0 ? (
              <EmptyState
                title="当前没有缺失署名"
                description="现有作品集在创作者覆盖上已经能支撑前台展示。"
              />
            ) : (
              <div className="space-y-3">
                {missingCreatorPreview.map((series) => (
                  <div
                    key={series.id}
                    className="flex flex-col gap-3 rounded-[24px] border border-cyan-200 bg-cyan-50/70 px-5 py-5 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold text-slate-950">{series.title}</p>
                        <StatusPill tone="slate">{series.id}</StatusPill>
                        <StatusPill tone={series.isPublished ? "emerald" : "amber"}>
                          {series.isPublished ? "已发布" : "草稿"}
                        </StatusPill>
                      </div>
                      <p className="text-sm leading-6 text-slate-600">
                        {series.type === "novel" ? "小说" : "漫画"} | {formatSeriesStatusLabel(series.status)} |
                        {" "}更新于 {formatDateLabel(series.updatedAt)}
                      </p>
                    </div>

                    <ActionButton onClick={() => handleOpenSeries(series.id)}>
                      <Edit3 className="h-4 w-4" />
                      补创作者署名
                    </ActionButton>
                  </div>
                ))}
              </div>
            )}
          </SurfacePanel>
        </div>

        <SurfacePanel appearance="light" accent="amber" className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[1.35rem] font-semibold tracking-tight text-slate-950">
                仍在旧 author 兼容层的作品
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                这些作品已经有可读署名，但还没真正迁进 Creator / SeriesCredit。先把它们迁完，后台和前台才算一条真链路。
              </p>
            </div>
            <BookOpen className="mt-1 h-5 w-5 text-amber-500" />
          </div>

          {legacyAuthorPreview.length === 0 ? (
            <EmptyState
              title="当前没有旧 author 兼容项"
              description="现有可读署名已经不再依赖旧 author 字段兜底。"
            />
          ) : (
            <div className="space-y-3">
              {legacyAuthorPreview.map((series) => (
                <div
                  key={`legacy-author-${series.id}`}
                  className="flex flex-col gap-3 rounded-[24px] border border-amber-200 bg-amber-50/70 px-5 py-5 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold text-slate-950">{series.title}</p>
                      <StatusPill tone="slate">{series.id}</StatusPill>
                      <StatusPill tone="amber">旧 author 兼容层</StatusPill>
                    </div>
                    <p className="text-sm leading-6 text-slate-600">
                      当前署名：<span className="font-medium text-slate-950">{series.author || "未填写"}</span> |{" "}
                      {series.type === "novel" ? "小说" : "漫画"} | {formatSeriesStatusLabel(series.status)}
                    </p>
                  </div>

                  <ActionButton onClick={() => handleOpenSeries(series.id)}>
                    <Edit3 className="h-4 w-4" />
                    迁到真实 credits
                  </ActionButton>
                </div>
              ))}
            </div>
          )}
        </SurfacePanel>

        <SurfacePanel appearance="light" accent="blue" className="space-y-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-[1.35rem] font-semibold tracking-tight text-slate-950">
                创作者目录
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                把公开创作者条目的覆盖率、命名状态、发布情况和前台路径放在一个地方统一核对。
              </p>
            </div>
            <p className="text-sm text-slate-500">
              还有 {audit.stats.unpublishedSeriesCount} 部草稿作品和 {audit.stats.namingRiskCreatorCount} 处命名风险需要处理
            </p>
          </div>

          {filteredCreators.length === 0 ? (
            <EmptyState
              title="当前筛选下没有匹配的创作者条目"
              description="清空搜索词，或切回“全部创作者”查看完整目录。"
            />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredCreators.map((creator) => {
                const isExpanded = expandedCreators.includes(creator.slug);

                return (
                  <article
                    key={creator.slug}
                    className="rounded-[28px] border border-black/8 bg-white/82 px-5 py-5 shadow-[0_12px_24px_rgba(15,23,42,0.03)]"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-[1.3rem] font-semibold tracking-tight text-slate-950">
                            {creator.name}
                          </h3>
                          <StatusPill tone={creator.hasNamingRisk ? "amber" : "emerald"}>
                            {creator.hasNamingRisk ? "命名待清理" : "命名稳定"}
                          </StatusPill>
                        </div>

                        <p className="text-sm leading-6 text-slate-600">
                          代表作品：{creator.spotlightSeries?.title || "暂未设置"} | 前台已就绪{" "}
                          {creator.readySeriesCount} 部 | 最近更新于 {formatDateLabel(creator.latestUpdatedAt)}
                        </p>

                        {creator.topGenres.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {creator.topGenres.map((genre) => (
                              <StatusPill key={`${creator.slug}-${genre}`} tone="slate">
                                {genre}
                              </StatusPill>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="grid min-w-[220px] gap-3 sm:grid-cols-2">
                        <div className="rounded-[22px] border border-black/8 bg-[rgba(250,247,241,0.76)] px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            作品数
                          </p>
                          <p className="mt-2 text-2xl font-semibold text-slate-950">{creator.titleCount}</p>
                        </div>
                        <div className="rounded-[22px] border border-black/8 bg-[rgba(250,247,241,0.76)] px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            资料完整度
                          </p>
                          <p className="mt-2 text-2xl font-semibold text-slate-950">
                            {formatPercent(creator.metadataCoverageScore)}
                          </p>
                        </div>
                        <div className="rounded-[22px] border border-black/8 bg-[rgba(250,247,241,0.76)] px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            已发布
                          </p>
                          <p className="mt-2 text-2xl font-semibold text-slate-950">{creator.publishedCount}</p>
                        </div>
                        <div className="rounded-[22px] border border-black/8 bg-[rgba(250,247,241,0.76)] px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            前台已就绪
                          </p>
                          <p className="mt-2 text-2xl font-semibold text-slate-950">{creator.readySeriesCount}</p>
                        </div>
                      </div>
                    </div>

                    {creator.variants.length > 1 ? (
                      <div className="mt-4 rounded-[24px] border border-amber-200 bg-amber-50/70 px-4 py-4">
                        <p className="text-sm font-semibold text-amber-900">
                          请把这些写法合并成一个稳定的公开创作者名称：
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {creator.variants.map((variant) => (
                            <StatusPill key={`${creator.slug}-variant-${variant}`} tone="amber">
                              {variant}
                            </StatusPill>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-5 flex flex-wrap gap-2">
                      <ActionButton onClick={() => handleOpenSeries(creator.spotlightSeries?.id)}>
                        <Edit3 className="h-4 w-4" />
                        编辑代表作品
                      </ActionButton>
                      <ActionButton onClick={() => handleOpenSeriesLibraryByCreator(creator.name)}>
                        <Search className="h-4 w-4" />
                        在作品库中搜索
                      </ActionButton>
                      <ActionButton onClick={() => handleCopyCreatorName(creator)}>
                        <Copy className="h-4 w-4" />
                        {copyFeedback.slug === creator.slug && copyFeedback.type === "success"
                          ? "已复制"
                          : "复制规范名称"}
                      </ActionButton>
                      <ActionButton onClick={() => handleOpenCreator(creator.path)}>
                        <Eye className="h-4 w-4" />
                        打开前台创作者页
                      </ActionButton>
                      {creator.spotlightSeries?.id ? (
                        <ActionButton onClick={() => handleOpenStorefrontSeries(creator.spotlightSeries.id)}>
                          <ArrowUpRight className="h-4 w-4" />
                          查看前台代表作品
                        </ActionButton>
                      ) : null}
                      <ActionButton onClick={() => handleToggleCreatorExpanded(creator.slug)}>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        {isExpanded ? "收起关联作品" : `查看关联作品（${creator.titleCount}）`}
                      </ActionButton>
                    </div>

                    {isExpanded ? (
                      <div className="mt-4 rounded-[24px] border border-black/8 bg-[rgba(250,247,241,0.62)] p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">关联作品</p>
                            <p className="mt-1 text-sm leading-6 text-slate-600">
                              用这份清单继续清理作品级署名字段，并复核前台作品页是否已经跟上。
                            </p>
                          </div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            共 {creator.series.length} 部
                          </p>
                        </div>

                        <div className="mt-4 space-y-3">
                          {creator.series.map((series) => (
                            <div
                              key={`${creator.slug}-${series.id}`}
                              className="flex flex-col gap-3 rounded-[22px] border border-black/8 bg-white px-4 py-4 xl:flex-row xl:items-center xl:justify-between"
                            >
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-base font-semibold text-slate-950">{series.title}</p>
                                  <StatusPill tone="slate">{series.id}</StatusPill>
                                  <StatusPill tone={series.isPublished ? "emerald" : "amber"}>
                                    {series.isPublished ? "已发布" : "草稿"}
                                  </StatusPill>
                                </div>
                                <p className="text-sm leading-6 text-slate-600">
                                  {series.type === "novel" ? "小说" : "漫画"} |{" "}
                                  {formatSeriesStatusLabel(series.status)} | 更新于{" "}
                                  {formatDateLabel(series.updatedAt)}
                                </p>
                                <p className="text-sm leading-6 text-slate-600">
                                  资料状态：{" "}
                                  <span className="text-slate-950">{getSeriesMetadataSummary(series)}</span>
                                </p>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <ActionButton onClick={() => handleOpenSeries(series.id)}>
                                  <Edit3 className="h-4 w-4" />
                                  编辑作品
                                </ActionButton>
                                {series.isPublished ? (
                                  <ActionButton onClick={() => handleOpenStorefrontSeries(series.id)}>
                                    <ArrowUpRight className="h-4 w-4" />
                                    查看前台页
                                  </ActionButton>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}

          {audit.creators.length === 0 &&
          audit.missingAuthorSeries.length === 0 &&
          legacyAuthorPreview.length === 0 ? (
            <EmptyState
              title="当前还没有创作者数据"
              description="先到作品详情页补创作者署名，后台和前台的创作者层才能开始成形。"
            />
          ) : null}
        </SurfacePanel>

        <SurfacePanel appearance="light" accent="emerald">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                建议处理顺序
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                先补缺失署名，再合并命名变体，最后抽查前台创作者页。这条顺序最容易用最小编辑成本换来最快的前台提升。
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusPill tone="emerald">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                先补缺失署名
              </StatusPill>
              <StatusPill tone="amber">
                <BookOpen className="mr-2 h-4 w-4" />
                再统一命名
              </StatusPill>
            </div>
          </div>
        </SurfacePanel>
      </div>
    </AdminShell>
  );
}

