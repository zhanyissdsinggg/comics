
'use client';

/* eslint-disable @next/next/no-img-element */

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, BookOpen, Image as ImageIcon, PencilLine, Save } from 'lucide-react';
import { AdminFeedbackBanner } from '@/components/admin/common/AdminFeedbackBanner';
import { LoadingState } from '@/components/admin/common/LoadingState';
import { adminFetchJson, adminUpload } from '@/lib/adminApiClient';

const TYPE_OPTIONS = [
  { value: 'comic', label: '漫画' },
  { value: 'novel', label: '小说' },
];

const STATUS_OPTIONS = [
  { value: 'Ongoing', label: '连载中' },
  { value: 'Completed', label: '已完结' },
  { value: 'Hiatus', label: '暂停中' },
  { value: 'Cancelled', label: '已停更' },
];

const EMPTY_FEEDBACK = { type: '', message: '' };
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const PRICING_FIELDS = new Set(['episodePrice']);
const TTF_FIELDS = new Set(['ttfEnabled', 'ttfIntervalHours']);
const SECTION_CONFIGS = [
  { id: 'basic', title: '基础信息', fields: ['title', 'type', 'status', 'description', 'genres', 'badge'] },
  { id: 'distribution', title: '发布与限制', fields: ['isPublished', 'adult'] },
  { id: 'commerce', title: '商业设置', fields: ['episodePrice', 'ttfEnabled', 'ttfIntervalHours'] },
  { id: 'cover', title: '封面资源', fields: ['coverUrl', 'coverTone'] },
];

function createEmptyForm() {
  return {
    title: '',
    type: 'comic',
    status: 'Ongoing',
    adult: false,
    isPublished: true,
    description: '',
    genres: '',
    coverUrl: '',
    coverTone: '',
    badge: '',
    episodePrice: '0',
    ttfEnabled: false,
    ttfIntervalHours: '24',
  };
}

function buildFormState(series) {
  return {
    title: series?.title || '',
    type: series?.type || 'comic',
    status: series?.status || 'Ongoing',
    adult: Boolean(series?.adult),
    isPublished: series?.isPublished !== undefined ? Boolean(series.isPublished) : true,
    description: series?.description || '',
    genres: Array.isArray(series?.genres) ? series.genres.join(', ') : '',
    coverUrl: series?.coverUrl || '',
    coverTone: series?.coverTone || '',
    badge: series?.badge || '',
    episodePrice: String(series?.episodePrice ?? 0),
    ttfEnabled: Boolean(series?.ttfEnabled),
    ttfIntervalHours: String(series?.ttfIntervalHours ?? 24),
  };
}

function buildSeriesPayload(formData, fields = null) {
  const include = fields ? new Set(fields) : null;
  const shouldInclude = (field) => !include || include.has(field);
  const episodePrice = Number.parseInt(String(formData.episodePrice || '0'), 10);
  const intervalHours = Number.parseInt(String(formData.ttfIntervalHours || '24'), 10);
  const payload = {};

  if (shouldInclude('title')) payload.title = formData.title.trim();
  if (shouldInclude('type')) payload.type = formData.type || 'comic';
  if (shouldInclude('status')) payload.status = formData.status || 'Ongoing';
  if (shouldInclude('adult')) payload.adult = Boolean(formData.adult);
  if (shouldInclude('isPublished')) payload.isPublished = Boolean(formData.isPublished);
  if (shouldInclude('description')) payload.description = formData.description.trim();
  if (shouldInclude('genres')) payload.genres = String(formData.genres || '').split(',').map((genre) => genre.trim()).filter(Boolean);
  if (shouldInclude('coverUrl')) payload.coverUrl = formData.coverUrl.trim();
  if (shouldInclude('coverTone')) payload.coverTone = formData.coverTone.trim();
  if (shouldInclude('badge')) payload.badge = formData.badge.trim();

  if (!include || [...PRICING_FIELDS].some((field) => include.has(field))) {
    payload.pricing = { episodePrice: Number.isFinite(episodePrice) ? episodePrice : 0 };
  }
  if (!include || [...TTF_FIELDS].some((field) => include.has(field))) {
    payload.ttf = {
      enabled: Boolean(formData.ttfEnabled),
      intervalHours: Number.isFinite(intervalHours) && intervalHours > 0 ? intervalHours : 24,
    };
  }

  return payload;
}

function mergeSeriesFieldsIntoForm(currentForm, series, fields = null) {
  const nextForm = buildFormState(series);
  if (!fields) return nextForm;
  const include = new Set(fields);
  return Object.keys(currentForm).reduce((acc, field) => {
    acc[field] = include.has(field) ? nextForm[field] : currentForm[field];
    return acc;
  }, {});
}

function formatSeriesTypeLabel(value) {
  return TYPE_OPTIONS.find((option) => option.value === value)?.label || '漫画';
}

function formatSeriesStatusLabel(value) {
  return STATUS_OPTIONS.find((option) => option.value === value)?.label || '连载中';
}

function getErrorMessage(error, fallbackMessage) {
  if (error instanceof Error && error.message) return error.message;
  return fallbackMessage;
}

function formatDateTime(value) {
  if (!value) return '暂无';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '暂无';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
function isNonNegativeIntegerString(value, { allowEmpty = false } = {}) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return allowEmpty;
  return /^\d+$/.test(normalized);
}

function validateSeriesDraft(formData, fields = null) {
  const include = fields ? new Set(fields) : null;
  const shouldValidate = (field) => !include || include.has(field);

  if (shouldValidate('title') && !formData.title.trim()) {
    return '标题不能为空。';
  }
  if (shouldValidate('episodePrice') && !isNonNegativeIntegerString(formData.episodePrice, { allowEmpty: true })) {
    return '章节价格必须是整数金币。';
  }
  if ((!include || include.has('ttfEnabled') || include.has('ttfIntervalHours')) && formData.ttfEnabled) {
    if (!isNonNegativeIntegerString(formData.ttfIntervalHours)) {
      return '免费券刷新间隔必须是整数小时。';
    }
    if (Number(formData.ttfIntervalHours) < 1) {
      return '免费券刷新间隔至少为 1 小时。';
    }
  }

  return '';
}

async function fetchSeriesDetail(seriesId) {
  const { response, data } = await adminFetchJson(`/api/admin/series/${seriesId}`, { cache: 'no-store' });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(data?.message || data?.error || '作品详情加载失败。');
  }
  return data?.series || null;
}

function FormField({ label, children, helperText = '' }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-neutral-300">{label}</span>
      {children}
      {helperText ? <span className="block text-xs text-neutral-500">{helperText}</span> : null}
    </label>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-neutral-800 py-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-neutral-500">{label}</span>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  );
}

function SectionCard({ id, title, dirty, isEditing, isSaving, onSave, children }) {
  return (
    <section id={id} className="scroll-mt-28 rounded-3xl border border-neutral-800 bg-neutral-900/80 px-6 py-6 shadow-[0_24px_80px_-36px_rgba(0,0,0,0.8)]">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-white">{title}</h2>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${dirty ? 'border border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}>
              {dirty ? '未保存' : '已同步'}
            </span>
          </div>
        </div>

        {isEditing ? (
          <button
            type="button"
            onClick={onSave}
            disabled={!dirty || isSaving}
            className="inline-flex items-center gap-2 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={16} />
            <span>{isSaving ? '保存中...' : '保存本区'}</span>
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export default function AdminSeriesDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const seriesId = String(params?.id || '');

  const [formData, setFormData] = useState(createEmptyForm());
  const [isEditing, setIsEditing] = useState(false);
  const [feedback, setFeedback] = useState(EMPTY_FEEDBACK);
  const [savingSectionId, setSavingSectionId] = useState('');
  const [activeSectionId, setActiveSectionId] = useState('basic');

  const seriesQuery = useQuery({
    queryKey: ['admin', 'series', seriesId],
    enabled: Boolean(seriesId),
    staleTime: 60_000,
    queryFn: () => fetchSeriesDetail(seriesId),
  });

  const series = seriesQuery.data;
  const baselineForm = useMemo(() => buildFormState(series), [series]);

  useEffect(() => {
    if (seriesQuery.data && !isEditing) {
      setFormData(buildFormState(seriesQuery.data));
    }
  }, [isEditing, seriesQuery.data]);

  const dirtyBySection = useMemo(
    () => SECTION_CONFIGS.reduce((acc, section) => {
      acc[section.id] = section.fields.some((field) => formData[field] !== baselineForm[field]);
      return acc;
    }, {}),
    [baselineForm, formData],
  );

  const overallDirty = useMemo(() => Object.values(dirtyBySection).some(Boolean), [dirtyBySection]);

  const saveMutation = useMutation({
    mutationFn: async ({ draft, fields, sectionId }) => {
      const { response, data } = await adminFetchJson(`/api/admin/series/${seriesId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ series: buildSeriesPayload(draft, fields) }),
      });

      if (!response.ok) {
        throw new Error(data?.message || data?.error || '保存作品详情失败。');
      }

      return { series: data?.series || null, sectionId, fields };
    },
    onSuccess: ({ series: updatedSeries, sectionId, fields }) => {
      if (updatedSeries) {
        queryClient.setQueryData(['admin', 'series', seriesId], updatedSeries);
        setFormData((current) => mergeSeriesFieldsIntoForm(current, updatedSeries, fields));
      }
      if (sectionId === 'all') {
        setIsEditing(false);
      }
      const section = SECTION_CONFIGS.find((item) => item.id === sectionId);
      setFeedback({ type: 'success', message: section ? `${section.title}已保存。` : '作品详情已保存。' });
      setSavingSectionId('');
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error, '保存作品详情失败。') });
      setSavingSectionId('');
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const uploadPayload = new FormData();
      uploadPayload.append('file', file);
      const response = await adminUpload('/api/admin/upload/image', uploadPayload);
      if (!response.ok || !response.data?.url) {
        throw new Error(response.error || response.message || '上传封面失败。');
      }
      return response.data;
    },
    onSuccess: (data) => {
      setFormData((current) => ({ ...current, coverUrl: data.url }));
      setFeedback({ type: 'success', message: '封面上传成功，请保存封面资源。' });
      setActiveSectionId('cover');
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error, '上传封面失败。') });
    },
  });
  const handleFieldChange = (field) => (event) => {
    const nextValue = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setFormData((current) => ({ ...current, [field]: nextValue }));
  };

  const handleStartEditing = () => {
    setFeedback(EMPTY_FEEDBACK);
    setFormData(baselineForm);
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setFeedback(EMPTY_FEEDBACK);
    setFormData(baselineForm);
    setIsEditing(false);
    setSavingSectionId('');
  };

  const handleSaveSection = (section) => {
    setFeedback(EMPTY_FEEDBACK);
    const validationMessage = validateSeriesDraft(formData, section.fields);
    if (validationMessage) {
      setFeedback({ type: 'error', message: validationMessage });
      return;
    }
    setSavingSectionId(section.id);
    saveMutation.mutate({ draft: formData, fields: section.fields, sectionId: section.id });
  };

  const handleSaveAll = () => {
    setFeedback(EMPTY_FEEDBACK);
    const validationMessage = validateSeriesDraft(formData);
    if (validationMessage) {
      setFeedback({ type: 'error', message: validationMessage });
      return;
    }
    setSavingSectionId('all');
    saveMutation.mutate({ draft: formData, fields: null, sectionId: 'all' });
  };

  const handleCoverUpload = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFeedback({ type: 'error', message: '请上传有效的图片文件。' });
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setFeedback({ type: 'error', message: '封面图片大小不能超过 10MB。' });
      return;
    }
    uploadMutation.mutate(file);
  };

  const scrollToSection = (sectionId) => {
    setActiveSectionId(sectionId);
    if (typeof document === 'undefined') return;
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (seriesQuery.isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 px-6 py-8">
        <div className="mx-auto max-w-6xl rounded-3xl border border-neutral-800 bg-neutral-900/80 px-6 py-16">
          <LoadingState.Spinner size="md" text="正在加载作品详情..." />
        </div>
      </div>
    );
  }

  if (seriesQuery.isError) {
    return (
      <div className="min-h-screen bg-neutral-950 px-6 py-8">
        <div className="mx-auto max-w-6xl rounded-3xl border border-neutral-800 bg-neutral-900/80 px-6 py-16">
          <LoadingState.ErrorState error={getErrorMessage(seriesQuery.error, '作品详情加载失败。')} onRetry={() => seriesQuery.refetch()} />
        </div>
      </div>
    );
  }

  if (!series) {
    return (
      <div className="min-h-screen bg-neutral-950 px-6 py-8">
        <div className="mx-auto max-w-6xl rounded-3xl border border-neutral-800 bg-neutral-900/80 px-6 py-16">
          <LoadingState.EmptyState
            message="未找到该作品。"
            action={<button type="button" onClick={() => router.push('/admin/series')} className="rounded-2xl border border-neutral-700 px-4 py-2 text-sm font-medium text-white transition hover:border-neutral-500 hover:bg-neutral-900">返回作品库</button>}
          />
        </div>
      </div>
    );
  }

  const summaryCards = [
    { label: '章节数量', value: String(series.episodeCount || 0), helper: series.latestEpisodeId ? `最新章节 ${series.latestEpisodeId}` : '还没有章节' },
    { label: '发布状态', value: formData.isPublished ? '已发布' : '草稿', helper: formData.adult ? '18+ 内容' : '全年龄内容' },
    { label: '默认价格', value: `${formData.episodePrice || '0'} 金币`, helper: formData.ttfEnabled ? `免费券每 ${formData.ttfIntervalHours} 小时恢复` : '未开启免费券' },
    { label: '封面资源', value: formData.coverUrl ? '已配置' : '待补充', helper: formData.coverTone || '未设置色调' },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="overflow-hidden rounded-[32px] border border-neutral-800 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.14),_transparent_32%),linear-gradient(180deg,rgba(23,23,23,0.96),rgba(10,10,10,0.94))] px-6 py-6 shadow-[0_28px_90px_-40px_rgba(0,0,0,0.85)]">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => router.push('/admin/series')}
                className="inline-flex w-fit items-center gap-2 rounded-2xl border border-neutral-700 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-300 transition hover:border-neutral-500 hover:text-white"
              >
                返回作品库
              </button>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-cyan-200">
                    {formatSeriesTypeLabel(formData.type)}
                  </span>
                  <span className="rounded-full border border-neutral-700 bg-neutral-900/80 px-3 py-1 text-neutral-300">
                    {formatSeriesStatusLabel(formData.status)}
                  </span>
                  {formData.adult ? (
                    <span className="rounded-full border border-rose-500/25 bg-rose-500/10 px-3 py-1 text-rose-200">
                      18+ 限制
                    </span>
                  ) : null}
                  {!formData.isPublished ? (
                    <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-amber-200">
                      未发布
                    </span>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    {formData.title || series.title || '未命名作品'}
                  </h1>
                  <p className="max-w-3xl text-sm leading-7 text-neutral-400">
                    把作品基础信息、前台展示、商业规则和封面资源集中在一个编辑台里处理，少来回跳页面。
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push(`/admin/series/${seriesId}/episodes`)}
                className="inline-flex items-center gap-2 rounded-2xl border border-neutral-700 px-4 py-2.5 text-sm font-medium text-white transition hover:border-neutral-500 hover:bg-neutral-900"
              >
                <BookOpen size={16} />
                管理章节
              </button>
              <a
                href={`/series/${seriesId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl border border-neutral-700 px-4 py-2.5 text-sm font-medium text-white transition hover:border-neutral-500 hover:bg-neutral-900"
              >
                <ArrowUpRight size={16} />
                预览前台
              </a>

              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={handleCancelEditing}
                    disabled={saveMutation.isPending || uploadMutation.isPending}
                    className="rounded-2xl border border-neutral-700 px-4 py-2.5 text-sm font-medium text-neutral-200 transition hover:border-neutral-500 hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    取消编辑
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAll}
                    disabled={!overallDirty || saveMutation.isPending || uploadMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save size={16} />
                    {savingSectionId === 'all' ? '保存全部中...' : '保存全部更改'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleStartEditing}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200"
                >
                  <PencilLine size={16} />
                  开始编辑
                </button>
              )}
            </div>
          </div>
        </header>

        <AdminFeedbackBanner feedback={feedback} onDismiss={() => setFeedback(EMPTY_FEEDBACK)} />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <article
              key={card.label}
              className="rounded-[28px] border border-neutral-800 bg-neutral-900/75 px-5 py-5 shadow-[0_24px_70px_-44px_rgba(0,0,0,0.75)]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">{card.label}</p>
              <p className="mt-4 text-2xl font-semibold text-white">{card.value}</p>
              <p className="mt-2 text-sm text-neutral-400">{card.helper}</p>
            </article>
          ))}
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),320px]">
          <main className="space-y-6">
            <SectionCard
              id="basic"
              title="基础信息"
              dirty={dirtyBySection.basic}
              isEditing={isEditing}
              isSaving={saveMutation.isPending && savingSectionId === 'basic'}
              onSave={() => handleSaveSection(SECTION_CONFIGS[0])}
            >
              <div className="grid gap-5 md:grid-cols-2">
                <FormField label="作品标题">
                  <input
                    type="text"
                    value={formData.title}
                    onChange={handleFieldChange('title')}
                    disabled={!isEditing}
                    className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </FormField>

                <FormField label="作品类型">
                  <select
                    value={formData.type}
                    onChange={handleFieldChange('type')}
                    disabled={!isEditing}
                    className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="连载状态">
                  <select
                    value={formData.status}
                    onChange={handleFieldChange('status')}
                    disabled={!isEditing}
                    className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="作品角标" helperText="例如：新作、独家、限时免费。">
                  <input
                    type="text"
                    value={formData.badge}
                    onChange={handleFieldChange('badge')}
                    disabled={!isEditing}
                    className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </FormField>
              </div>

              <div className="mt-5">
                <FormField label="作品简介">
                  <textarea
                    rows={7}
                    value={formData.description}
                    onChange={handleFieldChange('description')}
                    disabled={!isEditing}
                    className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm leading-7 text-white outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </FormField>
              </div>

              <div className="mt-5">
                <FormField label="分类 / 标签" helperText="多个标签用英文逗号分隔，例如：奇幻, 校园, 少女。">
                  <input
                    type="text"
                    value={formData.genres}
                    onChange={handleFieldChange('genres')}
                    disabled={!isEditing}
                    className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </FormField>
              </div>
            </SectionCard>

            <SectionCard
              id="distribution"
              title="发布与限制"
              dirty={dirtyBySection.distribution}
              isEditing={isEditing}
              isSaving={saveMutation.isPending && savingSectionId === 'distribution'}
              onSave={() => handleSaveSection(SECTION_CONFIGS[1])}
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-[28px] border border-neutral-800 bg-neutral-950/70 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold text-white">前台发布</h3>
                      <p className="text-sm leading-7 text-neutral-400">关闭后，作品会从前台列表和详情页隐藏。</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.isPublished}
                      onChange={handleFieldChange('isPublished')}
                      disabled={!isEditing}
                      className="mt-1 h-5 w-5 rounded border-neutral-700 bg-neutral-900"
                    />
                  </div>
                  <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                    当前状态：{formData.isPublished ? '已发布' : '草稿隐藏'}
                  </p>
                </div>

                <div className="rounded-[28px] border border-neutral-800 bg-neutral-950/70 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold text-white">18+ 限制</h3>
                      <p className="text-sm leading-7 text-neutral-400">标记后，前台会按成人内容规则进行限制和提示。</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.adult}
                      onChange={handleFieldChange('adult')}
                      disabled={!isEditing}
                      className="mt-1 h-5 w-5 rounded border-neutral-700 bg-neutral-900"
                    />
                  </div>
                  <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                    当前状态：{formData.adult ? '18+ 内容' : '全年龄'}
                  </p>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              id="commerce"
              title="商业设置"
              dirty={dirtyBySection.commerce}
              isEditing={isEditing}
              isSaving={saveMutation.isPending && savingSectionId === 'commerce'}
              onSave={() => handleSaveSection(SECTION_CONFIGS[2])}
            >
              <div className="grid gap-5 md:grid-cols-2">
                <FormField label="默认章节价格" helperText="单位为金币，0 表示免费章节。">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.episodePrice}
                    onChange={handleFieldChange('episodePrice')}
                    disabled={!isEditing}
                    className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </FormField>

                <div className="rounded-[28px] border border-neutral-800 bg-neutral-950/70 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold text-white">免费券</h3>
                      <p className="text-sm leading-7 text-neutral-400">按固定时间恢复，适合引导用户持续回访。</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.ttfEnabled}
                      onChange={handleFieldChange('ttfEnabled')}
                      disabled={!isEditing}
                      className="mt-1 h-5 w-5 rounded border-neutral-700 bg-neutral-900"
                    />
                  </div>

                  <div className="mt-4">
                    <FormField label="恢复间隔（小时）">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={formData.ttfIntervalHours}
                        onChange={handleFieldChange('ttfIntervalHours')}
                        disabled={!isEditing || !formData.ttfEnabled}
                        className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </FormField>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              id="cover"
              title="封面资源"
              dirty={dirtyBySection.cover}
              isEditing={isEditing}
              isSaving={saveMutation.isPending && savingSectionId === 'cover'}
              onSave={() => handleSaveSection(SECTION_CONFIGS[3])}
            >
              <div className="grid gap-6 lg:grid-cols-[280px,minmax(0,1fr)]">
                <div className="overflow-hidden rounded-[28px] border border-neutral-800 bg-neutral-950">
                  {formData.coverUrl ? (
                    <img
                      src={formData.coverUrl}
                      alt={`${formData.title || '作品'}封面`}
                      className="aspect-[2/3] h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[2/3] flex-col items-center justify-center gap-3 px-6 text-center text-sm text-neutral-500">
                      <ImageIcon size={28} />
                      <span>还没有上传封面资源。</span>
                    </div>
                  )}
                </div>

                <div className="space-y-5">
                  <FormField label="封面链接" helperText="可以直接贴 CDN / 图床链接，也可以先用下方上传。">
                    <input
                      type="url"
                      value={formData.coverUrl}
                      onChange={handleFieldChange('coverUrl')}
                      disabled={!isEditing}
                      className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </FormField>

                  <FormField label="封面色调" helperText="用于前台配色或人工标记，例如：warm、blue、neon。">
                    <input
                      type="text"
                      value={formData.coverTone}
                      onChange={handleFieldChange('coverTone')}
                      disabled={!isEditing}
                      className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </FormField>

                  {isEditing ? (
                    <label className="block rounded-[28px] border border-dashed border-neutral-700 bg-neutral-950/60 px-5 py-5 text-sm text-neutral-300 transition hover:border-neutral-500 hover:bg-neutral-950">
                      <span className="font-semibold text-white">上传新封面</span>
                      <span className="mt-2 block text-xs text-neutral-500">
                        支持 JPG、PNG、GIF、WEBP，文件大小不超过 10MB。
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverUpload}
                        disabled={uploadMutation.isPending}
                        className="mt-4 block w-full text-xs text-neutral-400 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </label>
                  ) : null}
                </div>
              </div>
            </SectionCard>
          </main>

          <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
            <section className="rounded-[28px] border border-neutral-800 bg-neutral-900/80 px-5 py-5 shadow-[0_24px_70px_-44px_rgba(0,0,0,0.75)]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">编辑导航</p>
              <div className="mt-4 space-y-2">
                {SECTION_CONFIGS.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => scrollToSection(section.id)}
                    className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${
                      activeSectionId === section.id
                        ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-100'
                        : 'border-neutral-800 bg-neutral-950/70 text-neutral-300 hover:border-neutral-700 hover:text-white'
                    }`}
                  >
                    <span>{section.title}</span>
                    <span className={`text-xs font-semibold ${dirtyBySection[section.id] ? 'text-amber-300' : 'text-neutral-500'}`}>
                      {dirtyBySection[section.id] ? '待保存' : '已同步'}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-neutral-800 bg-neutral-900/80 px-5 py-5 shadow-[0_24px_70px_-44px_rgba(0,0,0,0.75)]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">快捷操作</p>
              <div className="mt-4 space-y-2">
                <button
                  type="button"
                  onClick={() => router.push(`/admin/series/${seriesId}/episodes`)}
                  className="flex w-full items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-950/70 px-4 py-3 text-left text-sm text-neutral-300 transition hover:border-neutral-700 hover:text-white"
                >
                  <span className="inline-flex items-center gap-2">
                    <BookOpen size={16} />
                    去章节管理
                  </span>
                  <ArrowUpRight size={16} />
                </button>
                <a
                  href={`/series/${seriesId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-950/70 px-4 py-3 text-left text-sm text-neutral-300 transition hover:border-neutral-700 hover:text-white"
                >
                  <span className="inline-flex items-center gap-2">
                    <ArrowUpRight size={16} />
                    打开前台详情
                  </span>
                  <ArrowUpRight size={16} />
                </a>
                <button
                  type="button"
                  onClick={() => scrollToSection('cover')}
                  className="flex w-full items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-950/70 px-4 py-3 text-left text-sm text-neutral-300 transition hover:border-neutral-700 hover:text-white"
                >
                  <span className="inline-flex items-center gap-2">
                    <ImageIcon size={16} />
                    跳到封面资源
                  </span>
                  <ArrowUpRight size={16} />
                </button>
              </div>
            </section>

            <section className="rounded-[28px] border border-neutral-800 bg-neutral-900/80 px-5 py-5 shadow-[0_24px_70px_-44px_rgba(0,0,0,0.75)]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">作品信息</p>
              <div className="mt-3">
                <DetailRow label="作品 ID" value={series.id} />
                <DetailRow label="最新章节" value={series.latestEpisodeId || '暂无'} />
                <DetailRow label="创建时间" value={formatDateTime(series.createdAt)} />
                <DetailRow label="更新时间" value={formatDateTime(series.updatedAt)} />
                <DetailRow label="当前类型" value={formatSeriesTypeLabel(formData.type)} />
                <DetailRow label="当前状态" value={formatSeriesStatusLabel(formData.status)} />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
