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
    return "Series per type must be a positive integer.";
  }
  if (seriesPerType > 20) {
    return "Series per type cannot exceed 20.";
  }

  const minEpisodes = parsePositiveInteger(form.minEpisodes);
  if (!minEpisodes) {
    return "Minimum episodes must be a positive integer.";
  }
  if (minEpisodes > 30) {
    return "Minimum episodes cannot exceed 30.";
  }

  const maxEpisodes = parsePositiveInteger(form.maxEpisodes);
  if (!maxEpisodes) {
    return "Maximum episodes must be a positive integer.";
  }
  if (maxEpisodes > 30) {
    return "Maximum episodes cannot exceed 30.";
  }
  if (minEpisodes > maxEpisodes) {
    return "Maximum episodes must be greater than or equal to minimum episodes.";
  }

  return "";
}

function readErrorMessage(error) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Generation failed.";
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
      setProgress(`Error: ${validationError}`);
      return;
    }

    const payload = buildGeneratorPayload(form);
    setGenerating(true);
    setProgress("Generating demo content...");
    setResult(null);

    try {
      const response = await adminPost("/api/admin/generate-content", payload);
      if (!response.ok) {
        throw new Error(response.error || response.message || "Generation failed.");
      }

      setResult({ ...(response.data || {}), requestPayload: payload });
      setProgress(`Generation completed${response.data?.runId ? ` for run ${response.data.runId}.` : "."}`);
    } catch (error) {
      setProgress(`Error: ${readErrorMessage(error)}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AdminLayout title="Content Generator">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-3xl font-bold text-white">Demo content generator</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-300">
            Create a balanced set of demo comics and novels for QA, layout validation, and admin workflows.
            The backend route is protected by admin auth and can be disabled in production.
          </p>

          <div className="mt-6 grid gap-3 text-sm text-neutral-300 lg:grid-cols-[1.2fr,0.8fr]">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="font-semibold text-white">What gets created</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>{previewSeriesPerType} comic series</li>
                <li>{previewSeriesPerType} novel series</li>
                <li>{previewMinEpisodes} to {previewMaxEpisodes} episodes per series</li>
                <li>Ratings, tags, pricing, and preview content</li>
              </ul>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="font-semibold text-white">Operational note</p>
              <p className="mt-2 leading-6 text-neutral-400">
                Production environments require <code>ADMIN_CONTENT_GENERATOR_ENABLED=1</code> before this action can run.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2 text-sm text-neutral-300">
              <span className="font-semibold text-white">Seed</span>
              <input
                value={form.seed}
                onChange={(event) => updateField("seed", event.target.value)}
                placeholder="Optional reproducible seed"
                className="w-full rounded-2xl border border-white/10 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-emerald-400/50"
              />
            </label>
            <label className="space-y-2 text-sm text-neutral-300">
              <span className="font-semibold text-white">Series per type</span>
              <input
                value={form.seriesPerType}
                onChange={(event) => updateField("seriesPerType", event.target.value)}
                inputMode="numeric"
                className="w-full rounded-2xl border border-white/10 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/50"
              />
            </label>
            <label className="space-y-2 text-sm text-neutral-300">
              <span className="font-semibold text-white">Min episodes</span>
              <input
                value={form.minEpisodes}
                onChange={(event) => updateField("minEpisodes", event.target.value)}
                inputMode="numeric"
                className="w-full rounded-2xl border border-white/10 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/50"
              />
            </label>
            <label className="space-y-2 text-sm text-neutral-300">
              <span className="font-semibold text-white">Max episodes</span>
              <input
                value={form.maxEpisodes}
                onChange={(event) => updateField("maxEpisodes", event.target.value)}
                inputMode="numeric"
                className="w-full rounded-2xl border border-white/10 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/50"
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap gap-3 text-xs text-neutral-500">
            <span>Series per type: 1-20</span>
            <span>Episode range: 1-30</span>
            <span>Seed is optional and makes runs reproducible</span>
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
              {generating ? "Generating..." : "Generate content"}
            </button>
            <button
              type="button"
              onClick={() => setForm(DEFAULT_FORM)}
              disabled={generating}
              className="rounded-2xl border border-white/10 px-6 py-3 font-semibold text-neutral-200 transition hover:border-emerald-400 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reset settings
            </button>
            <button
              type="button"
              onClick={() => router.push("/admin/series")}
              className="rounded-2xl border border-white/10 px-6 py-3 font-semibold text-neutral-200 transition hover:border-emerald-400 hover:text-emerald-300"
            >
              Review series
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
            <h2 className="text-lg font-semibold text-emerald-400">Generation summary</h2>
            <div className="mt-3 grid gap-2 text-sm text-neutral-200 sm:grid-cols-2 lg:grid-cols-3">
              <p>Run ID: {result.runId || "-"}</p>
              <p>Comic series: {result.comicsCount}</p>
              <p>Novel series: {result.novelsCount}</p>
              <p>Total episodes: {result.totalEpisodes}</p>
              <p>Duration: {result.duration}s</p>
              <p>Seed: {String(result.requestPayload?.seed || "random")}</p>
              <p>Series per type: {result.settings?.seriesPerType ?? result.requestPayload?.seriesPerType ?? previewSeriesPerType}</p>
              <p>Min episodes: {result.settings?.minEpisodes ?? result.requestPayload?.minEpisodes ?? previewMinEpisodes}</p>
              <p>Max episodes: {result.settings?.maxEpisodes ?? result.requestPayload?.maxEpisodes ?? previewMaxEpisodes}</p>
            </div>
          </section>
        ) : null}
      </div>
    </AdminLayout>
  );
}
