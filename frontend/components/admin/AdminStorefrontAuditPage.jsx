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

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeSeries(entry, index) {
  const source = entry && typeof entry === "object" ? entry : {};
  return {
    id: String(source.id || `series-${index + 1}`),
    title: String(source.title || "Untitled series"),
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
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(Math.max(0, toNumber(value)));
}

function formatDateLabel(value) {
  if (!value) {
    return "No recent update";
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return "No recent update";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(parsed));
}

function getReaderProof(series) {
  return Math.max(toNumber(series?.followers), toNumber(series?.views), toNumber(series?.ratingCount));
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
    return "Add creator credit first so the title can support creator discovery and trust cues.";
  }

  if (series.episodeCount <= 0) {
    return "Add episodes before driving readers into a title page with no reading path.";
  }

  if (!series.coverUrl.trim()) {
    return "Add cover art so lists, cards, and headers can carry the title cleanly.";
  }

  if (!series.description.trim()) {
    return "Expand the summary so the detail page feels finished and easier to browse.";
  }

  if (!Array.isArray(series.genres) || series.genres.length === 0) {
    return "Add genres and tags so browse, search, and editorial grouping can work properly.";
  }

  if (!series.isPublished) {
    return "This title is close. Finish the launch check and publish when ready.";
  }

  if (readiness.score >= 85) {
    return "Core storefront materials are in place. This title is ready for regular editorial use.";
  }

  return "Tighten the remaining gaps so the live page can convert attention with less friction.";
}

function getReadinessToneClasses(tone) {
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
      title="Storefront Audit"
      subtitle="Review title metadata, discovery paths, and live-readiness with the same calm standards readers already see."
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
          setError(data?.message || data?.error || "Failed to load storefront audit data.");
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
        setError(loadError instanceof Error ? loadError.message : "Failed to load storefront audit data.");
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
      creator: "Missing creator credit",
      cover: "Missing cover art",
      description: "Thin summary",
      genres: "Missing genres",
      episodes: "No episodes",
      published: "Still draft",
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
      title="Storefront Audit"
      subtitle="Review title metadata, discovery paths, and live-readiness with a reader-facing standard."
      actions={
        <div className="flex flex-wrap gap-2">
          <ActionButton onClick={() => router.push("/admin/series")}>Open series list</ActionButton>
          <ActionButton onClick={() => router.push("/admin/creators")}>
            <BookOpen className="h-4 w-4" />
            Review creator credits
          </ActionButton>
        </div>
      }
    >
      <div className="space-y-6">
        {error ? (
          <div className="rounded-[24px] border border-rose-200 bg-rose-50/90 px-5 py-4 text-sm text-rose-700 shadow-[var(--gush-shadow-soft)]">
            Storefront audit failed to load: {error}
          </div>
        ) : null}

        <SurfacePanel appearance="light" tone="highlight" accent="blue" className="p-0">
          <div className="grid gap-6 px-5 py-5 sm:px-6 sm:py-6 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Front page readiness
              </p>
              <h2 className="mt-3 text-[2rem] font-semibold tracking-tight text-slate-950 sm:text-[2.45rem]">
                Fix the gaps readers actually feel.
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
                This is not a field checklist. It is a live-readiness review for titles that need to work on
                series pages, in search, inside editorial lanes, and across creator discovery.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <StatusPill tone="blue">Reader-facing standard</StatusPill>
                <StatusPill tone="rose">{overview.publishedRiskCount} live titles still have gaps</StatusPill>
                <StatusPill tone="amber">{overview.creatorGapCount} titles still miss creator credit</StatusPill>
              </div>
            </div>

            <div className="rounded-[24px] border border-[rgba(47,88,198,0.14)] bg-white/86 px-5 py-5 shadow-[0_12px_24px_rgba(15,23,42,0.03)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Average score
              </p>
              <p className="mt-3 text-[2.4rem] font-semibold tracking-tight text-slate-950">
                {overview.avgScore}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {overview.readyCount} of {overview.total} titles already meet the current storefront baseline.
              </p>
            </div>
          </div>
        </SurfacePanel>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Titles audited" value={overview.total.toLocaleString()} hint="All titles currently included in the storefront review." />
          <MetricCard label="Storefront-ready" value={overview.readyCount.toLocaleString()} hint="Core metadata, credits, and reading path are already in place." tone="emerald" />
          <MetricCard label="Live with gaps" value={overview.publishedRiskCount.toLocaleString()} hint="These titles are already public but still feel incomplete." tone="rose" />
          <MetricCard label="Launch-ready drafts" value={overview.launchReadyDraftCount.toLocaleString()} hint="Mostly ready titles that now need a launch decision." tone="cyan" />
          <MetricCard label="Missing creator" value={overview.creatorGapCount.toLocaleString()} hint="These titles still weaken creator discovery and trust." tone="amber" />
        </div>

        <SurfacePanel appearance="light" accent="blue" className="space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-[1.35rem] font-semibold tracking-tight text-slate-950">
                Focus the queue
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Prioritize live titles with obvious public-facing gaps, then pull near-ready drafts across the line.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "all", label: "All titles" },
                { id: "publishedRisk", label: "Live with gaps" },
                { id: "launchReady", label: "Launch-ready drafts" },
                { id: "creatorGap", label: "Missing creator" },
                { id: "emptyShell", label: "Thin live pages" },
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
              placeholder="Search title, ID, creator, genre, or recommended action"
              className="w-full rounded-full border border-black/8 bg-white px-11 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--gush-accent,#2f58c6)]"
            />
          </label>
        </SurfacePanel>

        <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
          <SurfacePanel appearance="light" accent="amber" className="space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[1.35rem] font-semibold tracking-tight text-slate-950">
                  Priority queue
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  These titles have the biggest live impact when fixed now.
                </p>
              </div>
              <AlertTriangle className="mt-1 h-5 w-5 text-amber-500" />
            </div>

            {topPriority.length === 0 ? (
              <EmptyState
                title="Nothing matches this filter"
                description="Switch back to All titles or try a broader search to continue the audit."
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
                          <StatusPill tone="slate">Score {series.readiness.score}</StatusPill>
                        </div>

                        <p className="text-sm leading-6 text-slate-600">
                          {series.author ? `Creator: ${series.author}` : "Creator: not listed yet"} |{" "}
                          {series.type === "novel" ? "Novel" : "Comic"} | {series.isPublished ? "Live" : "Draft"} |
                          {" "}Updated {formatDateLabel(series.updatedAt)}
                        </p>

                        <p className="text-sm leading-7 text-slate-700">{series.recommendation}</p>

                        <div className="flex flex-wrap gap-2">
                          {series.readiness.missingItems.length > 0 ? (
                            series.readiness.missingItems.map((item) => (
                              <StatusPill key={`${series.id}-${item.id}`} tone="amber">
                                Missing {item.label}
                              </StatusPill>
                            ))
                          ) : (
                            <StatusPill tone="emerald">Ready for normal storefront use</StatusPill>
                          )}
                        </div>
                      </div>

                      <div className="grid min-w-[220px] gap-3 sm:grid-cols-2 lg:grid-cols-1">
                        <div className="rounded-[22px] border border-black/8 bg-[rgba(250,247,241,0.76)] px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Episodes
                          </p>
                          <p className="mt-2 text-2xl font-semibold text-slate-950">{series.episodeCount}</p>
                        </div>
                        <div className="rounded-[22px] border border-black/8 bg-[rgba(250,247,241,0.76)] px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Reader signal
                          </p>
                          <p className="mt-2 text-2xl font-semibold text-slate-950">
                            {formatCompactNumber(series.readerProof)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <ActionButton onClick={() => handleOpenSeries(series.id)}>
                        <PenSquare className="h-4 w-4" />
                        Edit title
                      </ActionButton>
                      <ActionButton onClick={() => handleOpenEpisodes(series.id)}>
                        <BookOpen className="h-4 w-4" />
                        Edit episodes
                      </ActionButton>
                      {series.isPublished ? (
                        <ActionButton onClick={() => handlePreviewStorefront(series.id)}>
                          <ArrowUpRight className="h-4 w-4" />
                          View live page
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
                    Gap distribution
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Use this to see which missing piece is holding back the most titles right now.
                  </p>
                </div>
                <Sparkles className="mt-1 h-5 w-5 text-cyan-500" />
              </div>

              {topGaps.length === 0 ? (
                <EmptyState
                  title="No major gaps found"
                  description="The catalog is in good shape and can shift toward editorial tuning."
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
                          This directly affects discovery, click confidence, or detail-page usefulness.
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
                    Recommended order
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Follow this order to improve the live storefront fastest.
                  </p>
                </div>
                <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-500" />
              </div>

              {[
                "Fix live titles with obvious gaps first. Those are already absorbing reader attention.",
                "Add creator credit early because it improves trust, creator pages, and browse paths at once.",
                "Publish near-ready drafts next to expand the catalog without lowering the site standard.",
                "Treat missing cover, summary, and tags together as a sign that a title still needs a real editorial pass.",
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

