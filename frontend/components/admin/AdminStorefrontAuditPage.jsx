"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  PenSquare,
  Search,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";
import SurfacePanel from "@/components/common/SurfacePanel";

import AdminShell from "./AdminShell";
import { useAdminAuth } from "./AuthContext";
import Skeleton from "../common/Skeleton";
import { adminFetchJson } from "../../lib/adminApiClient";
import { getAdminSeriesReadiness } from "../../lib/adminSeriesReadiness";
import {
  resolveSeriesCreatorIdentity,
  resolveSeriesCreatorName,
} from "../../lib/creatorIdentity";

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeText(value) {
  return String(value || "").trim();
}

function getDateValue(value) {
  const parsed = Date.parse(value || "");
  return Number.isNaN(parsed) ? 0 : parsed;
}

function isRecentlyUpdated(value, days = 30) {
  const updatedAt = getDateValue(value);
  if (!updatedAt) {
    return false;
  }

  return updatedAt >= Date.now() - days * 24 * 60 * 60 * 1000;
}

function normalizeSeries(entry, index) {
  const source = entry && typeof entry === "object" ? entry : {};
  return {
    id: String(source.id || `series-${index + 1}`),
    title: normalizeText(source.title) || "未命名作品",
    author: normalizeText(source.author),
    creatorCredits: Array.isArray(source.creatorCredits) ? source.creatorCredits.filter(Boolean) : [],
    type: source.type === "novel" ? "novel" : "comic",
    status: normalizeText(source.status) || "Ongoing",
    adult: Boolean(source.adult),
    description: normalizeText(source.description),
    coverUrl: normalizeText(source.coverUrl || source.coverImage),
    genres: Array.isArray(source.genres) ? source.genres.filter(Boolean) : [],
    episodeCount: toNumber(source.episodeCount ?? source?._count?.episodes ?? source.totalEpisodes),
    isPublished: source.isPublished !== undefined ? Boolean(source.isPublished) : true,
    updatedAt: source.updatedAt || source.createdAt || null,
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

function formatSeriesTypeLabel(value) {
  return value === "novel" ? "小说" : "漫画";
}

function formatLifecycleLabel(series) {
  return series.isPublished ? "前台已上线" : "草稿未发布";
}

function getCreatorLabel(series) {
  return resolveSeriesCreatorName(series);
}

function getContentFootprint(series) {
  const episodeCount = toNumber(series?.episodeCount);
  const genreCount = Array.isArray(series?.genres) ? series.genres.length : 0;
  const creatorLabel = getCreatorLabel(series);

  let score = 0;

  if (episodeCount >= 40) {
    score += 40;
  } else if (episodeCount >= 20) {
    score += 30;
  } else if (episodeCount >= 10) {
    score += 22;
  } else if (episodeCount > 0) {
    score += 12;
  }

  if (series?.coverUrl) {
    score += 16;
  }

  if (series?.description) {
    score += 14;
  }

  if (creatorLabel) {
    score += 14;
  }

  score += Math.min(10, genreCount * 3);

  if (series?.isPublished) {
    score += 4;
  }

  if (isRecentlyUpdated(series?.updatedAt, 21)) {
    score += 6;
  }

  return Math.min(100, score);
}

function getPriorityScore(series, readiness, contentFootprint) {
  let score = Math.max(0, 100 - readiness.score);

  if (series.isPublished && readiness.missingCount > 0) {
    score += 90;
  }

  if (!getCreatorLabel(series)) {
    score += 28;
  }

  if (series.episodeCount <= 0) {
    score += 24;
  }

  if (!series.coverUrl) {
    score += 20;
  }

  if (!series.description) {
    score += 14;
  }

  if (!Array.isArray(series.genres) || series.genres.length === 0) {
    score += 12;
  }

  if (!series.isPublished && readiness.missingCount === 1 && readiness.missingItems[0]?.id === "published") {
    score += 18;
  }

  if (series.isPublished) {
    score += Math.round(contentFootprint / 6);
  }

  return score;
}

function isDraftLaunchReady(series, readiness) {
  if (series.isPublished) {
    return false;
  }

  return readiness.missingItems.every((item) => item.id === "published");
}

function getRecommendedAction(series, readiness) {
  if (!getCreatorLabel(series)) {
    return "先补公开署名。没有署名，作品页可信度和创作者发现页都会一起打折。";
  }

  if (series.episodeCount <= 0) {
    return "先补阅读入口。没有章节时，前台再好看也承接不住流量。";
  }

  if (!series.coverUrl) {
    return "先补封面。列表页、推荐位和作品页头图都要靠它撑住第一眼。";
  }

  if (!series.description) {
    return "把简介补到能读的程度，别让作品页像没写完的空壳。";
  }

  if (!Array.isArray(series.genres) || series.genres.length === 0) {
    return "补齐题材和标签，让搜索、筛选和专题编排能正常工作。";
  }

  if (!series.isPublished) {
    return "这部作品已经接近可上线状态，确认发布条件后就可以推进前台。";
  }

  if (readiness.score >= 85) {
    return "基础资料已经完整，可以稳定进入前台推荐、搜索和创作者发现路径。";
  }

  return "剩余缺口已经不多，按当前顺序收尾就能把前台体验拉稳。";
}

function getReadinessToneClasses(tone) {
  if (tone === "blue") {
    return "border-[rgba(47,88,198,0.14)] bg-[rgba(47,88,198,0.08)] text-[var(--gush-accent,#2f58c6)]";
  }

  if (tone === "emerald") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (tone === "cyan") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  if (tone === "amber") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-rose-200 bg-rose-50 text-rose-700";
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

function MetricCard({ label, value, hint, tone = "blue" }) {
  const toneClasses = {
    blue: "border-[rgba(47,88,198,0.14)] bg-[rgba(47,88,198,0.08)]",
    emerald: "border-emerald-200 bg-emerald-50/90",
    amber: "border-amber-200 bg-amber-50/90",
    rose: "border-rose-200 bg-rose-50/90",
    cyan: "border-sky-200 bg-sky-50/90",
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

function EmptyState({ title, description }) {
  return (
    <div className="rounded-[24px] border border-dashed border-black/10 bg-[rgba(250,247,241,0.72)] px-5 py-10 text-center">
      <p className="text-base font-semibold text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function StatusPill({ children, tone = "slate" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        tone === "slate" ? "border-black/8 bg-[rgba(250,247,241,0.92)] text-slate-600" : getReadinessToneClasses(tone),
      )}
    >
      {children}
    </span>
  );
}

function LoadingView() {
  return (
    <AdminShell
      title="前台巡检"
      subtitle="按读者真实会感知到的标准检查作品资料、署名和阅读路径。"
    >
      <div className="space-y-6">
        <Skeleton className="h-48 rounded-[32px]" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={`storefront-stat-${index}`} className="h-32 rounded-[28px]" />
          ))}
        </div>
        <Skeleton className="h-32 rounded-[28px]" />
        <div className="grid gap-6 xl:grid-cols-2">
          <Skeleton className="h-[36rem] rounded-[28px]" />
          <Skeleton className="h-[28rem] rounded-[28px]" />
        </div>
      </div>
    </AdminShell>
  );
}

export default function AdminStorefrontAuditPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdminAuth();
  const [seriesList, setSeriesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState("all");

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
          setError(data?.message || data?.error || "前台巡检数据加载失败。");
          setLoading(false);
          return;
        }

        const nextSeries = Array.isArray(data?.series)
          ? data.series.filter(Boolean).map(normalizeSeries)
          : [];
        setSeriesList(nextSeries);
        setLoading(false);
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setSeriesList([]);
        setError(loadError instanceof Error ? loadError.message : "前台巡检数据加载失败。");
        setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading]);

  const auditedSeries = useMemo(
    () =>
      seriesList
        .map((series) => {
          const readiness = getAdminSeriesReadiness(series);
          const contentFootprint = getContentFootprint(series);
          const priority = getPriorityScore(series, readiness, contentFootprint);

          return {
            ...series,
            creatorLabel: getCreatorLabel(series),
            readiness,
            contentFootprint,
            priority,
            launchReady: isDraftLaunchReady(series, readiness),
            recommendation: getRecommendedAction(series, readiness),
          };
        })
        .sort((left, right) => {
          if (right.priority !== left.priority) {
            return right.priority - left.priority;
          }

          const updatedDelta = getDateValue(right.updatedAt) - getDateValue(left.updatedAt);
          if (updatedDelta !== 0) {
            return updatedDelta;
          }

          return left.title.localeCompare(right.title, "zh-CN");
        }),
    [seriesList],
  );

  const overview = useMemo(() => {
    const total = auditedSeries.length;
    const readyCount = auditedSeries.filter((item) => item.readiness.isReady).length;
    const publishedRiskCount = auditedSeries.filter(
      (item) => item.isPublished && item.readiness.missingCount > 0,
    ).length;
    const launchReadyDraftCount = auditedSeries.filter((item) => item.launchReady).length;
    const creatorGapCount = auditedSeries.filter((item) => !item.creatorLabel).length;
    const avgScore = total
      ? Math.round(auditedSeries.reduce((sum, item) => sum + item.readiness.score, 0) / total)
      : 0;

    const missingSummary = auditedSeries.reduce((summary, item) => {
      item.readiness.missingItems.forEach((missingItem) => {
        summary[missingItem.id] = (summary[missingItem.id] || 0) + 1;
      });
      return summary;
    }, {});

    return {
      total,
      readyCount,
      publishedRiskCount,
      launchReadyDraftCount,
      creatorGapCount,
      avgScore,
      missingSummary,
    };
  }, [auditedSeries]);

  const filteredSeries = useMemo(() => {
    const normalizedQuery = normalizeText(query).toLowerCase();

    return auditedSeries.filter((series) => {
      const matchesFilter =
        quickFilter === "all" ||
        (quickFilter === "publishedRisk" && series.isPublished && series.readiness.missingCount > 0) ||
        (quickFilter === "launchReady" && series.launchReady) ||
        (quickFilter === "creatorGap" && !series.creatorLabel) ||
        (quickFilter === "thinPage" && (series.episodeCount <= 0 || !series.coverUrl));

      if (!matchesFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        series.title,
        series.id,
        series.creatorLabel,
        ...series.genres,
        series.recommendation,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [auditedSeries, query, quickFilter]);

  const topPriority = useMemo(() => filteredSeries.slice(0, 10), [filteredSeries]);

  const topGaps = useMemo(() => {
    const labels = {
      creator: "创作者署名缺失",
      cover: "封面素材缺失",
      description: "简介太薄",
      genres: "题材标签缺失",
      episodes: "没有章节",
      published: "仍未发布",
    };

    return Object.entries(overview.missingSummary)
      .map(([key, value]) => ({
        key,
        label: labels[key] || key,
        value: Number(value || 0),
      }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 6);
  }, [overview.missingSummary]);

  const handleOpenSeries = (seriesId) => {
    if (!seriesId) {
      return;
    }

    router.push(`/admin/series/${seriesId}`);
  };

  const handleOpenEpisodes = (seriesId) => {
    if (!seriesId) {
      return;
    }

    router.push(`/admin/series/${seriesId}/episodes`);
  };

  const handlePreviewStorefront = (seriesId) => {
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
      title="前台巡检"
      subtitle="按读者真实会感知到的标准检查作品资料、署名和阅读路径。"
      actions={
        <div className="flex flex-wrap gap-2">
          <ActionButton onClick={() => router.push("/admin/series")}>打开作品列表</ActionButton>
          <ActionButton onClick={() => router.push("/admin/creators")}>
            <BookOpen className="h-4 w-4" />
            查看创作者署名
          </ActionButton>
        </div>
      }
    >
      <div className="space-y-6">
        {error ? (
          <div className="rounded-[24px] border border-rose-200 bg-rose-50/90 px-5 py-4 text-sm text-rose-700 shadow-[var(--gush-shadow-soft)]">
            前台巡检加载失败：{error}
          </div>
        ) : null}

        <SurfacePanel appearance="light" tone="highlight" accent="blue" className="p-0">
          <div className="grid gap-6 px-5 py-5 sm:px-6 sm:py-6 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                前台可读性基线
              </p>
              <h2 className="mt-3 text-[2rem] font-semibold tracking-tight text-slate-950 sm:text-[2.45rem]">
                先补读者真的会感觉到的缺口。
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
                这里不看假热度，不看旧评分，只看作品页是否完整、署名是否可信、阅读路径是否能真正接住前台流量。
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <StatusPill tone="blue">读者视角巡检</StatusPill>
                <StatusPill tone="rose">{overview.publishedRiskCount} 部已上线作品仍有明显缺口</StatusPill>
                <StatusPill tone="amber">{overview.creatorGapCount} 部作品仍缺公开署名</StatusPill>
              </div>
            </div>

            <div className="rounded-[24px] border border-[rgba(47,88,198,0.14)] bg-white/86 px-5 py-5 shadow-[0_12px_24px_rgba(15,23,42,0.03)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                平均就绪分
              </p>
              <p className="mt-3 text-[2.4rem] font-semibold tracking-tight text-slate-950">
                {overview.avgScore}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {overview.readyCount} / {overview.total} 部作品已经满足当前前台基线。
              </p>
            </div>
          </div>
        </SurfacePanel>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="巡检作品数" value={overview.total.toLocaleString()} hint="当前纳入前台巡检的全部作品。" />
          <MetricCard label="可直接上前台" value={overview.readyCount.toLocaleString()} hint="资料、署名和阅读路径都已达标。" tone="emerald" />
          <MetricCard label="已上线但仍有缺口" value={overview.publishedRiskCount.toLocaleString()} hint="这些作品已经公开，但页面还不够稳。" tone="rose" />
          <MetricCard label="接近可发布" value={overview.launchReadyDraftCount.toLocaleString()} hint="只差发布动作或最后一两项补齐。" tone="cyan" />
          <MetricCard label="署名待补" value={overview.creatorGapCount.toLocaleString()} hint="这些作品会直接拖累创作者发现和读者信任。" tone="amber" />
        </div>

        <SurfacePanel appearance="light" accent="blue" className="space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-[1.35rem] font-semibold tracking-tight text-slate-950">
                收窄处理队列
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                先把已上线但明显缺资料的作品拉稳，再处理临门一脚就能发布的草稿。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "all", label: "全部作品" },
                { id: "publishedRisk", label: "已上线但有缺口" },
                { id: "launchReady", label: "接近可发布" },
                { id: "creatorGap", label: "署名待补" },
                { id: "thinPage", label: "页面仍偏空" },
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
          </div>

          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索作品名、ID、创作者、题材或建议动作"
              className="w-full rounded-full border border-black/8 bg-white px-11 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--gush-accent,#2f58c6)]"
            />
          </label>
        </SurfacePanel>

        <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
          <SurfacePanel appearance="light" accent="amber" className="space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[1.35rem] font-semibold tracking-tight text-slate-950">
                  优先处理队列
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  这些作品现在处理，最能直接改善读者看到的真实页面。
                </p>
              </div>
              <AlertTriangle className="mt-1 h-5 w-5 text-amber-500" />
            </div>

            {topPriority.length === 0 ? (
              <EmptyState
                title="当前筛选下没有结果"
                description="换回“全部作品”或者放宽搜索词，再继续往下巡检。"
              />
            ) : (
              <div className="space-y-4">
                {topPriority.map((series) => (
                  <article
                    key={series.id}
                    className="rounded-[28px] border border-black/8 bg-white/82 px-5 py-5 shadow-[0_12px_24px_rgba(15,23,42,0.03)]"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-[1.3rem] font-semibold tracking-tight text-slate-950">
                            {series.title}
                          </h3>
                          <StatusPill tone={series.readiness.tone}>{series.readiness.statusLabel}</StatusPill>
                          <StatusPill tone="slate">就绪分 {series.readiness.score}</StatusPill>
                        </div>

                        <p className="text-sm leading-6 text-slate-600">
                          {series.creatorLabel ? `署名：${series.creatorLabel}` : "署名待补"} |{" "}
                          {formatSeriesTypeLabel(series.type)} | {formatLifecycleLabel(series)} | 最近更新 {formatDateLabel(series.updatedAt)}
                        </p>

                        <p className="text-sm leading-7 text-slate-700">{series.recommendation}</p>

                        <div className="flex flex-wrap gap-2">
                          {series.readiness.missingItems.length > 0 ? (
                            series.readiness.missingItems.map((item) => (
                              <StatusPill key={`${series.id}-${item.id}`} tone="amber">
                                缺：{item.label}
                              </StatusPill>
                            ))
                          ) : (
                            <StatusPill tone="emerald">已经达到常规前台标准</StatusPill>
                          )}
                        </div>
                      </div>

                      <div className="grid min-w-[220px] gap-3 sm:grid-cols-2 lg:grid-cols-1">
                        <div className="rounded-[22px] border border-black/8 bg-[rgba(250,247,241,0.76)] px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            章节规模
                          </p>
                          <p className="mt-2 text-2xl font-semibold text-slate-950">{series.episodeCount}</p>
                        </div>
                        <div className="rounded-[22px] border border-black/8 bg-[rgba(250,247,241,0.76)] px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            内容基础
                          </p>
                          <p className="mt-2 text-2xl font-semibold text-slate-950">
                            {series.contentFootprint}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <ActionButton onClick={() => handleOpenSeries(series.id)}>
                        <PenSquare className="h-4 w-4" />
                        编辑作品
                      </ActionButton>
                      <ActionButton onClick={() => handleOpenEpisodes(series.id)}>
                        <BookOpen className="h-4 w-4" />
                        编辑章节
                      </ActionButton>
                      {series.isPublished ? (
                        <ActionButton onClick={() => handlePreviewStorefront(series.id)}>
                          <ArrowUpRight className="h-4 w-4" />
                          查看前台页
                        </ActionButton>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SurfacePanel>

          <div className="space-y-6">
            <SurfacePanel appearance="light" accent="cyan" className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-[1.35rem] font-semibold tracking-tight text-slate-950">
                    缺口分布
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    先看哪一类缺口拖住了最多作品，再决定这一轮补什么最值。
                  </p>
                </div>
                <Sparkles className="mt-1 h-5 w-5 text-cyan-500" />
              </div>

              {topGaps.length === 0 ? (
                <EmptyState
                  title="当前没有明显共性缺口"
                  description="目录基础已经比较稳，可以把精力转到专题编排和内容节奏上。"
                />
              ) : (
                <div className="space-y-3">
                  {topGaps.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between rounded-[22px] border border-black/8 bg-white px-4 py-4"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{item.label}</p>
                        <p className="mt-1 text-xs leading-6 text-slate-500">
                          这类问题会直接影响发现页、点击信心或作品页可读性。
                        </p>
                      </div>
                      <p className="text-2xl font-semibold text-slate-950">{item.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </SurfacePanel>

            <SurfacePanel appearance="light" accent="emerald" className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-[1.35rem] font-semibold tracking-tight text-slate-950">
                    建议处理顺序
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    按这个顺序推进，最容易让前台体验快速变稳。
                  </p>
                </div>
                <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-500" />
              </div>

              {[
                "先修已上线作品的明显缺口。它们已经在接流量，问题会直接被读者看到。",
                "署名优先级要靠前，因为它会同时影响可信度、创作者页和作品页信息完整度。",
                "接近可发布的草稿可以紧接着推进，这样扩目录时不会拉低整体前台质感。",
                "封面、简介和题材标签最好一轮补齐，别把半成品继续推到专题位里。",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[22px] border border-black/8 bg-[rgba(250,247,241,0.76)] px-4 py-4 text-sm leading-7 text-slate-700"
                >
                  {item}
                </div>
              ))}
            </SurfacePanel>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
