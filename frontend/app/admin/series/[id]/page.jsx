'use client';

/* eslint-disable @next/next/no-img-element */

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
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

function buildSeriesPayload(formData) {
  const episodePrice = Number.parseInt(String(formData.episodePrice || '0'), 10);
  const intervalHours = Number.parseInt(String(formData.ttfIntervalHours || '24'), 10);

  return {
    title: formData.title.trim(),
    type: formData.type || 'comic',
    status: formData.status || 'Ongoing',
    adult: Boolean(formData.adult),
    isPublished: Boolean(formData.isPublished),
    description: formData.description.trim(),
    genres: String(formData.genres || '')
      .split(',')
      .map((genre) => genre.trim())
      .filter(Boolean),
    coverUrl: formData.coverUrl.trim(),
    coverTone: formData.coverTone.trim(),
    badge: formData.badge.trim(),
    pricing: {
      episodePrice: Number.isFinite(episodePrice) ? episodePrice : 0,
    },
    ttf: {
      enabled: Boolean(formData.ttfEnabled),
      intervalHours: Number.isFinite(intervalHours) && intervalHours > 0 ? intervalHours : 24,
    },
  };
}

function formatSeriesTypeLabel(value) {
  return TYPE_OPTIONS.find((option) => option.value === value)?.label || '漫画';
}

function formatSeriesStatusLabel(value) {
  return STATUS_OPTIONS.find((option) => option.value === value)?.label || '连载中';
}

function getErrorMessage(error, fallbackMessage) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
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
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function isNonNegativeIntegerString(value, { allowEmpty = false } = {}) {
  const normalized = String(value ?? '').trim();

  if (!normalized) {
    return allowEmpty;
  }

  return /^\d+$/.test(normalized);
}

function validateSeriesDraft(formData) {
  if (!formData.title.trim()) {
    return '标题不能为空。';
  }

  if (!isNonNegativeIntegerString(formData.episodePrice, { allowEmpty: true })) {
    return '章节价格必须是整数金币。';
  }

  if (formData.ttfEnabled) {
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

  if (response.status === 404) {
    return null;
  }

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

export default function AdminSeriesDetailPage() {
  const params = useParams();
  const router = useRouter();
  const seriesId = String(params?.id || '');

  const [formData, setFormData] = useState(createEmptyForm());
  const [isEditing, setIsEditing] = useState(false);
  const [feedback, setFeedback] = useState(EMPTY_FEEDBACK);

  const seriesQuery = useQuery({
    queryKey: ['admin', 'series', seriesId],
    enabled: Boolean(seriesId),
    staleTime: 60_000,
    queryFn: () => fetchSeriesDetail(seriesId),
  });

  useEffect(() => {
    if (seriesQuery.data && !isEditing) {
      setFormData(buildFormState(seriesQuery.data));
    }
  }, [isEditing, seriesQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (draft) => {
      const payload = { series: buildSeriesPayload(draft) };
      const { response, data } = await adminFetchJson(`/api/admin/series/${seriesId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

        if (!response.ok) {
        throw new Error(data?.message || data?.error || '保存作品详情失败。');
      }

      return data?.series || null;
    },
    onSuccess: async (series) => {
      if (series) {
        setFormData(buildFormState(series));
      }
      setIsEditing(false);
      setFeedback({ type: 'success', message: '作品详情已保存。' });
      await seriesQuery.refetch();
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error, '保存作品详情失败。') });
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
      setFormData((current) => ({
        ...current,
        coverUrl: data.url,
      }));
      setFeedback({ type: 'success', message: '封面上传成功，保存后即可生效。' });
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error, '上传封面失败。') });
    },
  });

  const series = seriesQuery.data;

  const handleFieldChange = (field) => (event) => {
    const nextValue = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setFormData((current) => ({
      ...current,
      [field]: nextValue,
    }));
  };

  const handleStartEditing = () => {
    setFeedback(EMPTY_FEEDBACK);
    setFormData(buildFormState(series));
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setFeedback(EMPTY_FEEDBACK);
    setFormData(buildFormState(series));
    setIsEditing(false);
  };

  const handleSave = () => {
    setFeedback(EMPTY_FEEDBACK);

    const validationMessage = validateSeriesDraft(formData);
    if (validationMessage) {
      setFeedback({ type: 'error', message: validationMessage });
      return;
    }

    saveMutation.mutate(formData);
  };

  const handleCoverUpload = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

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

  if (seriesQuery.isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 px-6 py-8">
        <div className="mx-auto max-w-6xl rounded-3xl border border-neutral-800 bg-neutral-900/80 px-6 py-16">
          <LoadingState.Spinner size="md" />
        </div>
      </div>
    );
  }

  if (seriesQuery.isError) {
    return (
      <div className="min-h-screen bg-neutral-950 px-6 py-8">
        <div className="mx-auto max-w-6xl rounded-3xl border border-neutral-800 bg-neutral-900/80 px-6 py-16">
          <LoadingState.ErrorState
            error={getErrorMessage(seriesQuery.error, '作品详情加载失败。')}
            onRetry={() => seriesQuery.refetch()}
          />
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
            action={
              <button
                type="button"
                onClick={() => router.push('/admin/series')}
                className="rounded-2xl border border-neutral-700 px-4 py-2 text-sm font-medium text-white transition hover:border-neutral-500 hover:bg-neutral-900"
              >
                返回作品库
              </button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl border border-neutral-800 bg-neutral-900/80 px-6 py-6 shadow-[0_24px_80px_-36px_rgba(0,0,0,0.8)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => router.push('/admin/series')}
                className="inline-flex w-fit rounded-2xl border border-neutral-700 px-3 py-2 text-xs font-medium uppercase tracking-[0.2em] text-neutral-300 transition hover:border-neutral-500 hover:text-white"
              >
                 返回作品库
              </button>
              <div className="space-y-2">
                 <h1 className="text-3xl font-semibold tracking-tight text-white">{series.title || '未命名作品'}</h1>
                 <p className="max-w-3xl text-sm text-neutral-400">
                   在一个详情页中统一管理定价、年龄限制、封面和免费券规则。
                 </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push(`/admin/series/${seriesId}/episodes`)}
                className="rounded-2xl border border-neutral-700 px-4 py-2 text-sm font-medium text-white transition hover:border-neutral-500 hover:bg-neutral-900"
              >
                 管理章节
              </button>

              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={handleCancelEditing}
                    disabled={uploadMutation.isPending || saveMutation.isPending}
                    className="rounded-2xl border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:border-neutral-500 hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                     取消
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saveMutation.isPending || uploadMutation.isPending}
                    className="rounded-2xl bg-cyan-500 px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                     {saveMutation.isPending ? '保存中...' : uploadMutation.isPending ? '上传封面中...' : '保存更改'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleStartEditing}
                  className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
                >
                   编辑作品
                </button>
              )}
            </div>
          </div>
        </header>

        <AdminFeedbackBanner feedback={feedback} onDismiss={() => setFeedback(EMPTY_FEEDBACK)} />

        <div className="grid gap-6 xl:grid-cols-[1.35fr,0.85fr]">
          <section className="space-y-6 rounded-3xl border border-neutral-800 bg-neutral-900/80 px-6 py-6 shadow-[0_24px_80px_-36px_rgba(0,0,0,0.8)]">
            <div className="grid gap-5 md:grid-cols-2">
              <FormField label="标题">
                <input
                  type="text"
                  value={formData.title}
                  onChange={handleFieldChange('title')}
                  disabled={!isEditing}
                  className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </FormField>

              <FormField label="类型">
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

              <FormField label="状态">
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

              <FormField label="章节价格" helperText="按单章金币价格保存。">
                <input
                  type="number"
                  min="0"
                  value={formData.episodePrice}
                  onChange={handleFieldChange('episodePrice')}
                  disabled={!isEditing}
                  className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </FormField>
            </div>

            <FormField label="简介">
              <textarea
                rows={7}
                value={formData.description}
                onChange={handleFieldChange('description')}
                disabled={!isEditing}
                className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </FormField>

            <div className="grid gap-5 md:grid-cols-2">
              <FormField label="标签" helperText="多个标签请用逗号分隔。">
                <input
                  type="text"
                  value={formData.genres}
                  onChange={handleFieldChange('genres')}
                  disabled={!isEditing}
                  className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </FormField>

              <FormField label="角标" helperText="可选，会显示在作品卡片上。">
                <input
                  type="text"
                  value={formData.badge}
                  onChange={handleFieldChange('badge')}
                  disabled={!isEditing}
                  className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </FormField>

              <FormField label="封面色调">
                <input
                  type="text"
                  value={formData.coverTone}
                  onChange={handleFieldChange('coverTone')}
                  disabled={!isEditing}
                  className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </FormField>

              <FormField label="封面链接" helperText="上传后会自动更新，也可以手动粘贴外部资源链接。">
                <input
                  type="url"
                  value={formData.coverUrl}
                  onChange={handleFieldChange('coverUrl')}
                  disabled={!isEditing}
                  className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </FormField>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <div className="rounded-3xl border border-neutral-800 bg-neutral-950/70 px-5 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                     <h2 className="text-base font-semibold text-white">发布状态</h2>
                     <p className="text-sm text-neutral-500">控制该作品是否在前台站点可见。</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.isPublished}
                    onChange={handleFieldChange('isPublished')}
                    disabled={!isEditing}
                    className="mt-1 h-5 w-5 rounded border-neutral-700 bg-neutral-900"
                  />
                </div>
                 <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">{formData.isPublished ? '已发布' : '已隐藏'}</p>
              </div>

              <div className="rounded-3xl border border-neutral-800 bg-neutral-950/70 px-5 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                     <h2 className="text-base font-semibold text-white">年龄限制</h2>
                     <p className="text-sm text-neutral-500">将该作品标记为仅限成人访问。</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.adult}
                    onChange={handleFieldChange('adult')}
                    disabled={!isEditing}
                    className="mt-1 h-5 w-5 rounded border-neutral-700 bg-neutral-900"
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-neutral-800 bg-neutral-950/70 px-5 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                     <h2 className="text-base font-semibold text-white">免费券规则</h2>
                     <p className="text-sm text-neutral-500">控制该作品是否启用按时间恢复的免费券。</p>
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
                   <FormField label="刷新间隔（小时）">
                    <input
                      type="number"
                      min="1"
                      value={formData.ttfIntervalHours}
                      onChange={handleFieldChange('ttfIntervalHours')}
                      disabled={!isEditing || !formData.ttfEnabled}
                      className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </FormField>
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-neutral-800 bg-neutral-900/80 px-6 py-6 shadow-[0_24px_80px_-36px_rgba(0,0,0,0.8)]">
               <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">封面资源</p>
              <div className="mt-5 overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950">
                {formData.coverUrl ? (
                   <img src={formData.coverUrl} alt={`${formData.title || '作品'}封面`} className="aspect-[2/3] w-full object-cover" />
                 ) : (
                   <div className="flex aspect-[2/3] items-center justify-center px-6 text-center text-sm text-neutral-500">
                     暂未上传封面资源。
                   </div>
                 )}
              </div>

              {isEditing ? (
                <label className="mt-4 block rounded-2xl border border-dashed border-neutral-700 px-4 py-4 text-sm text-neutral-300 transition hover:border-neutral-500 hover:bg-neutral-950">
                   <span className="font-medium text-white">上传新封面</span>
                   <span className="mt-1 block text-xs text-neutral-500">支持 JPG、PNG、GIF 或 WEBP，大小不超过 10MB。</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverUpload}
                    disabled={uploadMutation.isPending}
                    className="mt-3 block w-full text-xs text-neutral-400 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </label>
              ) : null}
            </section>

            <section className="rounded-3xl border border-neutral-800 bg-neutral-900/80 px-6 py-6 shadow-[0_24px_80px_-36px_rgba(0,0,0,0.8)]">
               <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">作品信息</p>
               <div className="mt-4">
                 <DetailRow label="作品 ID" value={series.id} />
                 <DetailRow label="创建时间" value={formatDateTime(series.createdAt)} />
                 <DetailRow label="更新时间" value={formatDateTime(series.updatedAt)} />
                 <DetailRow label="类型" value={formatSeriesTypeLabel(formData.type)} />
                 <DetailRow label="状态" value={formatSeriesStatusLabel(formData.status)} />
                 <DetailRow label="发布状态" value={formData.isPublished ? '已发布' : '已隐藏'} />
               </div>
             </section>

             <section className="rounded-3xl border border-neutral-800 bg-neutral-900/80 px-6 py-6 shadow-[0_24px_80px_-36px_rgba(0,0,0,0.8)]">
               <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">操作说明</p>
               <div className="mt-4 space-y-3 text-sm leading-7 text-neutral-300">
                 <p>章节价格和免费券设置会通过统一的后台作品接口写入。</p>
                 <p>封面上传已经接入公共后台上传客户端，认证头和 CSRF 处理保持一致。</p>
                 <p>从本页保存时，提交的数据结构与后端控制器要求保持一致。</p>
               </div>
             </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
