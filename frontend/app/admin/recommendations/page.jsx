'use client';

export const dynamic = 'force-dynamic';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AdminDataState } from '@/components/admin/common/AdminDataState';
import { AdminFeedbackBanner } from '@/components/admin/common/AdminFeedbackBanner';
import { Modal } from '@/components/admin/common/Modal';
import { adminFetchJson } from '@/lib/adminApiClient';

const VIEW_TABS = [
  { key: 'slots', label: '推荐位' },
  { key: 'rankings', label: '榜单' },
  { key: 'analytics', label: '分析' },
];

const RANKING_TYPE_OPTIONS = [
  { value: 'views', label: '浏览量' },
  { value: 'rating', label: '评分' },
  { value: 'trending', label: '趋势热度' },
  { value: 'ratingCount', label: '评分人数' },
];

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

const EMPTY_FEEDBACK = { type: '', message: '' };

const STOREFRONT_SLOT_PRESETS = [
  {
    token: 'library-return',
    label: '书架回流位',
    hint: '给高意图回访用户安排下一本最该继续打开的作品。',
  },
  {
    token: 'home-hero',
    label: '首页英雄位',
    hint: '首页首屏轮播位，承担最大流量入口。',
  },
  {
    token: 'home-free-start',
    label: '免费开篇位',
    hint: '适合承接新客首读和低门槛转化。',
  },
  {
    token: 'home-binge-ready',
    label: '完结 binge 位',
    hint: '适合周末长阅读和高完成度作品。',
  },
  {
    token: 'home-breakout',
    label: '爆款新作位',
    hint: '适合承接热度上涨和新作爆发期。',
  },
  {
    token: 'custom',
    label: '自定义推荐位',
    hint: '手动输入机器标识，用于特殊活动或实验位。',
  },
];

const INITIAL_SLOT_FORM = {
  preset: 'library-return',
  slotToken: 'library-return',
  seriesIdsText: '',
};

const INITIAL_RANKING_FORM = {
  name: '',
  rankingType: 'views',
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

function normalizeSlotToken(value) {
  return String(value || '').trim().toLowerCase();
}

function getSlotPreset(token) {
  return STOREFRONT_SLOT_PRESETS.find((item) => item.token === token) || null;
}

function getSlotDisplayMeta(value) {
  const normalized = normalizeSlotToken(value);
  const preset = STOREFRONT_SLOT_PRESETS.find((item) => item.token === normalized);

  if (preset) {
    return preset;
  }

  return {
    token: normalized || 'custom',
    label: String(value || '未命名推荐位').trim() || '未命名推荐位',
    hint: '自定义推荐位，建议保持机器标识稳定，避免前台联动失效。',
  };
}

function buildSlotPayload(form) {
  const presetToken = String(form.preset || '').trim();
  const slotToken =
    presetToken && presetToken !== 'custom'
      ? presetToken
      : String(form.slotToken || '').trim();

  return {
    slot: slotToken,
    seriesIds: parseSeriesIds(form.seriesIdsText),
  };
}

function buildRankingPayload(form) {
  return {
    name: String(form.name || '').trim(),
    rankingType: String(form.rankingType || 'views').trim(),
    timeRange: String(form.timeRange || 'day').trim(),
    seriesType: String(form.seriesType || 'all').trim(),
    maxItems: Number.parseInt(String(form.maxItems || '20'), 10),
    adult: Boolean(form.adult),
    active: Boolean(form.active),
  };
}

function formatRankingTypeLabel(value) {
  return RANKING_TYPE_OPTIONS.find((option) => option.value === value)?.label || '未知';
}

function formatTimeRangeLabel(value) {
  return TIME_RANGE_OPTIONS.find((option) => option.value === value)?.label || '未知';
}

function formatSeriesTypeLabel(value) {
  return SERIES_TYPE_OPTIONS.find((option) => option.value === value)?.label || '未知';
}

function formatDateTime(value) {
  if (!value) {
    return '暂无';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '日期无效';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatNumber(value) {
  const numericValue = Number(value || 0);
  return new Intl.NumberFormat('zh-CN').format(Number.isFinite(numericValue) ? numericValue : 0);
}

function formatPercent(value) {
  const numericValue = Number(value || 0);
  return `${numericValue.toFixed(2)}%`;
}

function ErrorPanel({ title, message, onRetry }) {
  return (
    <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-100">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-red-50">{title}</h3>
          <p className="mt-1 text-red-100/80">{message}</p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-xl border border-red-400/30 px-4 py-2 font-medium text-red-50 transition hover:bg-red-400/10"
        >
          重试
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-3xl border border-neutral-800 bg-neutral-950/70 p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-neutral-50">{value}</p>
      {hint ? <p className="mt-2 text-sm text-neutral-400">{hint}</p> : null}
    </div>
  );
}

function getDeferredStatValue(query, isLoaded) {
  if (!isLoaded) {
    return '待加载';
  }

  if (query.isLoading && !query.data) {
    return '加载中...';
  }

  if (query.isError) {
    return '错误';
  }

  return formatNumber(query.data?.total || 0);
}

function getDeferredStatHint(hint, isLoaded) {
  return isLoaded ? hint : '打开此页签后加载';
}

function SectionHeader({ title, description, action }) {
  return (
    <div className="flex flex-col gap-4 border-b border-neutral-800/80 pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h2 className="text-xl font-semibold text-neutral-50">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm text-neutral-400">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function AnalyticsTable({ analytics }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950/70">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-800 text-sm">
          <thead className="bg-neutral-900/80 text-left text-xs uppercase tracking-[0.2em] text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">日期</th>
              <th className="px-4 py-3 font-medium">推荐位</th>
              <th className="px-4 py-3 font-medium">作品</th>
              <th className="px-4 py-3 font-medium">曝光</th>
              <th className="px-4 py-3 font-medium">浏览</th>
              <th className="px-4 py-3 font-medium">点击</th>
              <th className="px-4 py-3 font-medium">转化</th>
              <th className="px-4 py-3 font-medium">CTR</th>
              <th className="px-4 py-3 font-medium">转化率</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800 text-neutral-200">
            {analytics.map((item) => (
              <tr key={item.id} className="bg-neutral-950/30 transition hover:bg-neutral-900/60">
                <td className="px-4 py-3">{formatDateTime(item.date)}</td>
                <td className="px-4 py-3 font-medium text-neutral-50">{item.slot || item.slotId || '未知'}</td>
                <td className="px-4 py-3 font-mono text-xs text-neutral-300">{item.seriesId || '未知'}</td>
                <td className="px-4 py-3">{formatNumber(item.impressions)}</td>
                <td className="px-4 py-3">{formatNumber(item.views)}</td>
                <td className="px-4 py-3">{formatNumber(item.clicks)}</td>
                <td className="px-4 py-3">{formatNumber(item.conversions)}</td>
                <td className="px-4 py-3">{formatPercent(item.ctr)}</td>
                <td className="px-4 py-3">{formatPercent(item.conversionRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
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

  const handleTabChange = (nextTab) => {
    setActiveTab(nextTab);
    setLoadedTabs((current) => {
      if (current[nextTab]) {
        return current;
      }

      return {
        ...current,
        [nextTab]: true,
      };
    });
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
        throw new Error(data?.message || data?.error || '榜单配置加载失败。');
      }

      return {
        items: Array.isArray(data?.configs) ? data.configs : [],
        total: Number(data?.total || 0),
      };
    },
  });

  const analyticsQuery = useQuery({
    queryKey: ['admin', 'recommendations', 'analytics'],
    enabled: loadedTabs.analytics,
    staleTime: 60_000,
    queryFn: async () => {
      const { response, data } = await adminFetchJson('/api/admin/recommendations/analytics?limit=50');

      if (!response.ok) {
        throw new Error(data?.message || data?.error || '推荐分析加载失败。');
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
        throw new Error('推荐位名称不能为空。');
      }

      const { response, data } = await adminFetchJson('/api/admin/recommendations/slots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
        throw new Error('最大条目数必须在 1 到 200 之间。');
      }

      const { response, data } = await adminFetchJson('/api/admin/recommendations/rankings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(data?.message || data?.error || '创建榜单配置失败。');
      }

      return data?.config || null;
    },
    onSuccess: async () => {
      setCreateTarget(null);
      setRankingForm(INITIAL_RANKING_FORM);
      setFeedback({ type: 'success', message: '榜单配置已创建。' });
      await rankingsQuery.refetch();
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error, '创建榜单配置失败。') });
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
        throw new Error(data?.message || data?.error || '删除榜单配置失败。');
      }

      return data;
    },
    onSuccess: async () => {
      setDeleteTarget(null);
      setFeedback({ type: 'success', message: '榜单配置已删除。' });
      await rankingsQuery.refetch();
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error, '删除榜单配置失败。') });
    },
  });

  const slots = slotsQuery.data?.items || [];
  const rankings = rankingsQuery.data?.items || [];
  const analytics = analyticsQuery.data?.items || [];
  const selectedSlotMeta = useMemo(
    () => getSlotDisplayMeta(slotForm.preset === 'custom' ? slotForm.slotToken : slotForm.preset),
    [slotForm.preset, slotForm.slotToken],
  );

  const analyticsSummary = useMemo(() => {
    return analytics.reduce(
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
      }
    );
  }, [analytics]);

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
    const preset = getSlotPreset(nextPreset);
    setSlotForm((current) => ({
      ...current,
      preset: nextPreset,
      slotToken:
        preset && preset.token !== 'custom'
          ? preset.token
          : current.slotToken,
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

  const renderSlots = () => {
    if (slotsQuery.isError) {
      return (
        <ErrorPanel
          title="推荐位加载失败"
          message={getErrorMessage(slotsQuery.error, '推荐位列表无法加载。')}
          onRetry={() => slotsQuery.refetch()}
        />
      );
    }

    return (
      <AdminDataState
        isLoading={slotsQuery.isLoading}
        hasData={slots.length > 0}
        emptyMessage="暂无推荐位。"
        wrap={false}
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {slots.map((slot) => {
            const seriesIds = Array.isArray(slot.seriesIds) ? slot.seriesIds : [];
            const slotMeta = getSlotDisplayMeta(slot.slot || slot.name);

            return (
              <article key={slot.id} className="rounded-3xl border border-neutral-800 bg-neutral-950/70 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">推荐位</p>
                    <h3 className="mt-2 text-lg font-semibold text-neutral-50">{slot.name || slot.slot || '未命名推荐位'}</h3>
                    <p className="mt-2 font-mono text-xs text-neutral-400">{slot.id}</p>
                    <p className="mt-2 text-sm text-neutral-400">{slotMeta.hint}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openDeleteModal('slot', slot)}
                    className="rounded-xl border border-red-500/30 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/10"
                  >
                    删除推荐位
                  </button>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <StatCard label="作品数量" value={formatNumber(seriesIds.length)} hint="已关联作品 ID" />
                  <StatCard label="创建时间" value={formatDateTime(slot.createdAt)} hint="首次创建时间" />
                  <StatCard label="更新时间" value={formatDateTime(slot.updatedAt)} hint="最近保存时间" />
                </div>

                <div className="mt-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">作品 ID</p>
                  {seriesIds.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {seriesIds.map((seriesId) => (
                        <span
                          key={seriesId}
                          className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 font-mono text-xs text-neutral-300"
                        >
                          {seriesId}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-neutral-400">该推荐位还没有关联作品 ID。</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </AdminDataState>
    );
  };

  const renderRankings = () => {
    if (rankingsQuery.isError) {
      return (
        <ErrorPanel
          title="榜单配置加载失败"
          message={getErrorMessage(rankingsQuery.error, '榜单配置列表无法加载。')}
          onRetry={() => rankingsQuery.refetch()}
        />
      );
    }

    return (
      <AdminDataState
        isLoading={rankingsQuery.isLoading}
        hasData={rankings.length > 0}
        emptyMessage="暂无榜单配置。"
        wrap={false}
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {rankings.map((ranking) => (
            <article key={ranking.id} className="rounded-3xl border border-neutral-800 bg-neutral-950/70 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">榜单</p>
                  <h3 className="mt-2 text-lg font-semibold text-neutral-50">
                    {ranking.name || ranking.ranking || '未命名榜单'}
                  </h3>
                  <p className="mt-2 font-mono text-xs text-neutral-400">{ranking.id}</p>
                </div>
                <button
                  type="button"
                  onClick={() => openDeleteModal('ranking', ranking)}
                  className="rounded-xl border border-red-500/30 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/10"
                >
                  删除榜单
                </button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <StatCard label="类型" value={formatRankingTypeLabel(ranking.rankingType)} hint="排序依据" />
                <StatCard label="范围" value={formatTimeRangeLabel(ranking.timeRange)} hint="聚合时间窗口" />
                <StatCard label="作品范围" value={formatSeriesTypeLabel(ranking.seriesType)} hint="内容筛选" />
                <StatCard label="最大条目数" value={formatNumber(ranking.maxItems)} hint="返回条目上限" />
                <StatCard label="成人内容" value={ranking.adult ? '开启' : '关闭'} hint="受众过滤" />
                <StatCard label="启用状态" value={ranking.active ? '开启' : '关闭'} hint="当前可用状态" />
              </div>

              <div className="mt-5 flex flex-wrap gap-2 text-xs text-neutral-400">
                <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1">创建于 {formatDateTime(ranking.createdAt)}</span>
                <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1">更新于 {formatDateTime(ranking.updatedAt)}</span>
              </div>
            </article>
          ))}
        </div>
      </AdminDataState>
    );
  };

  const renderAnalytics = () => {
    if (analyticsQuery.isError) {
      return (
        <ErrorPanel
          title="分析数据加载失败"
          message={getErrorMessage(analyticsQuery.error, '分析数据无法加载。')}
          onRetry={() => analyticsQuery.refetch()}
        />
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="曝光" value={formatNumber(analyticsSummary.impressions)} hint="当前已加载数据汇总" />
          <StatCard label="浏览" value={formatNumber(analyticsSummary.views)} hint="作品详情访问量" />
          <StatCard label="点击" value={formatNumber(analyticsSummary.clicks)} hint="推荐位点击量" />
          <StatCard label="转化" value={formatNumber(analyticsSummary.conversions)} hint="已完成动作" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <StatCard label="平均 CTR" value={formatPercent(averageCtr)} hint="点击数除以曝光数" />
          <StatCard
            label="平均转化率"
            value={formatPercent(averageConversionRate)}
            hint="转化数除以点击数"
          />
        </div>
        <AdminDataState
          isLoading={analyticsQuery.isLoading}
          hasData={analytics.length > 0}
          emptyMessage="暂无推荐分析数据。"
          wrap={false}
        >
          <AnalyticsTable analytics={analytics} />
        </AdminDataState>
      </div>
    );
  };

  return (
    <div className="space-y-8 p-6 text-neutral-100">
      <header className="rounded-[32px] border border-neutral-800 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_35%),linear-gradient(180deg,rgba(10,10,10,0.96),rgba(10,10,10,0.88))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-emerald-300">后台控制台</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">推荐管理</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-300">
              在一个稳定页面内统一管理推荐位、榜单配置和推荐分析数据。
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[420px]">
            <StatCard label="推荐位" value={getDeferredStatValue(slotsQuery, true)} hint="推荐展示位置" />
            <StatCard
              label="榜单"
              value={getDeferredStatValue(rankingsQuery, loadedTabs.rankings)}
              hint={getDeferredStatHint('榜单配置数量', loadedTabs.rankings)}
            />
            <StatCard
              label="分析记录"
              value={getDeferredStatValue(analyticsQuery, loadedTabs.analytics)}
              hint={getDeferredStatHint('当前已加载记录数', loadedTabs.analytics)}
            />
          </div>
        </div>
      </header>

      <AdminFeedbackBanner
        feedback={feedback}
        onDismiss={() => setFeedback(EMPTY_FEEDBACK)}
        dismissAriaLabel="关闭提示"
      />

      <div className="flex flex-wrap gap-3">
        {VIEW_TABS.map((tab) => {
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              className={[
                'rounded-full border px-4 py-2 text-sm font-medium transition',
                isActive
                  ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
                  : 'border-neutral-800 bg-neutral-950/70 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200',
              ].join(' ')}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <section className="space-y-6 rounded-[32px] border border-neutral-800 bg-neutral-950/60 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.24)]">
        {activeTab === 'slots' ? (
          <>
            <SectionHeader
              title="推荐位"
              description="推荐位仅提交后端支持的字段：名称和可选的作品 ID 列表。"
              action={
                <button
                  type="button"
                  onClick={() => openCreateModal('slot')}
                  className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-400"
                >
                  新建推荐位
                </button>
              }
            />
            {renderSlots()}
          </>
        ) : null}

        {activeTab === 'rankings' ? (
          <>
            <SectionHeader
              title="榜单配置"
              description="榜单配置严格按后端契约提交：名称、榜单类型、时间范围、作品类型、最大条目数、成人标记和启用状态。"
              action={
                <button
                  type="button"
                  onClick={() => openCreateModal('ranking')}
                  className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-400"
                >
                  新建榜单
                </button>
              }
            />
            {renderRankings()}
          </>
        ) : null}

        {activeTab === 'analytics' ? (
          <>
            <SectionHeader
              title="分析"
              description="此页面只读，用于展示后端返回的最新推荐表现数据。"
            />
            {renderAnalytics()}
          </>
        ) : null}
      </section>

      <Modal
        isOpen={createTarget === 'slot'}
        title="新建推荐位"
        subtitle="表单只暴露后端当前支持的字段。"
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
          <div>
            <label className="text-sm font-medium text-neutral-300" htmlFor="slot-preset">
              推荐位模板
            </label>
            <select
              id="slot-preset"
              value={slotForm.preset}
              onChange={(event) => handleSlotPresetChange(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-neutral-100 outline-none transition focus:border-emerald-400"
            >
              {STOREFRONT_SLOT_PRESETS.map((preset) => (
                <option key={preset.token} value={preset.token}>
                  {preset.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-neutral-500">
              {selectedSlotMeta.hint || '选择一个常用推荐位模板，减少手动输错标识的风险。'}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-300" htmlFor="slot-token">
              推荐位名称
            </label>
            <input
              id="slot-token"
              type="text"
              value={slotForm.slotToken}
              readOnly={slotForm.preset !== 'custom'}
              onChange={(event) => setSlotForm((current) => ({ ...current, slotToken: event.target.value }))}
              placeholder="例如：home-featured"
              className="mt-2 w-full rounded-2xl border border-neutral-700 bg-neutral-800 px-4 py-3 font-mono text-neutral-100 outline-none transition focus:border-emerald-400 read-only:cursor-not-allowed read-only:opacity-80"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-300" htmlFor="slot-series-ids">
              作品 ID
            </label>
            <textarea
              id="slot-series-ids"
              rows={5}
              value={slotForm.seriesIdsText}
              onChange={(event) => setSlotForm((current) => ({ ...current, seriesIdsText: event.target.value }))}
              placeholder="例如：series_001, series_002"
              className="mt-2 w-full rounded-2xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-neutral-100 outline-none transition focus:border-emerald-400"
            />
            <p className="mt-2 text-xs text-neutral-500">多个 ID 可用逗号或换行分隔。</p>
          </div>
          <button
            type="submit"
            disabled={createSlotMutation.isPending}
            className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createSlotMutation.isPending ? '创建中...' : '创建推荐位'}
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={createTarget === 'ranking'}
        title="新建榜单配置"
        subtitle="提交数据与当前后端 DTO 和校验规则保持一致。"
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
            <div>
              <label className="text-sm font-medium text-neutral-300" htmlFor="ranking-name">
                榜单名称
              </label>
              <input
                id="ranking-name"
                type="text"
                value={rankingForm.name}
                onChange={(event) => setRankingForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="例如：weekly-trending"
                className="mt-2 w-full rounded-2xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-neutral-100 outline-none transition focus:border-emerald-400"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-300" htmlFor="ranking-type">
                榜单类型
              </label>
              <select
                id="ranking-type"
                value={rankingForm.rankingType}
                onChange={(event) => setRankingForm((current) => ({ ...current, rankingType: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-neutral-100 outline-none transition focus:border-emerald-400"
              >
                {RANKING_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-300" htmlFor="ranking-range">
                时间范围
              </label>
              <select
                id="ranking-range"
                value={rankingForm.timeRange}
                onChange={(event) => setRankingForm((current) => ({ ...current, timeRange: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-neutral-100 outline-none transition focus:border-emerald-400"
              >
                {TIME_RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-300" htmlFor="ranking-series-type">
                作品类型
              </label>
              <select
                id="ranking-series-type"
                value={rankingForm.seriesType}
                onChange={(event) => setRankingForm((current) => ({ ...current, seriesType: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-neutral-100 outline-none transition focus:border-emerald-400"
              >
                {SERIES_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-300" htmlFor="ranking-max-items">
                最大条目数
              </label>
              <input
                id="ranking-max-items"
                type="number"
                min="1"
                max="200"
                value={rankingForm.maxItems}
                onChange={(event) => setRankingForm((current) => ({ ...current, maxItems: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-neutral-100 outline-none transition focus:border-emerald-400"
              />
            </div>
            <div className="grid gap-3">
              <label className="flex items-center justify-between rounded-2xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-sm text-neutral-200">
                <span>启用成人内容</span>
                <input
                  type="checkbox"
                  checked={rankingForm.adult}
                  onChange={(event) => setRankingForm((current) => ({ ...current, adult: event.target.checked }))}
                  className="h-4 w-4"
                />
              </label>
              <label className="flex items-center justify-between rounded-2xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-sm text-neutral-200">
                <span>配置启用</span>
                <input
                  type="checkbox"
                  checked={rankingForm.active}
                  onChange={(event) => setRankingForm((current) => ({ ...current, active: event.target.checked }))}
                  className="h-4 w-4"
                />
              </label>
            </div>
          </div>
          <button
            type="submit"
            disabled={createRankingMutation.isPending}
            className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createRankingMutation.isPending ? '创建中...' : '创建榜单'}
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(deleteTarget)}
        title="删除项目"
        subtitle="该操作会立即删除所选记录。"
        onClose={() => {
          if (!deleteBusy) {
            setDeleteTarget(null);
          }
        }}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-300">
            {deleteTarget?.kind === 'slot'
              ? `确定删除推荐位「${deleteTarget?.item?.name || deleteTarget?.item?.slot || '未知'}」吗？`
              : `确定删除榜单「${deleteTarget?.item?.name || deleteTarget?.item?.ranking || '未知'}」吗？`}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteBusy}
              className="flex-1 rounded-2xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-sm font-medium text-neutral-200 transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              disabled={deleteBusy}
              className="flex-1 rounded-2xl bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleteBusy ? '删除中...' : '删除'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

