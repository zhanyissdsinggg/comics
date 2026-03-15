'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useMemo, useState } from 'react';

import { AdminFeedbackBanner } from '@/components/admin/common/AdminFeedbackBanner';
import { AdminListToolbar } from '@/components/admin/common/AdminListToolbar';
import { AdminSelectionBar } from '@/components/admin/common/AdminSelectionBar';
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog';
import { AdminSortModal } from '@/components/admin/common/AdminSortModal';
import { AdminTableShell } from '@/components/admin/common/AdminTableShell';
import { apiGet } from '@/lib/apiClient';
import { useAdminList } from '@/lib/hooks/useAdminList';
import { useBulkDelete } from '@/lib/hooks/useBulkMutation';

const searchFields = [
  { field: 'id', type: 'string' },
  { field: 'name', type: 'string' },
  { field: 'label', type: 'string' },
];

const sortFields = [
  { field: 'createdAt', type: 'date' },
  { field: 'price', type: 'number' },
  { field: 'points', type: 'number' },
  { field: 'name', type: 'string' },
  { field: 'active', type: 'boolean' },
];

const sortOptions = [
  { value: 'createdAt', label: '创建时间' },
  { value: 'price', label: '价格' },
  { value: 'points', label: '总点数' },
  { value: 'name', label: '套餐名称' },
  { value: 'active', label: '启用状态' },
];

function toNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function formatCurrency(value, currency = 'USD') {
  const amount = toNumber(value);
  const normalizedCurrency = typeof currency === 'string' && currency.trim() ? currency : 'USD';

  try {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: normalizedCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${normalizedCurrency} ${amount.toFixed(2)}`;
  }
}

function formatPoints(value) {
  return new Intl.NumberFormat('zh-CN').format(toNumber(value));
}

function getBillingModeLabel(mode) {
  switch (String(mode || '').toLowerCase()) {
    case 'demo':
      return '演示模式';
    case 'provider':
      return '真实支付接入态';
    default:
      return '未识别';
  }
}

function getAvailabilityMeta(enabled) {
  return enabled
    ? {
        label: '已开放',
        className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100',
      }
    : {
        label: '预览中',
        className: 'border-amber-500/20 bg-amber-500/10 text-amber-100',
      };
}

export default function AdminBillingPage() {
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [billingAvailability, setBillingAvailability] = useState(null);
  const [plans, setPlans] = useState([]);

  const {
    items: packages,
    pagination,
    page,
    setPage,
    pageSize,
    setPageSize,
    isLoading,
    isError,
    error,
    refetch,
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
  } = useAdminList('billing', searchFields, sortFields, 'createdAt', 'desc');

  useEffect(() => {
    let mounted = true;

    const loadOverview = async () => {
      const [topupsResponse, plansResponse] = await Promise.all([
        apiGet('/api/billing/topups'),
        apiGet('/api/billing/plans'),
      ]);

      if (!mounted) {
        return;
      }

      if (topupsResponse.ok) {
        setBillingAvailability(topupsResponse.data?.billing || null);
      }

      if (plansResponse.ok && Array.isArray(plansResponse.data?.plans)) {
        setPlans(plansResponse.data.plans);
      }
    };

    void loadOverview();

    return () => {
      mounted = false;
    };
  }, []);

  const selectedIdsSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const bulkDeleteMutation = useBulkDelete('billing', {
    onSuccess: () => {
      clearSelection();
      setIsDeleteConfirmOpen(false);
      setFeedback({ type: 'success', message: '已删除所选充值套餐。' });
      refetch();
    },
    onError: (mutationError) => {
      setFeedback({ type: 'error', message: `删除失败：${mutationError.message}` });
    },
  });

  const packageSummary = useMemo(() => {
    if (!packages.length) {
      return {
        totalCount: 0,
        activeCount: 0,
        highestBonus: 0,
        cheapest: null,
        largest: null,
        bestDensity: null,
      };
    }

    return packages.reduce(
      (summary, pkg) => {
        const totalPoints = toNumber(pkg.points) || toNumber(pkg.paidPts) + toNumber(pkg.bonusPts);
        const price = toNumber(pkg.price);
        const density = price > 0 ? totalPoints / price : 0;
        const currentLargestTotal =
          summary.largest
            ? toNumber(summary.largest.points) || toNumber(summary.largest.paidPts) + toNumber(summary.largest.bonusPts)
            : 0;

        summary.totalCount += 1;

        if (pkg.active !== false) {
          summary.activeCount += 1;
        }

        summary.highestBonus = Math.max(summary.highestBonus, toNumber(pkg.bonusPts));

        if (!summary.cheapest || (price > 0 && price < toNumber(summary.cheapest.price))) {
          summary.cheapest = pkg;
        }

        if (!summary.largest || totalPoints > currentLargestTotal) {
          summary.largest = pkg;
        }

        if (!summary.bestDensity || density > summary.bestDensity.value) {
          summary.bestDensity = {
            name: pkg.name || pkg.label || pkg.id,
            value: density,
            currency: pkg.currency || 'USD',
          };
        }

        return summary;
      },
      {
        totalCount: 0,
        activeCount: 0,
        highestBonus: 0,
        cheapest: null,
        largest: null,
        bestDensity: null,
      },
    );
  }, [packages]);

  const planSummary = useMemo(() => {
    if (!plans.length) {
      return {
        totalCount: 0,
        activeCount: 0,
        maxDiscount: 0,
        maxDailyFree: 0,
        maxVoucher: 0,
      };
    }

    return plans.reduce(
      (summary, plan) => {
        summary.totalCount += 1;

        if (plan.active !== false) {
          summary.activeCount += 1;
        }

        summary.maxDiscount = Math.max(summary.maxDiscount, toNumber(plan.discountPct));
        summary.maxDailyFree = Math.max(summary.maxDailyFree, toNumber(plan.dailyFreeUnlocks));
        summary.maxVoucher = Math.max(summary.maxVoucher, toNumber(plan.voucherPts));

        return summary;
      },
      {
        totalCount: 0,
        activeCount: 0,
        maxDiscount: 0,
        maxDailyFree: 0,
        maxVoucher: 0,
      },
    );
  }, [plans]);

  const availabilityCards = useMemo(
    () => [
      {
        title: '购买动作',
        detail: '前台点券购买按钮',
        ...getAvailabilityMeta(billingAvailability?.purchaseActionsEnabled === true),
      },
      {
        title: '订阅动作',
        detail: '会员开通与取消',
        ...getAvailabilityMeta(billingAvailability?.subscriptionActionsEnabled === true),
      },
      {
        title: '退款动作',
        detail: '订单自助退款入口',
        ...getAvailabilityMeta(billingAvailability?.refundActionsEnabled === true),
      },
    ],
    [billingAvailability],
  );

  const handleBulkDelete = () => {
    bulkDeleteMutation.mutate(selectedIds);
  };

  return (
    <div className="min-h-screen bg-neutral-950 p-6 text-neutral-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-neutral-500">后台 · 计费</p>
          <h1 className="text-3xl font-semibold tracking-tight text-white">计费套餐总览</h1>
          <p className="max-w-3xl text-sm leading-6 text-neutral-400">
            这里把点券套餐、会员联动、支付开关和售后风险放到同一个视图里，方便你快速判断当前商业闭环是否合理。
          </p>
        </section>

        <AdminFeedbackBanner
          feedback={feedback}
          onDismiss={() => setFeedback({ type: '', message: '' })}
          dismissLabel="关闭"
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">点券套餐</p>
            <p className="mt-3 text-3xl font-semibold text-white">{packageSummary.totalCount}</p>
            <p className="mt-2 text-sm text-neutral-400">当前已配置的充值套餐总数。</p>
          </div>
          <div className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">启用中</p>
            <p className="mt-3 text-3xl font-semibold text-white">{packageSummary.activeCount}</p>
            <p className="mt-2 text-sm text-neutral-400">仍然在前台可售或可见的套餐数量。</p>
          </div>
          <div className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">最高赠点</p>
            <p className="mt-3 text-3xl font-semibold text-white">{formatPoints(packageSummary.highestBonus)}</p>
            <p className="mt-2 text-sm text-neutral-400">单个方案中赠送点数的上限。</p>
          </div>
          <div className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">会员档位</p>
            <p className="mt-3 text-3xl font-semibold text-white">{planSummary.activeCount}</p>
            <p className="mt-2 text-sm text-neutral-400">活跃会员档位，最高折扣 {planSummary.maxDiscount}% 。</p>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.2fr_1fr_0.9fr]">
          <div className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">套餐结构</p>
            <h2 className="mt-3 text-xl font-semibold text-white">前台价值感是否讲清楚</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4">
                <p className="text-xs text-neutral-500">最低起购</p>
                <p className="mt-2 text-sm font-medium text-white">
                  {packageSummary.cheapest
                    ? `${packageSummary.cheapest.name || packageSummary.cheapest.id} · ${formatCurrency(packageSummary.cheapest.price, packageSummary.cheapest.currency)}`
                    : '-'}
                </p>
              </div>
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4">
                <p className="text-xs text-neutral-500">最大总点数</p>
                <p className="mt-2 text-sm font-medium text-white">
                  {packageSummary.largest
                    ? `${packageSummary.largest.name || packageSummary.largest.id} · ${formatPoints(toNumber(packageSummary.largest.points) || toNumber(packageSummary.largest.paidPts) + toNumber(packageSummary.largest.bonusPts))} 点`
                    : '-'}
                </p>
              </div>
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4">
                <p className="text-xs text-neutral-500">点数密度最高</p>
                <p className="mt-2 text-sm font-medium text-white">
                  {packageSummary.bestDensity
                    ? `${packageSummary.bestDensity.name} · ${packageSummary.bestDensity.value.toFixed(1)} 点/${packageSummary.bestDensity.currency}`
                    : '-'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">会员联动</p>
            <h2 className="mt-3 text-xl font-semibold text-white">点券和会员不能割裂看</h2>
            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4">
                <p className="text-xs text-neutral-500">最高折扣</p>
                <p className="mt-2 font-medium text-white">{planSummary.maxDiscount}% 解锁折扣</p>
              </div>
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4">
                <p className="text-xs text-neutral-500">每日免费</p>
                <p className="mt-2 font-medium text-white">{planSummary.maxDailyFree} 章 / 日</p>
              </div>
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4">
                <p className="text-xs text-neutral-500">月度赠点</p>
                <p className="mt-2 font-medium text-white">{planSummary.maxVoucher} 点</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">风控与售后</p>
            <h2 className="mt-3 text-xl font-semibold text-white">支付开关必须清楚</h2>
            <p className="mt-3 text-sm leading-6 text-neutral-400">
              当前支付模式：<span className="font-medium text-white">{getBillingModeLabel(billingAvailability?.billingMode)}</span>
            </p>
            <div className="mt-4 space-y-3">
              {availabilityCards.map((item) => (
                <div
                  key={item.title}
                  className={`rounded-2xl border px-4 py-3 ${item.className}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">{item.title}</span>
                    <span className="text-xs font-semibold uppercase tracking-[0.2em]">{item.label}</span>
                  </div>
                  <p className="mt-2 text-xs text-current/80">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="rounded-3xl border border-neutral-800 bg-neutral-950/90 p-4 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7)]">
          <AdminListToolbar
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            searchPlaceholder="搜索套餐 ID、名称或标签"
            onOpenFilters={() => setIsSortModalOpen(true)}
            sortOrder={sortOrder}
            onToggleSortOrder={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="mb-0"
          />
        </div>

        <AdminSelectionBar selectedCount={selectedIds.length} onClear={clearSelection} clearLabel="清空选择">
          <button
            type="button"
            onClick={() => setIsDeleteConfirmOpen(true)}
            disabled={bulkDeleteMutation.isPending}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {bulkDeleteMutation.isPending ? '删除中...' : '删除套餐'}
          </button>
        </AdminSelectionBar>

        <AdminTableShell
          isError={isError}
          errorMessage={error?.message || '充值套餐加载失败。'}
          onRetry={refetch}
          isLoading={isLoading}
          hasItems={packages.length > 0}
          emptyMessage="暂无充值套餐。"
          pagination={pagination}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          containerClassName="overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950/90 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7)]"
          paginationProps={{
            containerClassName:
              'flex flex-col gap-3 border-t border-neutral-800 bg-neutral-900/70 px-4 py-4 text-sm text-neutral-400 lg:flex-row lg:items-center lg:justify-between',
            pageSizeSelectClassName:
              'rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none',
            buttonClassName:
              'rounded-xl border border-neutral-700 px-3 py-2 text-sm text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50',
          }}
        >
          <table className="min-w-full divide-y divide-neutral-800 text-sm">
            <thead className="bg-neutral-900/90 text-left text-xs uppercase tracking-[0.16em] text-neutral-500">
              <tr>
                <th className="px-4 py-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === packages.length && packages.length > 0}
                    onChange={(event) => {
                      if (event.target.checked) {
                        selectAll(packages);
                        return;
                      }

                      clearSelection();
                    }}
                    className="h-4 w-4 rounded border-neutral-700 bg-neutral-900"
                    aria-label="选择全部充值套餐"
                  />
                </th>
                <th className="px-4 py-4">套餐信息</th>
                <th className="px-4 py-4">定价</th>
                <th className="px-4 py-4">点数结构</th>
                <th className="px-4 py-4">标签与状态</th>
                <th className="px-4 py-4">创建时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {packages.map((pkg) => {
                const isActive = pkg.active !== false;
                const paidPts = toNumber(pkg.paidPts);
                const bonusPts = toNumber(pkg.bonusPts);
                const totalPoints = toNumber(pkg.points) || paidPts + bonusPts;
                const bonusRate = paidPts > 0 ? Math.round((bonusPts / paidPts) * 100) : 0;
                const density = toNumber(pkg.price) > 0 ? totalPoints / toNumber(pkg.price) : 0;

                return (
                  <tr key={pkg.id} className="align-top transition hover:bg-neutral-900/70">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIdsSet.has(pkg.id)}
                        onChange={() => toggleSelect(pkg.id)}
                        className="h-4 w-4 rounded border-neutral-700 bg-neutral-900"
                        aria-label={`选择套餐 ${pkg.id}`}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-2">
                        <div className="font-medium text-white">{pkg.name || pkg.label || '未命名套餐'}</div>
                        <div className="text-xs text-neutral-500">ID：{pkg.id}</div>
                        {pkg.label ? <div className="text-xs text-neutral-400">前台文案：{pkg.label}</div> : null}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-2">
                        <div className="font-medium text-emerald-300">{formatCurrency(pkg.price, pkg.currency)}</div>
                        <div className="text-xs text-neutral-500">币种：{pkg.currency || 'USD'}</div>
                        <div className="text-xs text-neutral-400">
                          点数密度：{density > 0 ? `${density.toFixed(1)} 点/${pkg.currency || 'USD'}` : '-'}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-2">
                        <div className="font-medium text-white">总计 {formatPoints(totalPoints)} 点</div>
                        <div className="text-xs text-neutral-400">
                          付费点数 {formatPoints(paidPts)} · 赠点 {formatPoints(bonusPts)}
                        </div>
                        <div className="text-xs text-neutral-500">
                          赠送比例：{bonusRate > 0 ? `${bonusRate}%` : '无赠点'}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-3">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            isActive
                              ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20'
                              : 'bg-neutral-800 text-neutral-300 ring-1 ring-neutral-700'
                          }`}
                        >
                          {isActive ? '启用中' : '已停用'}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {Array.isArray(pkg.tags) && pkg.tags.length > 0 ? (
                            pkg.tags.map((tag) => (
                              <span
                                key={`${pkg.id}-${tag}`}
                                className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-[11px] text-neutral-300"
                              >
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-[11px] text-neutral-500">
                              无标签
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-neutral-400">{formatDate(pkg.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </AdminTableShell>

        <AdminSortModal
          isOpen={isSortModalOpen}
          onClose={() => setIsSortModalOpen(false)}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          options={sortOptions}
          title="充值套餐排序"
          label="排序字段"
          actionLabel="应用排序"
        />

        <ConfirmDialog
          isOpen={isDeleteConfirmOpen}
          title="删除充值套餐"
          message={`确认删除 ${selectedIds.length} 个选中套餐吗？如果套餐已经关联历史订单，删除操作可能失败。`}
          confirmText={bulkDeleteMutation.isPending ? '删除中...' : '确认删除'}
          cancelText="取消"
          isDangerous={true}
          isLoading={bulkDeleteMutation.isPending}
          onConfirm={handleBulkDelete}
          onCancel={() => setIsDeleteConfirmOpen(false)}
        />
      </div>
    </div>
  );
}
