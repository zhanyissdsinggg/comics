"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  PenSquare,
  Sparkles,
} from "lucide-react";

import SurfacePanel from "@/components/common/SurfacePanel";

import {
  RECOMMENDED_SEQUENCE,
  formatDateLabel,
  formatLifecycleLabel,
  formatSeriesTypeLabel,
} from "./utils";
import { ActionButton, EmptyState, StatusPill } from "./blocks";

export function PriorityQueueSection({
  topPriority,
  handleOpenSeries,
  handleOpenEpisodes,
  handlePreviewStorefront,
}) {
  return (
    <SurfacePanel appearance="light" accent="amber" className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[1.35rem] font-semibold tracking-tight text-slate-950">优先处理队列</h2>
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
              className="rounded-[28px] border border-[color:var(--gush-border)] bg-white/82 px-5 py-5 shadow-[0_12px_24px_rgba(15,23,42,0.03)]"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[1.3rem] font-semibold tracking-tight text-slate-950">
                      {series.title}
                    </h3>
                    <StatusPill tone={series.readiness.tone}>{series.readiness.statusLabel}</StatusPill>
                    <StatusPill tone="slate">就绪度 {series.readiness.score}</StatusPill>
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
                  <div className="rounded-[22px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">章节规模</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">{series.episodeCount}</p>
                  </div>
                  <div className="rounded-[22px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">内容基础</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">{series.contentFootprint}</p>
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
  );
}

export function GapDistributionSection({ topGaps }) {
  return (
    <SurfacePanel appearance="light" accent="cyan" className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[1.35rem] font-semibold tracking-tight text-slate-950">缺口分布</h2>
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
              className="flex items-center justify-between rounded-[22px] border border-[color:var(--gush-border)] bg-white px-4 py-4"
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
  );
}

export function RecommendedSequenceSection() {
  return (
    <SurfacePanel appearance="light" accent="emerald" className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[1.35rem] font-semibold tracking-tight text-slate-950">建议处理顺序</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            按这个顺序推进，最容易让前台体验快速变稳。
          </p>
        </div>
        <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-500" />
      </div>

      {RECOMMENDED_SEQUENCE.map((item) => (
        <div
          key={item}
          className="rounded-[22px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-4 text-sm leading-7 text-slate-700"
        >
          {item}
        </div>
      ))}
    </SurfacePanel>
  );
}
