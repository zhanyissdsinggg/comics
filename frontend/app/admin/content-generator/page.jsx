"use client";

export const dynamic = "force-dynamic";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import AdminShell from "@/components/admin/AdminShell";
import {
  GeneratorFeedback,
  GeneratorFormSection,
  GeneratorResultSection,
  GeneratorSummaryCards,
} from "@/components/admin/content-generator-workspace/sections";
import {
  buildGeneratorPayload,
  DEFAULT_FORM,
  parsePositiveInteger,
  readGeneratorErrorMessage,
  validateForm,
} from "@/components/admin/content-generator-workspace/utils";
import { adminPost } from "@/lib/adminApiClient";

function isAdminTestToolsEnabled() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_ADMIN_TOOLS_ENABLED === "1"
  );
}

export default function ContentGeneratorPage() {
  const router = useRouter();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [generating, setGenerating] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [result, setResult] = useState(null);

  const validationError = useMemo(() => validateForm(form), [form]);
  const previewSeriesPerType = parsePositiveInteger(form.seriesPerType) ?? 20;
  const previewMinEpisodes = parsePositiveInteger(form.minEpisodes) ?? 10;
  const previewMaxEpisodes = parsePositiveInteger(form.maxEpisodes) ?? 30;
  const estimatedSeriesTotal = previewSeriesPerType * 2;

  if (!isAdminTestToolsEnabled()) {
    return (
      <AdminShell
        title="内容生成器（测试工具）"
        subtitle="当前环境未启用此工具。"
      >
        <div
          data-testid="admin-content-generator-locked"
          className="rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4 text-sm leading-6 text-slate-600 shadow-[0_12px_28px_rgba(15,23,42,0.032)] ring-1 ring-black/[0.02]"
        >
          <p className="font-semibold text-slate-950">此页面已在生产环境隐藏</p>
          <p className="mt-2">
            这是一个用于批量生成测试内容的内部工具。若确实需要启用，请设置环境变量
            <span className="mx-1 rounded bg-slate-100 px-1 py-0.5 font-mono text-xs text-slate-700">
              NEXT_PUBLIC_ADMIN_TOOLS_ENABLED=1
            </span>
            并重新部署。
          </p>
        </div>
      </AdminShell>
    );
  }

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const generateContent = async () => {
    if (validationError) {
      setResult(null);
      setFeedback({ type: "error", message: validationError });
      return;
    }

    const payload = buildGeneratorPayload(form);
    setGenerating(true);
    setFeedback({ type: "", message: "" });
    setResult(null);

    try {
      const response = await adminPost("/api/admin/generate-content", payload);
      if (!response.ok) {
        throw new Error(response.error || response.message || "内容生成失败。");
      }

      setResult({ ...(response.data || {}), requestPayload: payload });
      setFeedback({
        type: "success",
        message: response.data?.runId
          ? `生成完成。任务编号：${response.data.runId}。`
          : "生成完成。",
      });
    } catch (error) {
      setFeedback({ type: "error", message: readGeneratorErrorMessage(error) });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AdminShell title="内容生成器" subtitle="用于批量生成测试内容。">
      <div className="space-y-6">
        <GeneratorSummaryCards
          estimatedSeriesTotal={estimatedSeriesTotal}
          previewMinEpisodes={previewMinEpisodes}
          previewMaxEpisodes={previewMaxEpisodes}
        />

        <GeneratorFeedback
          feedback={feedback}
          onDismiss={() => setFeedback({ type: "", message: "" })}
        />

        <GeneratorFormSection
          form={form}
          onUpdateField={updateField}
          onGenerate={generateContent}
          generating={generating}
          onReset={() => setForm(DEFAULT_FORM)}
          onViewSeries={() => router.push("/admin/series")}
          previewSeriesPerType={previewSeriesPerType}
          previewMinEpisodes={previewMinEpisodes}
          previewMaxEpisodes={previewMaxEpisodes}
        />

        <GeneratorResultSection result={result} />
      </div>
    </AdminShell>
  );
}
