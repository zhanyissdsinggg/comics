"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, CheckCircle2, Eye, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import SurfacePanel from "@/components/common/SurfacePanel";

import { useAdminAuth } from "./AuthContext";
import { adminFetchJson } from "../../lib/adminApiClient";
import AdminShell from "./AdminShell";
import {
  ActionButton,
  EmptyState,
  LoadingView,
  MetricCard,
  PillButton,
  StatusPill,
} from "./creators-audit/blocks";
import {
  CreatorDirectorySection,
  LegacyAuthorSection,
  MissingCreditsSection,
  NamingRiskSection,
} from "./creators-audit/sections";
import {
  EMPTY_AUDIT,
  getErrorMessage,
} from "./creators-audit/utils";

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
      subtitle="统一署名、作品归属和公开展示，避免前台继续靠旧 author 字段硬撑。"
      actions={
        <div className="flex flex-wrap gap-2">
          <ActionButton
            onClick={() => router.push("/admin/series")}
            className="border-[color:var(--gush-border-strong)] bg-[color:var(--gush-page-bg-muted)] text-slate-950"
          >
            打开作品列表
          </ActionButton>
          <ActionButton onClick={() => handleOpenCreator("/creators")}>
            <Eye className="h-4 w-4" />
            查看前台创作者页
          </ActionButton>
        </div>
      }
    >
      <div className="space-y-6">
        {error ? (
          <div className="rounded-[24px] border border-rose-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,241,242,0.95))] px-5 py-4 text-sm text-rose-700 shadow-[0_12px_28px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02]">
            创作者巡检加载失败：{error}
          </div>
        ) : null}

        {copyFeedback.message ? (
          <div
            className={cn(
              "rounded-[24px] border px-5 py-4 text-sm shadow-[0_12px_28px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02]",
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
                先把缺失署名补齐，再回收旧 author 兼容层和命名分叉。
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <StatusPill tone="blue">内容优先后台</StatusPill>
                <StatusPill tone="amber">缺署名 {audit.stats.missingAuthorSeriesCount}</StatusPill>
                <StatusPill tone={audit.stats.legacyAuthorOnlySeriesCount > 0 ? "amber" : "emerald"}>
                  旧 author {audit.stats.legacyAuthorOnlySeriesCount}
                </StatusPill>
                <StatusPill tone={audit.stats.namingRiskCreatorCount > 0 ? "rose" : "emerald"}>
                  命名风险 {audit.stats.namingRiskCreatorCount}
                </StatusPill>
              </div>
            </div>

            <div className="rounded-[24px] border border-[color:var(--gush-border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,247,249,0.92))] px-5 py-5 shadow-[0_14px_32px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">覆盖率</p>
              <p className="mt-3 text-[2.4rem] font-semibold tracking-tight text-slate-950">{coverageRate}%</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {audit.stats.attributedSeriesCount} / {audit.stats.totalSeries} 部作品已经接入真实 credits。
              </p>
            </div>
          </div>
        </SurfacePanel>

        <div className="grid gap-4 lg:grid-cols-4">
          <MetricCard
            title="创作者条目"
            value={audit.stats.creatorCount.toLocaleString()}
            hint="已经进入真实 Creator / SeriesCredit 模型。"
            tone="blue"
          />
          <MetricCard
            title="真实 credits 已接入"
            value={audit.stats.structuredCreatorSeriesCount.toLocaleString()}
            hint="前台作品页和创作者目录可以直接使用。"
            tone="emerald"
          />
          <MetricCard
            title="旧 author 兼容层"
            value={audit.stats.legacyAuthorOnlySeriesCount.toLocaleString()}
            hint="还没有迁进真实 credits 的作品。"
            tone="amber"
          />
          <MetricCard
            title="缺少公开署名"
            value={audit.stats.missingAuthorSeriesCount.toLocaleString()}
            hint="前台暂时还拿不到可展示的创作者身份。"
            tone="rose"
          />
        </div>

        <SurfacePanel appearance="light" accent="blue" className="space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-[1.35rem] font-semibold tracking-tight text-slate-950">筛选创作者目录</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                按名字、作品或题材快速定位要处理的创作者条目。
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
              className="w-full rounded-full border border-[color:var(--gush-border)] bg-white px-11 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--gush-accent,#2f58c6)]"
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
          <NamingRiskSection
            namingRiskPreview={namingRiskPreview}
            handleOpenSeries={handleOpenSeries}
            handleCopyCreatorName={handleCopyCreatorName}
            copyFeedback={copyFeedback}
          />
          <MissingCreditsSection
            missingCreatorPreview={missingCreatorPreview}
            handleOpenSeries={handleOpenSeries}
          />
        </div>

        <LegacyAuthorSection
          legacyAuthorPreview={legacyAuthorPreview}
          handleOpenSeries={handleOpenSeries}
        />

        <CreatorDirectorySection
          filteredCreators={filteredCreators}
          expandedCreators={expandedCreators}
          audit={audit}
          handleOpenSeries={handleOpenSeries}
          handleOpenSeriesLibraryByCreator={handleOpenSeriesLibraryByCreator}
          handleCopyCreatorName={handleCopyCreatorName}
          handleOpenCreator={handleOpenCreator}
          handleOpenStorefrontSeries={handleOpenStorefrontSeries}
          handleToggleCreatorExpanded={handleToggleCreatorExpanded}
          copyFeedback={copyFeedback}
        />

        {audit.creators.length === 0 &&
        audit.missingAuthorSeries.length === 0 &&
        legacyAuthorPreview.length === 0 ? (
          <EmptyState
            title="当前还没有创作者数据"
            description="先到作品详情页补署名，再回来看目录是否已经建立。"
          />
        ) : null}

        <SurfacePanel appearance="light" accent="emerald">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                建议处理顺序
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                先补缺失署名，再统一命名，最后回查前台展示。
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
