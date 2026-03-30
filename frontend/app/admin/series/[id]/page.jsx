'use client';

/* eslint-disable @next/next/no-img-element */

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowUpRight, BookOpen, Image as ImageIcon, PencilLine, Save } from 'lucide-react';

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

const TYPE_OPTIONS = [
  { value: 'comic', label: 'Comic' },
  { value: 'novel', label: 'Novel' },
];

const STATUS_OPTIONS = [
  { value: 'Ongoing', label: 'Ongoing' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Hiatus', label: 'Hiatus' },
  { value: 'Cancelled', label: 'Cancelled' },
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
    author: '',
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
    author: series?.author || '',
    genres: Array.isArray(series?.genres) ? series.genres.join(', ') : '',
    coverUrl: series?.coverUrl || '',
    coverTone: series?.coverTone || '',
    badge: series?.badge || '',
    episodePrice: String(series?.episodePrice ?? 0),
    ttfEnabled: Boolean(series?.ttfEnabled),
    ttfIntervalHours: String(series?.ttfIntervalHours ?? 24),
  };
}

function normalizeGenresInput(value) {
  return String(value || '')
    .split(',')
    .map((genre) => genre.trim())
    .filter(Boolean);
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
    author: formData.author.trim(),
    genres: normalizeGenresInput(formData.genres),
    coverUrl: formData.coverUrl.trim(),
    coverTone: formData.coverTone.trim(),
    badge: formData.badge.trim(),
    pricing: { episodePrice: Number.isFinite(episodePrice) ? episodePrice : 0 },
    ttf: {
      enabled: Boolean(formData.ttfEnabled),
      intervalHours: Number.isFinite(intervalHours) && intervalHours > 0 ? intervalHours : 24,
    },
  };
}

function isNonNegativeIntegerString(value, { allowEmpty = false } = {}) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return allowEmpty;
  return /^\d+$/.test(normalized);
}

function validateSeriesDraft(formData) {
  if (!formData.title.trim()) {
    return 'Title is required.';
  }
  if (formData.author.trim().length > 120) {
    return 'Creator or studio names should stay within 120 characters.';
  }
  if (!isNonNegativeIntegerString(formData.episodePrice, { allowEmpty: true })) {
    return 'Default episode price must be a whole-number point value.';
  }
  if (formData.ttfEnabled) {
    if (!isNonNegativeIntegerString(formData.ttfIntervalHours)) {
      return 'The free-pass interval must be a whole number of hours.';
    }
    if (Number(formData.ttfIntervalHours) < 1) {
      return 'The free-pass interval must be at least 1 hour.';
    }
  }

  return '';
}

function formatDateTime(value) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatCompactNumber(value) {
  const safeValue = Number(value || 0);
  if (!Number.isFinite(safeValue)) return '0';
  return new Intl.NumberFormat('zh-CN', {
    notation: safeValue >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: safeValue >= 10000 ? 1 : 0,
  }).format(safeValue);
}

function getErrorMessage(error, fallbackMessage) {
  if (error instanceof Error && error.message) return error.message;
  return fallbackMessage;
}

async function fetchSeriesDetail(seriesId) {
  const { response, data } = await adminFetchJson(`/api/admin/series/${seriesId}`, { cache: 'no-store' });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(data?.message || data?.error || 'Series details could not be loaded.');
  }
  return data?.series || null;
}

export default function AdminSeriesDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
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

  const series = seriesQuery.data;
  const baselineForm = useMemo(() => buildFormState(series), [series]);

  useEffect(() => {
    if (seriesQuery.data && !isEditing) {
      setFormData(buildFormState(seriesQuery.data));
    }
  }, [isEditing, seriesQuery.data]);

  const overallDirty = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(baselineForm),
    [baselineForm, formData],
  );

  const readiness = useMemo(
    () =>
      getAdminSeriesReadiness({
        ...(series || {}),
        author: formData.author,
        coverUrl: formData.coverUrl,
        description: formData.description,
        genres: normalizeGenresInput(formData.genres),
        isPublished: formData.isPublished,
        episodePrice: Number.parseInt(String(formData.episodePrice || '0'), 10),
        ttfEnabled: formData.ttfEnabled,
      }),
    [formData.author, formData.coverUrl, formData.description, formData.episodePrice, formData.genres, formData.isPublished, formData.ttfEnabled, series],
  );

  const saveMutation = useMutation({
    mutationFn: async (draft) => {
      const { response, data } = await adminFetchJson(`/api/admin/series/${seriesId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ series: buildSeriesPayload(draft) }),
      });

      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Series details could not be saved.');
      }

      return data?.series || null;
    },
    onSuccess: (updatedSeries) => {
      if (updatedSeries) {
        queryClient.setQueryData(['admin', 'series', seriesId], updatedSeries);
        setFormData(buildFormState(updatedSeries));
      }
      setIsEditing(false);
      setFeedback({ type: 'success', message: 'Series details were saved.' });
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error, 'Series details could not be saved.') });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const uploadPayload = new FormData();
      uploadPayload.append('file', file);
      const response = await adminUpload('/api/admin/upload/image', uploadPayload);
      if (!response.ok || !response.data?.url) {
        throw new Error(response.error || response.message || 'The cover image could not be uploaded.');
      }
      return response.data;
    },
    onSuccess: (data) => {
      setFormData((current) => ({ ...current, coverUrl: data.url }));
      setFeedback({ type: 'success', message: 'The cover image was uploaded. Save changes to publish it to the series record.' });
      setIsEditing(true);
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error, 'The cover image could not be uploaded.') });
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
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFeedback({ type: 'error', message: 'Please upload a valid image file.' });
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setFeedback({ type: 'error', message: 'Cover images must stay under 10MB.' });
      return;
    }
    uploadMutation.mutate(file);
  };

  if (seriesQuery.isLoading) {
    return (
      <AdminShell title="Series detail" subtitle="Loading the series workspace...">
        <AdminDataState isLoading={true} hasData={false} />
      </AdminShell>
    );
  }

  if (seriesQuery.isError) {
    return (
      <AdminShell title="Series detail" subtitle="The series workspace could not be loaded.">
        <AdminDataState isLoading={false} hasData={false} emptyMessage={getErrorMessage(seriesQuery.error, 'Series details could not be loaded.')} />
      </AdminShell>
    );
  }

  if (!series) {
    return (
      <AdminShell title="Series detail" subtitle="The requested title could not be found.">
        <AdminDataState isLoading={false} hasData={false} emptyMessage="This series record does not exist." />
      </AdminShell>
    );
  }

  const summaryCards = [
    {
      label: 'Episodes',
      value: String(series.episodeCount || 0),
      detail: series.latestEpisodeId ? `Latest episode: ${series.latestEpisodeId}` : 'No episodes yet.',
      tone: 'accent',
    },
    {
      label: 'Visibility',
      value: formData.isPublished ? 'Published' : 'Draft',
      detail: formData.adult ? '18+ restrictions enabled.' : 'General audience.',
    },
    {
      label: 'Creator',
      value: formData.author || 'Not listed',
      detail: `Followers ${formatCompactNumber(series.followers || 0)} · Views ${formatCompactNumber(series.views || 0)}`,
    },
    {
      label: 'Storefront readiness',
      value: readiness.score,
      detail: readiness.summary,
    },
  ];

  return (
    <AdminShell
      title={series.title || 'Series detail'}
      subtitle="Edit the reader-facing identity of this title first: story basics, creator credit, publish state, and cover quality."
      actions={
        <>
          <Button type="button" variant="outline" onClick={() => router.push('/admin/series')}>
            <ArrowLeft className="size-4" />
            All series
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push(`/admin/series/${seriesId}/episodes`)}>
            <BookOpen className="size-4" />
            Episodes
          </Button>
          <Button type="button" variant="outline" onClick={() => window.open(`/series/${seriesId}`, '_blank')}>
            <ArrowUpRight className="size-4" />
            View live page
          </Button>
          {isEditing ? (
            <>
              <Button type="button" variant="outline" onClick={handleCancelEditing}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSave} disabled={!overallDirty || saveMutation.isPending}>
                <Save className="size-4" />
                {saveMutation.isPending ? 'Saving...' : 'Save changes'}
              </Button>
            </>
          ) : (
            <Button type="button" onClick={handleStartEditing}>
              <PencilLine className="size-4" />
              Edit details
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <AdminMetricCard key={card.label} {...card} />
          ))}
        </div>

        <AdminFeedbackBanner feedback={feedback} onDismiss={() => setFeedback(EMPTY_FEEDBACK)} />

        <AdminPageSection title="Basic info" description="Keep the title, summary, and tags clean enough for storefront discovery.">
          <div className="grid gap-5 lg:grid-cols-2">
            <AdminFormField label="Title">
              <input type="text" value={formData.title} onChange={handleFieldChange('title')} disabled={!isEditing} className={adminInputClassName} />
            </AdminFormField>
            <AdminFormField label="Badge" helperText="Use this sparingly so editorial labels do not overwhelm the page.">
              <input type="text" value={formData.badge} onChange={handleFieldChange('badge')} disabled={!isEditing} className={adminInputClassName} />
            </AdminFormField>
            <AdminFormField label="Format">
              <select value={formData.type} onChange={handleFieldChange('type')} disabled={!isEditing} className={adminSelectClassName}>
                {TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </AdminFormField>
            <AdminFormField label="Status">
              <select value={formData.status} onChange={handleFieldChange('status')} disabled={!isEditing} className={adminSelectClassName}>
                {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </AdminFormField>
          </div>
          <div className="mt-5">
            <AdminFormField label="Summary">
              <textarea value={formData.description} onChange={handleFieldChange('description')} disabled={!isEditing} rows={6} className={adminTextareaClassName} />
            </AdminFormField>
          </div>
          <div className="mt-5">
            <AdminFormField label="Genres and tags" helperText="Separate tags with commas.">
              <input type="text" value={formData.genres} onChange={handleFieldChange('genres')} disabled={!isEditing} className={adminInputClassName} />
            </AdminFormField>
          </div>
        </AdminPageSection>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
          <div className="space-y-6">
            <AdminPageSection title="Credits" description="This name should match the public-facing creator or studio credit readers see.">
              <AdminFormField
                label="Creator or studio"
                helperText="Use one stable public-facing form of the name so creator pages, series pages, and trust surfaces stay aligned."
              >
                <input type="text" value={formData.author} onChange={handleFieldChange('author')} disabled={!isEditing} className={adminInputClassName} />
              </AdminFormField>
            </AdminPageSection>

            <AdminPageSection title="Publishing" description="Keep publish state and audience restrictions simple and easy to scan.">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex items-center justify-between rounded-[22px] border border-black/8 bg-[rgba(250,247,241,0.88)] px-4 py-4 text-sm text-slate-700">
                  <span>Visible on the live site</span>
                  <input type="checkbox" checked={formData.isPublished} onChange={handleFieldChange('isPublished')} disabled={!isEditing} className="h-4 w-4 rounded border-black/20 bg-transparent" />
                </label>
                <label className="flex items-center justify-between rounded-[22px] border border-black/8 bg-[rgba(250,247,241,0.88)] px-4 py-4 text-sm text-slate-700">
                  <span>18+ title</span>
                  <input type="checkbox" checked={formData.adult} onChange={handleFieldChange('adult')} disabled={!isEditing} className="h-4 w-4 rounded border-black/20 bg-transparent" />
                </label>
              </div>
            </AdminPageSection>

            <AdminPageSection title="Commerce" description="Keep commercial settings lower on the page so story identity and creator credit stay primary.">
              <div className="grid gap-5 md:grid-cols-2">
                <AdminFormField label="Default episode price" helperText="Use whole-number points only.">
                  <input type="number" min="0" step="1" value={formData.episodePrice} onChange={handleFieldChange('episodePrice')} disabled={!isEditing} className={adminInputClassName} />
                </AdminFormField>
                <label className="flex items-center justify-between rounded-[22px] border border-black/8 bg-[rgba(250,247,241,0.88)] px-4 py-4 text-sm text-slate-700">
                  <span>Enable free-pass window</span>
                  <input type="checkbox" checked={formData.ttfEnabled} onChange={handleFieldChange('ttfEnabled')} disabled={!isEditing} className="h-4 w-4 rounded border-black/20 bg-transparent" />
                </label>
              </div>
              <div className="mt-5 max-w-sm">
                <AdminFormField label="Free-pass interval (hours)">
                  <input type="number" min="1" step="1" value={formData.ttfIntervalHours} onChange={handleFieldChange('ttfIntervalHours')} disabled={!isEditing || !formData.ttfEnabled} className={adminInputClassName} />
                </AdminFormField>
              </div>
            </AdminPageSection>
          </div>

          <div className="space-y-6">
            <AdminPageSection title="Cover" description="A strong cover and a stable creator line usually do more for trust than any extra dashboard metric.">
              <div className="overflow-hidden rounded-[26px] border border-black/8 bg-[rgba(250,247,241,0.78)]">
                {formData.coverUrl ? (
                  <img src={formData.coverUrl} alt={`${formData.title || 'Series'} cover`} className="aspect-[2/3] w-full object-cover" />
                ) : (
                  <div className="flex aspect-[2/3] flex-col items-center justify-center gap-3 px-6 text-center text-sm text-slate-500">
                    <ImageIcon size={28} />
                    <span>No cover image yet.</span>
                  </div>
                )}
              </div>
              <div className="mt-5 space-y-4">
                <AdminFormField label="Cover URL">
                  <input type="url" value={formData.coverUrl} onChange={handleFieldChange('coverUrl')} disabled={!isEditing} className={adminInputClassName} />
                </AdminFormField>
                <AdminFormField label="Cover tone" helperText="Optional editorial note such as warm, blue, neon, or moody.">
                  <input type="text" value={formData.coverTone} onChange={handleFieldChange('coverTone')} disabled={!isEditing} className={adminInputClassName} />
                </AdminFormField>
                {isEditing ? (
                  <label className="block rounded-[22px] border border-dashed border-black/10 bg-[rgba(250,247,241,0.78)] px-4 py-4 text-sm text-slate-600">
                    <span className="font-semibold text-slate-950">Upload a new cover</span>
                    <span className="mt-1 block text-xs text-slate-500">JPG, PNG, GIF, or WEBP up to 10MB.</span>
                    <input type="file" accept="image/*" onChange={handleCoverUpload} disabled={uploadMutation.isPending} className="mt-4 block w-full text-xs text-slate-500" />
                  </label>
                ) : null}
              </div>
            </AdminPageSection>

            <AdminPageSection title="Readiness" description="A quick view of what still weakens the live series page.">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-3xl font-semibold tracking-tight text-slate-950">{readiness.score}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{readiness.summary}</p>
                </div>
                <AdminBadge tone={readiness.tone === 'emerald' ? 'success' : readiness.tone === 'amber' ? 'warning' : readiness.tone === 'rose' ? 'danger' : 'accent'}>
                  {readiness.statusLabel}
                </AdminBadge>
              </div>
              <div className="mt-4 space-y-2">
                {readiness.checks.map((item) => (
                  <div key={item.id} className="rounded-[20px] border border-black/6 bg-[rgba(250,247,241,0.82)] px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-950">{item.label}</p>
                      <AdminBadge tone={item.ok ? 'success' : 'warning'}>
                        {item.ok ? 'Ready' : 'Needs work'}
                      </AdminBadge>
                    </div>
                    <p className="mt-2 text-xs leading-6 text-slate-500">{item.hint}</p>
                  </div>
                ))}
              </div>
            </AdminPageSection>

            <AdminPageSection title="Series record" description="Useful metadata for operators who need to confirm what is already live.">
              <AdminKeyValueList
                items={[
                  { label: 'Series ID', value: series.id },
                  { label: 'Created', value: formatDateTime(series.createdAt) },
                  { label: 'Updated', value: formatDateTime(series.updatedAt) },
                  { label: 'Latest episode', value: series.latestEpisodeId || 'Not available' },
                  { label: 'Followers', value: formatCompactNumber(series.followers || 0) },
                  { label: 'Views', value: formatCompactNumber(series.views || 0) },
                ]}
              />
            </AdminPageSection>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
