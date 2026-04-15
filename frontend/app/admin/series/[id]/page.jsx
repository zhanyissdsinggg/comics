'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import AdminShell from '@/components/admin/AdminShell';
import { AdminFeedbackBanner } from '@/components/admin/common/AdminFeedbackBanner';
import { AdminDataState } from '@/components/admin/common/AdminDataState';
import {
  BasicInformationSection,
  CoverSection,
  CreditsSection,
  LegacyAuthorNotice,
  PublishingSection,
  ReadinessSection,
  RecordInfoSection,
  SeriesHeaderActions,
  SummaryCardsSection,
} from '@/components/admin/series-detail/sections';
import {
  buildCreditsPayload,
  buildCreditsState,
  buildCreatorPreviewLabel,
  buildFormState,
  buildSeriesInsightState,
  buildSeriesPayload,
  createEmptyCreditRow,
  createEmptyForm,
  CREDIT_ROLE_OPTIONS,
  CREDIT_TYPE_OPTIONS,
  EMPTY_FEEDBACK,
  fetchSeriesCredits,
  fetchSeriesDetail,
  getErrorMessage,
  MAX_UPLOAD_BYTES,
  normalizeGenresInput,
  normalizeParam,
  STATUS_OPTIONS,
  TYPE_OPTIONS,
  validateCreditsDraft,
  validateSeriesDraft,
} from '@/components/admin/series-detail/utils';
import { adminFetchJson, adminUpload } from '@/lib/adminApiClient';
import { getAdminSeriesReadiness } from '@/lib/adminSeriesReadiness';

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

  const authorFallback = creditsQuery.data?.author || series?.author || '';
  const creatorPreviewLabel = useMemo(
    () => buildCreatorPreviewLabel(publicCredits, authorFallback),
    [authorFallback, publicCredits],
  );

  const readiness = useMemo(
    () =>
      getAdminSeriesReadiness({
        ...(series || {}),
        creatorCredits: publicCredits,
        creator: creditsQuery.data?.creator || series?.creator,
        author: authorFallback,
        coverUrl: formData.coverUrl,
        description: formData.description,
        genres: normalizeGenresInput(formData.genres),
        isPublished: formData.isPublished,
      }),
    [
      authorFallback,
      creditsQuery.data?.creator,
      formData.coverUrl,
      formData.description,
      formData.genres,
      formData.isPublished,
      publicCredits,
      series,
    ],
  );

  const insightState = useMemo(
    () =>
      buildSeriesInsightState({
        series,
        formData,
        publicCredits,
        creatorPreviewLabel,
        readiness,
        authorFallback,
      }),
    [authorFallback, creatorPreviewLabel, formData, publicCredits, readiness, series],
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
      setCreditsFeedback({
        type: 'error',
        message: getErrorMessage(error, '创作者署名保存失败。'),
      });
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

  return (
    <AdminShell
      title={series.title || '作品详情'}
      subtitle="优先维护读者会直接看到的作品信息和真实署名。"
      actions={
        <SeriesHeaderActions
          onBackToList={() => router.push('/admin/series')}
          onOpenEpisodes={() => router.push(`/admin/series/${seriesId}/episodes`)}
          onOpenStorefront={() =>
            window.open(`/series/${seriesId}`, '_blank', 'noopener,noreferrer')
          }
          isEditing={isEditing}
          onStartEditing={handleStartEditing}
          onCancelEditing={handleCancelEditing}
          onSave={handleSave}
          overallDirty={overallDirty}
          isSaving={saveMutation.isPending}
        />
      }
    >
      <div className="space-y-6">
        <SummaryCardsSection cards={insightState.summaryCards} />

        <AdminFeedbackBanner feedback={feedback} onDismiss={() => setFeedback(EMPTY_FEEDBACK)} />
        <AdminFeedbackBanner
          feedback={creditsFeedback}
          onDismiss={() => setCreditsFeedback(EMPTY_FEEDBACK)}
        />

        <BasicInformationSection
          formData={formData}
          isEditing={isEditing}
          onFieldChange={handleFieldChange}
          typeOptions={TYPE_OPTIONS}
          statusOptions={STATUS_OPTIONS}
        />

        <div id="creator" className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
          <div className="space-y-6">
            <CoverSection
              formData={formData}
              isEditing={isEditing}
              uploadPending={uploadMutation.isPending}
              onFieldChange={handleFieldChange}
              onCoverUpload={handleCoverUpload}
            />
            <ReadinessSection readiness={readiness} />
            <RecordInfoSection items={insightState.recordItems} />
          </div>

          <div className="space-y-6">
            <CreditsSection
              creatorPreviewLabel={creatorPreviewLabel}
              publicCredits={publicCredits}
              hasLegacyAuthorFallback={insightState.hasLegacyAuthorFallback}
              creditsDraft={creditsDraft}
              isCreditsEditing={isCreditsEditing}
              creditsDirty={creditsDirty}
              isSaving={saveCreditsMutation.isPending}
              roleOptions={CREDIT_ROLE_OPTIONS}
              typeOptions={CREDIT_TYPE_OPTIONS}
              loading={creditsQuery.isLoading}
              errorMessage={
                creditsQuery.isError
                  ? getErrorMessage(creditsQuery.error, '创作者署名加载失败。')
                  : ''
              }
              onStartEditing={handleStartCreditsEditing}
              onCancelEditing={handleCancelCreditsEditing}
              onSave={handleSaveCredits}
              onAddCredit={handleAddCredit}
              onRemoveCredit={handleRemoveCredit}
              onFieldChange={handleCreditFieldChange}
            />
            <PublishingSection
              formData={formData}
              isEditing={isEditing}
              onFieldChange={handleFieldChange}
            />
          </div>
        </div>

        <LegacyAuthorNotice visible={insightState.hasLegacyAuthorFallback} />
      </div>
    </AdminShell>
  );
}
