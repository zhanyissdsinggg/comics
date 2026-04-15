"use client";

import { Plus, RefreshCw } from "lucide-react";

import { AdminDataState } from "@/components/admin/common/AdminDataState";
import {
  AdminBadge,
  AdminDataTable,
  AdminFormField,
  AdminMetricCard,
  AdminPageSection,
  AdminTableHeader,
  AdminTableRow,
  AdminTabs,
  adminInputClassName,
  adminSelectClassName,
  adminTextareaClassName,
} from "@/components/admin/common/AdminWorkspacePrimitives";
import { Button } from "@/components/ui/button";

import {
  formatCampaignStatusLabel,
  formatCampaignTypeLabel,
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
  formatSegmentLabel,
  getCampaignMetrics,
  getStatusTone,
} from "./utils";

export function MarketingSummaryCards({ metricSnapshot }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <AdminMetricCard label="当前活动" value={formatNumber(metricSnapshot.totalCampaigns)} detail="当前工作区内活动总数。" tone="accent" />
      <AdminMetricCard label="进行中" value={formatNumber(metricSnapshot.activeCampaigns)} detail="仍在运行或排期内的活动。" />
      <AdminMetricCard label="当前预算" value={formatCurrency(metricSnapshot.totalBudget)} detail="所选时间范围内的计划预算。" />
      <AdminMetricCard label="平均投入产出比" value={formatPercent(metricSnapshot.avgRoi)} detail="快速判断当前活动效果。" />
    </div>
  );
}

export function MarketingControlsSection({
  tabs,
  viewMode,
  tabContentMeta,
  dateRange,
  onViewModeChange,
  onRangeValueChange,
  onRefresh,
  onOpenCreate,
}) {
  return (
    <AdminPageSection
      title="活动控制"
      description="切换视图、调整时间范围并新建活动。"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={onRefresh}>
            <RefreshCw className="size-4" />
            刷新
          </Button>
          <Button type="button" onClick={onOpenCreate}>
            <Plus className="size-4" />
            新建活动
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-end">
        <div className="space-y-3">
          <AdminTabs items={tabs} value={viewMode} onChange={onViewModeChange} />
          <p className="text-sm leading-6 text-slate-500">{tabContentMeta.description}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <AdminFormField label="开始日期">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(event) => onRangeValueChange("startDate", event.target.value)}
              max={dateRange.endDate || undefined}
              className={adminInputClassName}
            />
          </AdminFormField>
          <AdminFormField label="结束日期">
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(event) => onRangeValueChange("endDate", event.target.value)}
              min={dateRange.startDate || undefined}
              className={adminInputClassName}
            />
          </AdminFormField>
        </div>
      </div>
    </AdminPageSection>
  );
}

export function MarketingCampaignsSection({
  campaignsQuery,
  campaigns,
  onOpenDelete,
  deletePending,
  selectedCampaignId,
}) {
  return (
    <AdminDataState
      isLoading={campaignsQuery.isLoading}
      hasData={campaigns.length > 0}
      emptyMessage="当前视图下还没有可用的活动。"
      wrap={false}
    >
      <AdminDataTable>
        <table className="min-w-full text-sm">
          <AdminTableHeader>
            <tr>
              <th className="px-4 py-4">活动</th>
              <th className="px-4 py-4">状态</th>
              <th className="px-4 py-4">受众</th>
              <th className="px-4 py-4">排期</th>
              <th className="px-4 py-4">预算</th>
              <th className="px-4 py-4">结果</th>
              <th className="px-4 py-4 text-right">操作</th>
            </tr>
          </AdminTableHeader>
          <tbody>
            {campaigns.map((campaign) => {
              const metric = getCampaignMetrics(campaign);
              const schedule =
                campaign.startDate || campaign.endDate
                  ? `${formatDate(campaign.startDate, "任意时间")} 至 ${formatDate(campaign.endDate, "未结束")}`
                  : "未安排";

              return (
                <AdminTableRow key={campaign.id || campaign.name}>
                  <td className="px-4 py-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-950">{campaign.name || "未命名活动"}</p>
                        <AdminBadge tone="default">{formatCampaignTypeLabel(campaign.type)}</AdminBadge>
                      </div>
                      {campaign.description ? (
                        <p className="max-w-md text-sm leading-6 text-slate-600">{campaign.description}</p>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <AdminBadge tone={getStatusTone(campaign.status)}>
                      {formatCampaignStatusLabel(campaign.status)}
                    </AdminBadge>
                  </td>
                  <td className="px-4 py-4 text-slate-700">
                    <div className="space-y-1">
                      <p>{formatSegmentLabel(campaign.targetSegment)}</p>
                      <p className="text-xs text-slate-500">创建于 {formatDate(campaign.createdAt, "未知")}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-700">{schedule}</td>
                  <td className="px-4 py-4 text-slate-700">
                    <div className="space-y-1">
                      <p>预算 {formatCurrency(campaign.budget)}</p>
                      <p className="text-xs text-slate-500">已花费 {formatCurrency(campaign.spent)}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-700">
                    <div className="space-y-1">
                      <p>收入 {formatCurrency(metric.revenue)}</p>
                      <p className="text-xs text-slate-500">
                        {formatNumber(metric.converted)} 次转化，投入产出比 {formatPercent(metric.roi)}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => onOpenDelete(campaign)}
                      disabled={deletePending}
                    >
                      {deletePending && selectedCampaignId === campaign.id ? "正在删除..." : "删除"}
                    </Button>
                  </td>
                </AdminTableRow>
              );
            })}
          </tbody>
        </table>
      </AdminDataTable>
    </AdminDataState>
  );
}

export function MarketingStatsSection({ statsQuery, stats }) {
  return (
    <AdminDataState
      isLoading={statsQuery.isLoading}
      hasData={Boolean(stats)}
      emptyMessage="当前时间范围内还没有可用的营销表现汇总。"
      wrap={false}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AdminMetricCard label="活动总数" value={formatNumber(stats?.totalCampaigns)} detail="当前时间窗口内统计到的活动数量。" tone="accent" />
        <AdminMetricCard label="进行中活动" value={formatNumber(stats?.activeCampaigns)} detail="当前时间窗口内仍在进行的活动。" />
        <AdminMetricCard label="总预算" value={formatCurrency(stats?.totalBudget)} detail="计划投入预算。" />
        <AdminMetricCard label="已花费" value={formatCurrency(stats?.totalSpent)} detail="目前已实际发生的花费。" />
        <AdminMetricCard label="归因收入" value={formatCurrency(stats?.totalRevenue)} detail="当前已归因到活动的收入。" />
        <AdminMetricCard label="平均投入产出比" value={formatPercent(stats?.avgRoi)} detail={`累计 ${formatNumber(stats?.totalConverted)} 次转化`} />
      </div>
    </AdminDataState>
  );
}

export function MarketingSegmentsSection({ segmentsQuery, segments }) {
  return (
    <AdminDataState
      isLoading={segmentsQuery.isLoading}
      hasData={segments.length > 0}
      emptyMessage="当前时间范围内还没有人群表现数据。"
      wrap={false}
    >
      <div className="grid gap-4 xl:grid-cols-2">
        {segments.map((segment) => (
          <div
            key={segment.segment || "unknown"}
            className="rounded-[28px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,247,249,0.92))] p-5 shadow-[0_14px_32px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02]"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">人群</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">{formatSegmentLabel(segment.segment)}</h3>
              </div>
              <AdminBadge tone="default">{formatNumber(segment.count)} 个活动</AdminBadge>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <AdminMetricCard label="预算" value={formatCurrency(segment.budget)} detail="计划投入。" />
              <AdminMetricCard label="已花费" value={formatCurrency(segment.spent)} detail="实际花费。" />
              <AdminMetricCard label="收入" value={formatCurrency(segment.revenue)} detail="已归因收入。" tone="accent" />
              <AdminMetricCard label="转化" value={formatNumber(segment.converted)} detail="完成结果数。" />
            </div>
          </div>
        ))}
      </div>
    </AdminDataState>
  );
}

export function MarketingTypesSection({ typesQuery, types }) {
  return (
    <AdminDataState
      isLoading={typesQuery.isLoading}
      hasData={types.length > 0}
      emptyMessage="当前时间范围内还没有类型级别的营销表现数据。"
      wrap={false}
    >
      <AdminDataTable>
        <table className="min-w-full text-sm">
          <AdminTableHeader>
            <tr>
              <th className="px-4 py-4">类型</th>
              <th className="px-4 py-4">活动数</th>
              <th className="px-4 py-4">预算</th>
              <th className="px-4 py-4">已花费</th>
              <th className="px-4 py-4">收入</th>
              <th className="px-4 py-4">转化</th>
            </tr>
          </AdminTableHeader>
          <tbody>
            {types.map((typeRow) => (
              <AdminTableRow key={typeRow.type || "unknown"}>
                <td className="px-4 py-4 font-medium text-slate-950">{formatCampaignTypeLabel(typeRow.type)}</td>
                <td className="px-4 py-4 text-slate-700">{formatNumber(typeRow.count)}</td>
                <td className="px-4 py-4 text-slate-700">{formatCurrency(typeRow.budget)}</td>
                <td className="px-4 py-4 text-slate-700">{formatCurrency(typeRow.spent)}</td>
                <td className="px-4 py-4 text-slate-700">{formatCurrency(typeRow.revenue)}</td>
                <td className="px-4 py-4 text-slate-700">{formatNumber(typeRow.converted)}</td>
              </AdminTableRow>
            ))}
          </tbody>
        </table>
      </AdminDataTable>
    </AdminDataState>
  );
}

export function CreateCampaignModalContent({
  formData,
  setFormValue,
  segmentOptions,
  typeOptions,
  statusOptions,
  onCancel,
  onSubmit,
  isPending,
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <AdminFormField label="活动名称">
          <input
            value={formData.name}
            onChange={(event) => setFormValue("name", event.target.value)}
            className={adminInputClassName}
            placeholder="春季回流活动"
          />
        </AdminFormField>

        <AdminFormField label="受众人群">
          <select
            value={formData.targetSegment}
            onChange={(event) => setFormValue("targetSegment", event.target.value)}
            className={adminSelectClassName}
          >
            {segmentOptions.map((option) => (
              <option key={option} value={option}>
                {formatSegmentLabel(option)}
              </option>
            ))}
          </select>
        </AdminFormField>

        <AdminFormField label="活动类型">
          <select
            value={formData.type}
            onChange={(event) => setFormValue("type", event.target.value)}
            className={adminSelectClassName}
          >
            {typeOptions.map((option) => (
              <option key={option} value={option}>
                {formatCampaignTypeLabel(option)}
              </option>
            ))}
          </select>
        </AdminFormField>

        <AdminFormField label="状态">
          <select
            value={formData.status}
            onChange={(event) => setFormValue("status", event.target.value)}
            className={adminSelectClassName}
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {formatCampaignStatusLabel(option)}
              </option>
            ))}
          </select>
        </AdminFormField>

        <AdminFormField label="预算">
          <input
            value={formData.budget}
            onChange={(event) => setFormValue("budget", event.target.value)}
            className={adminInputClassName}
            inputMode="decimal"
            placeholder="1500"
          />
        </AdminFormField>

        <AdminFormField label="开始日期">
          <input
            type="date"
            value={formData.startDate}
            onChange={(event) => setFormValue("startDate", event.target.value)}
            className={adminInputClassName}
          />
        </AdminFormField>

        <AdminFormField label="结束日期">
          <input
            type="date"
            value={formData.endDate}
            onChange={(event) => setFormValue("endDate", event.target.value)}
            className={adminInputClassName}
          />
        </AdminFormField>
      </div>

      <AdminFormField label="备注">
        <textarea
          value={formData.description}
          onChange={(event) => setFormValue("description", event.target.value)}
          rows={5}
          className={adminTextareaClassName}
          placeholder="简要写清这次活动想推动什么，以及运营需要重点观察什么。"
        />
      </AdminFormField>

      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="button" onClick={onSubmit} disabled={isPending}>
          {isPending ? "正在创建..." : "创建活动"}
        </Button>
      </div>
    </div>
  );
}
