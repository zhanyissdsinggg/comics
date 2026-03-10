"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "../../../components/admin/AdminLayout";
import { adminPost } from "../../../lib/adminApiClient";

export default function ContentGeneratorPage() {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState(null);

  const generateContent = async () => {
    setGenerating(true);
    setProgress("Generating demo content...");
    setResult(null);

    try {
      const response = await adminPost("/api/admin/generate-content", {});
      if (!response.ok) {
        throw new Error(response.error || response.message || "Generation failed.");
      }

      setResult(response.data);
      setProgress("Generation completed.");
    } catch (error) {
      setProgress(`Error: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AdminLayout title="Content Generator">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-3xl font-bold text-white">Demo content generator</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-300">
            Create a balanced set of demo comics and novels for QA, layout validation, and admin workflows.
            The backend route is protected by admin auth and can be disabled in production.
          </p>

          <div className="mt-6 grid gap-3 text-sm text-neutral-300 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="font-semibold text-white">What gets created</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>20 comic series</li>
                <li>20 novel series</li>
                <li>10 to 30 episodes per series</li>
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

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={generateContent}
              disabled={generating}
              className={`rounded-2xl px-6 py-3 font-semibold text-white transition-colors ${
                generating ? "cursor-not-allowed bg-neutral-600" : "bg-emerald-500 hover:bg-emerald-600"
              }`}
            >
              {generating ? "Generating..." : "Generate content"}
            </button>
            <button
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
            <div className="mt-3 grid gap-2 text-sm text-neutral-200 sm:grid-cols-2">
              <p>Comic series: {result.comicsCount}</p>
              <p>Novel series: {result.novelsCount}</p>
              <p>Total episodes: {result.totalEpisodes}</p>
              <p>Duration: {result.duration}s</p>
            </div>
          </section>
        ) : null}
      </div>
    </AdminLayout>
  );
}
