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
  { value: 'createdAt', label: 'Created time' },
  { value: 'price', label: 'Price' },
  { value: 'points', label: 'Points' },
  { value: 'name', label: 'Package name' },
  { value: 'active', label: 'Status' },
];

function toNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value) {
  if (!value) {
    return 'Not available';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Not available';
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
      return 'Demo mode';
    case 'provider':
      return 'Live provider mode';
    default:
      return 'Not configured';
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
      setFeedback({ type: 'success', message: 'The selected top-up packages were removed.' });
      refetch();
    },
    onError: (mutationError) => {
      setFeedback({ type: 'error', message: `Could not remove the selected packages: ${mutationError.message}` });
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
    { label: 'Billing mode', value: getBillingModeLabel(billingAvailability?.billingMode) },
    { label: 'Purchase actions', value: billingAvailability?.purchaseActionsEnabled ? 'Enabled' : 'Preview only' },
    { label: 'Subscription actions', value: billingAvailability?.subscriptionActionsEnabled ? 'Enabled' : 'Preview only' },
    { label: 'Refund actions', value: billingAvailability?.refundActionsEnabled ? 'Enabled' : 'Preview only' },
  ];

  const membershipSnapshotItems = [
    {
      label: 'Best value pack',
      value: packageSummary.bestDensity
        ? `${packageSummary.bestDensity.name} 路 ${packageSummary.bestDensity.value.toFixed(1)} pts/${packageSummary.bestDensity.currency}`
        : 'Not available',
    },
    {
      label: 'Largest package',
      value: packageSummary.largest
        ? `${packageSummary.largest.name || packageSummary.largest.id} 路 ${formatPoints(toNumber(packageSummary.largest.points) || toNumber(packageSummary.largest.paidPts) + toNumber(packageSummary.largest.bonusPts))} pts`
        : 'Not available',
    },
    { label: 'Highest member discount', value: `${planSummary.maxDiscount}%` },
    { label: 'Daily free unlocks', value: String(planSummary.maxDailyFree) },
    { label: 'Monthly voucher points', value: formatPoints(planSummary.maxVoucher) },
  ];

  return (
    <AdminShell
      title="Billing"
      subtitle="Keep commerce readable: top-up inventory, membership coverage, and the switches that affect what readers can actually buy."
    >
      <div className="space-y-6">
        <div className="grid gap-4 xl:grid-cols-4">
          <AdminMetricCard
            label="Packages in view"
            value={String(packageSummary.totalCount)}
            detail="Top-up packages currently visible in this directory."
            tone="accent"
          />
          <AdminMetricCard
            label="Active packages"
            value={String(packageSummary.activeCount)}
            detail="Packages still available to readers or operators."
          />
          <AdminMetricCard
            label="Highest bonus"
            value={formatPoints(packageSummary.highestBonus)}
            detail="The largest bonus point amount on a single package."
          />
          <AdminMetricCard
            label="Active memberships"
            value={String(planSummary.activeCount)}
            detail="Membership tiers currently marked active."
          />
        </div>

        <AdminFeedbackBanner
          feedback={feedback}
          onDismiss={() => setFeedback({ type: '', message: '' })}
        />

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <AdminPageSection
            title="Billing snapshot"
            description="Show the operating mode and the actions that are actually available before anyone starts changing package inventory."
          >
            <AdminKeyValueList items={billingSnapshotItems} />
          </AdminPageSection>

          <AdminPageSection
            title="Membership snapshot"
            description="Keep the member value story short: discount, free unlocks, and voucher support."
          >
            <AdminKeyValueList items={membershipSnapshotItems} />
          </AdminPageSection>
        </div>

        <AdminPageSection
          title="Top-up packages"
          description="This list should answer the basics first: what the package is, what readers pay, how many points it yields, and whether it is still active."
        >
          <AdminListToolbar
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            searchPlaceholder="Search package ID, name, or label"
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
              {bulkDeleteMutation.isPending ? 'Removing...' : 'Delete packages'}
            </Button>
          </AdminSelectionBar>

          <AdminTableShell
            isError={isError}
            errorMessage={error?.message || 'Billing packages could not be loaded.'}
            onRetry={refetch}
            isLoading={isLoading}
            hasItems={packages.length > 0}
            emptyMessage="No top-up packages match this view yet."
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
                      aria-label="Select all packages"
                    />
                  </th>
                  <th className="px-4 py-3">Package</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Points</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
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
                          aria-label={`Select package ${pkg.id}`}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-950">{pkg.name || pkg.label || 'Untitled package'}</div>
                        <div className="mt-1 text-xs text-slate-500">{pkg.id}</div>
                      </td>
                      <td className="px-4 py-4 text-slate-700">{formatCurrency(pkg.price, pkg.currency)}</td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-950">{formatPoints(totalPoints)} pts</div>
                        <div className="mt-1 text-xs text-slate-500">
                          Paid {formatPoints(pkg.paidPts || pkg.points || 0)} 路 Bonus {formatPoints(pkg.bonusPts || 0)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <AdminBadge tone={getStatusTone(isActive)}>{isActive ? 'Active' : 'Paused'}</AdminBadge>
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
          title="Sort packages"
          label="Sort by"
          actionLabel="Apply"
        />

        <ConfirmDialog
          isOpen={isDeleteConfirmOpen}
          title="Delete packages"
          message={`Delete ${selectedIds.length} selected package${selectedIds.length === 1 ? '' : 's'}?`}
          confirmText="Delete"
          cancelText="Cancel"
          isDangerous={true}
          isLoading={bulkDeleteMutation.isPending}
          onConfirm={() => bulkDeleteMutation.mutate(selectedIds)}
          onCancel={() => setIsDeleteConfirmOpen(false)}
        />
      </div>
    </AdminShell>
  );
}

