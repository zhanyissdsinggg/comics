"use client";

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
} from "@/components/admin/common/AdminWorkspacePrimitives";

import {
  EMPTY_MESSAGE,
  formatCount,
  formatCurrency,
  formatLabel,
  formatPercentage,
} from "./utils";

export function RevenueSummaryCards({ stats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <AdminMetricCard label="总营收" value={stats ? formatCurrency(stats.totalRevenue) : "--"} detail="当前时间范围内的支付成功总收入。" tone="accent" />
      <AdminMetricCard label="支付成功订单" value={stats ? formatCount(stats.totalOrders) : "--"} detail="当前营收快照里计入的订单数量。" />
      <AdminMetricCard label="客单价" value={stats ? formatCurrency(stats.avgOrderValue) : "--"} detail="快速判断订单质量，不只看订单数量。" />
      <AdminMetricCard label="净营收" value={stats ? formatCurrency(stats.netRevenue) : "--"} detail="扣除退款金额后的剩余收入。" />
    </div>
  );
}

export function RevenueRangeSection({ tabs, viewMode, meta, dateRange, onViewModeChange, onDateRangeChange }) {
  return (
    <AdminPageSection
      title="查看范围"
      description="切换视角和时间窗口时，页面保持清楚、轻量、可读，不回到通用 BI 仪表盘写法。"
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-end">
        <div className="space-y-3">
          <AdminTabs items={tabs} value={viewMode} onChange={onViewModeChange} />
          <p className="text-sm leading-6 text-slate-500">{meta.description}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <AdminFormField label="开始日期">
            <input
              id="revenue-start-date"
              type="date"
              value={dateRange.startDate}
              onChange={(event) => onDateRangeChange("startDate", event.target.value)}
              className={adminInputClassName}
            />
          </AdminFormField>
          <AdminFormField label="结束日期">
            <input
              id="revenue-end-date"
              type="date"
              value={dateRange.endDate}
              onChange={(event) => onDateRangeChange("endDate", event.target.value)}
              className={adminInputClassName}
            />
          </AdminFormField>
        </div>
      </div>
    </AdminPageSection>
  );
}

export function RevenueOverviewSection({ overviewLoading, hasOverviewData, stats, userValue, orderStatus }) {
  return (
    <AdminDataState isLoading={overviewLoading} hasData={hasOverviewData} emptyMessage={EMPTY_MESSAGE} wrap={false}>
      <div className="space-y-6">
        {stats ? (
          <AdminPageSection title="收入总览" description="在当前时间窗口内，先把收入、退款和订单质量读清楚。">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <AdminMetricCard label="总收入" value={formatCurrency(stats.totalRevenue)} detail="退款前的支付成功收入。" tone="accent" />
              <AdminMetricCard label="订单总数" value={formatCount(stats.totalOrders)} detail="当前快照里统计到的订单数。" />
              <AdminMetricCard label="平均订单金额" value={formatCurrency(stats.avgOrderValue)} detail="支付成功订单的平均金额。" />
              <AdminMetricCard label="退款金额" value={formatCurrency(stats.totalRefunded)} detail="同一时间范围内发生的退款总额。" />
              <AdminMetricCard label="净收入" value={formatCurrency(stats.netRevenue)} detail="扣除退款后真正留下的收入。" />
            </div>
          </AdminPageSection>
        ) : null}

        {userValue ? (
          <AdminPageSection title="付费读者层级" description="按照累计消费做一个轻量分层，帮助判断读者价值结构。">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <AdminMetricCard label="高价值" value={formatCount(userValue.highValue)} detail="累计消费最强的一批读者。" tone="accent" />
              <AdminMetricCard label="中价值" value={formatCount(userValue.mediumValue)} detail="处在中间消费带的读者。" />
              <AdminMetricCard label="低价值" value={formatCount(userValue.lowValue)} detail="已付费但还未进入中段的读者。" />
              <AdminMetricCard label="未付费" value={formatCount(userValue.noValue)} detail="当前没有记录到消费的读者。" />
            </div>
          </AdminPageSection>
        ) : null}

        {orderStatus ? (
          <AdminPageSection title="订单结果结构" description="让订单健康度保持可读，这样客服和商业判断才建立在真实结果上。">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <AdminMetricCard label="待完成" value={formatCount(orderStatus.pending)} detail="仍在等待支付完成的订单。" />
              <AdminMetricCard label="已支付" value={formatCount(orderStatus.paid)} detail="已经成功完成支付的订单。" tone="accent" />
              <AdminMetricCard label="失败" value={formatCount(orderStatus.failed)} detail="支付失败或被拒付的订单。" />
              <AdminMetricCard label="已退款" value={formatCount(orderStatus.refunded)} detail="后续完成退款的订单。" />
            </div>
          </AdminPageSection>
        ) : null}
      </div>
    </AdminDataState>
  );
}

export function RevenueTrendSection({ trendLoading, trend }) {
  return (
    <AdminDataState isLoading={trendLoading} hasData={trend.length > 0} emptyMessage={EMPTY_MESSAGE} wrap={false}>
      <AdminPageSection title="收入趋势" description="按天看收入和支付完成订单的变化。">
        <AdminDataTable>
          <table className="w-full text-sm">
            <AdminTableHeader>
              <tr>
                <th className="px-4 py-4">日期</th>
                <th className="px-4 py-4">收入</th>
                <th className="px-4 py-4">支付成功订单</th>
              </tr>
            </AdminTableHeader>
            <tbody>
              {trend.map((item) => (
                <AdminTableRow key={item.date}>
                  <td className="px-4 py-4 text-slate-700">{item.date}</td>
                  <td className="px-4 py-4 text-slate-700">{formatCurrency(item.revenue)}</td>
                  <td className="px-4 py-4 text-slate-700">{formatCount(item.orders)}</td>
                </AdminTableRow>
              ))}
            </tbody>
          </table>
        </AdminDataTable>
      </AdminPageSection>
    </AdminDataState>
  );
}

export function RevenueChannelsSection({ channelsLoading, channels }) {
  return (
    <AdminDataState isLoading={channelsLoading} hasData={channels.length > 0} emptyMessage={EMPTY_MESSAGE} wrap={false}>
      <AdminPageSection title="渠道表现" description="比较不同支付或购买渠道带来的收入，不把页面做成密密麻麻的仪表盘。">
        <AdminDataTable>
          <table className="w-full text-sm">
            <AdminTableHeader>
              <tr>
                <th className="px-4 py-4">渠道</th>
                <th className="px-4 py-4">订单数</th>
                <th className="px-4 py-4">收入</th>
                <th className="px-4 py-4">平均订单金额</th>
              </tr>
            </AdminTableHeader>
            <tbody>
              {channels.map((item) => (
                <AdminTableRow key={item.channel}>
                  <td className="px-4 py-4 text-slate-700">{formatLabel(item.channel)}</td>
                  <td className="px-4 py-4 text-slate-700">{formatCount(item.orders)}</td>
                  <td className="px-4 py-4 text-slate-700">{formatCurrency(item.revenue)}</td>
                  <td className="px-4 py-4 text-slate-700">{formatCurrency(item.avgOrderValue)}</td>
                </AdminTableRow>
              ))}
            </tbody>
          </table>
        </AdminDataTable>
      </AdminPageSection>
    </AdminDataState>
  );
}

export function RevenuePromotionsSection({
  promotionsLoading,
  promotions,
  promotionsRoiAvailable,
  promotionsAttributionModel,
  promotionsAttributionCopy,
}) {
  return (
    <AdminDataState isLoading={promotionsLoading} hasData={promotions.length > 0} emptyMessage={EMPTY_MESSAGE} wrap={false}>
      <AdminPageSection
        title="活动表现"
        description="把活动结果和归因限制同时说明白，避免看起来像后台自己编出了完整效果。"
      >
        {!promotionsRoiAvailable || promotionsAttributionModel ? (
          <div className="mb-5 rounded-[24px] border border-[color:var(--gush-border)] bg-white px-4 py-4 text-sm leading-6 text-slate-600 shadow-[0_8px_18px_rgba(15,23,42,0.025)] ring-1 ring-black/[0.015]">
            {promotionsAttributionCopy}
          </div>
        ) : null}

        <AdminDataTable>
          <table className="w-full text-sm">
            <AdminTableHeader>
              <tr>
                <th className="px-4 py-4">活动</th>
                <th className="px-4 py-4">订单数</th>
                <th className="px-4 py-4">收入</th>
                <th className="px-4 py-4">投入产出比</th>
                <th className="px-4 py-4">状态</th>
              </tr>
            </AdminTableHeader>
            <tbody>
              {promotions.map((item) => (
                <AdminTableRow key={item.promotionId}>
                  <td className="px-4 py-4 text-slate-700">{item.title}</td>
                  <td className="px-4 py-4 text-slate-700">{formatCount(item.orders)}</td>
                  <td className="px-4 py-4 text-slate-700">{formatCurrency(item.revenue)}</td>
                  <td className="px-4 py-4 text-slate-700">{formatPercentage(item.roi)}</td>
                  <td className="px-4 py-4">
                    <AdminBadge tone={item.active ? "success" : "default"}>
                      {item.active ? "进行中" : "已停用"}
                    </AdminBadge>
                  </td>
                </AdminTableRow>
              ))}
            </tbody>
          </table>
        </AdminDataTable>
      </AdminPageSection>
    </AdminDataState>
  );
}
