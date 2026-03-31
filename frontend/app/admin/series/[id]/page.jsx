'use client';

/* eslint-disable @next/next/no-img-element */

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Eye,
  EyeOff,
  Image as ImageIcon,
  PencilLine,
  Plus,
  Save,
  Trash2,
  Users,
} from 'lucide-react';

import AdminShell from '@/components/admin/AdminShell';
import { AdminFeedbackBanner } from '@/components/admin/common/AdminFeedbackBanner';
import { AdminDataState } from '@/components/admin/common/AdminDataState';
import {
  AdminBadge,
  AdminFormField,
  AdminKeyValueList,
  AdminMetricCard,
  AdminPageSection,
  adminInputClassName,
  adminSelectClassName,
  adminTextareaClassName,
} from '@/components/admin/common/AdminWorkspacePrimitives';
import { Button } from '@/components/ui/button';
import { adminFetchJson, adminUpload } from '@/lib/adminApiClient';
import { getAdminSeriesReadiness } from '@/lib/adminSeriesReadiness';
import { cn } from '@/lib/utils';

const TYPE_OPTIONS = [
  { value: 'comic', label: '漫画' },
  { value: 'novel', label: '小说' },
];

const STATUS_OPTIONS = [
  { value: 'Ongoing', label: '连载中' },
  { value: 'Completed', label: '已完结' },
  { value: 'Hiatus', label: '休更中' },
  { value: 'Cancelled', label: '已下线' },
];

const CREDIT_ROLE_OPTIONS = [
  { value: 'AUTHOR', label: '作者' },
  { value: 'WRITER', label: '编剧' },
  { value: 'ARTIST', label: '主笔' },
  { value: 'ADAPTER', label: '改编' },
  { value: 'TEAM', label: '团队' },
  { value: 'STUDIO', label: '工作室' },
  { value: 'CREATOR', label: '创作' },
];

const CREDIT_TYPE_OPTIONS = [
  { value: 'person', label: '人物' },
  { value: 'team', label: '团队' },
  { value: 'studio', label: '工作室' },
];

const EMPTY_FEEDBACK = { type: '', message: '' };
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function normalizeParam(value) {
  if (Array.isArray(value)) {
    return value[0] || '';
  }

  return typeof value === 'string' ? value : '';
}

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
  };
}

function createEmptyCreditRow(index = 0) {
  return {
    id: `draft-credit-${Date.now()}-${index}`,
    creatorId: '',
    name: '',
    role: 'AUTHOR',
    type: 'person',
    sortOrder: index,
    isPrimary: index === 0,
    isPublic: true,
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
  };
}

function buildCreditsState(credits) {
  const rows = (Array.isArray(credits) ? credits : [])
    .filter(Boolean)
    .map((credit, index) => ({
      id: String(credit?.id || `credit-${index + 1}`),
      creatorId: String(credit?.creatorId || ''),
      name: String(credit?.name || ''),
      role: String(credit?.role || 'author').toUpperCase(),
      type: String(credit?.type || 'person').toLowerCase(),
      sortOrder: Number(credit?.sortOrder ?? index) || index,
      isPrimary: Boolean(credit?.isPrimary),
      isPublic: credit?.isPublic !== false,
    }))
    .sort((left, right) => left.sortOrder - right.sortOrder);

  if (rows.length === 0) {
    return [createEmptyCreditRow(0)];
  }

  const hasPrimary = rows.some((row) => row.isPrimary);
  return rows.map((row, index) => ({
    ...row,
    sortOrder: index,
    isPrimary: hasPrimary ? row.isPrimary : index === 0,
  }));
}

function normalizeGenresInput(value) {
  return String(value || '')
    .split(',')
    .map((genre) => genre.trim())
    .filter(Boolean);
}

function buildSeriesPayload(formData) {
  return {
    title: formData.title.trim(),
    type: formData.type || 'comic',
    status: formData.status || 'Ongoing',
    adult: Boolean(formData.adult),
    isPublished: Boolean(formData.isPublished),
    description: formData.description.trim(),
    genres: normalizeGenresInput(formData.genres),
    coverUrl: formData.coverUrl.trim(),
    coverTone: formData.coverTone.trim(),
  };
}

function buildCreditsPayload(credits) {
  const normalizedRows = (Array.isArray(credits) ? credits : [])
    .map((credit, index) => ({
      creatorId: String(credit?.creatorId || '').trim(),
      name: String(credit?.name || '').trim(),
      role: String(credit?.role || 'AUTHOR').trim().toUpperCase(),
      type: String(credit?.type || 'person').trim().toLowerCase(),
      sortOrder: Number(credit?.sortOrder ?? index) || index,
      isPrimary: Boolean(credit?.isPrimary),
      isPublic: credit?.isPublic !== false,
    }))
    .filter((credit) => credit.name);

  const firstPublicIndex = normalizedRows.findIndex((credit) => credit.isPublic);
  const hasPrimary = normalizedRows.some((credit) => credit.isPrimary && credit.isPublic);

  return normalizedRows.map((credit, index) => ({
    ...credit,
    sortOrder: index,
    isPrimary: hasPrimary
      ? credit.isPrimary && credit.isPublic
      : index === (firstPublicIndex >= 0 ? firstPublicIndex : 0) && credit.isPublic,
  }));
}

function validateSeriesDraft(formData) {
  if (!formData.title.trim()) {
    return '作品标题不能为空。';
  }

  return '';
}

function validateCreditsDraft(credits) {
  const namedCredits = (Array.isArray(credits) ? credits : []).filter((credit) =>
    String(credit?.name || '').trim(),
  );

  if (namedCredits.length === 0) {
    return '';
  }

  const hasPrimaryPublicCredit = namedCredits.some(
    (credit) => credit.isPrimary && credit.isPublic,
  );

  if (!hasPrimaryPublicCredit) {
    return '至少保留一条公开主署名，前台作品页和创作者页才有稳定身份。';
  }

  return '';
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

function getErrorMessage(error, fallbackMessage) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

async function fetchSeriesDetail(seriesId) {
  const { response, data } = await adminFetchJson(`/api/admin/series/${seriesId}`, {
    cache: 'no-store',
  });
  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(data?.message || data?.error || '作品详情加载失败。');
  }

  return data?.series || null;
}

async function fetchSeriesCredits(seriesId) {
  const { response, data } = await adminFetchJson(`/api/admin/series/${seriesId}/credits`, {
    cache: 'no-store',
  });
  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(data?.message || data?.error || '创作者署名加载失败。');
  }

  return {
    credits: Array.isArray(data?.credits) ? data.credits : [],
    creator: data?.creator || null,
    author: String(data?.author || ''),
  };
}

export default function AdminSeriesDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const seriesId = normalizeParam(params?.id);

  const [formData, setFormData] = useState(createEmptyForm());
  const [creditsDraft, setCreditsDraft] = useState([createEmptyCreditRow(0)]);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreditsEditing, setIsCreditsEditing] = useState(false);
  const [feedback, setFeedback] = useState(EMPTY_FEEDBACK);
  const [creditsFeedback, setCreditsFeedback] = useState(EMPTY_FEEDBACK);

  const seriesQuery = useQuery({
    queryKey: ['admin', 'series', seriesId],
    enabled: Boolean(seriesId),
    staleTime: 60_000,
    queryFn: () => fetchSeriesDetail(seriesId),
  });

  const creditsQuery = useQuery({
    queryKey: ['admin', 'series', seriesId, 'credits'],
    enabled: Boolean(seriesId),
    staleTime: 60_000,
    queryFn: () => fetchSeriesCredits(seriesId),
  });

  const series = seriesQuery.data;
  const baselineForm = useMemo(() => buildFormState(series), [series]);
  const baselineCredits = useMemo(
    () => buildCreditsState(creditsQuery.data?.credits),
    [creditsQuery.data?.credits],
  );

  useEffect(() => {
    if (seriesQuery.data && !isEditing) {
      setFormData(buildFormState(seriesQuery.data));
    }
  }, [isEditing, seriesQuery.data]);

  useEffect(() => {
    if (creditsQuery.data && !isCreditsEditing) {
      setCreditsDraft(buildCreditsState(creditsQuery.data.credits));
    }
  }, [creditsQuery.data, isCreditsEditing]);

  const overallDirty = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(baselineForm),
    [baselineForm, formData],
  );
  const creditsDirty = useMemo(
    () => JSON.stringify(creditsDraft) !== JSON.stringify(baselineCredits),
    [baselineCredits, creditsDraft],
  );

  const publicCredits = useMemo(
    () =>
      buildCreditsPayload(isCreditsEditing ? creditsDraft : baselineCredits).filter(
        (credit) => credit.isPublic,
      ),
    [baselineCredits, creditsDraft, isCreditsEditing],
  );

  const creatorPreviewLabel = useMemo(() => {
    if (publicCredits.length === 0) {
      return creditsQuery.data?.author || series?.author || '待补充';
    }

    const primaryCredit = publicCredits.find((credit) => credit.isPrimary) || publicCredits[0];
    if (!primaryCredit) {
      return '待补充';
    }

    if (publicCredits.length === 1) {
      return primaryCredit.name;
    }

    if (publicCredits.length === 2) {
      return `${publicCredits[0].name} 与 ${publicCredits[1].name}`;
    }

    return `${primaryCredit.name} 等 ${publicCredits.length} 位`;
  }, [creditsQuery.data?.author, publicCredits, series?.author]);

  const readiness = useMemo(
    () =>
      getAdminSeriesReadiness({
        ...(series || {}),
        creatorCredits: publicCredits,
        creator: creditsQuery.data?.creator || series?.creator,
        author: creditsQuery.data?.author || series?.author || '',
        coverUrl: formData.coverUrl,
        description: formData.description,
        genres: normalizeGenresInput(formData.genres),
        isPublished: formData.isPublished,
      }),
    [
      creditsQuery.data?.author,
      creditsQuery.data?.creator,
      formData.coverUrl,
      formData.description,
      formData.genres,
      formData.isPublished,
      publicCredits,
      series,
    ],
  );

  const saveMutation = useMutation({
    mutationFn: async (draft) => {
      const { response, data } = await adminFetchJson(`/api/admin/series/${seriesId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ series: buildSeriesPayload(draft) }),
      });

      if (!response.ok) {
        throw new Error(data?.message || data?.error || '作品详情保存失败。');
      }

      return data?.series || null;
    },
    onSuccess: (updatedSeries) => {
      if (updatedSeries) {
        queryClient.setQueryData(['admin', 'series', seriesId], updatedSeries);
        setFormData(buildFormState(updatedSeries));
      }

      setIsEditing(false);
      setFeedback({ type: 'success', message: '作品详情已保存。' });
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error, '作品详情保存失败。') });
    },
  });

  const saveCreditsMutation = useMutation({
    mutationFn: async (draft) => {
      const { response, data } = await adminFetchJson(`/api/admin/series/${seriesId}/credits`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credits: buildCreditsPayload(draft) }),
      });

      if (!response.ok) {
        throw new Error(data?.message || data?.error || '创作者署名保存失败。');
      }

      return data || null;
    },
    onSuccess: (data) => {
      const nextCreditsState = buildCreditsState(data?.credits);
      setCreditsDraft(nextCreditsState);
      setIsCreditsEditing(false);
      setCreditsFeedback({ type: 'success', message: '创作者署名已保存。' });

      queryClient.setQueryData(['admin', 'series', seriesId, 'credits'], {
        credits: Array.isArray(data?.credits) ? data.credits : [],
        creator: data?.creator || null,
        author: String(data?.author || ''),
      });
      queryClient.setQueryData(['admin', 'series', seriesId], (current) =>
        current
          ? {
              ...current,
              author: String(data?.author || ''),
              creator: data?.creator || current.creator,
              creatorCredits: Array.isArray(data?.publicCredits)
                ? data.publicCredits
                : current.creatorCredits,
            }
          : current,
      );
    },
    onError: (error) => {
      setCreditsFeedback({ type: 'error', message: getErrorMessage(error, '创作者署名保存失败。') });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const uploadPayload = new FormData();
      uploadPayload.append('file', file);
      const response = await adminUpload('/api/admin/upload/image', uploadPayload);

      if (!response.ok || !response.data?.url) {
        throw new Error(response.error || response.message || '封面上传失败。');
      }

      return response.data;
    },
    onSuccess: (data) => {
      setFormData((current) => ({ ...current, coverUrl: data.url }));
      setFeedback({ type: 'success', message: '封面已上传，保存后会写入作品记录。' });
      setIsEditing(true);
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error, '封面上传失败。') });
    },
  });

  const handleFieldChange = (field) => (event) => {
    const nextValue = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setFormData((current) => ({ ...current, [field]: nextValue }));
  };

  const handleCreditFieldChange = (creditId, field, value) => {
    setCreditsDraft((current) =>
      current.map((credit) => {
        if (credit.id !== creditId) {
          return field === 'isPrimary' && value
            ? { ...credit, isPrimary: false }
            : credit;
        }

        if (field === 'isPrimary') {
          return { ...credit, isPrimary: Boolean(value) };
        }

        return {
          ...credit,
          [field]: field === 'sortOrder' ? Number(value) || 0 : value,
        };
      }),
    );
  };

  const handleAddCredit = () => {
    setCreditsFeedback(EMPTY_FEEDBACK);
    setIsCreditsEditing(true);
    setCreditsDraft((current) => [...current, createEmptyCreditRow(current.length)]);
  };

  const handleRemoveCredit = (creditId) => {
    setCreditsDraft((current) => {
      const next = current.filter((credit) => credit.id !== creditId);
      return next.length > 0
        ? next.map((credit, index) => ({ ...credit, sortOrder: index }))
        : [createEmptyCreditRow(0)];
    });
    setIsCreditsEditing(true);
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
  };

  const handleStartCreditsEditing = () => {
    setCreditsFeedback(EMPTY_FEEDBACK);
    setCreditsDraft(baselineCredits);
    setIsCreditsEditing(true);
  };

  const handleCancelCreditsEditing = () => {
    setCreditsFeedback(EMPTY_FEEDBACK);
    setCreditsDraft(baselineCredits);
    setIsCreditsEditing(false);
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

  const handleSaveCredits = () => {
    setCreditsFeedback(EMPTY_FEEDBACK);
    const validationMessage = validateCreditsDraft(creditsDraft);

    if (validationMessage) {
      setCreditsFeedback({ type: 'error', message: validationMessage });
      return;
    }

    saveCreditsMutation.mutate(creditsDraft);
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
      <AdminShell title="作品详情" subtitle="正在加载作品工作台...">
        <AdminDataState isLoading={true} hasData={false} />
      </AdminShell>
    );
  }

  if (seriesQuery.isError) {
    return (
      <AdminShell title="作品详情" subtitle="作品工作台加载失败。">
        <AdminDataState
          isLoading={false}
          hasData={false}
          emptyMessage={getErrorMessage(seriesQuery.error, '作品详情加载失败。')}
        />
      </AdminShell>
    );
  }

  if (!series) {
    return (
      <AdminShell title="作品详情" subtitle="没有找到这部作品。">
        <AdminDataState isLoading={false} hasData={false} emptyMessage="这条作品记录不存在。" />
      </AdminShell>
    );
  }

  const normalizedGenres = normalizeGenresInput(formData.genres);
  const descriptionLength = formData.description.trim().length;
  const coverStatus = formData.coverUrl.trim() ? '封面已就绪' : '封面待补';
  const synopsisStatus = descriptionLength > 0 ? `${descriptionLength} 字简介` : '简介待补';
  const genreStatus = normalizedGenres.length > 0 ? `${normalizedGenres.length} 个标签` : '标签待补';
  const hasLegacyAuthorFallback = !publicCredits.length && Boolean(creditsQuery.data?.author || series?.author);
  const creatorStatusDetail = publicCredits.length
    ? `${publicCredits.length} 条公开 credits · ${coverStatus} · ${genreStatus}`
    : hasLegacyAuthorFallback
      ? '当前仍由旧 author 字段兼容兜底，建议尽快迁到真实 credits。'
      : '当前还缺少可公开展示的署名。';

  const summaryCards = [
    {
      label: '章节数',
      value: String(series.episodeCount || 0),
      detail: series.latestEpisodeId ? `最新章节：${series.latestEpisodeId}` : '还没有章节。',
      tone: 'accent',
    },
    {
      label: '发布状态',
      value: formData.isPublished ? '已发布' : '草稿',
      detail: formData.adult ? '当前开启 18+ 限制。' : '当前为普通向内容。',
    },
    {
      label: '创作者',
      value: creatorPreviewLabel,
      detail: creatorStatusDetail,
    },
    {
      label: '前台就绪度',
      value: readiness.score,
      detail: readiness.summary,
    },
  ];

  return (
    <AdminShell
      title={series.title || '作品详情'}
      subtitle="先把读者会直接看到的内容信息收稳：标题、简介、封面、发布状态和真实创作者署名。"
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="flex flex-wrap items-center gap-2 rounded-full border border-black/8 bg-white/78 p-1.5">
            <Button type="button" variant="ghost" onClick={() => router.push('/admin/series')}>
              <ArrowLeft className="size-4" />
              返回作品列表
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push(`/admin/series/${seriesId}/episodes`)}
            >
              <BookOpen className="size-4" />
              章节管理
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => window.open(`/series/${seriesId}`, '_blank', 'noopener,noreferrer')}
            >
              <ArrowUpRight className="size-4" />
              查看前台页
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-full border border-black/8 bg-white/88 p-1.5 shadow-[0_10px_24px_rgba(15,23,42,0.03)]">
            {isEditing ? (
              <>
                <Button type="button" variant="secondary" onClick={handleCancelEditing}>
                  取消
                </Button>
                <Button type="button" onClick={handleSave} disabled={!overallDirty || saveMutation.isPending}>
                  <Save className="size-4" />
                  {saveMutation.isPending ? '保存中...' : '保存更改'}
                </Button>
              </>
            ) : (
              <Button type="button" onClick={handleStartEditing}>
                <PencilLine className="size-4" />
                编辑详情
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <AdminMetricCard key={card.label} {...card} />
          ))}
        </div>

        <AdminFeedbackBanner feedback={feedback} onDismiss={() => setFeedback(EMPTY_FEEDBACK)} />
        <AdminFeedbackBanner
          feedback={creditsFeedback}
          onDismiss={() => setCreditsFeedback(EMPTY_FEEDBACK)}
        />

        <AdminPageSection
          title="基础信息"
          description="把标题、简介和标签收干净，前台发现流和作品详情页才会更可信。"
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <AdminFormField label="作品标题">
              <input
                type="text"
                value={formData.title}
                onChange={handleFieldChange('title')}
                disabled={!isEditing}
                className={adminInputClassName}
              />
            </AdminFormField>
            <AdminFormField label="作品形式">
              <select
                value={formData.type}
                onChange={handleFieldChange('type')}
                disabled={!isEditing}
                className={adminSelectClassName}
              >
                {TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </AdminFormField>
            <AdminFormField label="连载状态">
              <select
                value={formData.status}
                onChange={handleFieldChange('status')}
                disabled={!isEditing}
                className={adminSelectClassName}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </AdminFormField>
          </div>

          <div className="mt-5">
            <AdminFormField label="作品简介">
              <textarea
                value={formData.description}
                onChange={handleFieldChange('description')}
                disabled={!isEditing}
                rows={6}
                className={adminTextareaClassName}
              />
            </AdminFormField>
          </div>

          <div className="mt-5">
            <AdminFormField label="题材与标签" helperText="多个标签请用逗号分隔。">
              <input
                type="text"
                value={formData.genres}
                onChange={handleFieldChange('genres')}
                disabled={!isEditing}
                className={adminInputClassName}
              />
            </AdminFormField>
          </div>
        </AdminPageSection>

        <div id="creator" className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
          <div className="space-y-6">
            <AdminPageSection
              title="封面"
              description="一张稳定的封面，比花哨的后台指标更能提升前台信任感。"
            >
              <div className="overflow-hidden rounded-[26px] border border-black/8 bg-[rgba(250,247,241,0.78)]">
                {formData.coverUrl ? (
                  <img
                    src={formData.coverUrl}
                    alt={`${formData.title || '作品'}封面`}
                    className="aspect-[2/3] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[2/3] flex-col items-center justify-center gap-3 px-6 text-center text-sm text-slate-500">
                    <ImageIcon size={28} />
                    <span>还没有封面图片。</span>
                  </div>
                )}
              </div>

              <div className="mt-5 space-y-4">
                <AdminFormField label="封面链接">
                  <input
                    type="url"
                    value={formData.coverUrl}
                    onChange={handleFieldChange('coverUrl')}
                    disabled={!isEditing}
                    className={adminInputClassName}
                  />
                </AdminFormField>
                <AdminFormField label="封面风格备注" helperText="可选填写，例如暖色、冷调、悬疑、压抑等编辑备注。">
                  <input
                    type="text"
                    value={formData.coverTone}
                    onChange={handleFieldChange('coverTone')}
                    disabled={!isEditing}
                    className={adminInputClassName}
                  />
                </AdminFormField>
                {isEditing ? (
                  <label className="block rounded-[22px] border border-dashed border-black/10 bg-[rgba(250,247,241,0.78)] px-4 py-4 text-sm text-slate-600">
                    <span className="font-semibold text-slate-950">上传新封面</span>
                    <span className="mt-1 block text-xs text-slate-500">
                      支持 JPG、PNG、GIF、WEBP，大小不能超过 10MB。
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverUpload}
                      disabled={uploadMutation.isPending}
                      className="mt-4 block w-full text-xs text-slate-500"
                    />
                  </label>
                ) : null}
              </div>
            </AdminPageSection>

            <AdminPageSection
              title="前台就绪度"
              description="快速看出还缺哪些地方会拖累前台作品页。"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-3xl font-semibold tracking-tight text-slate-950">
                    {readiness.score}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{readiness.summary}</p>
                </div>
                <AdminBadge
                  tone={
                    readiness.tone === 'emerald'
                      ? 'success'
                      : readiness.tone === 'amber'
                        ? 'warning'
                        : readiness.tone === 'rose'
                          ? 'danger'
                          : 'accent'
                  }
                >
                  {readiness.statusLabel}
                </AdminBadge>
              </div>

              <div className="mt-4 space-y-2">
                {readiness.checks.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[20px] border border-black/6 bg-[rgba(250,247,241,0.82)] px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-950">{item.label}</p>
                      <AdminBadge tone={item.ok ? 'success' : 'warning'}>
                        {item.ok ? '已就绪' : '待处理'}
                      </AdminBadge>
                    </div>
                    <p className="mt-2 text-xs leading-6 text-slate-500">{item.hint}</p>
                  </div>
                ))}
              </div>
            </AdminPageSection>

            <AdminPageSection
              title="记录信息"
              description="用来核对这部作品当前的后台记录状态。"
            >
              <AdminKeyValueList
                items={[
                  { label: '作品 ID', value: series.id },
                  { label: '创建时间', value: formatDateTime(series.createdAt) },
                  { label: '最近更新', value: formatDateTime(series.updatedAt) },
                  { label: '最新章节', value: series.latestEpisodeId || '暂无' },
                  { label: '封面状态', value: coverStatus },
                  { label: '简介状态', value: synopsisStatus },
                  { label: '标签状态', value: genreStatus },
                ]}
              />
            </AdminPageSection>
          </div>

          <div className="space-y-6">
            <AdminPageSection
              title="创作者署名与 credits"
              description="这里维护的才是作品页和创作者页真正会使用的公开署名。不要再只改旧 author 字段了。"
              action={
                <div className="flex flex-wrap gap-2">
                  {isCreditsEditing ? (
                    <>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleCancelCreditsEditing}
                      >
                        取消
                      </Button>
                      <Button
                        type="button"
                        onClick={handleSaveCredits}
                        disabled={!creditsDirty || saveCreditsMutation.isPending}
                      >
                        <Save className="size-4" />
                        {saveCreditsMutation.isPending ? '保存中...' : '保存署名'}
                      </Button>
                    </>
                  ) : (
                    <Button type="button" onClick={handleStartCreditsEditing}>
                      <Users className="size-4" />
                      编辑署名
                    </Button>
                  )}
                  <Button type="button" variant="secondary" onClick={handleAddCredit}>
                    <Plus className="size-4" />
                    添加 credit
                  </Button>
                </div>
              }
            >
              <div className="space-y-4">
                <div className="rounded-[24px] border border-black/8 bg-[rgba(250,247,241,0.72)] px-4 py-4">
                  <p className="text-sm font-semibold text-slate-950">当前前台署名</p>
                  <p className="mt-2 text-base text-slate-700">{creatorPreviewLabel}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <AdminBadge tone={publicCredits.length > 0 ? 'success' : 'warning'}>
                      {publicCredits.length > 0
                        ? `${publicCredits.length} 条公开 credits`
                        : '还没有公开 credits'}
                    </AdminBadge>
                    {hasLegacyAuthorFallback ? (
                      <AdminBadge tone="warning">仍在旧 author 兼容层</AdminBadge>
                    ) : null}
                  </div>
                </div>

                {creditsQuery.isLoading ? (
                  <div className="rounded-[24px] border border-dashed border-black/10 bg-[rgba(250,247,241,0.72)] px-4 py-8 text-sm text-slate-500">
                    正在加载创作者署名...
                  </div>
                ) : creditsQuery.isError ? (
                  <div className="rounded-[24px] border border-red-200 bg-red-50/90 px-4 py-5 text-sm text-red-700">
                    {getErrorMessage(creditsQuery.error, '创作者署名加载失败。')}
                  </div>
                ) : (
                  creditsDraft.map((credit, index) => (
                    <div
                      key={credit.id}
                      className="rounded-[26px] border border-black/8 bg-white/92 px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)]"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-950">署名 {index + 1}</p>
                          {credit.isPrimary ? <AdminBadge tone="accent">主署名</AdminBadge> : null}
                          <AdminBadge tone={credit.isPublic ? 'success' : 'warning'}>
                            {credit.isPublic ? '公开' : '仅后台'}
                          </AdminBadge>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => handleRemoveCredit(credit.id)}
                          className="text-rose-600 hover:text-rose-700"
                        >
                          <Trash2 className="size-4" />
                          删除
                        </Button>
                      </div>

                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <AdminFormField label="公开署名">
                          <input
                            type="text"
                            value={credit.name}
                            disabled={!isCreditsEditing}
                            onChange={(event) =>
                              handleCreditFieldChange(credit.id, 'name', event.target.value)
                            }
                            className={adminInputClassName}
                          />
                        </AdminFormField>
                        <AdminFormField label="角色">
                          <select
                            value={credit.role}
                            disabled={!isCreditsEditing}
                            onChange={(event) =>
                              handleCreditFieldChange(credit.id, 'role', event.target.value)
                            }
                            className={adminSelectClassName}
                          >
                            {CREDIT_ROLE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </AdminFormField>
                        <AdminFormField label="创作者类型">
                          <select
                            value={credit.type}
                            disabled={!isCreditsEditing}
                            onChange={(event) =>
                              handleCreditFieldChange(credit.id, 'type', event.target.value)
                            }
                            className={adminSelectClassName}
                          >
                            {CREDIT_TYPE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </AdminFormField>
                        <AdminFormField label="排序">
                          <input
                            type="number"
                            min="0"
                            value={credit.sortOrder}
                            disabled={!isCreditsEditing}
                            onChange={(event) =>
                              handleCreditFieldChange(credit.id, 'sortOrder', event.target.value)
                            }
                            className={adminInputClassName}
                          />
                        </AdminFormField>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <label className="flex items-center justify-between rounded-[22px] border border-black/8 bg-[rgba(250,247,241,0.88)] px-4 py-4 text-sm text-slate-700">
                          <span className="flex items-center gap-2">
                            <Eye className="size-4 text-slate-500" />
                            对前台公开
                          </span>
                          <input
                            type="checkbox"
                            checked={credit.isPublic}
                            disabled={!isCreditsEditing}
                            onChange={(event) =>
                              handleCreditFieldChange(credit.id, 'isPublic', event.target.checked)
                            }
                            className="h-4 w-4 rounded border-black/20 bg-transparent"
                          />
                        </label>
                        <label className="flex items-center justify-between rounded-[22px] border border-black/8 bg-[rgba(250,247,241,0.88)] px-4 py-4 text-sm text-slate-700">
                          <span className="flex items-center gap-2">
                            {credit.isPrimary ? (
                              <Eye className="size-4 text-[var(--gush-accent,#2f58c6)]" />
                            ) : (
                              <EyeOff className="size-4 text-slate-500" />
                            )}
                            设为主署名
                          </span>
                          <input
                            type="checkbox"
                            checked={credit.isPrimary}
                            disabled={!isCreditsEditing}
                            onChange={(event) =>
                              handleCreditFieldChange(credit.id, 'isPrimary', event.target.checked)
                            }
                            className="h-4 w-4 rounded border-black/20 bg-transparent"
                          />
                        </label>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </AdminPageSection>

            <AdminPageSection
              title="发布设置"
              description="发布状态和分级限制保持简单明确即可。"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex items-center justify-between rounded-[22px] border border-black/8 bg-[rgba(250,247,241,0.88)] px-4 py-4 text-sm text-slate-700">
                  <span>前台可见</span>
                  <input
                    type="checkbox"
                    checked={formData.isPublished}
                    onChange={handleFieldChange('isPublished')}
                    disabled={!isEditing}
                    className="h-4 w-4 rounded border-black/20 bg-transparent"
                  />
                </label>
                <label className="flex items-center justify-between rounded-[22px] border border-black/8 bg-[rgba(250,247,241,0.88)] px-4 py-4 text-sm text-slate-700">
                  <span>18+ 作品</span>
                  <input
                    type="checkbox"
                    checked={formData.adult}
                    onChange={handleFieldChange('adult')}
                    disabled={!isEditing}
                    className="h-4 w-4 rounded border-black/20 bg-transparent"
                  />
                </label>
              </div>
            </AdminPageSection>
          </div>
        </div>

        {hasLegacyAuthorFallback ? (
          <div
            className={cn(
              'rounded-[24px] border px-5 py-4 text-sm leading-6 shadow-[0_10px_24px_rgba(15,23,42,0.03)]',
              'border-amber-200 bg-amber-50/90 text-amber-800',
            )}
          >
            当前前台署名仍由旧 author 字段兼容兜底。把这部作品迁到真实 credits 之后，创作者页、作品页头部和后台巡检才会完全对齐。
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}
