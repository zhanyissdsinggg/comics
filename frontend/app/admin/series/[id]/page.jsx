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

function getErrorMessage(error, fallbackMessage) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

function formatDateTime(value) {
  if (!value) {
    return 'Unavailable';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unavailable';
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

async function fetchSeriesDetail(seriesId) {
  const { response, data } = await adminFetchJson(`/api/admin/series/${seriesId}`, { cache: 'no-store' });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(data?.message || data?.error || 'Failed to load series details.');
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
        throw new Error(data?.message || data?.error || 'Failed to save series details.');
      }

      return data?.series || null;
    },
    onSuccess: async (series) => {
      if (series) {
        setFormData(buildFormState(series));
      }
      setIsEditing(false);
      setFeedback({ type: 'success', message: 'Series details were saved.' });
      await seriesQuery.refetch();
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error, 'Failed to save series details.') });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const uploadPayload = new FormData();
      uploadPayload.append('file', file);

      const response = await adminUpload('/api/admin/upload/image', uploadPayload);
      if (!response.ok || !response.data?.url) {
        throw new Error(response.error || response.message || 'Failed to upload cover image.');
      }

      return response.data;
    },
    onSuccess: (data) => {
      setFormData((current) => ({
        ...current,
        coverUrl: data.url,
      }));
      setFeedback({ type: 'success', message: 'Cover image uploaded.' });
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error, 'Failed to upload cover image.') });
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

    if (!formData.title.trim()) {
      setFeedback({ type: 'error', message: 'Title is required.' });
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
      setFeedback({ type: 'error', message: 'Please upload a valid image file.' });
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setFeedback({ type: 'error', message: 'Cover images must be 10MB or smaller.' });
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
            error={getErrorMessage(seriesQuery.error, 'Failed to load series details.')}
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
            message="This series could not be found."
            action={
              <button
                type="button"
                onClick={() => router.push('/admin/series')}
                className="rounded-2xl border border-neutral-700 px-4 py-2 text-sm font-medium text-white transition hover:border-neutral-500 hover:bg-neutral-900"
              >
                Back to series library
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
                Back to library
              </button>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-white">{series.title || 'Untitled series'}</h1>
                <p className="max-w-3xl text-sm text-neutral-400">
                  Edit pricing, maturity rules, cover art, and free-ticket behavior from a single detail view.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push(`/admin/series/${seriesId}/episodes`)}
                className="rounded-2xl border border-neutral-700 px-4 py-2 text-sm font-medium text-white transition hover:border-neutral-500 hover:bg-neutral-900"
              >
                Manage episodes
              </button>

              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={handleCancelEditing}
                    className="rounded-2xl border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:border-neutral-500 hover:bg-neutral-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                    className="rounded-2xl bg-cyan-500 px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saveMutation.isPending ? 'Saving...' : 'Save changes'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleStartEditing}
                  className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
                >
                  Edit series
                </button>
              )}
            </div>
          </div>
        </header>

        <AdminFeedbackBanner feedback={feedback} onDismiss={() => setFeedback(EMPTY_FEEDBACK)} />

        <div className="grid gap-6 xl:grid-cols-[1.35fr,0.85fr]">
          <section className="space-y-6 rounded-3xl border border-neutral-800 bg-neutral-900/80 px-6 py-6 shadow-[0_24px_80px_-36px_rgba(0,0,0,0.8)]">
            <div className="grid gap-5 md:grid-cols-2">
              <FormField label="Title">
                <input
                  type="text"
                  value={formData.title}
                  onChange={handleFieldChange('title')}
                  disabled={!isEditing}
                  className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </FormField>

              <FormField label="Type">
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

              <FormField label="Status">
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

              <FormField label="Episode price" helperText="Stored as coin cost per episode.">
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

            <FormField label="Description">
              <textarea
                rows={7}
                value={formData.description}
                onChange={handleFieldChange('description')}
                disabled={!isEditing}
                className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </FormField>

            <div className="grid gap-5 md:grid-cols-2">
              <FormField label="Genres" helperText="Separate entries with commas.">
                <input
                  type="text"
                  value={formData.genres}
                  onChange={handleFieldChange('genres')}
                  disabled={!isEditing}
                  className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </FormField>

              <FormField label="Badge" helperText="Optional label shown on the series card.">
                <input
                  type="text"
                  value={formData.badge}
                  onChange={handleFieldChange('badge')}
                  disabled={!isEditing}
                  className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </FormField>

              <FormField label="Cover tone">
                <input
                  type="text"
                  value={formData.coverTone}
                  onChange={handleFieldChange('coverTone')}
                  disabled={!isEditing}
                  className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </FormField>

              <FormField label="Cover URL" helperText="Updated automatically after an upload, or paste an external asset URL.">
                <input
                  type="url"
                  value={formData.coverUrl}
                  onChange={handleFieldChange('coverUrl')}
                  disabled={!isEditing}
                  className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </FormField>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-3xl border border-neutral-800 bg-neutral-950/70 px-5 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="text-base font-semibold text-white">Maturity gate</h2>
                    <p className="text-sm text-neutral-500">Mark this title as adults only.</p>
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
                    <h2 className="text-base font-semibold text-white">Free ticket flow</h2>
                    <p className="text-sm text-neutral-500">Enable time-ticket access on this title.</p>
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
                  <FormField label="Refresh interval (hours)">
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
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">Cover asset</p>
              <div className="mt-5 overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950">
                {formData.coverUrl ? (
                  <img src={formData.coverUrl} alt={`${formData.title || 'Series'} cover`} className="aspect-[2/3] w-full object-cover" />
                ) : (
                  <div className="flex aspect-[2/3] items-center justify-center px-6 text-center text-sm text-neutral-500">
                    No cover asset uploaded yet.
                  </div>
                )}
              </div>

              {isEditing ? (
                <label className="mt-4 block rounded-2xl border border-dashed border-neutral-700 px-4 py-4 text-sm text-neutral-300 transition hover:border-neutral-500 hover:bg-neutral-950">
                  <span className="font-medium text-white">Upload a new cover</span>
                  <span className="mt-1 block text-xs text-neutral-500">JPG, PNG, GIF, or WEBP up to 10MB.</span>
                  <input type="file" accept="image/*" onChange={handleCoverUpload} className="mt-3 block w-full text-xs text-neutral-400" />
                </label>
              ) : null}
            </section>

            <section className="rounded-3xl border border-neutral-800 bg-neutral-900/80 px-6 py-6 shadow-[0_24px_80px_-36px_rgba(0,0,0,0.8)]">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">Series metadata</p>
              <div className="mt-4">
                <DetailRow label="Series ID" value={series.id} />
                <DetailRow label="Created" value={formatDateTime(series.createdAt)} />
                <DetailRow label="Updated" value={formatDateTime(series.updatedAt)} />
                <DetailRow label="Type" value={formData.type || 'comic'} />
                <DetailRow label="Status" value={formData.status || 'Ongoing'} />
              </div>
            </section>

            <section className="rounded-3xl border border-neutral-800 bg-neutral-900/80 px-6 py-6 shadow-[0_24px_80px_-36px_rgba(0,0,0,0.8)]">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">Operational notes</p>
              <div className="mt-4 space-y-3 text-sm leading-7 text-neutral-300">
                <p>Episode pricing and time-ticket settings are pushed through the canonical admin series endpoint.</p>
                <p>Cover uploads now use the shared admin upload client, so auth headers and CSRF handling stay consistent.</p>
                <p>Saving from this page sends the payload in the shape expected by the backend controller.</p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
