"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { AdminLayout } from "../../../components/admin/AdminLayout";
import {
  RevenueChannelsSection,
  RevenueOverviewSection,
  RevenuePromotionsSection,
  RevenueRangeSection,
  RevenueSummaryCards,
  RevenueTrendSection,
} from "@/components/admin/revenue-workspace/sections";
import {
  loadRevenueResource,
  REVENUE_TABS,
  toDateInputValue,
  viewMeta,
} from "@/components/admin/revenue-workspace/utils";

export default function AdminRevenuePage() {
  const [viewMode, setViewMode] = useState("overview");
  const [dateRange, setDateRange] = useState({
    startDate: toDateInputValue(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    ),
    endDate: toDateInputValue(new Date()),
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["admin", "revenue", "stats", dateRange],
    queryFn: async () => {
      const params = new URLSearchParams(dateRange);
      return loadRevenueResource(`/api/admin/revenue/stats?${params}`, {
        stats: null,
      });
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ["admin", "revenue", "trend", dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({ ...dateRange, groupBy: "day" });
      return loadRevenueResource(`/api/admin/revenue/trend?${params}`, {
        trend: [],
      });
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: channelsData, isLoading: channelsLoading } = useQuery({
    queryKey: ["admin", "revenue", "channels", dateRange],
    queryFn: async () => {
      const params = new URLSearchParams(dateRange);
      return loadRevenueResource(`/api/admin/revenue/channels?${params}`, {
        channels: [],
      });
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: promotionsData, isLoading: promotionsLoading } = useQuery({
    queryKey: ["admin", "revenue", "promotions", dateRange],
    queryFn: async () => {
      const params = new URLSearchParams(dateRange);
      return loadRevenueResource(`/api/admin/revenue/promotions?${params}`, {
        promotions: [],
        attributionModel: null,
        roiAvailable: true,
      });
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: userValueData, isLoading: userValueLoading } = useQuery({
    queryKey: ["admin", "revenue", "user-value-distribution", dateRange],
    queryFn: async () =>
      loadRevenueResource("/api/admin/revenue/user-value-distribution", {
        distribution: null,
      }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: orderStatusData, isLoading: orderStatusLoading } = useQuery({
    queryKey: ["admin", "revenue", "order-status-distribution", dateRange],
    queryFn: async () => {
      const params = new URLSearchParams(dateRange);
      return loadRevenueResource(
        `/api/admin/revenue/order-status-distribution?${params}`,
        {
          distribution: null,
        },
      );
    },
    staleTime: 5 * 60 * 1000,
  });

  const stats = statsData?.stats;
  const trend = trendData?.trend || [];
  const channels = channelsData?.channels || [];
  const promotions = promotionsData?.promotions || [];
  const userValue = userValueData?.distribution;
  const orderStatus = orderStatusData?.distribution;

  const promotionsAttributionModel = promotionsData?.attributionModel;
  const promotionsRoiAvailable = promotionsData?.roiAvailable !== false;
  const promotionsAttributionCopy =
    promotionsAttributionModel === "order_audit"
      ? "当前收入归因来自支付创建时记录的审计元数据。在活动花费归因接线完成前，投入产出比仍会保持不可用。"
      : promotionsAttributionModel === "hybrid_order_audit_and_derived_rules"
        ? "当前收入会优先使用支付创建审计元数据；缺失时再回退到活动规则推导。在活动花费归因接线完成前，投入产出比仍会保持不可用。"
        : "当前收入暂时通过活动规则推导得出。在活动花费归因接线完成前，投入产出比仍会保持不可用。";

  const overviewLoading =
    statsLoading || userValueLoading || orderStatusLoading;
  const hasOverviewData =
    Boolean(stats) || Boolean(userValue) || Boolean(orderStatus);
  const meta = viewMeta(viewMode);

  return (
    <AdminLayout title="营收" subtitle="查看收入、渠道和活动结果。">
      <div className="space-y-6">
        <RevenueSummaryCards stats={stats} />

        <RevenueRangeSection
          tabs={REVENUE_TABS}
          viewMode={viewMode}
          meta={meta}
          dateRange={dateRange}
          onViewModeChange={setViewMode}
          onDateRangeChange={(key, value) =>
            setDateRange((current) => ({ ...current, [key]: value }))
          }
        />

        {viewMode === "overview" ? (
          <RevenueOverviewSection
            overviewLoading={overviewLoading}
            hasOverviewData={hasOverviewData}
            stats={stats}
            userValue={userValue}
            orderStatus={orderStatus}
          />
        ) : null}

        {viewMode === "trend" ? (
          <RevenueTrendSection trendLoading={trendLoading} trend={trend} />
        ) : null}

        {viewMode === "channels" ? (
          <RevenueChannelsSection
            channelsLoading={channelsLoading}
            channels={channels}
          />
        ) : null}

        {viewMode === "promotions" ? (
          <RevenuePromotionsSection
            promotionsLoading={promotionsLoading}
            promotions={promotions}
            promotionsRoiAvailable={promotionsRoiAvailable}
            promotionsAttributionModel={promotionsAttributionModel}
            promotionsAttributionCopy={promotionsAttributionCopy}
          />
        ) : null}
      </div>
    </AdminLayout>
  );
}
