"use client";

export const dynamic = "force-dynamic";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "../../../components/admin/AdminLayout";
import { adminPost } from "../../../lib/adminApiClient";

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
    return "每种类型的作品数量必须是正整数。";
  }
  if (seriesPerType > 20) {
    return "每种类型的作品数量不能超过 20。";
  }

  const minEpisodes = parsePositiveInteger(form.minEpisodes);
  if (!minEpisodes) {
    return "最少章节数必须是正整数。";
  }
  if (minEpisodes > 30) {
    return "最少章节数不能超过 30。";
  }

  const maxEpisodes = parsePositiveInteger(form.maxEpisodes);
  if (!maxEpisodes) {
    return "最多章节数必须是正整数。";
  }
  if (maxEpisodes > 30) {
    return "最多章节数不能超过 30。";
  }
  if (minEpisodes > maxEpisodes) {
    return "最多章节数必须大于或等于最少章节数。";
  }

  return "";
}

function readErrorMessage(error) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "生成失败。";
}

export default function ContentGeneratorPage() {
  const router = useRouter();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState(null);

  const validationError = useMemo(() => validateForm(form), [form]);
  const previewSeriesPerType = parsePositiveInteger(form.seriesPerType) ?? 20;
  const previewMinEpisodes = parsePositiveInteger(form.minEpisodes) ?? 10;
  const previewMaxEpisodes = parsePositiveInteger(form.maxEpisodes) ?? 30;

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const generateContent = async () => {
    if (validationError) {
      setResult(null);
      setProgress(`错误：${validationError}`);
      return;
    }

    const payload = buildGeneratorPayload(form);
    setGenerating(true);
    setProgress("正在生成演示内容...");
    setResult(null);

    try {
      const response = await adminPost("/api/admin/generate-content", payload);
      if (!response.ok) {
        throw new Error(response.error || response.message || "生成失败。");
      }

      setResult({ ...(response.data || {}), requestPayload: payload });
      setProgress(`生成完成${response.data?.runId ? `，任务编号：${response.data.runId}。` : "。"}`);
    } catch (error) {
      setProgress(`错误：${readErrorMessage(error)}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AdminLayout title="内容生成器">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-3xl font-bold text-white">演示内容生成器</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-300">
            一键生成平衡的演示漫画和小说数据，用于 QA、排版验收和后台流程联调。
            该后端接口受后台鉴权保护，并且可以在生产环境中禁用。
          </p>

          <div className="mt-6 grid gap-3 text-sm text-neutral-300 lg:grid-cols-[1.2fr,0.8fr]">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="font-semibold text-white">将生成的内容</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>{previewSeriesPerType} 部漫画作品</li>
                <li>{previewSeriesPerType} 部小说作品</li>
                <li>每部作品 {previewMinEpisodes} 到 {previewMaxEpisodes} 章</li>
                <li>评分、标签、定价和预览内容</li>
              </ul>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="font-semibold text-white">运行说明</p>
              <p className="mt-2 leading-6 text-neutral-400">
                生产环境需要先配置 <code>ADMIN_CONTENT_GENERATOR_ENABLED=1</code>，此操作才可执行。
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2 text-sm text-neutral-300">
              <span className="font-semibold text-white">种子</span>
              <input
                value={form.seed}
                onChange={(event) => updateField("seed", event.target.value)}
                placeholder="可选的复现实验种子"
                className="w-full rounded-2xl border border-white/10 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-emerald-400/50"
              />
            </label>
            <label className="space-y-2 text-sm text-neutral-300">
              <span className="font-semibold text-white">每种类型作品数</span>
              <input
                value={form.seriesPerType}
                onChange={(event) => updateField("seriesPerType", event.target.value)}
                inputMode="numeric"
                className="w-full rounded-2xl border border-white/10 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/50"
              />
            </label>
            <label className="space-y-2 text-sm text-neutral-300">
              <span className="font-semibold text-white">最少章节数</span>
              <input
                value={form.minEpisodes}
                onChange={(event) => updateField("minEpisodes", event.target.value)}
                inputMode="numeric"
                className="w-full rounded-2xl border border-white/10 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/50"
              />
            </label>
            <label className="space-y-2 text-sm text-neutral-300">
              <span className="font-semibold text-white">最多章节数</span>
              <input
                value={form.maxEpisodes}
                onChange={(event) => updateField("maxEpisodes", event.target.value)}
                inputMode="numeric"
                className="w-full rounded-2xl border border-white/10 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/50"
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap gap-3 text-xs text-neutral-500">
            <span>每种类型作品数：1-20</span>
            <span>章节范围：1-30</span>
            <span>种子可选，填写后可复现生成结果</span>
          </div>

          {validationError ? (
            <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {validationError}
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={generateContent}
              disabled={generating}
              className={`rounded-2xl px-6 py-3 font-semibold text-white transition-colors ${
                generating ? "cursor-not-allowed bg-neutral-600" : "bg-emerald-500 hover:bg-emerald-600"
              }`}
            >
              {generating ? "生成中..." : "生成内容"}
            </button>
            <button
              type="button"
              onClick={() => setForm(DEFAULT_FORM)}
              disabled={generating}
              className="rounded-2xl border border-white/10 px-6 py-3 font-semibold text-neutral-200 transition hover:border-emerald-400 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              重置设置
            </button>
            <button
              type="button"
              onClick={() => router.push("/admin/series")}
              className="rounded-2xl border border-white/10 px-6 py-3 font-semibold text-neutral-200 transition hover:border-emerald-400 hover:text-emerald-300"
            >
              查看作品
            </button>
          </div>
        </section>

        {progress ? (
          <section className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-neutral-300">
            {progress}
          </section>
        ) : null}

        {result ? (
          <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
            <h2 className="text-lg font-semibold text-emerald-400">生成结果</h2>
            <div className="mt-3 grid gap-2 text-sm text-neutral-200 sm:grid-cols-2 lg:grid-cols-3">
              <p>任务编号：{result.runId || "-"}</p>
              <p>漫画作品：{result.comicsCount}</p>
              <p>小说作品：{result.novelsCount}</p>
              <p>总章节数：{result.totalEpisodes}</p>
              <p>耗时：{result.duration} 秒</p>
              <p>种子：{String(result.requestPayload?.seed || "随机")}</p>
              <p>每种类型作品数：{result.settings?.seriesPerType ?? result.requestPayload?.seriesPerType ?? previewSeriesPerType}</p>
              <p>最少章节数：{result.settings?.minEpisodes ?? result.requestPayload?.minEpisodes ?? previewMinEpisodes}</p>
              <p>最多章节数：{result.settings?.maxEpisodes ?? result.requestPayload?.maxEpisodes ?? previewMaxEpisodes}</p>
            </div>
          </section>
        ) : null}
      </div>
    </AdminLayout>
  );
}
