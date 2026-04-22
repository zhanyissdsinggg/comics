"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Search } from "lucide-react";

import SurfacePanel from "@/components/common/SurfacePanel";

import AdminShell from "./AdminShell";
import { useAdminAuth } from "./AuthContext";
import { adminFetchJson } from "../../lib/adminApiClient";
import {
  ActionButton,
  EmptyState,
  LoadingView,
  MetricCard,
  PillButton,
  StatusPill,
} from "./storefront-audit/blocks";
import {
  GapDistributionSection,
  PriorityQueueSection,
  RecommendedSequenceSection,
} from "./storefront-audit/sections";
import {
  QUICK_FILTERS,
  createAuditedSeries,
  filterAuditedSeries,
  getAuditOverview,
  getTopGaps,
  normalizeSeries,
} from "./storefront-audit/utils";

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

  const auditedSeries = useMemo(() => createAuditedSeries(seriesList), [seriesList]);
  const overview = useMemo(() => getAuditOverview(auditedSeries), [auditedSeries]);
  const filteredSeries = useMemo(
    () => filterAuditedSeries(auditedSeries, query, quickFilter),
    [auditedSeries, query, quickFilter],
  );
  const topPriority = useMemo(() => filteredSeries.slice(0, 10), [filteredSeries]);
  const topGaps = useMemo(() => getTopGaps(overview.missingSummary), [overview.missingSummary]);

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
      subtitle="按读者视角检查作品页、署名、封面和阅读路径。"
      actions={
        <div className="flex flex-wrap gap-2">
          <ActionButton
            onClick={() => router.push("/admin/series")}
            className="border-[color:var(--gush-border-strong)] bg-[color:var(--gush-page-bg-muted)] text-slate-950"
          >
            打开作品列表
          </ActionButton>
          <ActionButton onClick={() => router.push("/admin/creators")}>
            <BookOpen className="h-4 w-4" />
            查看创作者署名
          </ActionButton>
        </div>
      }
    >
      <div className="space-y-6">
        {error ? (
          <div className="rounded-[24px] border border-rose-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,241,242,0.95))] px-5 py-4 text-sm text-rose-700 shadow-[0_12px_28px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02]">
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
                先看资料、署名和阅读路径，再决定哪些作品可以放心推到前台。
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <StatusPill tone="blue">读者视角巡检</StatusPill>
                <StatusPill tone="rose">{overview.publishedRiskCount} 部已上线作品仍有明显缺口</StatusPill>
                <StatusPill tone="amber">{overview.creatorGapCount} 部作品仍缺公开署名</StatusPill>
              </div>
            </div>

            <div className="rounded-[24px] border border-[color:var(--gush-border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,247,249,0.92))] px-5 py-5 shadow-[0_14px_32px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                平均就绪度
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
          <MetricCard label="接近可发布" value={overview.launchReadyDraftCount.toLocaleString()} hint="只差最后一两项补齐就能上线。" tone="cyan" />
          <MetricCard label="署名待补" value={overview.creatorGapCount.toLocaleString()} hint="这些作品会直接拖累创作者发现和读者信任。" tone="amber" />
        </div>

        <SurfacePanel appearance="light" accent="blue" className="space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-[1.35rem] font-semibold tracking-tight text-slate-950">收口处理队列</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                先稳住已上线作品，再处理接近可发的草稿。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_FILTERS.map((item) => (
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
              placeholder="搜索作品名、编号、创作者、题材或建议动作"
              className="w-full rounded-full border border-[color:var(--gush-border)] bg-white px-11 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--gush-accent,#2f58c6)]"
            />
          </label>
        </SurfacePanel>

        <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
          <PriorityQueueSection
            topPriority={topPriority}
            handleOpenSeries={handleOpenSeries}
            handleOpenEpisodes={handleOpenEpisodes}
            handlePreviewStorefront={handlePreviewStorefront}
          />

          <div className="space-y-6">
            <GapDistributionSection topGaps={topGaps} />
            <RecommendedSequenceSection />
          </div>
        </div>

        {auditedSeries.length === 0 ? (
          <EmptyState
            title="当前还没有可巡检的作品"
            description="先确认后台作品目录是否已经同步出来。"
          />
        ) : null}
      </div>
    </AdminShell>
  );
}
