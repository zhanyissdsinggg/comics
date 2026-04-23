"use client";

import { ArrowUpRight, BookOpen, Copy, RefreshCw, Star } from "lucide-react";

import SurfacePanel from "@/components/common/SurfacePanel";
import Skeleton from "@/components/common/Skeleton";
import { cn } from "@/lib/utils";

import { getAdminSeriesReadiness } from "../../../lib/adminSeriesReadiness";
import { resolveSeriesCreatorName } from "../../../lib/creatorIdentity";

import { ActionButton, EmptyState, getToneClasses, MetricCard, MiniMetric } from "./blocks";
import {
  formatCompactNumber,
  formatDateLabel,
  formatPercentValue,
  formatSeriesStatusLabel,
  getPerformanceState,
  PERFORMANCE_WINDOWS,
} from "./utils";

const actionTrayClassName = "flex flex-wrap gap-2";

const primaryActionClassName =
  "border-[color:var(--gush-border-strong)] bg-[color:var(--gush-page-bg-muted)] text-slate-950";

export function PerformanceOverviewSection(props) {
  const {
    performanceWindow,
    setPerformanceWindow,
    performanceNotice,
    trackedCurrentSlots,
    performanceLoading,
    performanceSummary,
    summaryCtr,
    summaryConversionRate,
    slotPerformanceCards,
  } = props;

  return (
    <SurfacePanel appearance="light" accent="blue" className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">表现复盘</p>
          <h2 className="text-[1.35rem] font-semibold tracking-tight text-slate-950">推荐位表现</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">先看入口有没有真正拿到曝光、点击和转化。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PERFORMANCE_WINDOWS.map((window) => (
            <ActionButton
              key={window.id}
              onClick={() => setPerformanceWindow(window.id)}
              className={
                performanceWindow === window.id
                  ? "border-[color:var(--gush-border-strong)] bg-[color:var(--gush-page-bg-muted)] text-slate-950"
                  : ""
              }
            >
              {window.label}
            </ActionButton>
          ))}
        </div>
      </div>

      {performanceNotice ? (
        <div className="rounded-[24px] border border-amber-200 bg-white px-5 py-4 text-sm text-amber-800 shadow-[0_10px_24px_rgba(15,23,42,0.03)] ring-1 ring-black/[0.02]">
          {performanceNotice}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[22px] border border-[color:var(--gush-border)] bg-white/95 px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)] ring-1 ring-black/[0.02]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">当前重点</p>
          <p className="mt-2 text-sm font-semibold text-slate-950">先看高曝光入口</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">曝光已经起来但点击低的入口，最值得先调整标题和选品。</p>
        </div>
        <div className="rounded-[22px] border border-[color:var(--gush-border)] bg-white/95 px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)] ring-1 ring-black/[0.02]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">切换窗口</p>
          <p className="mt-2 text-sm font-semibold text-slate-950">按时间窗口复核波动</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">不要只看单日数据，避免因为短时波动误判推荐位好坏。</p>
        </div>
        <div className="rounded-[22px] border border-[color:var(--gush-border)] bg-white/95 px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)] ring-1 ring-black/[0.02]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">使用建议</p>
          <p className="mt-2 text-sm font-semibold text-slate-950">先看趋势，再改配置</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">先确认问题稳定存在，再去替换作品或调整推荐位内容。</p>
        </div>
      </div>

      {trackedCurrentSlots.length === 0 ? (
        <EmptyState title="先完成推荐位配置" description="关键入口上线后，这里才会出现真实表现数据。" />
      ) : performanceLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={`performance-metric-${index}`} className="h-32 rounded-[28px]" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="已跟踪推荐位" value={trackedCurrentSlots.length.toLocaleString()} hint="当前已配置且有表现数据的入口数量。" tone="cyan" />
            <MetricCard label="曝光" value={formatCompactNumber(performanceSummary.totalImpressions)} hint="所选时间范围内的总曝光。" />
            <MetricCard label="点击" value={formatCompactNumber(performanceSummary.totalClicks)} hint="这些推荐位带来的点击量。" />
            <MetricCard label="转化" value={formatCompactNumber(performanceSummary.totalConversions)} hint="点击后的被跟踪动作。" tone={performanceSummary.totalConversions > 0 ? "emerald" : "amber"} />
            <MetricCard label="点击率" value={formatPercentValue(summaryCtr)} hint={`转化率 ${formatPercentValue(summaryConversionRate)}`} tone={summaryCtr >= 2 ? "emerald" : summaryCtr > 0 ? "amber" : "rose"} />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {slotPerformanceCards.map((slot) => {
              const performanceState = getPerformanceState(slot.performance);
              const linkedTitles = slot.currentSeries.slice(0, 2).map((series) => series.title);

              return (
                <article
                  key={`${slot.id}-performance`}
                  className="rounded-[28px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,247,249,0.92))] px-5 py-5 shadow-[0_14px_32px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[1.2rem] font-semibold tracking-tight text-slate-950">{slot.label}</h3>
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getToneClasses(performanceState.tone)}`}>
                      {performanceState.label}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {linkedTitles.length > 0
                      ? `当前作品：${linkedTitles.join(" / ")}${slot.currentSeries.length > linkedTitles.length ? `，另有 ${slot.currentSeries.length - linkedTitles.length} 部` : ""}`
                      : "推荐位已经配置，但当前作品数据没有成功解析出来。"}
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <MiniMetric label="曝光" value={formatCompactNumber(slot.performance.totalImpressions)} />
                    <MiniMetric label="点击" value={formatCompactNumber(slot.performance.totalClicks)} />
                    <MiniMetric label="转化" value={formatCompactNumber(slot.performance.totalConversions)} />
                    <MiniMetric label="点击率" value={formatPercentValue(slot.performance.avgCtr)} />
                    <MiniMetric label="转化率" value={formatPercentValue(slot.performance.avgConversionRate)} />
                    <MiniMetric label="推荐位编号" value={slot.id} hint="追踪参考" />
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </SurfacePanel>
  );
}

export function OptimizationQueueSection(props) {
  const {
    urgentOptimizationCount,
    slotOptimizationCards,
    handleApplyRecommendation,
    savingSlot,
    openSeriesEditor,
    handleCopyIds,
  } = props;

  return (
    <SurfacePanel appearance="light" accent="emerald" className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">优化动作</p>
          <h2 className="text-[1.35rem] font-semibold tracking-tight text-slate-950">待优化队列</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">把配置、完整度和表现放在一起看，先处理最影响首页观感的入口。</p>
        </div>
        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
          {urgentOptimizationCount} 个高优先项
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {slotOptimizationCards.map((slot) => (
          <article
            key={`${slot.id}-optimization`}
            className="rounded-[28px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,247,249,0.92))] px-5 py-5 shadow-[0_14px_32px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02]"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[1.2rem] font-semibold tracking-tight text-slate-950">{slot.label}</h3>
              <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getToneClasses(slot.plan.tone)}`}>
                {slot.plan.title}
              </span>
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">{slot.plan.detail}</p>

            {slot.current ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <MiniMetric label="曝光" value={formatCompactNumber(slot.performance.totalImpressions)} />
                <MiniMetric label="点击率" value={formatPercentValue(slot.performance.avgCtr)} />
                <MiniMetric label="转化率" value={formatPercentValue(slot.performance.avgConversionRate)} />
              </div>
            ) : null}

            {slot.plan.replacementCandidates.length > 0 ? (
              <div className="mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">备选作品</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {slot.plan.replacementCandidates.map((series) => (
                    <span
                      key={`${slot.id}-replacement-${series.id}`}
                      className="inline-flex items-center rounded-full border border-[color:var(--gush-border)] bg-white px-2.5 py-1 text-xs font-semibold text-slate-700"
                    >
                      {series.title}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className={`mt-5 ${actionTrayClassName}`}>
              {slot.plan.actionType === "apply" ? (
                <ActionButton
                  onClick={() => void handleApplyRecommendation(slot)}
                  className={primaryActionClassName}
                  disabled={savingSlot === slot.id || !slot.canApplyRecommendation}
                >
                  <RefreshCw className={cn("h-4 w-4", savingSlot === slot.id ? "animate-spin" : "")} />
                  {savingSlot === slot.id ? "保存中..." : slot.plan.actionLabel}
                </ActionButton>
              ) : null}

              {slot.plan.actionType === "edit" && slot.plan.actionSeriesId ? (
                <ActionButton onClick={() => openSeriesEditor(slot.plan.actionSeriesId)}>
                  <BookOpen className="h-4 w-4" />
                  {slot.plan.actionLabel}
                </ActionButton>
              ) : null}

              {slot.plan.actionType === "copy" ? (
                <ActionButton onClick={() => void handleCopyIds(`${slot.label} 备选方案`, slot.plan.actionIds)}>
                  <Copy className="h-4 w-4" />
                  {slot.plan.actionLabel}
                </ActionButton>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </SurfacePanel>
  );
}

export function HeroCandidatesSection(props) {
  const { heroCandidates, getReaderProof, openSeriesEditor, openSeriesPreview, handleCopyIds } = props;

  return (
    <SurfacePanel appearance="light" accent="amber" className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">主视觉挑选</p>
          <h2 className="text-[1.35rem] font-semibold tracking-tight text-slate-950">主视觉候选作品</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">这些作品最接近首页最强曝光位，适合优先做主视觉编排。</p>
        </div>
        <Star className="mt-1 h-5 w-5 text-amber-500" />
      </div>

      {heroCandidates.length === 0 ? (
        <EmptyState title="当前还没有足够稳的主视觉候选" description="先把封面、署名、简介和章节补稳。" />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {heroCandidates.map(({ series, score, reasons }) => {
            const readiness = getAdminSeriesReadiness(series);
            const creatorName = resolveSeriesCreatorName(series);

            return (
              <article
                key={series.id}
                className="rounded-[28px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,247,249,0.92))] px-5 py-5 shadow-[0_14px_32px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[1.25rem] font-semibold tracking-tight text-slate-950">{series.title}</h3>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getToneClasses(readiness.tone)}`}>
                    {readiness.statusLabel}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-[color:var(--gush-border)] bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                    候选分 {Math.round(score)}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {creatorName ? `署名：${creatorName}` : "署名待补"} | {series.type === "novel" ? "小说" : "漫画"} |{" "}
                  {formatSeriesStatusLabel(series.status)} | 更新于 {formatDateLabel(series.updatedAt)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {reasons.map((reason) => (
                    <span
                      key={`${series.id}-${reason}`}
                      className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                    >
                      {reason}
                    </span>
                  ))}
                  {readiness.missingItems.slice(0, 2).map((item) => (
                    <span
                      key={`${series.id}-${item.id}`}
                      className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700"
                    >
                      缺：{item.label}
                    </span>
                  ))}
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <MiniMetric label="章节数" value={series.episodeCount} />
                  <MiniMetric label="内容基础" value={formatCompactNumber(getReaderProof(series))} />
                  <MiniMetric label="就绪分" value={readiness.score} />
                </div>
                <div className={`mt-5 ${actionTrayClassName}`}>
                  <ActionButton onClick={() => openSeriesEditor(series.id)} className={primaryActionClassName}>
                    <BookOpen className="h-4 w-4" />
                    编辑作品
                  </ActionButton>
                  <ActionButton onClick={() => openSeriesPreview(series.id)}>
                    <ArrowUpRight className="h-4 w-4" />
                    查看前台页
                  </ActionButton>
                  <ActionButton onClick={() => void handleCopyIds(series.title, [series.id])}>
                    <Copy className="h-4 w-4" />
                    复制作品编号
                  </ActionButton>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </SurfacePanel>
  );
}
