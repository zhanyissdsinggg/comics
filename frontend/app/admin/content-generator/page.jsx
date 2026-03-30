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
    return "Series per type must be a whole number.";
  }
  if (seriesPerType > 20) {
    return "Series per type cannot be greater than 20.";
  }

  const minEpisodes = parsePositiveInteger(form.minEpisodes);
  if (!minEpisodes) {
    return "Minimum episodes must be a whole number.";
  }
  if (minEpisodes > 30) {
    return "Minimum episodes cannot be greater than 30.";
  }

  const maxEpisodes = parsePositiveInteger(form.maxEpisodes);
  if (!maxEpisodes) {
    return "Maximum episodes must be a whole number.";
  }
  if (maxEpisodes > 30) {
    return "Maximum episodes cannot be greater than 30.";
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
  return "Content generation failed.";
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
        throw new Error(response.error || response.message || "Content generation failed.");
      }

      setResult({ ...(response.data || {}), requestPayload: payload });
      setFeedback({
        type: "success",
        message: response.data?.runId
          ? `Generation finished. Run ID: ${response.data.runId}.`
          : "Generation finished.",
      });
    } catch (error) {
      setFeedback({ type: "error", message: readErrorMessage(error) });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AdminLayout
      title="Content Generator"
      subtitle="Create demo catalog data for QA, layout checks, and backstage workflow reviews without turning the admin into a noisy tooling console."
    >
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <AdminMetricCard
            label="Estimated series"
            value={String(estimatedSeriesTotal)}
            detail="The generator creates the same number of comics and novels per run."
            tone="accent"
          />
          <AdminMetricCard
            label="Episode range"
            value={`${previewMinEpisodes}-${previewMaxEpisodes}`}
            detail="Each generated series stays within the configured episode window."
          />
          <AdminMetricCard
            label="Access"
            value="Admin-only"
            detail="Production use should stay gated behind ADMIN_CONTENT_GENERATOR_ENABLED."
          />
        </div>

        <AdminFeedbackBanner
          feedback={feedback}
          onDismiss={() => setFeedback({ type: "", message: "" })}
        />

        <AdminPageSection
          title="Demo Content Generator"
          description="Generate controlled demo catalog data for QA and publishing checks. Keep the output intentional so the workspace stays useful instead of noisy."
          action={<AdminBadge tone="accent">Utility route</AdminBadge>}
        >
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <AdminFormField
                  label="Seed"
                  helperText="Optional. Use a repeatable seed when QA needs the same dataset again."
                >
                  <input
                    value={form.seed}
                    onChange={(event) => updateField("seed", event.target.value)}
                    placeholder="Optional repeatable seed"
                    className={adminInputClassName}
                  />
                </AdminFormField>

                <AdminFormField
                  label="Series per type"
                  helperText="Allowed range: 1 to 20."
                >
                  <input
                    value={form.seriesPerType}
                    onChange={(event) => updateField("seriesPerType", event.target.value)}
                    inputMode="numeric"
                    className={adminInputClassName}
                  />
                </AdminFormField>

                <AdminFormField
                  label="Minimum episodes"
                  helperText="Allowed range: 1 to 30."
                >
                  <input
                    value={form.minEpisodes}
                    onChange={(event) => updateField("minEpisodes", event.target.value)}
                    inputMode="numeric"
                    className={adminInputClassName}
                  />
                </AdminFormField>

                <AdminFormField
                  label="Maximum episodes"
                  helperText="Allowed range: 1 to 30."
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
                  {generating ? "Generating..." : "Generate content"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setForm(DEFAULT_FORM)}
                  disabled={generating}
                >
                  Reset settings
                </Button>
                <Button type="button" variant="outline" onClick={() => router.push("/admin/series")}>
                  View series
                </Button>
              </div>
            </div>

            <div className="rounded-[28px] border border-black/8 bg-white/88 p-5 shadow-[0_10px_24px_rgba(15,23,42,0.03)]">
              <h3 className="text-base font-semibold text-slate-950">What this run will create</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                This generator stays focused on usable demo inventory rather than fake dashboard theater.
              </p>

              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <li>{previewSeriesPerType} comic series</li>
                <li>{previewSeriesPerType} novel series</li>
                <li>
                  {previewMinEpisodes === previewMaxEpisodes
                    ? `${previewMinEpisodes} episodes per series`
                    : `${previewMinEpisodes} to ${previewMaxEpisodes} episodes per series`}
                </li>
                <li>Metadata shaped for QA, layout review, and backstage workflow testing</li>
              </ul>

              <div className="mt-5 rounded-[22px] border border-black/8 bg-[rgba(250,247,241,0.82)] px-4 py-4 text-sm leading-6 text-slate-600">
                Enable <code>ADMIN_CONTENT_GENERATOR_ENABLED=1</code> in production-like environments before using this route.
              </div>
            </div>
          </div>
        </AdminPageSection>

        {result ? (
          <AdminPageSection
            title="Latest run"
            description="A short summary of the most recent demo generation request."
          >
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <AdminMetricCard label="Run ID" value={result.runId || "-"} detail="The backend identifier for this generation request." />
              <AdminMetricCard label="Comic series" value={String(result.comicsCount ?? 0)} detail="Generated comic entries in this run." />
              <AdminMetricCard label="Novel series" value={String(result.novelsCount ?? 0)} detail="Generated novel entries in this run." />
              <AdminMetricCard label="Total episodes" value={String(result.totalEpisodes ?? 0)} detail="Episode count across all generated titles." />
              <AdminMetricCard label="Duration" value={`${result.duration ?? 0} s`} detail="Reported backend execution time." />
              <AdminMetricCard
                label="Seed"
                value={String(result.requestPayload?.seed || "Random")}
                detail="Use the same seed again when QA needs a repeatable run."
              />
            </div>
          </AdminPageSection>
        ) : null}
      </div>
    </AdminLayout>
  );
}
