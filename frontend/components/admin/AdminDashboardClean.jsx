"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, RefreshCw } from "lucide-react";

import SurfacePanel from "@/components/common/SurfacePanel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { apiGet } from "../../lib/apiClient";
import {
  EMPTY_WORKSPACE,
  RANGE_OPTIONS,
  buildInsights,
  buildStatCards,
  normalizeStats,
  pickArray,
} from "./dashboard-clean/utils";
import {
  LoadingView,
  StatCard,
  pillActiveClassName,
  pillIdleClassName,
} from "./dashboard-clean/blocks";
import {
  CommentsQueueSection,
  LatestSeriesSection,
  OrdersQueueSection,
  PendingItemsSection,
  QuickActionsSection,
  SupportQueueSection,
} from "./dashboard-clean/sections";

export default function AdminDashboardClean() {
  const [workspace, setWorkspace] = useState(EMPTY_WORKSPACE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [warning, setWarning] = useState("");
  const [range, setRange] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const query = useMemo(() => {
    if (range === "7days" || range === "30days") {
      const days = range === "7days" ? 7 : 30;
      const end = new Date().toISOString().slice(0, 10);
      const start = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
      return `?from=${start}&to=${end}`;
    }

    return range === "custom" && from && to ? `?from=${from}&to=${to}` : "";
  }, [from, range, to]);

  const loadDashboard = useCallback(async (mode = "initial") => {
    if (mode === "initial") {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const [statsResponse, seriesResponse, supportResponse, ordersResponse, commentsResponse] =
        await Promise.all([
          apiGet(`/api/admin/stats/dashboard${query}`),
          apiGet("/api/admin/series"),
          apiGet("/api/admin/support?page=1&pageSize=5&sortBy=updatedAt&sortOrder=desc"),
          apiGet("/api/admin/orders?page=1&pageSize=5"),
          apiGet("/api/admin/comments"),
        ]);

      const warnings = [
        !statsResponse.ok && "总览统计",
        !seriesResponse.ok && "作品目录",
        !supportResponse.ok && "客服队列",
        !ordersResponse.ok && "订单队列",
        !commentsResponse.ok && "评论列表",
      ].filter(Boolean);

      setWorkspace({
        stats: statsResponse.ok ? normalizeStats(statsResponse.data) : EMPTY_WORKSPACE.stats,
        series: seriesResponse.ok ? pickArray(seriesResponse.data, ["series", "items"]) : [],
        support: supportResponse.ok ? pickArray(supportResponse.data, ["support", "tickets"]) : [],
        orders: ordersResponse.ok ? pickArray(ordersResponse.data, ["orders", "items"]) : [],
        comments: commentsResponse.ok ? pickArray(commentsResponse.data, ["comments", "items"]) : [],
      });

      setWarning(
        warnings.length
          ? `部分数据暂时不可用：${warnings.join("、")}。页面只展示当前拿到的真实后台数据。`
          : "",
      );
    } catch (error) {
      console.error("admin dashboard load failed:", error);
      setWorkspace(EMPTY_WORKSPACE);
      setWarning("仪表盘暂时加载失败，当前没有拿到可展示的后台数据。");
    } finally {
      if (mode === "initial") {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  }, [query]);

  useEffect(() => {
    void loadDashboard("initial");
  }, [loadDashboard]);

  const insights = useMemo(() => buildInsights(workspace.series), [workspace.series]);
  const statCards = useMemo(
    () => buildStatCards(workspace.stats, insights),
    [workspace.stats, insights],
  );

  if (loading) {
    return <LoadingView />;
  }

  return (
    <div className="space-y-6">
      <SurfacePanel appearance="light" tone="highlight" accent="blue">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_300px]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              运营总览
            </p>
            <h2 className="mt-3 text-[2rem] font-semibold tracking-tight text-slate-950 sm:text-[2.45rem]">
              先清待处理，再看趋势。
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
              草稿、缺署名、缺封面和缺章节，决定前台看起来是不是可信。
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {[
                `已上线 ${insights.published}`,
                `草稿 ${insights.drafts}`,
                `待补署名 ${insights.missingCredits}`,
                `待补封面 ${insights.missingCovers}`,
              ].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[color:var(--gush-border)] bg-white px-3 py-1.5 text-sm font-semibold text-slate-700"
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <Button type="button" onClick={() => void loadDashboard("refresh")} disabled={refreshing}>
                <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
                {refreshing ? "刷新中..." : "刷新数据"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const rows = [
                    ["指标", "总量", "最近 7 天变化"],
                    ...statCards.map((item) => [item.label, item.value, item.detail]),
                  ];
                  const blob = new Blob(
                    [`\ufeff${rows.map((row) => row.join(",")).join("\n")}`],
                    { type: "text/csv;charset=utf-8;" },
                  );
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = `admin-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
                  link.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="size-4" />
                导出总览
              </Button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRange(option.value)}
                  className={range === option.value ? pillActiveClassName : pillIdleClassName}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {range === "custom" ? (
              <div className="mt-4 flex flex-wrap gap-3">
                {[
                  { label: "开始日期", value: from, onChange: setFrom },
                  { label: "结束日期", value: to, onChange: setTo },
                ].map((field) => (
                  <label key={field.label} className="text-sm text-slate-600">
                    <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {field.label}
                    </span>
                    <input
                      type="date"
                      value={field.value}
                      onChange={(event) => field.onChange(event.target.value)}
                      className="rounded-full border border-[color:var(--gush-border)] bg-white px-4 py-2.5 text-sm text-slate-950 outline-none transition focus:border-[color:var(--gush-border-strong)]"
                    />
                  </label>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid gap-3">
            <StatCard
              label="当前最该先看"
              value={`${insights.drafts + insights.missingCredits + insights.missingCovers}`}
              detail="草稿、缺署名和缺封面是最先要清掉的入口。"
              accent
            />
            <StatCard
              label="最近工单"
              value={`${workspace.support.length}`}
              detail={workspace.support.length > 0 ? "客服队列里已经有真实工单。" : "当前没有新工单。"}
            />
            <StatCard
              label="最新评论"
              value={`${workspace.comments.length}`}
              detail={workspace.comments.length > 0 ? "最新评论已经进入后台。" : "当前没有新评论。"}
            />
          </div>
        </div>
      </SurfacePanel>

      {warning ? (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50/90 px-4 py-4 text-sm leading-6 text-amber-800">
          {warning}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {statCards.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </div>

      <PendingItemsSection insights={insights} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(300px,0.88fr)]">
        <LatestSeriesSection latestUpdated={insights.latestUpdated} />
        <QuickActionsSection />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <SupportQueueSection support={workspace.support} />
        <OrdersQueueSection orders={workspace.orders} />
        <CommentsQueueSection comments={workspace.comments} />
      </div>
    </div>
  );
}
