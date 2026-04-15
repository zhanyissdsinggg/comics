'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';

import AdminShell from '@/components/admin/AdminShell';
import {
  BillingPackagesSection,
  BillingSnapshotSection,
  BillingSummaryCards,
} from '@/components/admin/billing-workspace/sections';
import {
  buildBillingMetricCards,
  buildBillingSnapshotItems,
  buildMembershipSnapshotItems,
  buildPackageSummary,
  buildPlanSummary,
  searchFields,
  sortFields,
  sortOptions,
} from '@/components/admin/billing-workspace/utils';
import { AdminFeedbackBanner } from '@/components/admin/common/AdminFeedbackBanner';
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog';
import { AdminSortModal } from '@/components/admin/common/AdminSortModal';
import { apiGet } from '@/lib/apiClient';
import { useAdminList } from '@/lib/hooks/useAdminList';
import { useBulkDelete } from '@/lib/hooks/useBulkMutation';

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

  const packageSummary = useMemo(() => buildPackageSummary(packages), [packages]);
  const planSummary = useMemo(() => buildPlanSummary(plans), [plans]);
  const metricCards = useMemo(
    () => buildBillingMetricCards(packageSummary, planSummary),
    [packageSummary, planSummary],
  );
  const billingSnapshotItems = useMemo(
    () => buildBillingSnapshotItems(billingAvailability),
    [billingAvailability],
  );
  const membershipSnapshotItems = useMemo(
    () => buildMembershipSnapshotItems(packageSummary, planSummary),
    [packageSummary, planSummary],
  );

  return (
    <AdminShell title="充值与会员" subtitle="查看套餐、会员方案和可售状态。">
      <div className="space-y-6">
        <BillingSummaryCards cards={metricCards} />

        <AdminFeedbackBanner
          feedback={feedback}
          onDismiss={() => setFeedback({ type: '', message: '' })}
        />

        <BillingSnapshotSection
          billingSnapshotItems={billingSnapshotItems}
          membershipSnapshotItems={membershipSnapshotItems}
        />

        <BillingPackagesSection
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          sortOrder={sortOrder}
          onToggleSortOrder={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          onOpenSortModal={() => setIsSortModalOpen(true)}
          selectedIds={selectedIds}
          clearSelection={clearSelection}
          onOpenDeleteConfirm={() => setIsDeleteConfirmOpen(true)}
          deletePending={bulkDeleteMutation.isPending}
          isError={isError}
          errorMessage={error?.message || '充值套餐加载失败。'}
          onRetry={refetch}
          isLoading={isLoading}
          hasItems={packages.length > 0}
          pagination={pagination}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          packages={packages}
          selectedIdsSet={selectedIdsSet}
          onSelectAll={(checked) => {
            if (checked) {
              selectAll(packages);
              return;
            }
            clearSelection();
          }}
          onToggleSelect={toggleSelect}
        />

        <AdminSortModal
          isOpen={isSortModalOpen}
          onClose={() => setIsSortModalOpen(false)}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          options={sortOptions}
          title="套餐排序"
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
