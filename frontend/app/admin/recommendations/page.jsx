'use client';

export const dynamic = 'force-dynamic';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';

import AdminShell from '@/components/admin/AdminShell';
import { AdminFeedbackBanner } from '@/components/admin/common/AdminFeedbackBanner';
import { AdminTabs } from '@/components/admin/common/AdminWorkspacePrimitives';
import { Modal } from '@/components/admin/common/Modal';
import {
  CreateRankingModalContent,
  CreateSlotModalContent,
  DeleteRecommendationContent,
} from '@/components/admin/recommendations-workspace/blocks';
import {
  AnalyticsSection,
  RankingsSection,
  RecommendationsStatsSection,
  SlotsSection,
} from '@/components/admin/recommendations-workspace/sections';
import {
  ANALYTICS_SLOT_FILTER_OPTIONS,
  buildAnalyticsSummary,
  buildRankingPayload,
  buildRecommendationStatCards,
  buildSlotPayload,
  EMPTY_FEEDBACK,
  formatNumber,
  getErrorMessage,
  getStorefrontSlotDisplayMeta,
  getStorefrontSlotPreset,
  INITIAL_RANKING_FORM,
  INITIAL_SLOT_FORM,
  RANKING_TYPE_OPTIONS,
  SERIES_TYPE_OPTIONS,
  STOREFRONT_SLOT_PRESETS,
  TIME_RANGE_OPTIONS,
  VIEW_TABS,
} from '@/components/admin/recommendations-workspace/utils';
import { adminFetchJson } from '@/lib/adminApiClient';

export default function AdminRecommendationsPage() {
  const [activeTab, setActiveTab] = useState('slots');
  const [loadedTabs, setLoadedTabs] = useState({
    slots: true,
    rankings: false,
    analytics: false,
  });
  const [feedback, setFeedback] = useState(EMPTY_FEEDBACK);
  const [createTarget, setCreateTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [slotForm, setSlotForm] = useState(INITIAL_SLOT_FORM);
  const [rankingForm, setRankingForm] = useState(INITIAL_RANKING_FORM);
  const [analyticsSlotFilter, setAnalyticsSlotFilter] = useState('all');

  const handleTabChange = (nextTab) => {
    setActiveTab(nextTab);
    setLoadedTabs((current) =>
      current[nextTab]
        ? current
        : {
            ...current,
            [nextTab]: true,
          },
    );
  };

  const slotsQuery = useQuery({
    queryKey: ['admin', 'recommendations', 'slots'],
    staleTime: 60_000,
    queryFn: async () => {
      const { response, data } = await adminFetchJson('/api/admin/recommendations/slots?limit=100');

      if (!response.ok) {
        throw new Error(data?.message || data?.error || '推荐位加载失败。');
      }

      return {
        items: Array.isArray(data?.slots) ? data.slots : [],
        total: Number(data?.total || 0),
      };
    },
  });

  const rankingsQuery = useQuery({
    queryKey: ['admin', 'recommendations', 'rankings'],
    enabled: loadedTabs.rankings,
    staleTime: 60_000,
    queryFn: async () => {
      const { response, data } = await adminFetchJson('/api/admin/recommendations/rankings?limit=100');

      if (!response.ok) {
        throw new Error(data?.message || data?.error || '榜单规则加载失败。');
      }

      return {
        items: Array.isArray(data?.configs) ? data.configs : [],
        total: Number(data?.total || 0),
      };
    },
  });

  const analyticsQuery = useQuery({
    queryKey: ['admin', 'recommendations', 'analytics', analyticsSlotFilter],
    enabled: loadedTabs.analytics,
    staleTime: 60_000,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('limit', '50');
      if (analyticsSlotFilter !== 'all') {
        params.set('slot', analyticsSlotFilter);
      }

      const { response, data } = await adminFetchJson(
        `/api/admin/recommendations/analytics?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error(data?.message || data?.error || '推荐位分析加载失败。');
      }

      return {
        items: Array.isArray(data?.analytics) ? data.analytics : [],
        total: Number(data?.total || 0),
      };
    },
  });

  const createSlotMutation = useMutation({
    mutationFn: async () => {
      const payload = buildSlotPayload(slotForm);

      if (!payload.slot) {
        throw new Error('推荐位标识不能为空。');
      }

      const { response, data } = await adminFetchJson('/api/admin/recommendations/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(data?.message || data?.error || '创建推荐位失败。');
      }

      return data?.slot || null;
    },
    onSuccess: async () => {
      setCreateTarget(null);
      setSlotForm(INITIAL_SLOT_FORM);
      setFeedback({ type: 'success', message: '推荐位已创建。' });
      await slotsQuery.refetch();
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error, '创建推荐位失败。') });
    },
  });

  const createRankingMutation = useMutation({
    mutationFn: async () => {
      const payload = buildRankingPayload(rankingForm);

      if (!payload.name) {
        throw new Error('榜单名称不能为空。');
      }

      if (!Number.isInteger(payload.maxItems) || payload.maxItems < 1 || payload.maxItems > 200) {
        throw new Error('最大作品数必须在 1 到 200 之间。');
      }

      const { response, data } = await adminFetchJson('/api/admin/recommendations/rankings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(data?.message || data?.error || '创建榜单规则失败。');
      }

      return data?.config || null;
    },
    onSuccess: async () => {
      setCreateTarget(null);
      setRankingForm(INITIAL_RANKING_FORM);
      setFeedback({ type: 'success', message: '榜单规则已创建。' });
      await rankingsQuery.refetch();
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error, '创建榜单规则失败。') });
    },
  });

  const deleteSlotMutation = useMutation({
    mutationFn: async (slotId) => {
      const { response, data } = await adminFetchJson(`/api/admin/recommendations/slots/${slotId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(data?.message || data?.error || '删除推荐位失败。');
      }

      return data;
    },
    onSuccess: async () => {
      setDeleteTarget(null);
      setFeedback({ type: 'success', message: '推荐位已删除。' });
      await slotsQuery.refetch();
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error, '删除推荐位失败。') });
    },
  });

  const deleteRankingMutation = useMutation({
    mutationFn: async (rankingId) => {
      const { response, data } = await adminFetchJson(
        `/api/admin/recommendations/rankings/${rankingId}`,
        {
          method: 'DELETE',
        },
      );

      if (!response.ok) {
        throw new Error(data?.message || data?.error || '删除榜单规则失败。');
      }

      return data;
    },
    onSuccess: async () => {
      setDeleteTarget(null);
      setFeedback({ type: 'success', message: '榜单规则已删除。' });
      await rankingsQuery.refetch();
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error, '删除榜单规则失败。') });
    },
  });

  const slots = slotsQuery.data?.items || [];
  const rankings = rankingsQuery.data?.items || [];
  const analytics = analyticsQuery.data?.items || [];
  const selectedSlotMeta = useMemo(
    () =>
      getStorefrontSlotDisplayMeta(
        slotForm.preset === 'custom' ? slotForm.slotToken : slotForm.preset,
      ),
    [slotForm.preset, slotForm.slotToken],
  );
  const selectedAnalyticsSlotMeta = useMemo(
    () => (analyticsSlotFilter === 'all' ? null : getStorefrontSlotDisplayMeta(analyticsSlotFilter)),
    [analyticsSlotFilter],
  );

  const analyticsSummary = useMemo(() => buildAnalyticsSummary(analytics), [analytics]);
  const averageCtr =
    analyticsSummary.impressions > 0
      ? (analyticsSummary.clicks / analyticsSummary.impressions) * 100
      : 0;
  const averageConversionRate =
    analyticsSummary.clicks > 0
      ? (analyticsSummary.conversions / analyticsSummary.clicks) * 100
      : 0;

  const deleteBusy = deleteSlotMutation.isPending || deleteRankingMutation.isPending;

  const openCreateModal = (target) => {
    setFeedback(EMPTY_FEEDBACK);
    if (target === 'slot') {
      setSlotForm(INITIAL_SLOT_FORM);
    }
    if (target === 'ranking') {
      setRankingForm(INITIAL_RANKING_FORM);
    }
    setCreateTarget(target);
  };

  const handleSlotPresetChange = (nextPreset) => {
    const preset = getStorefrontSlotPreset(nextPreset);
    setSlotForm((current) => ({
      ...current,
      preset: nextPreset,
      slotToken: preset && preset.token !== 'custom' ? preset.token : current.slotToken,
    }));
  };

  const openDeleteModal = (kind, item) => {
    setFeedback(EMPTY_FEEDBACK);
    setDeleteTarget({ kind, item });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget?.item?.id) {
      return;
    }

    if (deleteTarget.kind === 'slot') {
      await deleteSlotMutation.mutateAsync(deleteTarget.item.id);
      return;
    }

    await deleteRankingMutation.mutateAsync(deleteTarget.item.id);
  };

  const statCards = useMemo(
    () =>
      buildRecommendationStatCards({
        slotsTotal: slotsQuery.data?.total || 0,
        rankingsTotal: rankingsQuery.data?.total || 0,
        analyticsTotal: analyticsQuery.data?.total || 0,
        rankingsLoaded: loadedTabs.rankings,
        analyticsLoaded: loadedTabs.analytics,
      }),
    [
      analyticsQuery.data?.total,
      loadedTabs.analytics,
      loadedTabs.rankings,
      rankingsQuery.data?.total,
      slotsQuery.data?.total,
    ],
  );

  return (
    <AdminShell
      title="搜索与发现"
      subtitle="把发现页当成编辑工作来管理：推荐位、榜单规则和表现数据都要真实、克制、可解释。"
    >
      <div className="space-y-6">
        <RecommendationsStatsSection cards={statCards} />

        <AdminFeedbackBanner
          feedback={feedback}
          onDismiss={() => setFeedback(EMPTY_FEEDBACK)}
          dismissAriaLabel="关闭提示"
        />

        <AdminTabs items={VIEW_TABS} value={activeTab} onChange={handleTabChange} />

        {activeTab === 'slots' ? (
          <SlotsSection
            slotsQuery={{
              isLoading: slotsQuery.isLoading,
              isError: slotsQuery.isError,
              errorMessage: slotsQuery.isError
                ? getErrorMessage(slotsQuery.error, '推荐位加载失败。')
                : '',
            }}
            slots={slots}
            onOpenCreateModal={openCreateModal}
            onOpenDeleteModal={openDeleteModal}
          />
        ) : null}

        {activeTab === 'rankings' ? (
          <RankingsSection
            rankingsQuery={{
              isLoading: rankingsQuery.isLoading,
              isError: rankingsQuery.isError,
              errorMessage: rankingsQuery.isError
                ? getErrorMessage(rankingsQuery.error, '榜单规则加载失败。')
                : '',
            }}
            rankings={rankings}
            onOpenCreateModal={openCreateModal}
            onOpenDeleteModal={openDeleteModal}
          />
        ) : null}

        {activeTab === 'analytics' ? (
          <AnalyticsSection
            analyticsQuery={{
              isLoading: analyticsQuery.isLoading,
              isError: analyticsQuery.isError,
              errorMessage: analyticsQuery.isError
                ? getErrorMessage(analyticsQuery.error, '推荐位分析加载失败。')
                : '',
            }}
            analytics={analytics}
            analyticsSummary={analyticsSummary}
            averageCtr={averageCtr}
            averageConversionRate={averageConversionRate}
            analyticsSlotFilter={analyticsSlotFilter}
            analyticsFilterOptions={ANALYTICS_SLOT_FILTER_OPTIONS}
            selectedAnalyticsSlotMeta={selectedAnalyticsSlotMeta}
            onAnalyticsSlotFilterChange={setAnalyticsSlotFilter}
          />
        ) : null}
      </div>

      <Modal
        isOpen={createTarget === 'slot'}
        title="新建推荐位"
        subtitle="推荐位标识必须稳定、清楚，不要让前台接线和运营判断跟着一起发散。"
        onClose={() => {
          if (!createSlotMutation.isPending) {
            setCreateTarget(null);
          }
        }}
      >
        <CreateSlotModalContent
          slotForm={slotForm}
          setSlotForm={setSlotForm}
          selectedSlotMeta={selectedSlotMeta}
          storefrontPresets={STOREFRONT_SLOT_PRESETS}
          onPresetChange={handleSlotPresetChange}
          onSubmit={() => createSlotMutation.mutate()}
          isPending={createSlotMutation.isPending}
        />
      </Modal>

      <Modal
        isOpen={createTarget === 'ranking'}
        title="新建榜单规则"
        subtitle="榜单规则必须显式可见，这样发现页才能保持真实且可维护。"
        onClose={() => {
          if (!createRankingMutation.isPending) {
            setCreateTarget(null);
          }
        }}
        size="lg"
      >
        <CreateRankingModalContent
          rankingForm={rankingForm}
          setRankingForm={setRankingForm}
          rankingTypeOptions={RANKING_TYPE_OPTIONS}
          timeRangeOptions={TIME_RANGE_OPTIONS}
          seriesTypeOptions={SERIES_TYPE_OPTIONS}
          onSubmit={() => createRankingMutation.mutate()}
          isPending={createRankingMutation.isPending}
        />
      </Modal>

      <Modal
        isOpen={Boolean(deleteTarget)}
        title="删除项目"
        subtitle="这会立即删除当前选中的发现页配置记录。"
        onClose={() => {
          if (!deleteBusy) {
            setDeleteTarget(null);
          }
        }}
        size="sm"
      >
        <DeleteRecommendationContent
          deleteTarget={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
          isBusy={deleteBusy}
        />
      </Modal>
    </AdminShell>
  );
}
