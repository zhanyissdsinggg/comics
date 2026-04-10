"use client";

export const dynamic = "force-dynamic";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { AdminLayout } from "../../../components/admin/AdminLayout";
import { AdminFeedbackBanner } from "@/components/admin/common/AdminFeedbackBanner";
import {
  AdminBadge,
  AdminFormField,
  AdminMetricCard,
  AdminPageSection,
  adminInputClassName,
} from "@/components/admin/common/AdminWorkspacePrimitives";
import { adminPost, normalizeAdminErrorMessage } from "../../../lib/adminApiClient";

const DEFAULT_FORM = {
  seed: "",
  seriesPerType: "20",
  minEpisodes: "10",
  maxEpisodes: "30",
};

function parsePositiveInteger(value) {
  const normalized = String(value || "").trim();
  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function buildGeneratorPayload(form) {
  const payload = {
    seriesPerType: parsePositiveInteger(form.seriesPerType) ?? 20,
    minEpisodes: parsePositiveInteger(form.minEpisodes) ?? 10,
    maxEpisodes: parsePositiveInteger(form.maxEpisodes) ?? 30,
  };

  const seed = String(form.seed || "").trim();
  if (seed) {
    payload.seed = seed;
  }

  return payload;
}

function validateForm(form) {
  const seriesPerType = parsePositiveInteger(form.seriesPerType);
  if (!seriesPerType) {
    return "每种类型作品数必须是整数。";
  }
  if (seriesPerType > 20) {
    return "每种类型作品数不能大于 20。";
  }

  const minEpisodes = parsePositiveInteger(form.minEpisodes);
  if (!minEpisodes) {
    return "最少章节数必须是整数。";
  }
  if (minEpisodes > 30) {
    return "最少章节数不能大于 30。";
  }

  const maxEpisodes = parsePositiveInteger(form.maxEpisodes);
  if (!maxEpisodes) {
    return "最多章节数必须是整数。";
  }
  if (maxEpisodes > 30) {
    return "最多章节数不能大于 30。";
  }
  if (minEpisodes > maxEpisodes) {
    return "最多章节数必须大于或等于最少章节数。";
  }

  return "";
}

function readErrorMessage(error) {
  return normalizeAdminErrorMessage(error, "内容生成失败。");
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
          ? `生成完成。运行 ID：${response.data.runId}。`
          : "生成完成。",
      });
    } catch (error) {
      setFeedback({ type: "error", message: readErrorMessage(error) });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AdminLayout
      title="内容生成器"
      subtitle="给测试、版式检查和后台流程核验用的演示数据入口。"
    >
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <AdminMetricCard
            label="预计作品数"
            value={String(estimatedSeriesTotal)}
            detail="每次会按相同数量生成漫画和小说。"
            tone="accent"
          />
          <AdminMetricCard
            label="章节范围"
            value={`${previewMinEpisodes}-${previewMaxEpisodes}`}
            detail="每部生成作品都会落在设定的章节区间里。"
          />
          <AdminMetricCard
            label="使用范围"
            value="仅测试工具"
            detail="生产环境必须通过 ADMIN_CONTENT_GENERATOR_ENABLED 开关保护。"
          />
        </div>

        <AdminFeedbackBanner
          feedback={feedback}
          onDismiss={() => setFeedback({ type: "", message: "" })}
        />

        <AdminPageSection
          title="演示内容生成器"
          description="这里只生成可控的测试目录数据，不作为正式内容录入入口。"
          action={<AdminBadge tone="accent">仅测试工具</AdminBadge>}
        >
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <AdminFormField
                  label="种子"
                  helperText="可选。需要复现同一批测试数据时再填写。"
                >
                  <input
                    value={form.seed}
                    onChange={(event) => updateField("seed", event.target.value)}
                    placeholder="可选的可复现种子"
                    className={adminInputClassName}
                  />
                </AdminFormField>

                <AdminFormField
                  label="每种类型作品数"
                  helperText="允许范围：1 到 20。"
                >
                  <input
                    value={form.seriesPerType}
                    onChange={(event) => updateField("seriesPerType", event.target.value)}
                    inputMode="numeric"
                    className={adminInputClassName}
                  />
                </AdminFormField>

                <AdminFormField
                  label="最少章节数"
                  helperText="允许范围：1 到 30。"
                >
                  <input
                    value={form.minEpisodes}
                    onChange={(event) => updateField("minEpisodes", event.target.value)}
                    inputMode="numeric"
                    className={adminInputClassName}
                  />
                </AdminFormField>

                <AdminFormField
                  label="最多章节数"
                  helperText="允许范围：1 到 30。"
                >
                  <input
                    value={form.maxEpisodes}
                    onChange={(event) => updateField("maxEpisodes", event.target.value)}
                    inputMode="numeric"
                    className={adminInputClassName}
                  />
                </AdminFormField>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button type="button" onClick={generateContent} disabled={generating}>
                  {generating ? "生成中..." : "生成内容"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setForm(DEFAULT_FORM)}
                  disabled={generating}
                >
                  重置设置
                </Button>
                <Button type="button" variant="outline" onClick={() => router.push("/admin/series")}>
                  查看作品
                </Button>
              </div>
            </div>

            <div className="rounded-[28px] border border-[color:var(--gush-border)] bg-white/88 p-5 shadow-[0_10px_24px_rgba(15,23,42,0.03)]">
              <h3 className="text-base font-semibold text-slate-950">本次将生成的内容</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                这个工具只生成用于测试的演示目录数据，不再给后台制造看起来很热闹的假数据。
              </p>

              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <li>{previewSeriesPerType} 部漫画作品</li>
                <li>{previewSeriesPerType} 部小说作品</li>
                <li>
                  {previewMinEpisodes === previewMaxEpisodes
                    ? `每部 ${previewMinEpisodes} 话`
                    : `每部 ${previewMinEpisodes} 到 ${previewMaxEpisodes} 话`}
                </li>
                <li>元数据只面向测试、版式检查和后台流程验证</li>
              </ul>

              <div className="mt-5 rounded-[22px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-4 text-sm leading-6 text-slate-600">
                在类生产环境里使用前，请先显式开启 <code>ADMIN_CONTENT_GENERATOR_ENABLED=1</code>。
              </div>
            </div>
          </div>
        </AdminPageSection>

        {result ? (
          <AdminPageSection
            title="最近一次生成"
            description="这里只展示最近一次测试生成的摘要，方便快速复核。"
          >
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <AdminMetricCard label="运行 ID" value={result.runId || "-"} detail="后端记录这次生成请求的唯一标识。" />
              <AdminMetricCard label="漫画作品" value={String(result.comicsCount ?? 0)} detail="本轮生成出的漫画条目数。" />
              <AdminMetricCard label="小说作品" value={String(result.novelsCount ?? 0)} detail="本轮生成出的小说条目数。" />
              <AdminMetricCard label="总章节数" value={String(result.totalEpisodes ?? 0)} detail="这轮生成覆盖到的章节总量。" />
              <AdminMetricCard label="耗时" value={`${result.duration ?? 0} 秒`} detail="后端返回的执行耗时。" />
              <AdminMetricCard
                label="种子"
                value={String(result.requestPayload?.seed || "随机")}
                detail="需要复现同一批测试数据时，可以再次使用这个种子。"
              />
            </div>
          </AdminPageSection>
        ) : null}
      </div>
    </AdminLayout>
  );
}
