'use client';

export const dynamic = 'force-dynamic';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import AdminShell from '@/components/admin/AdminShell';
import {
  GeneratorFeedback,
  GeneratorFormSection,
  GeneratorResultSection,
  GeneratorSummaryCards,
} from '@/components/admin/content-generator-workspace/sections';
import {
  buildGeneratorPayload,
  DEFAULT_FORM,
  parsePositiveInteger,
  readGeneratorErrorMessage,
  validateForm,
} from '@/components/admin/content-generator-workspace/utils';
import { adminPost } from '@/lib/adminApiClient';

export default function ContentGeneratorPage() {
  const router = useRouter();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [generating, setGenerating] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [result, setResult] = useState(null);

  const validationError = useMemo(() => validateForm(form), [form]);
  const previewSeriesPerType = parsePositiveInteger(form.seriesPerType) ?? 20;
  const previewMinEpisodes = parsePositiveInteger(form.minEpisodes) ?? 10;
  const previewMaxEpisodes = parsePositiveInteger(form.maxEpisodes) ?? 30;
  const estimatedSeriesTotal = previewSeriesPerType * 2;

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const generateContent = async () => {
    if (validationError) {
      setResult(null);
      setFeedback({ type: 'error', message: validationError });
      return;
    }

    const payload = buildGeneratorPayload(form);
    setGenerating(true);
    setFeedback({ type: '', message: '' });
    setResult(null);

    try {
      const response = await adminPost('/api/admin/generate-content', payload);
      if (!response.ok) {
        throw new Error(response.error || response.message || '内容生成失败。');
      }

      setResult({ ...(response.data || {}), requestPayload: payload });
      setFeedback({
        type: 'success',
        message: response.data?.runId
          ? `生成完成。任务编号：${response.data.runId}。`
          : '生成完成。',
      });
    } catch (error) {
      setFeedback({ type: 'error', message: readGeneratorErrorMessage(error) });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AdminShell
      title="内容生成器"
      subtitle="用于批量生成测试内容。"
    >
      <div className="space-y-6">
        <GeneratorSummaryCards
          estimatedSeriesTotal={estimatedSeriesTotal}
          previewMinEpisodes={previewMinEpisodes}
          previewMaxEpisodes={previewMaxEpisodes}
        />

        <GeneratorFeedback
          feedback={feedback}
          onDismiss={() => setFeedback({ type: '', message: '' })}
        />

        <GeneratorFormSection
          form={form}
          onUpdateField={updateField}
          onGenerate={generateContent}
          generating={generating}
          onReset={() => setForm(DEFAULT_FORM)}
          onViewSeries={() => router.push('/admin/series')}
          previewSeriesPerType={previewSeriesPerType}
          previewMinEpisodes={previewMinEpisodes}
          previewMaxEpisodes={previewMaxEpisodes}
        />

        <GeneratorResultSection result={result} />
      </div>
    </AdminShell>
  );
}
