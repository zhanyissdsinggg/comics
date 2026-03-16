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
import AdminShell from "./AdminShell";
import { useAdminAuth } from "./AuthContext";
import Skeleton from "../common/Skeleton";
import { adminFetchJson } from "../../lib/adminApiClient";
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
    genres: Array.isArray(source.genres) ? source.genres.filter(Boolean) : [],
    episodeCount: toNumber(source.episodeCount ?? source?._count?.episodes ?? source.totalEpisodes),
    isPublished: source.isPublished !== undefined ? Boolean(source.isPublished) : true,
    updatedAt: source.updatedAt || source.createdAt || null,
    followers: toNumber(source.followers),
    views: toNumber(source.views),
    ratingCount: toNumber(source.ratingCount),
  };
}

function formatCompactNumber(value) {
  return new Intl.NumberFormat("zh-CN", {
    notation: value >= 10000 ? "compact" : "standard",
    maximumFractionDigits: value >= 10000 ? 1 : 0,
  }).format(Math.max(0, toNumber(value)));
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

function getReaderProof(series) {
  return Math.max(
    toNumber(series?.followers),
    toNumber(series?.views),
    toNumber(series?.ratingCount),
  );
}

function getPriorityScore(series, readiness, readerProof) {
  let score = Math.max(0, 100 - readiness.score);

  if (series.isPublished && readiness.missingCount > 0) {
    score += 100;
  }

  if (!series.author.trim()) {
    score += 35;
  }

  if (series.episodeCount <= 0) {
    score += 35;
  }

  if (!series.coverUrl.trim()) {
    score += 25;
  }

  if (!series.description.trim()) {
    score += 15;
  }

  if (!Array.isArray(series.genres) || series.genres.length === 0) {
    score += 15;
  }

  if (readerProof > 0) {
    score += Math.min(35, Math.round(Math.log10(readerProof + 1) * 10));
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
  if (!series.author.trim()) {
    return "先补作者归因，打通 creator 入口";
  }

  if (series.episodeCount <= 0) {
    return "先补章节，避免前台详情页变空壳";
  }

  if (!series.coverUrl.trim()) {
    return "先补封面，提升首页和列表点击率";
  }

  if (!series.description.trim()) {
    return "补简介，让详情页和搜索摘要更像成熟站点";
  }

  if (!Array.isArray(series.genres) || series.genres.length === 0) {
    return "补标签，增强搜索过滤和相关推荐";
  }

  if (!series.isPublished) {
    return "这部作品已接近可发，可以进入上线检查";
  }

  if (readiness.score >= 85) {
    return "基础资料已齐，可以转向推荐位和活动运营";
  }

  return "补齐剩余细节，继续抬升前台转化质量";
}

function getReadinessToneClasses(tone) {
  if (tone === "emerald") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-200";
  }

  if (tone === "cyan") {
    return "border-cyan-500/25 bg-cyan-500/10 text-cyan-200";
  }

  if (tone === "amber") {
    return "border-amber-500/25 bg-amber-500/10 text-amber-200";
  }

  return "border-rose-500/25 bg-rose-500/10 text-rose-200";
}

function LoadingView() {
  return (
    <AdminShell
      title="前台体检"
      subtitle="从头部漫画站标准检查作品资料、发现链路和上线准备度。"
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={`storefront-audit-stat-${index}`} className="h-32 rounded-3xl" />
          ))}
        </div>
        <Skeleton className="h-28 rounded-3xl" />
        <Skeleton className="h-24 rounded-3xl" />
        <div className="grid gap-4 xl:grid-cols-2">
          <Skeleton className="h-72 rounded-3xl" />
          <Skeleton className="h-72 rounded-3xl" />
        </div>
      </div>
    </AdminShell>
  );
}

function StatCard({ label, value, hint, tone = "neutral" }) {
  const toneClasses = {
    neutral: "border-neutral-800 bg-neutral-900/70 text-white",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-white",
    cyan: "border-cyan-500/20 bg-cyan-500/10 text-white",
    amber: "border-amber-500/20 bg-amber-500/10 text-white",
    rose: "border-rose-500/20 bg-rose-500/10 text-white",
  };

  return (
    <div className={`rounded-3xl border px-5 py-5 ${toneClasses[tone] || toneClasses.neutral}`}>
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
          setError(data?.message || data?.error || "前台体检数据加载失败。");
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
        setError(loadError instanceof Error ? loadError.message : "前台体检数据加载失败。");
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading]);

  const auditedSeries = useMemo(
    () =>
      seriesList
        .map((series) => {
          const readiness = getAdminSeriesReadiness(series);
          const readerProof = getReaderProof(series);
          const priority = getPriorityScore(series, readiness, readerProof);

          return {
            ...series,
            readiness,
            readerProof,
            priority,
            launchReady: isDraftLaunchReady(series, readiness),
            recommendation: getRecommendedAction(series, readiness),
          };
        })
        .sort((left, right) => {
          if (right.priority !== left.priority) {
            return right.priority - left.priority;
          }

          const updatedDelta = Date.parse(right.updatedAt || 0) - Date.parse(left.updatedAt || 0);
          if (updatedDelta !== 0) {
            return updatedDelta;
          }

          return left.title.localeCompare(right.title);
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
    const creatorGapCount = auditedSeries.filter((item) => !item.author.trim()).length;
    const avgScore = total
      ? Math.round(
          auditedSeries.reduce((sum, item) => sum + item.readiness.score, 0) / total,
        )
      : 0;

    const missingSummary = auditedSeries.reduce(
      (summary, item) => {
        item.readiness.missingItems.forEach((missingItem) => {
          summary[missingItem.id] = (summary[missingItem.id] || 0) + 1;
        });
        return summary;
      },
      {},
    );

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
    const normalizedQuery = String(query || "").trim().toLowerCase();

    return auditedSeries.filter((series) => {
      const matchesFilter =
        quickFilter === "all" ||
        (quickFilter === "publishedRisk" && series.isPublished && series.readiness.missingCount > 0) ||
        (quickFilter === "launchReady" && series.launchReady) ||
        (quickFilter === "creatorGap" && !series.author.trim()) ||
        (quickFilter === "emptyShell" && (series.episodeCount <= 0 || !series.coverUrl.trim()));

      if (!matchesFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        series.title,
        series.id,
        series.author,
        ...(Array.isArray(series.genres) ? series.genres : []),
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
      author: "缺作者归因",
      cover: "缺封面资源",
      description: "缺完整简介",
      genres: "缺分类标签",
      episodes: "缺章节",
      published: "未发布",
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
      title="前台体检"
      subtitle="用头部漫画站标准审视作品资料、发现链路和上线准备度。"
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
            onClick={() => router.push("/admin/creators")}
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
          >
            去创作者归因
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {error ? (
          <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
            前台体检数据加载失败：{error}
          </div>
        ) : null}

        <section className="rounded-3xl border border-neutral-800 bg-neutral-900/50 p-6 backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300/80">
                Storefront audit
              </p>
              <h2 className="text-2xl font-semibold text-white">
                先修会直接影响前台点击、发现和转化的缺口。
              </h2>
              <p className="max-w-3xl text-sm leading-7 text-neutral-400">
                这个页面不是在看“后台字段填没填”，而是在看这些字段能不能支撑一个美国头部漫画站的前台体验。
                已发布但资料不完整的作品要优先处理，草稿中只差发布的一批则适合尽快上线。
              </p>
            </div>
            <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">
                当前平均分
              </p>
              <p className="mt-2 text-3xl font-semibold text-white">{overview.avgScore}</p>
              <p className="mt-1 text-xs text-neutral-300">
                {overview.readyCount} / {overview.total} 部作品已达到头部站基础就绪线
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="全部作品"
            value={overview.total.toLocaleString()}
            hint="当前纳入前台体检的作品总量"
          />
          <StatCard
            label="头部站就绪"
            value={overview.readyCount.toLocaleString()}
            hint="资料、章节和发布状态都已齐备"
            tone="emerald"
          />
          <StatCard
            label="已发布待补"
            value={overview.publishedRiskCount.toLocaleString()}
            hint="已在前台承接流量，但还有明显短板"
            tone="rose"
          />
          <StatCard
            label="可上线草稿"
            value={overview.launchReadyDraftCount.toLocaleString()}
            hint="除发布状态外，其他关键资料已基本齐备"
            tone="cyan"
          />
          <StatCard
            label="缺作者归因"
            value={overview.creatorGapCount.toLocaleString()}
            hint="这会直接切断 creator 发现链路"
            tone="amber"
          />
        </section>

        <section className="rounded-3xl border border-neutral-800 bg-neutral-900/50 p-6 backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-white">运营动作顺序</h2>
              <p className="max-w-3xl text-sm text-neutral-400">
                推荐按这个顺序收口：先修已发布待补作品，再补作者归因，再把已接近可发的草稿推上线。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "all", label: "全部" },
                { id: "publishedRisk", label: "已发布待补" },
                { id: "launchReady", label: "可上线草稿" },
                { id: "creatorGap", label: "缺作者" },
                { id: "emptyShell", label: "空壳页风险" },
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

          <label className="relative mt-5 block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索作品名、ID、作者、标签或建议动作"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-emerald-400/40"
            />
          </label>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
          <div className="rounded-3xl border border-neutral-800 bg-neutral-900/50 p-6 backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-white">优先处理队列</h2>
                <p className="mt-2 text-sm text-neutral-400">
                  当前筛选下最值得优先处理的作品。排序会同时考虑前台影响、缺口严重度和已有读者信号。
                </p>
              </div>
              <AlertTriangle className="mt-1 h-5 w-5 text-amber-300" />
            </div>

            <div className="mt-5 space-y-4">
              {topPriority.length === 0 ? (
                <EmptyPanel
                  title="当前筛选下没有待处理作品"
                  description="可以切回“全部”，或者换一个筛选看别的缺口。"
                />
              ) : (
                topPriority.map((series) => (
                  <article
                    key={series.id}
                    className="rounded-3xl border border-white/10 bg-black/10 p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-semibold text-white">{series.title}</h3>
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getReadinessToneClasses(series.readiness.tone)}`}>
                            {series.readiness.statusLabel}
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-neutral-300">
                            前台分 {series.readiness.score}
                          </span>
                        </div>

                        <p className="text-sm text-neutral-400">
                          {series.author ? `作者 / 工作室：${series.author}` : "作者 / 工作室：未填写"} ·
                          {" "}
                          {series.type === "novel" ? "小说" : "漫画"} ·
                          {" "}
                          {series.isPublished ? "已发布" : "草稿"} · 更新于 {formatDateLabel(series.updatedAt)}
                        </p>

                        <p className="text-sm leading-7 text-neutral-300">{series.recommendation}</p>

                        <div className="flex flex-wrap gap-2">
                          {series.readiness.missingItems.length > 0
                            ? series.readiness.missingItems.map((item) => (
                                <span
                                  key={`${series.id}-${item.id}`}
                                  className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200"
                                >
                                  待补：{item.label}
                                </span>
                              ))
                            : (
                                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-200">
                                  可直接承接前台分发
                                </span>
                              )}
                        </div>
                      </div>

                      <div className="grid min-w-[220px] gap-2 sm:grid-cols-2 lg:grid-cols-1">
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                          <p className="text-xs text-neutral-500">章节</p>
                          <p className="mt-2 text-2xl font-semibold text-white">{series.episodeCount}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                          <p className="text-xs text-neutral-500">读者信号</p>
                          <p className="mt-2 text-2xl font-semibold text-white">
                            {formatCompactNumber(series.readerProof)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenSeries(series.id)}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
                      >
                        <PenSquare className="h-4 w-4" />
                        编辑作品
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEpisodes(series.id)}
                        className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-400/50 hover:bg-emerald-500/15"
                      >
                        <BookOpen className="h-4 w-4" />
                        章节管理
                      </button>
                      {series.isPublished ? (
                        <button
                          type="button"
                          onClick={() => handlePreviewStorefront(series.id)}
                          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
                        >
                          <ArrowUpRight className="h-4 w-4" />
                          前台预览
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="space-y-4">
            <section className="rounded-3xl border border-neutral-800 bg-neutral-900/50 p-6 backdrop-blur-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-white">缺口分布</h2>
                  <p className="mt-2 text-sm text-neutral-400">
                    这里能帮你看清当前站点最短的那块木板是什么。
                  </p>
                </div>
                <Sparkles className="mt-1 h-5 w-5 text-cyan-300" />
              </div>

              <div className="mt-5 space-y-3">
                {topGaps.length === 0 ? (
                  <EmptyPanel
                    title="当前没有明显缺口"
                    description="说明作品资料已经比较完整，可以转向活动与推荐位运营。"
                  />
                ) : (
                  topGaps.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-white">{item.label}</p>
                        <p className="mt-1 text-xs text-neutral-500">会直接影响前台发现、点击或转化</p>
                      </div>
                      <p className="text-2xl font-semibold text-white">{item.value}</p>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-neutral-800 bg-neutral-900/50 p-6 backdrop-blur-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-white">运营建议</h2>
                  <p className="mt-2 text-sm text-neutral-400">
                    如果你想最快抬高站点水平，建议按下面顺序推进。
                  </p>
                </div>
                <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-300" />
              </div>

              <div className="mt-5 space-y-3">
                {[
                  "先修已发布但资料不完整的作品，这些最直接影响首页、搜索和系列页转化。",
                  "作者字段优先级很高，因为它同时影响 creator 页面、搜索救援链路和信任模块。",
                  "草稿里只差发布状态的一批作品适合尽快上线，能最快扩充前台可运营库存。",
                  "封面、简介、标签如果同时缺失，说明这部作品还不具备头部站的基础承接能力。",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-neutral-300"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
