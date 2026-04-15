"use client";

import { Plus, Trash2 } from "lucide-react";

import { AdminDataState } from "@/components/admin/common/AdminDataState";
import {
  AdminBadge,
  AdminFormField,
  AdminMetricCard,
  AdminPageSection,
  adminSelectClassName,
} from "@/components/admin/common/AdminWorkspacePrimitives";
import { Button } from "@/components/ui/button";

import { RecommendationCard, SlotIdentity } from "./blocks";
import {
  formatDateTime,
  formatNumber,
  formatPercent,
  formatRankingTypeLabel,
  formatSeriesTypeLabel,
  formatTimeRangeLabel,
  getStorefrontSlotDisplayMeta,
} from "./utils";

export function RecommendationsStatsSection({ cards }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {cards.map((card) => (
        <AdminMetricCard key={card.label} {...card} />
      ))}
    </div>
  );
}

export function SlotsSection({ slotsQuery, slots, onOpenCreateModal, onOpenDeleteModal }) {
  return (
    <AdminPageSection
      title="推荐位"
      description="把入口和作品组合收清楚。"
      action={
        <Button type="button" onClick={() => onOpenCreateModal("slot")}>
          <Plus className="size-4" />
          新建推荐位
        </Button>
      }
    >
      <AdminDataState
        isLoading={slotsQuery.isLoading}
        hasData={slots.length > 0}
        emptyMessage={slotsQuery.isError ? slotsQuery.errorMessage : "还没有推荐位。"}
        wrap={false}
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {slots.map((slot) => {
            const seriesIds = Array.isArray(slot.seriesIds) ? slot.seriesIds : [];
            const slotMeta = getStorefrontSlotDisplayMeta(slot.slot || slot.name);

            return (
            <RecommendationCard
              key={slot.id}
              title={slotMeta.label}
              description={slotMeta.hint}
                meta={<AdminBadge tone="accent">{seriesIds.length} 部作品</AdminBadge>}
                footer={
                  <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">更新于 {formatDateTime(slot.updatedAt)}</p>
                  <Button
                    type="button"
                    variant="destructive"
                      size="sm"
                      onClick={() => onOpenDeleteModal("slot", slot)}
                    >
                      <Trash2 className="size-4" />
                      删除
                    </Button>
                  </div>
                }
              >
                <SlotIdentity slotMeta={slotMeta} itemId={slot.id} hint="" />
                <div className="mt-4 flex flex-wrap gap-2">
                  {seriesIds.length > 0 ? (
                    seriesIds.map((seriesId) => (
                      <span
                        key={`${slot.id}-${seriesId}`}
                        className="rounded-full border border-[color:var(--gush-border)] bg-white px-3 py-1 text-xs text-slate-600 shadow-[0_4px_12px_rgba(15,23,42,0.025)]"
                      >
                        {seriesId}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500">还没有分配作品。</span>
                  )}
                </div>
              </RecommendationCard>
            );
          })}
        </div>
      </AdminDataState>
    </AdminPageSection>
  );
}

export function RankingsSection({ rankingsQuery, rankings, onOpenCreateModal, onOpenDeleteModal }) {
  return (
    <AdminPageSection
      title="榜单规则"
      description="把策略和范围收清楚。"
      action={
        <Button type="button" onClick={() => onOpenCreateModal("ranking")}>
          <Plus className="size-4" />
          新建榜单规则
        </Button>
      }
    >
      <AdminDataState
        isLoading={rankingsQuery.isLoading}
        hasData={rankings.length > 0}
        emptyMessage={rankingsQuery.isError ? rankingsQuery.errorMessage : "还没有榜单规则。"}
        wrap={false}
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {rankings.map((ranking) => (
            <RecommendationCard
              key={ranking.id}
              title={ranking.name || "未命名榜单规则"}
              description={`${formatRankingTypeLabel(ranking.rankingType)} · ${formatTimeRangeLabel(
                ranking.timeRange,
              )} · ${formatSeriesTypeLabel(ranking.seriesType)}`}
              meta={
                <AdminBadge tone={ranking.active ? "success" : "default"}>
                  {ranking.active ? "启用中" : "已暂停"}
                </AdminBadge>
              }
              footer={
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">更新于 {formatDateTime(ranking.updatedAt)}</p>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => onOpenDeleteModal("ranking", ranking)}
                  >
                    <Trash2 className="size-4" />
                    删除
                  </Button>
                </div>
              }
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[22px] border border-[color:var(--gush-border)] bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.03)]">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">最大作品数</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{ranking.maxItems || 0}</p>
                </div>
                <div className="rounded-[22px] border border-[color:var(--gush-border)] bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.03)]">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">适用范围</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">
                    {ranking.adult ? "允许 18+ 内容" : "普通内容"}
                  </p>
                </div>
              </div>
            </RecommendationCard>
          ))}
        </div>
      </AdminDataState>
    </AdminPageSection>
  );
}

export function AnalyticsSection({
  analyticsQuery,
  analytics,
  analyticsSummary,
  averageCtr,
  averageConversionRate,
  analyticsSlotFilter,
  analyticsFilterOptions,
  selectedAnalyticsSlotMeta,
  onAnalyticsSlotFilterChange,
}) {
  return (
    <AdminPageSection
      title="推荐位表现分析"
      description="按推荐位筛选，再看曝光、点击和转化。"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard
            label="曝光"
            value={formatNumber(analyticsSummary.impressions)}
            detail="当前已加载记录。"
            tone="accent"
          />
          <AdminMetricCard
            label="详情访问"
            value={formatNumber(analyticsSummary.views)}
            detail="进入作品详情页的次数。"
          />
          <AdminMetricCard label="点击" value={formatNumber(analyticsSummary.clicks)} detail="推荐位点击量。" />
          <AdminMetricCard label="转化" value={formatNumber(analyticsSummary.conversions)} detail="被跟踪到的下游动作。" />
        </div>
        <div className="rounded-[26px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,247,249,0.92))] p-5 shadow-[0_14px_32px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02]">
          <AdminFormField label="推荐位筛选">
            <select
              id="analytics-slot-filter"
              value={analyticsSlotFilter}
              onChange={(event) => onAnalyticsSlotFilterChange(event.target.value)}
              className={adminSelectClassName}
            >
              {analyticsFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </AdminFormField>
          {selectedAnalyticsSlotMeta ? (
            <div className="mt-4">
              <SlotIdentity slotMeta={selectedAnalyticsSlotMeta} hint={selectedAnalyticsSlotMeta.hint} />
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-slate-600">
              先选一个推荐位。
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <AdminMetricCard
          label="平均点击率"
          value={formatPercent(averageCtr)}
          detail="点击数 / 曝光数。"
        />
        <AdminMetricCard
          label="平均转化率"
          value={formatPercent(averageConversionRate)}
          detail="转化数 / 点击数。"
        />
      </div>

      <div className="mt-6">
        <AdminDataState
          isLoading={analyticsQuery.isLoading}
          hasData={analytics.length > 0}
          emptyMessage={analyticsQuery.isError ? analyticsQuery.errorMessage : "当前筛选下没有分析记录。"}
          wrap={false}
        >
          <div className="overflow-hidden rounded-[28px] border border-[color:var(--gush-border)] bg-white shadow-[0_14px_32px_rgba(15,23,42,0.032)] ring-1 ring-black/[0.02]">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-[color:var(--gush-page-bg-muted)] text-left text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-4 py-4">日期</th>
                    <th className="px-4 py-4">推荐位</th>
                    <th className="px-4 py-4">作品</th>
                    <th className="px-4 py-4">曝光</th>
                    <th className="px-4 py-4">详情访问</th>
                    <th className="px-4 py-4">点击</th>
                    <th className="px-4 py-4">转化</th>
                    <th className="px-4 py-4">点击率</th>
                    <th className="px-4 py-4">转化率</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.map((item) => {
                    const slotMeta = getStorefrontSlotDisplayMeta(item.slot || item.slotId);
                    return (
                      <tr
                        key={item.id}
                        className="border-t border-[color:var(--gush-border)] text-sm text-slate-700 transition hover:bg-[color:var(--gush-page-bg-muted)]"
                      >
                        <td className="px-4 py-4">{formatDateTime(item.date)}</td>
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-950">{slotMeta.label}</p>
                            <p className="text-xs text-slate-500">{slotMeta.token}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4 font-mono text-xs text-slate-600">
                          {item.seriesId || "未知作品"}
                        </td>
                        <td className="px-4 py-4">{formatNumber(item.impressions)}</td>
                        <td className="px-4 py-4">{formatNumber(item.views)}</td>
                        <td className="px-4 py-4">{formatNumber(item.clicks)}</td>
                        <td className="px-4 py-4">{formatNumber(item.conversions)}</td>
                        <td className="px-4 py-4">{formatPercent(item.ctr)}</td>
                        <td className="px-4 py-4">{formatPercent(item.conversionRate)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </AdminDataState>
      </div>
    </AdminPageSection>
  );
}
