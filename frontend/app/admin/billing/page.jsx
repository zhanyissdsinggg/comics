'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useMemo, useState } from 'react';

import AdminShell from '@/components/admin/AdminShell';
import { AdminFeedbackBanner } from '@/components/admin/common/AdminFeedbackBanner';
import { AdminListToolbar } from '@/components/admin/common/AdminListToolbar';
import { AdminSelectionBar } from '@/components/admin/common/AdminSelectionBar';
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog';
import { AdminSortModal } from '@/components/admin/common/AdminSortModal';
import { AdminTableShell } from '@/components/admin/common/AdminTableShell';
import {
  AdminBadge,
  AdminKeyValueList,
  AdminMetricCard,
  AdminPageSection,
  AdminTableHeader,
  AdminTableRow,
} from '@/components/admin/common/AdminWorkspacePrimitives';
import { Button } from '@/components/ui/button';
import { apiGet } from '@/lib/apiClient';
import { useAdminList } from '@/lib/hooks/useAdminList';
import { useBulkDelete } from '@/lib/hooks/useBulkMutation';
import { normalizeUSDisplayCurrency } from '@/lib/localization';

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
  { value: 'points', label: '点数' },
  { value: 'name', label: '套餐名称' },
  { value: 'active', label: '状态' },
];

function toNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value) {
  if (!value) {
    return '暂无';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '暂无';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function formatCurrency(value, currency = 'USD') {
  const amount = toNumber(value);
  const normalizedCurrency = normalizeUSDisplayCurrency(currency);

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
      return '正式支付模式';
    default:
      return '未配置';
  }
}

function getStatusTone(isActive) {
  return isActive ? 'success' : 'default';
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
      setFeedback({ type: 'error', message: `删除所选充值套餐失败：${mutationError.message}` });
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
        const currentLargestTotal = summary.largest
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
        activeCount: 0,
        maxDiscount: 0,
        maxDailyFree: 0,
        maxVoucher: 0,
      };
    }

    return plans.reduce(
      (summary, plan) => {
        if (plan.active !== false) {
          summary.activeCount += 1;
        }

        summary.maxDiscount = Math.max(summary.maxDiscount, toNumber(plan.discountPct));
        summary.maxDailyFree = Math.max(summary.maxDailyFree, toNumber(plan.dailyFreeUnlocks));
        summary.maxVoucher = Math.max(summary.maxVoucher, toNumber(plan.voucherPts));

        return summary;
      },
      {
        activeCount: 0,
        maxDiscount: 0,
        maxDailyFree: 0,
        maxVoucher: 0,
      },
    );
  }, [plans]);

  const billingSnapshotItems = [
    { label: '计费模式', value: getBillingModeLabel(billingAvailability?.billingMode) },
    { label: '购买操作', value: billingAvailability?.purchaseActionsEnabled ? '已启用' : '仅预览' },
    { label: '订阅操作', value: billingAvailability?.subscriptionActionsEnabled ? '已启用' : '仅预览' },
    { label: '退款操作', value: billingAvailability?.refundActionsEnabled ? '已启用' : '仅预览' },
  ];

  const membershipSnapshotItems = [
    {
      label: '最划算套餐',
      value: packageSummary.bestDensity
        ? `${packageSummary.bestDensity.name} · ${packageSummary.bestDensity.value.toFixed(1)} 点/${packageSummary.bestDensity.currency}`
        : '暂无',
    },
    {
      label: '最大面额套餐',
      value: packageSummary.largest
        ? `${packageSummary.largest.name || packageSummary.largest.id} · ${formatPoints(toNumber(packageSummary.largest.points) || toNumber(packageSummary.largest.paidPts) + toNumber(packageSummary.largest.bonusPts))} 点`
        : '暂无',
    },
    { label: '最高会员折扣', value: `${planSummary.maxDiscount}%` },
    { label: '每日免费解锁', value: String(planSummary.maxDailyFree) },
    { label: '每月代金券点数', value: formatPoints(planSummary.maxVoucher) },
  ];

  return (
    <AdminShell
      title="充值与会员"
      subtitle="把充值套餐、会员方案和支付开关收在一个清爽工作区里，先看读者现在到底能买什么。"
    >
      <div className="space-y-6">
        <div className="grid gap-4 xl:grid-cols-4">
          <AdminMetricCard
            label="当前套餐"
            value={String(packageSummary.totalCount)}
            detail="当前列表里可见的充值套餐数量。"
            tone="accent"
          />
          <AdminMetricCard
            label="已启用套餐"
            value={String(packageSummary.activeCount)}
            detail="仍对读者或运营开放的套餐。"
          />
          <AdminMetricCard
            label="最高赠送"
            value={formatPoints(packageSummary.highestBonus)}
            detail="单个套餐里赠送点数最高的一档。"
          />
          <AdminMetricCard
            label="已启用会员方案"
            value={String(planSummary.activeCount)}
            detail="当前仍标记为启用的会员层级。"
          />
        </div>

        <AdminFeedbackBanner
          feedback={feedback}
          onDismiss={() => setFeedback({ type: '', message: '' })}
        />

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <AdminPageSection
            title="支付状态概览"
            description="先确认当前运行模式和真实可用操作，再去调整套餐和会员设置。"
          >
            <AdminKeyValueList items={billingSnapshotItems} />
          </AdminPageSection>

          <AdminPageSection
            title="会员方案概览"
            description="用最短的信息看清会员价值：折扣、免费解锁和代金券支持。"
          >
            <AdminKeyValueList items={membershipSnapshotItems} />
          </AdminPageSection>
        </div>

        <AdminPageSection
          title="充值套餐"
          description="先回答最重要的几个问题：套餐是什么、读者付多少钱、可得多少点数、当前是否仍在售。"
        >
          <AdminListToolbar
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            searchPlaceholder="搜索套餐 ID、名称或标签"
            onOpenFilters={() => setIsSortModalOpen(true)}
            sortOrder={sortOrder}
            onToggleSortOrder={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          />

          <AdminSelectionBar selectedCount={selectedIds.length} onClear={clearSelection}>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setIsDeleteConfirmOpen(true)}
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? '正在删除...' : '删除套餐'}
            </Button>
          </AdminSelectionBar>

          <AdminTableShell
            isError={isError}
            errorMessage={error?.message || '充值套餐加载失败。'}
            onRetry={refetch}
            isLoading={isLoading}
            hasItems={packages.length > 0}
            emptyMessage="当前视图下还没有匹配的充值套餐。"
            pagination={pagination}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          >
            <table className="min-w-full text-sm">
              <AdminTableHeader>
                <tr>
                  <th className="px-4 py-3 text-left">
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
                      className="rounded"
                      aria-label="选择全部套餐"
                    />
                  </th>
                  <th className="px-4 py-3">套餐</th>
                  <th className="px-4 py-3">价格</th>
                  <th className="px-4 py-3">点数</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3">创建时间</th>
                </tr>
              </AdminTableHeader>
              <tbody>
                {packages.map((pkg) => {
                  const totalPoints = toNumber(pkg.points) || toNumber(pkg.paidPts) + toNumber(pkg.bonusPts);
                  const isActive = pkg.active !== false;

                  return (
                    <AdminTableRow key={pkg.id}>
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIdsSet.has(pkg.id)}
                          onChange={() => toggleSelect(pkg.id)}
                          className="rounded"
                          aria-label={`选择套餐 ${pkg.id}`}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-950">{pkg.name || pkg.label || '未命名套餐'}</div>
                        <div className="mt-1 text-xs text-slate-500">{pkg.id}</div>
                      </td>
                      <td className="px-4 py-4 text-slate-700">{formatCurrency(pkg.price, pkg.currency)}</td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-950">{formatPoints(totalPoints)} 点</div>
                        <div className="mt-1 text-xs text-slate-500">
                          付费 {formatPoints(pkg.paidPts || pkg.points || 0)} 点 · 赠送 {formatPoints(pkg.bonusPts || 0)} 点
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <AdminBadge tone={getStatusTone(isActive)}>{isActive ? '启用中' : '已暂停'}</AdminBadge>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{formatDate(pkg.createdAt)}</td>
                    </AdminTableRow>
                  );
                })}
              </tbody>
            </table>
          </AdminTableShell>
        </AdminPageSection>

        <AdminSortModal
          isOpen={isSortModalOpen}
          onClose={() => setIsSortModalOpen(false)}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          options={sortOptions}
          title="排序套餐"
          label="排序方式"
          actionLabel="应用"
        />

        <ConfirmDialog
          isOpen={isDeleteConfirmOpen}
          title="删除套餐"
          message={`确定删除所选 ${selectedIds.length} 个套餐吗？`}
          confirmText="删除"
          cancelText="取消"
          isDangerous={true}
          isLoading={bulkDeleteMutation.isPending}
          onConfirm={() => bulkDeleteMutation.mutate(selectedIds)}
          onCancel={() => setIsDeleteConfirmOpen(false)}
        />
      </div>
    </AdminShell>
  );
}
