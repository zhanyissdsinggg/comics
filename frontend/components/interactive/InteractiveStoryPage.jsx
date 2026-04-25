"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../../lib/apiClient";
import SiteHeader from "../layout/SiteHeader";
import { useAuthStore } from "../../store/useAuthStore";

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function openAuthModal() {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent("auth:open"));
}

function toStateRows(state) {
  if (!state || typeof state !== "object") {
    return [];
  }
  const keys = ["affection", "trust", "risk", "clues"];
  return keys
    .map((key) => ({
      key,
      value: Number(state[key] || 0),
    }))
    .filter((item) => Number.isFinite(item.value));
}

export default function InteractiveStoryPage({ seriesId }) {
  const [loading, setLoading] = useState(true);
  const [story, setStory] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");
  const [submittingChoiceId, setSubmittingChoiceId] = useState("");
  const [authRequired, setAuthRequired] = useState(false);
  const [degradedNotice, setDegradedNotice] = useState("");
  const { hydrated, isSignedIn } = useAuthStore();

  const loadProgress = useCallback(async (storyId) => {
    const response = await apiGet(`/api/interactive-stories/${encodeURIComponent(storyId)}/progress`, {
      bust: true,
      cacheMs: 0,
    });

    if (response.ok && response.data?.progress) {
      setProgress(response.data.progress);
      setAuthRequired(false);
      setError("");
      return;
    }

    if (response.status === 401) {
      setAuthRequired(true);
      setError("Sign in to save and continue your interactive run.");
      return;
    }

    setError("Failed to load your interactive progress.");
  }, []);

  const bootstrap = useCallback(async () => {
    const normalizedSeriesId = normalizeText(seriesId);
    if (!normalizedSeriesId) {
      setError("Invalid series id.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setDegradedNotice("");

    const storyResponse = await apiGet(
      `/api/interactive-stories/by-series/${encodeURIComponent(normalizedSeriesId)}`,
      { bust: true, cacheMs: 0 },
    );

    if (!storyResponse.ok || !storyResponse.data?.story) {
      setStory(null);
      setProgress(null);
      setError("Interactive mode is not configured for this story yet.");
      setLoading(false);
      return;
    }

    const storyPayload = storyResponse.data.story;
    setStory(storyPayload);
    await loadProgress(storyPayload.id);
    setLoading(false);
  }, [loadProgress, seriesId]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    void bootstrap();
  }, [bootstrap, hydrated, isSignedIn]);

  const handleChoose = useCallback(
    async (choiceId) => {
      if (!story?.id || !choiceId) {
        return;
      }

      setSubmittingChoiceId(choiceId);
      setError("");
      const response = await apiPost(
        `/api/interactive-stories/${encodeURIComponent(story.id)}/choice`,
        { choiceId },
        { timeoutMs: 20000 },
      );
      setSubmittingChoiceId("");

      if (response.ok && response.data?.progress) {
        setProgress(response.data.progress);
        setAuthRequired(false);
        setDegradedNotice("");
        return;
      }

      if (response.status === 401) {
        setAuthRequired(true);
        setError("Please sign in before making interactive choices.");
        openAuthModal();
        return;
      }

      if (response.status === 400) {
        setDegradedNotice("That option is unavailable now. We reloaded your latest node.");
        await loadProgress(story.id);
        return;
      }

      setError("We could not continue the story right now. Please retry.");
    },
    [loadProgress, story?.id],
  );

  const storyStateRows = useMemo(() => toStateRows(progress?.state), [progress?.state]);
  const node = progress?.node || null;
  const storyTitle = normalizeText(story?.title || "Interactive");
  const storyDescription = normalizeText(story?.description);

  if (loading) {
    return (
      <main className="min-h-screen overflow-hidden bg-[#f6f7f9] text-black">
        <SiteHeader variant="home" />
        <div className="mx-auto max-w-[1320px] px-4 py-8 md:px-8 md:py-10">
          <section className="rounded-[30px] border border-black/10 bg-white p-6 shadow-[0_20px_46px_rgba(15,23,42,0.08)]">
            <p className="text-sm font-medium text-black/58">Loading...</p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f6f7f9] text-black">
      <SiteHeader variant="home" />
      <div className="mx-auto flex max-w-[1320px] flex-col gap-8 px-4 py-8 md:px-8 md:py-10">
        <section className="rounded-[30px] border border-black/10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-6 shadow-[0_20px_46px_rgba(15,23,42,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-black/55">
                Interactive
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-black">
                {storyTitle}
              </h1>
              {storyDescription ? (
                <p className="mt-2 text-sm font-medium text-black/68">{storyDescription}</p>
              ) : null}
            </div>
            <Link
              href={`/series/${encodeURIComponent(seriesId)}`}
              className="inline-flex items-center justify-center rounded-full border border-black/12 bg-white px-4 py-2 text-sm font-semibold tracking-[0.02em] text-black shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition-[background-color,border-color,box-shadow,transform] duration-200 hover:border-black/18 hover:bg-black/[0.03] hover:shadow-[0_12px_24px_rgba(15,23,42,0.1)] active:translate-y-px"
            >
              Back to series
            </Link>
          </div>
        </section>

        {error ? (
          <section className="rounded-[24px] border border-rose-200/70 bg-[linear-gradient(180deg,#fff6f8_0%,#fff1f3_100%)] p-4 text-sm font-medium text-rose-700 shadow-[0_16px_34px_rgba(244,63,94,0.1)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>{error}</span>
              {authRequired ? (
                <button
                  type="button"
                  onClick={openAuthModal}
                  className="rounded-full border border-rose-200/70 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-rose-700 shadow-[0_10px_20px_rgba(244,63,94,0.08)] transition-[background-color,border-color,box-shadow,transform] duration-200 hover:bg-rose-50 hover:shadow-[0_12px_24px_rgba(244,63,94,0.1)] active:translate-y-px"
                >
                  Sign in
                </button>
              ) : null}
            </div>
          </section>
        ) : null}

        {degradedNotice ? (
          <section className="rounded-[24px] border border-amber-200/70 bg-[linear-gradient(180deg,#fffdf7_0%,#fff8eb_100%)] p-4 text-sm font-medium text-black/68 shadow-[0_16px_34px_rgba(245,158,11,0.08)]">
            {degradedNotice}
          </section>
        ) : null}

        {node ? (
          <>
            <section className="rounded-[30px] border border-black/10 bg-white p-6 shadow-[0_20px_46px_rgba(15,23,42,0.08)]">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-black/55">
                {normalizeText(node.title || "Current Node")}
              </p>
              <p className="mt-4 whitespace-pre-line text-[15px] leading-8 text-black/82">
                {normalizeText(node.content)}
              </p>
            </section>

            <section className="rounded-[30px] border border-black/10 bg-white p-6 shadow-[0_20px_46px_rgba(15,23,42,0.08)]">
              <h2 className="text-base font-semibold tracking-[0.01em] text-black">Choose your next move</h2>
              <div className="mt-4 grid gap-3">
                {(node.choices || []).map((choice) => {
                  const disabled = Boolean(submittingChoiceId) || authRequired;
                  const busy = submittingChoiceId === choice.id;
                  return (
                    <button
                      key={choice.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => handleChoose(choice.id)}
                      className="rounded-[24px] border border-black/10 bg-[linear-gradient(180deg,#ffffff_0%,#fafbfc_100%)] px-4 py-3 text-left text-sm font-medium text-black shadow-[0_14px_30px_rgba(15,23,42,0.08)] transition-[background-color,border-color,box-shadow,transform] duration-200 hover:border-black/16 hover:bg-white hover:shadow-[0_16px_34px_rgba(15,23,42,0.1)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busy ? "Generating next segment..." : normalizeText(choice.label)}
                    </button>
                  );
                })}
                {node.choices?.length === 0 ? (
                  <p className="text-sm font-medium text-black/58">
                    End of current branch. More chapters can be configured in story nodes.
                  </p>
                ) : null}
              </div>
            </section>

            {storyStateRows.length > 0 ? (
              <section className="rounded-[28px] border border-black/10 bg-[linear-gradient(180deg,#ffffff_0%,#f7f8fa_100%)] p-4 shadow-[0_18px_38px_rgba(15,23,42,0.08)]">
                <h3 className="text-xs font-black uppercase tracking-[0.16em] text-black/55">
                  Story State
                </h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {storyStateRows.map((item) => (
                    <div
                      key={item.key}
                      className="rounded-[20px] border border-black/10 bg-white px-3 py-2 text-sm text-black shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
                    >
                      <span className="font-semibold uppercase tracking-[0.08em] text-black/72">{item.key}</span>: {item.value}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
