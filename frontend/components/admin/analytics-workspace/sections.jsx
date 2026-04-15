"use client";

import { AdminDataState } from "@/components/admin/common/AdminDataState";
import { AdminTableShell } from "@/components/admin/common/AdminTableShell";
import {
  AdminBadge,
  AdminDataTable,
  AdminKeyValueList,
  AdminMetricCard,
  AdminPageSection,
  AdminTableHeader,
  AdminTableRow,
} from "@/components/admin/common/AdminWorkspacePrimitives";
import { Button } from "@/components/ui/button";

import {
  buildStatsInsights,
  formatChurnRiskLabel,
  formatCurrency,
  formatDate,
  formatNumber,
  getChurnTone,
  getSegmentLabel,
} from "./utils";

export function AnalyticsStatsSection({ statsQuery, stats, statsCards, getErrorMessage }) {
  const insightCards = buildStatsInsights(stats);

  return (
    <AdminPageSection
      title="读者总览"
      description="看规模、活跃、价值和流失风险。"
    >
      {statsQuery.isError ? (
        <AdminDataState
          isLoading={false}
          hasData={false}
          emptyMessage={getErrorMessage(statsQuery.error, "分析数据加载失败。")}
        />
      ) : (
        <AdminDataState
          isLoading={statsQuery.isLoading}
          hasData={Boolean(stats)}
          emptyMessage="还没有可用的分析数据。"
          wrap={false}
        >
          {() => (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {statsCards.map((card) => (
                  <AdminMetricCard key={card.label} {...card} />
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                {insightCards.map((card) => (
                  <div
                    key={card.title}
                    className="rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4 shadow-[0_8px_18px_rgba(15,23,42,0.025)] ring-1 ring-black/[0.015]"
                  >
                    <p className="text-sm font-semibold text-slate-950">{card.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{card.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </AdminDataState>
      )}
    </AdminPageSection>
  );
}

export function AnalyticsSegmentsSection({
  segmentFilters,
  selectedSegment,
  onSelectSegment,
  segmentsQuery,
  users,
  pagination,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onOpenUser,
  getErrorMessage,
}) {
  return (
    <AdminPageSection
      title="读者分群"
      description="先看分群，再打开账号。"
    >
      <div className="mb-6 flex flex-wrap gap-2 rounded-[24px] border border-[color:var(--gush-border)] bg-white p-3 shadow-[0_10px_22px_rgba(15,23,42,0.03)] ring-1 ring-black/[0.02]">
        {segmentFilters.map((segment) => (
          <button
            key={segment.key}
            type="button"
            data-testid={`admin-analytics-segment-${segment.key}`}
            onClick={() => onSelectSegment(segment.key)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              selectedSegment === segment.key
                ? "border-[color:var(--gush-border-strong)] bg-white text-slate-950 shadow-[0_8px_20px_rgba(15,23,42,0.04)]"
                : "border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]/78 text-slate-600 hover:border-[color:var(--gush-border-strong)] hover:bg-white hover:text-slate-950"
            }`}
          >
            {segment.label}
          </button>
        ))}
      </div>

      <AdminTableShell
        isError={segmentsQuery.isError}
        errorMessage={getErrorMessage(segmentsQuery.error, "读者分群加载失败。")}
        onRetry={() => segmentsQuery.refetch()}
        isLoading={segmentsQuery.isLoading}
        hasItems={users.length > 0}
        emptyMessage="当前分群下没有匹配用户。"
        pagination={pagination}
        page={page}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      >
        <AdminDataTable className="border-0 shadow-none">
          <table className="w-full min-w-[920px]">
            <AdminTableHeader>
              <tr>
                <th className="px-4 py-4">读者</th>
                <th className="px-4 py-4">钱包</th>
                <th className="px-4 py-4">生命周期价值</th>
                <th className="px-4 py-4">浏览作品数</th>
                <th className="px-4 py-4">流失风险</th>
                <th className="px-4 py-4">加入时间</th>
                <th className="px-4 py-4">操作</th>
              </tr>
            </AdminTableHeader>
            <tbody>
              {users.map((segmentUser) => {
                const metrics = segmentUser.userMetrics;
                const behavior = segmentUser.userBehavior;

                return (
                  <AdminTableRow key={segmentUser.id}>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-950">
                          {segmentUser.email || "未填写邮箱"}
                        </p>
                        <p className="text-xs text-slate-500">{segmentUser.id}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {formatNumber(segmentUser.wallet?.coins)}
                    </td>
                    <td className="px-4 py-4 text-slate-600">{formatCurrency(metrics?.ltv)}</td>
                    <td className="px-4 py-4 text-slate-600">
                      {formatNumber(behavior?.seriesViewed)}
                    </td>
                    <td className="px-4 py-4">
                      <AdminBadge tone={getChurnTone(metrics?.churnRisk)}>
                        {formatChurnRiskLabel(metrics?.churnRisk)}
                      </AdminBadge>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{formatDate(segmentUser.createdAt)}</td>
                    <td className="px-4 py-4">
                      <Button type="button" variant="outline" size="sm" onClick={() => onOpenUser(segmentUser.id)}>
                        打开用户
                      </Button>
                    </td>
                  </AdminTableRow>
                );
              })}
            </tbody>
          </table>
        </AdminDataTable>
      </AdminTableShell>
    </AdminPageSection>
  );
}

export function AnalyticsUserDetailSection({
  selectedSegment,
  selectedUserId,
  userDetailQuery,
  analytics,
  getErrorMessage,
  onBack,
}) {
  const user = analytics?.user;
  const ltv = analytics?.ltv;
  const userBehavior = user?.userBehavior;
  const retentionMessage =
    String(analytics?.churnRisk || "").toLowerCase() === "high"
      ? "已出现明显流失信号，建议尽快唤回。"
      : String(analytics?.churnRisk || "").toLowerCase() === "medium"
        ? "活跃度在走软，适合补一次触达。"
        : "近期互动稳定，留存状态健康。";

  return (
    <AdminPageSection
      title="用户详情"
      description={`查看“${getSegmentLabel(selectedSegment)}”分群里的账号表现。`}
      action={
        <Button type="button" variant="outline" onClick={onBack}>
          返回分群
        </Button>
      }
    >
      {userDetailQuery.isError ? (
        <AdminDataState
          isLoading={false}
          hasData={false}
          emptyMessage={getErrorMessage(userDetailQuery.error, "用户详情加载失败。")}
        />
      ) : (
        <AdminDataState
          isLoading={userDetailQuery.isLoading}
          hasData={Boolean(analytics && user)}
          emptyMessage={
            selectedUserId
              ? "没有找到这条用户记录。"
              : "先从上面的分群表格里选择一个读者，再打开深度视图。"
          }
          wrap={false}
        >
          {() => (
            <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
              <div className="space-y-6">
                <div className="rounded-[28px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,247,249,0.92))] p-6 shadow-[0_14px_32px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    用户画像
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                    {user?.email || "未填写邮箱"}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">{user?.id}</p>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <AdminMetricCard
                      label="生命周期价值"
                      value={formatCurrency(ltv?.ltv)}
                      detail={`平均订单金额：${formatCurrency(ltv?.avgOrderValue)}`}
                      tone="accent"
                    />
                    <AdminMetricCard
                      label="累计消费"
                      value={formatCurrency(ltv?.totalSpent)}
                      detail={`共记录 ${formatNumber(ltv?.totalOrders)} 笔订单`}
                    />
                    <AdminMetricCard
                      label="钱包余额"
                      value={formatNumber(user?.wallet?.coins)}
                      detail="点数余额。"
                    />
                    <AdminMetricCard
                      label="活跃评分"
                      value={formatNumber(userBehavior?.activityScore)}
                      detail="根据阅读和互动信号计算。"
                    />
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-[28px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,247,249,0.92))] p-6 shadow-[0_14px_32px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02]">
                    <p className="text-sm font-semibold text-slate-950">消费记录</p>
                    <AdminKeyValueList
                      className="mt-4"
                      items={[
                        { label: "首单时间", value: formatDate(ltv?.firstOrderDate) },
                        { label: "最近订单", value: formatDate(ltv?.lastOrderDate) },
                        { label: "订单数", value: formatNumber(ltv?.totalOrders) },
                        { label: "所在分群", value: getSegmentLabel(selectedSegment) },
                      ]}
                    />
                  </div>
                  <div className="rounded-[28px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,247,249,0.92))] p-6 shadow-[0_14px_32px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02]">
                    <p className="text-sm font-semibold text-slate-950">阅读行为</p>
                    <AdminKeyValueList
                      className="mt-4"
                      items={[
                        { label: "浏览作品数", value: formatNumber(userBehavior?.seriesViewed) },
                        {
                          label: "阅读时长",
                          value: `${formatNumber(
                            Math.round(Number(userBehavior?.readingTime || 0) / 60),
                          )} 分钟`,
                        },
                        { label: "评论数", value: formatNumber(userBehavior?.commentsCount) },
                        { label: "评分数", value: formatNumber(userBehavior?.ratingsCount) },
                        { label: "书签数", value: formatNumber(userBehavior?.bookmarksCount) },
                      ]}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[28px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,247,249,0.92))] p-6 shadow-[0_14px_32px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">留存状态</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        一句话看清流失风险。
                      </p>
                    </div>
                    <AdminBadge tone={getChurnTone(analytics?.churnRisk)}>
                      {formatChurnRiskLabel(analytics?.churnRisk)}
                    </AdminBadge>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-600">{retentionMessage}</p>
                </div>

                <div className="rounded-[28px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,247,249,0.92))] p-6 shadow-[0_14px_32px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02]">
                  <p className="text-sm font-semibold text-slate-950">快速信息</p>
                  <AdminKeyValueList
                    className="mt-4"
                    items={[
                      { label: "加入时间", value: formatDate(user?.createdAt) },
                      { label: "钱包余额", value: formatNumber(user?.wallet?.coins) },
                      { label: "赠送余额", value: formatNumber(user?.wallet?.bonusCoins) },
                      { label: "最近活跃", value: formatDate(userBehavior?.lastActiveAt) },
                    ]}
                  />
                </div>
              </div>
            </div>
          )}
        </AdminDataState>
      )}
    </AdminPageSection>
  );
}
