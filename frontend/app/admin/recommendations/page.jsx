'use client';

export const dynamic = 'force-dynamic';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';

import AdminShell from '@/components/admin/AdminShell';
import { AdminDataState } from '@/components/admin/common/AdminDataState';
import { AdminFeedbackBanner } from '@/components/admin/common/AdminFeedbackBanner';
import { Modal } from '@/components/admin/common/Modal';
import {
  AdminBadge,
  AdminFormField,
  AdminMetricCard,
  AdminPageSection,
  AdminTabs,
  adminInputClassName,
  adminSelectClassName,
  adminTextareaClassName,
} from '@/components/admin/common/AdminWorkspacePrimitives';
import { Button } from '@/components/ui/button';
import { adminFetchJson } from '@/lib/adminApiClient';
import {
  STOREFRONT_SLOT_PRESETS,
  getStorefrontSlotDisplayMeta,
  getStorefrontSlotPreset,
} from '@/lib/storefrontSlots';

const VIEW_TABS = [
  { value: 'slots', label: '推荐位' },
  { value: 'rankings', label: '榜单规则' },
  { value: 'analytics', label: '表现分析' },
];

const RANKING_TYPE_OPTIONS = [
  { value: 'trending', label: '趋势排序' },
  { value: 'new', label: '新作优先' },
];

const LEGACY_RANKING_TYPE_LABELS = {
  views: '历史阅读量（旧规则）',
  rating: '历史评分（旧规则）',
  ratingCount: '历史评分人数（旧规则）',
};

const TIME_RANGE_OPTIONS = [
  { value: 'day', label: '日' },
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
  { value: 'all', label: '全部时间' },
];

const SERIES_TYPE_OPTIONS = [
  { value: 'all', label: '全部作品' },
  { value: 'comic', label: '漫画' },
  { value: 'novel', label: '小说' },
  { value: 'manga', label: '日漫' },
  { value: 'manhwa', label: '韩漫' },
];

const ANALYTICS_SLOT_FILTER_OPTIONS = [
  { value: 'all', label: '全部推荐位' },
  ...STOREFRONT_SLOT_PRESETS.filter((item) => item.token !== 'custom').map((item) => ({
    value: item.token,
    label: item.label,
  })),
];

const EMPTY_FEEDBACK = { type: '', message: '' };

const INITIAL_SLOT_FORM = {
  preset: 'library-return',
  slotToken: 'library-return',
  seriesIdsText: '',
};

const INITIAL_RANKING_FORM = {
  name: '',
  rankingType: 'trending',
  timeRange: 'day',
  seriesType: 'all',
  maxItems: '20',
  adult: false,
  active: true,
};

function getErrorMessage(error, fallbackMessage) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

function parseSeriesIds(value) {
  return String(value || '')
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function buildSlotPayload(form) {
  const presetToken = String(form.preset || '').trim();
  const slotToken = presetToken && presetToken !== 'custom' ? presetToken : String(form.slotToken || '').trim();

  return {
    slot: slotToken,
    seriesIds: parseSeriesIds(form.seriesIdsText),
  };
}

function buildRankingPayload(form) {
  return {
    name: String(form.name || '').trim(),
    rankingType: String(form.rankingType || 'trending').trim(),
    timeRange: String(form.timeRange || 'day').trim(),
    seriesType: String(form.seriesType || 'all').trim(),
    maxItems: Number.parseInt(String(form.maxItems || '20'), 10),
    adult: Boolean(form.adult),
    active: Boolean(form.active),
  };
}

function formatRankingTypeLabel(value) {
  return (
    RANKING_TYPE_OPTIONS.find((option) => option.value === value)?.label ||
    LEGACY_RANKING_TYPE_LABELS[value] ||
    '未知类型'
  );
}

function formatTimeRangeLabel(value) {
  return TIME_RANGE_OPTIONS.find((option) => option.value === value)?.label || '未知范围';
}

function formatSeriesTypeLabel(value) {
  return SERIES_TYPE_OPTIONS.find((option) => option.value === value)?.label || '未知类型';
}

function formatDateTime(value) {
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
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatNumber(value) {
  return new Intl.NumberFormat('zh-CN').format(Number(value || 0));
}

function formatPercent(value) {
  const numericValue = Number(value || 0);
  return `${numericValue.toFixed(2)}%`;
}

function SlotIdentity({ slotKey, itemId = '', hint = '' }) {
  const slotMeta = getStorefrontSlotDisplayMeta(slotKey);
  const resolvedHint = hint || slotMeta.hint;

  return (
    <div className="space-y-2">
      <div className="text-lg font-semibold text-slate-950">{slotMeta.label}</div>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-black/8 bg-[rgba(250,247,241,0.9)] px-3 py-1 font-mono text-slate-600">
          {slotMeta.token}
        </span>
        {itemId ? (
          <span className="rounded-full border border-black/8 bg-[rgba(250,247,241,0.9)] px-3 py-1 font-mono text-slate-500">
            {itemId}
          </span>
        ) : null}
      </div>
      {resolvedHint ? <p className="text-sm leading-6 text-slate-600">{resolvedHint}</p> : null}
    </div>
  );
}

function RecommendationCard({ title, description, meta = null, footer = null, children }) {
  return (
    <article className="rounded-[26px] border border-black/8 bg-white/86 p-5 shadow-[var(--gush-shadow-soft)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
          {description ? <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p> : null}
        </div>
        {meta}
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
      {footer ? <div className="mt-4 border-t border-black/6 pt-4">{footer}</div> : null}
    </article>
  );
}

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

      const { response, data } = await adminFetchJson(`/api/admin/recommendations/analytics?${params.toString()}`);

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
      const { response, data } = await adminFetchJson(`/api/admin/recommendations/rankings/${rankingId}`, {
        method: 'DELETE',
      });

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
    () => getStorefrontSlotDisplayMeta(slotForm.preset === 'custom' ? slotForm.slotToken : slotForm.preset),
    [slotForm.preset, slotForm.slotToken],
  );
  const selectedAnalyticsSlotMeta = useMemo(
    () => (analyticsSlotFilter === 'all' ? null : getStorefrontSlotDisplayMeta(analyticsSlotFilter)),
    [analyticsSlotFilter],
  );

  const analyticsSummary = useMemo(
    () =>
      analytics.reduce(
        (summary, item) => ({
          impressions: summary.impressions + Number(item.impressions || 0),
          views: summary.views + Number(item.views || 0),
          clicks: summary.clicks + Number(item.clicks || 0),
          conversions: summary.conversions + Number(item.conversions || 0),
        }),
        {
          impressions: 0,
          views: 0,
          clicks: 0,
          conversions: 0,
        },
      ),
    [analytics],
  );

  const averageCtr = analyticsSummary.impressions > 0
    ? (analyticsSummary.clicks / analyticsSummary.impressions) * 100
    : 0;
  const averageConversionRate = analyticsSummary.clicks > 0
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

  const statCards = [
    {
      label: '推荐位',
      value: formatNumber(slotsQuery.data?.total || 0),
      detail: '当前由编辑后台直接维护的推荐位数量。',
      tone: 'accent',
    },
    {
      label: '榜单规则',
      value: loadedTabs.rankings ? formatNumber(rankingsQuery.data?.total || 0) : '打开标签后加载',
      detail: loadedTabs.rankings ? '当前已配置的榜单规则数量。' : '只有打开“榜单规则”标签后才会加载。',
    },
    {
      label: '分析记录',
      value: loadedTabs.analytics ? formatNumber(analyticsQuery.data?.total || 0) : '打开标签后加载',
      detail: loadedTabs.analytics ? '当前已加载的推荐位表现记录数。' : '只有打开“表现分析”标签后才会加载。',
    },
  ];

  return (
    <AdminShell
      title="搜索与发现"
      subtitle="把发现页当成编辑工作来管理：推荐位、榜单规则和表现数据都要真实、克制、可解释。"
    >
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-3">
          {statCards.map((card) => (
            <AdminMetricCard key={card.label} {...card} />
          ))}
        </div>

        <AdminFeedbackBanner
          feedback={feedback}
          onDismiss={() => setFeedback(EMPTY_FEEDBACK)}
          dismissAriaLabel="关闭提示"
        />

        <AdminTabs items={VIEW_TABS} value={activeTab} onChange={handleTabChange} />

        {activeTab === 'slots' ? (
          <AdminPageSection
            title="推荐位"
            description="推荐位是前台稳定的编辑入口。标识要稳定，作品组合要有明确意图，不要临时拼凑。"
            action={
              <Button type="button" onClick={() => openCreateModal('slot')}>
                <Plus className="size-4" />
                新建推荐位
              </Button>
            }
          >
            <AdminDataState
              isLoading={slotsQuery.isLoading}
              hasData={slots.length > 0}
              emptyMessage={slotsQuery.isError ? getErrorMessage(slotsQuery.error, '推荐位加载失败。') : '当前还没有推荐位。'}
              wrap={false}
            >
              <div className="grid gap-4 xl:grid-cols-2">
                {slots.map((slot) => {
                  const seriesIds = Array.isArray(slot.seriesIds) ? slot.seriesIds : [];
                  const slotMeta = getStorefrontSlotDisplayMeta(slot.slot || slot.name);

                  return (
                    <RecommendationCard
                      key={slot.id}
                      title={slotMeta.label}
                      description={slotMeta.hint}
                      meta={<AdminBadge tone="accent">{seriesIds.length} 部作品</AdminBadge>}
                      footer={
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-xs text-slate-500">
                            更新于 {formatDateTime(slot.updatedAt)}
                          </p>
                          <Button type="button" variant="destructive" size="sm" onClick={() => openDeleteModal('slot', slot)}>
                            <Trash2 className="size-4" />
                            删除
                          </Button>
                        </div>
                      }
                    >
                      <SlotIdentity slotKey={slotMeta.token} itemId={slot.id} hint="" />
                      <div className="mt-4 flex flex-wrap gap-2">
                        {seriesIds.length > 0 ? (
                          seriesIds.map((seriesId) => (
                            <span
                              key={`${slot.id}-${seriesId}`}
                              className="rounded-full border border-black/8 bg-[rgba(250,247,241,0.9)] px-3 py-1 text-xs text-slate-600"
                            >
                              {seriesId}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-slate-500">还没有分配作品。</span>
                        )}
                      </div>
                    </RecommendationCard>
                  );
                })}
              </div>
            </AdminDataState>
          </AdminPageSection>
        ) : null}

        {activeTab === 'rankings' ? (
            <AdminPageSection
              title="榜单规则"
            description="榜单规则要写清楚：用什么编辑策略、覆盖哪些作品、当前是否启用，别再把旧热度排序当成默认入口。"
            action={
              <Button type="button" onClick={() => openCreateModal('ranking')}>
                <Plus className="size-4" />
                新建榜单规则
              </Button>
            }
          >
            <AdminDataState
              isLoading={rankingsQuery.isLoading}
              hasData={rankings.length > 0}
              emptyMessage={rankingsQuery.isError ? getErrorMessage(rankingsQuery.error, '榜单规则加载失败。') : '当前还没有榜单规则。'}
              wrap={false}
            >
              <div className="grid gap-4 xl:grid-cols-2">
                {rankings.map((ranking) => (
                  <RecommendationCard
                    key={ranking.id}
                    title={ranking.name || '未命名榜单规则'}
                    description={`${formatRankingTypeLabel(ranking.rankingType)} · ${formatTimeRangeLabel(ranking.timeRange)} · ${formatSeriesTypeLabel(ranking.seriesType)}`}
                    meta={
                      <AdminBadge tone={ranking.active ? 'success' : 'default'}>
                        {ranking.active ? '启用中' : '已暂停'}
                      </AdminBadge>
                    }
                    footer={
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-slate-500">
                          更新于 {formatDateTime(ranking.updatedAt)}
                        </p>
                        <Button type="button" variant="destructive" size="sm" onClick={() => openDeleteModal('ranking', ranking)}>
                          <Trash2 className="size-4" />
                          删除
                        </Button>
                      </div>
                    }
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[22px] border border-black/6 bg-[rgba(250,247,241,0.82)] p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">最大作品数</p>
                        <p className="mt-2 text-lg font-semibold text-slate-950">{ranking.maxItems || 0}</p>
                      </div>
                      <div className="rounded-[22px] border border-black/6 bg-[rgba(250,247,241,0.82)] p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">适用范围</p>
                        <p className="mt-2 text-lg font-semibold text-slate-950">
                          {ranking.adult ? '允许 18+ 内容' : '普通内容'}
                        </p>
                      </div>
                    </div>
                  </RecommendationCard>
                ))}
              </div>
            </AdminDataState>
          </AdminPageSection>
        ) : null}

        {activeTab === 'analytics' ? (
          <AdminPageSection
            title="推荐位表现分析"
            description="先按推荐位筛选，再比较曝光、点击和转化，不把不相关的入口混成一锅。"
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <AdminMetricCard label="曝光" value={formatNumber(analyticsSummary.impressions)} detail="当前已加载的分析记录。" tone="accent" />
                <AdminMetricCard label="详情访问" value={formatNumber(analyticsSummary.views)} detail="进入作品详情页的次数。" />
                <AdminMetricCard label="点击" value={formatNumber(analyticsSummary.clicks)} detail="推荐位点击量。" />
                <AdminMetricCard label="转化" value={formatNumber(analyticsSummary.conversions)} detail="被跟踪到的下游动作。" />
              </div>
              <div className="rounded-[26px] border border-black/8 bg-white/88 p-5 shadow-[var(--gush-shadow-soft)]">
                <AdminFormField label="推荐位筛选">
                  <select
                    id="analytics-slot-filter"
                    value={analyticsSlotFilter}
                    onChange={(event) => setAnalyticsSlotFilter(event.target.value)}
                    className={adminSelectClassName}
                  >
                    {ANALYTICS_SLOT_FILTER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </AdminFormField>
                {selectedAnalyticsSlotMeta ? (
                  <div className="mt-4">
                    <SlotIdentity slotKey={selectedAnalyticsSlotMeta.token} hint={selectedAnalyticsSlotMeta.hint} />
                  </div>
                ) : (
                  <p className="mt-4 text-sm leading-6 text-slate-600">
                    先选定一个推荐位，再把分析表聚焦到单一读者入口上。
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <AdminMetricCard label="平均点击率" value={formatPercent(averageCtr)} detail="点击数 / 曝光数。" />
              <AdminMetricCard label="平均转化率" value={formatPercent(averageConversionRate)} detail="转化数 / 点击数。" />
            </div>

            <div className="mt-6">
              <AdminDataState
                isLoading={analyticsQuery.isLoading}
                hasData={analytics.length > 0}
                emptyMessage={analyticsQuery.isError ? getErrorMessage(analyticsQuery.error, '推荐位分析加载失败。') : '当前筛选条件下没有分析记录。'}
                wrap={false}
              >
                <div className="overflow-hidden rounded-[28px] border border-black/8 bg-white/92 shadow-[var(--gush-shadow-soft)]">
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-[rgba(250,247,241,0.9)] text-left text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        <tr>
                          <th className="px-4 py-4">日期</th>
                          <th className="px-4 py-4">推荐位</th>
                          <th className="px-4 py-4">作品</th>
                          <th className="px-4 py-4">曝光</th>
                          <th className="px-4 py-4">详情访问</th>
                          <th className="px-4 py-4">点击</th>
                          <th className="px-4 py-4">转化</th>
                          <th className="px-4 py-4">CTR</th>
                          <th className="px-4 py-4">转化率</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.map((item) => {
                          const slotMeta = getStorefrontSlotDisplayMeta(item.slot || item.slotId);
                          return (
                            <tr
                              key={item.id}
                              className="border-t border-black/6 text-sm text-slate-700 transition hover:bg-[rgba(250,247,241,0.52)]"
                            >
                              <td className="px-4 py-4">{formatDateTime(item.date)}</td>
                              <td className="px-4 py-4">
                                <div className="space-y-1">
                                  <p className="font-semibold text-slate-950">{slotMeta.label}</p>
                                  <p className="text-xs text-slate-500">{slotMeta.token}</p>
                                </div>
                              </td>
                              <td className="px-4 py-4 font-mono text-xs text-slate-600">{item.seriesId || '未知作品'}</td>
                              <td className="px-4 py-4">{formatNumber(item.impressions)}</td>
                              <td className="px-4 py-4">{formatNumber(item.views)}</td>
                              <td className="px-4 py-4">{formatNumber(item.clicks)}</td>
                              <td className="px-4 py-4">{formatNumber(item.conversions)}</td>
                              <td className="px-4 py-4">{formatPercent(item.ctr)}</td>
                              <td className="px-4 py-4">{formatPercent(item.conversionRate)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </AdminDataState>
            </div>
          </AdminPageSection>
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
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            createSlotMutation.mutate();
          }}
        >
          <AdminFormField label="推荐位预设" helperText={selectedSlotMeta.hint || '先从已有推荐位预设开始，减少接线和命名错误。'}>
            <select
              id="slot-preset"
              value={slotForm.preset}
              onChange={(event) => handleSlotPresetChange(event.target.value)}
              className={adminSelectClassName}
            >
              {STOREFRONT_SLOT_PRESETS.map((preset) => (
                <option key={preset.token} value={preset.token}>
                  {preset.label}
                </option>
              ))}
            </select>
          </AdminFormField>

          <AdminFormField
            label="系统标识"
            helperText={
              slotForm.preset === 'custom'
                ? '只使用小写字母、数字和短横线。'
                : '这个标识会根据预设自动填入。'
            }
          >
            <input
              id="slot-token"
              type="text"
              value={slotForm.slotToken}
              readOnly={slotForm.preset !== 'custom'}
              onChange={(event) => setSlotForm((current) => ({ ...current, slotToken: event.target.value }))}
              placeholder="例如：library-return"
              className={adminInputClassName}
            />
          </AdminFormField>

          <AdminFormField label="作品 ID" helperText="多个作品 ID 可用逗号或换行分隔。">
            <textarea
              id="slot-series-ids"
              rows={5}
              value={slotForm.seriesIdsText}
              onChange={(event) => setSlotForm((current) => ({ ...current, seriesIdsText: event.target.value }))}
              placeholder="series_001&#10;series_002"
              className={adminTextareaClassName}
            />
          </AdminFormField>

          <Button type="submit" disabled={createSlotMutation.isPending}>
            {createSlotMutation.isPending ? '创建中...' : '创建推荐位'}
          </Button>
        </form>
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
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            createRankingMutation.mutate();
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <AdminFormField label="榜单名称">
              <input
                id="ranking-name"
                type="text"
                value={rankingForm.name}
                onChange={(event) => setRankingForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="例如：weekly-trending"
                className={adminInputClassName}
              />
            </AdminFormField>
            <AdminFormField label="榜单类型" helperText="这里只保留当前仍建议新建的榜单策略；旧规则只会作为历史配置显示。">
              <select
                id="ranking-type"
                value={rankingForm.rankingType}
                onChange={(event) => setRankingForm((current) => ({ ...current, rankingType: event.target.value }))}
                className={adminSelectClassName}
              >
                {RANKING_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </AdminFormField>
            <AdminFormField label="时间范围">
              <select
                id="ranking-range"
                value={rankingForm.timeRange}
                onChange={(event) => setRankingForm((current) => ({ ...current, timeRange: event.target.value }))}
                className={adminSelectClassName}
              >
                {TIME_RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </AdminFormField>
            <AdminFormField label="作品类型">
              <select
                id="ranking-series-type"
                value={rankingForm.seriesType}
                onChange={(event) => setRankingForm((current) => ({ ...current, seriesType: event.target.value }))}
                className={adminSelectClassName}
              >
                {SERIES_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </AdminFormField>
            <AdminFormField label="最大作品数">
              <input
                id="ranking-max-items"
                type="number"
                min="1"
                max="200"
                value={rankingForm.maxItems}
                onChange={(event) => setRankingForm((current) => ({ ...current, maxItems: event.target.value }))}
                className={adminInputClassName}
              />
            </AdminFormField>
            <div className="grid gap-3">
              <label className="flex items-center justify-between rounded-[22px] border border-black/8 bg-[rgba(250,247,241,0.88)] px-4 py-3 text-sm text-slate-700">
                <span>允许 18+ 内容</span>
                <input
                  type="checkbox"
                  checked={rankingForm.adult}
                  onChange={(event) => setRankingForm((current) => ({ ...current, adult: event.target.checked }))}
                  className="h-4 w-4 rounded border-black/20 bg-transparent"
                />
              </label>
              <label className="flex items-center justify-between rounded-[22px] border border-black/8 bg-[rgba(250,247,241,0.88)] px-4 py-3 text-sm text-slate-700">
                <span>规则启用中</span>
                <input
                  type="checkbox"
                  checked={rankingForm.active}
                  onChange={(event) => setRankingForm((current) => ({ ...current, active: event.target.checked }))}
                  className="h-4 w-4 rounded border-black/20 bg-transparent"
                />
              </label>
            </div>
          </div>
          <Button type="submit" disabled={createRankingMutation.isPending}>
            {createRankingMutation.isPending ? '创建中...' : '创建榜单规则'}
          </Button>
        </form>
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
        <div className="space-y-4">
          <p className="text-sm leading-6 text-slate-600">
            {deleteTarget?.kind === 'slot'
              ? `确定删除推荐位“${deleteTarget?.item?.name || deleteTarget?.item?.slot || '未知'}”吗？`
              : `确定删除榜单规则“${deleteTarget?.item?.name || deleteTarget?.item?.ranking || '未知'}”吗？`}
          </p>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteBusy}>
              取消
            </Button>
            <Button type="button" variant="destructive" onClick={handleDeleteConfirm} disabled={deleteBusy}>
              {deleteBusy ? '删除中...' : '删除'}
            </Button>
          </div>
        </div>
      </Modal>
    </AdminShell>
  );
}

