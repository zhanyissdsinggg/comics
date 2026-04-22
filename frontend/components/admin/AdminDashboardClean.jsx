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
import { LoadingView, StatCard, pillActiveClassName, pillIdleClassName } from "./dashboard-clean/blocks";
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
          ? `部分数据暂时不可用：${warnings.join("、")}。页面会先展示当前拿到的数据。`
          : "",
      );
    } catch (error) {
      console.error("admin dashboard load failed:", error);
      setWorkspace(EMPTY_WORKSPACE);
      setWarning("仪表盘暂时加载失败，当前没有可展示的数据。");
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
  const statCards = useMemo(() => buildStatCards(workspace.stats, insights), [workspace.stats, insights]);

  if (loading) {
    return <LoadingView />;
  }

  return (
    <div className="space-y-6">
      <SurfacePanel appearance="light" tone="highlight" accent="blue">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_300px]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">运营总览</p>
            <h2 className="mt-3 text-[2rem] font-semibold tracking-tight text-slate-950 sm:text-[2.45rem]">
              先把待处理收口，再安排今天的运营动作。
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">
              先把草稿、缺封面、缺署名这些会拖慢上线质量的口子收掉，再去看订单、评论和客服反馈。
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

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-[22px] border border-[color:var(--gush-border)] bg-white/92 px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)] ring-1 ring-black/[0.02]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">作品目录</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">先补齐前台资料</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">封面、署名、章节三项一起看，减少反复跳转。</p>
              </div>
              <div className="rounded-[22px] border border-[color:var(--gush-border)] bg-white/92 px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)] ring-1 ring-black/[0.02]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">客服与评论</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">优先处理最新反馈</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">避免已更新的工单和读者反馈长时间挂起。</p>
              </div>
              <div className="rounded-[22px] border border-[color:var(--gush-border)] bg-white/92 px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)] ring-1 ring-black/[0.02]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">今天建议</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">
                  {insights.drafts > 0 ? "先清草稿再发新内容" : "目录状态稳定，可推进上新"}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {insights.drafts > 0
                    ? "草稿越多，越容易让排期和前台展示脱节。"
                    : "可以把精力放到首页编排和读者反馈上。"}
                </p>
              </div>
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
                    ["指标", "总量", "最近变化"],
                    ...statCards.map((item) => [item.label, item.value, item.detail]),
                  ];
                  const blob = new Blob([`\ufeff${rows.map((row) => row.join(",")).join("\n")}`], {
                    type: "text/csv;charset=utf-8;",
                  });
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

            <div className="mt-6 rounded-[24px] border border-[color:var(--gush-border)] bg-white/92 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)] ring-1 ring-black/[0.02]">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">时间范围</p>
                  <p className="mt-1 text-sm text-slate-600">切换查看窗口，确认近期运营是否在往正确方向走。</p>
                </div>
                <div className="flex flex-wrap gap-2">
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
          </div>

          <div className="grid gap-3">
            <StatCard
              label="当前最该先看"
              value={`${insights.drafts + insights.missingCredits + insights.missingCovers}`}
              detail="先清草稿和资料缺口。"
              accent
            />
            <StatCard
              label="最近工单"
              value={`${workspace.support.length}`}
              detail={workspace.support.length > 0 ? "客服队列有更新。" : "没有新工单。"}
            />
            <StatCard
              label="最新评论"
              value={`${workspace.comments.length}`}
              detail={workspace.comments.length > 0 ? "最新评论已经进入后台。" : "暂无评论。"}
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
