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
  const storyTitle = normalizeText(story?.title || "Interactive Story");
  const storyDescription = normalizeText(story?.description);

  if (loading) {
    return (
      <main className="gush-page-shell gush-home-shell overflow-hidden">
        <SiteHeader variant="home" />
        <div className="gush-page-main">
          <section className="rounded-[30px] border border-[color:var(--gush-border)] bg-white p-6 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
            <p className="text-sm text-[color:var(--gush-ink-soft)]">Loading interactive mode...</p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="gush-page-shell gush-home-shell overflow-hidden">
      <SiteHeader variant="home" />
      <div className="gush-page-main gush-section-stack">
        <section className="rounded-[30px] border border-[color:var(--gush-border)] bg-white p-6 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--gush-ink-faint)]">
                Interactive Mode
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[color:var(--gush-ink-strong)]">
                {storyTitle}
              </h1>
              {storyDescription ? (
                <p className="mt-2 text-sm text-[color:var(--gush-ink-soft)]">{storyDescription}</p>
              ) : null}
            </div>
            <Link
              href={`/series/${encodeURIComponent(seriesId)}`}
              className="rounded-full border border-[color:var(--gush-border)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--gush-ink)] hover:border-[color:var(--gush-border-strong)]"
            >
              Back to series
            </Link>
          </div>
        </section>

        {error ? (
          <section className="rounded-[24px] border border-[rgba(239,68,68,0.25)] bg-[rgba(254,242,242,0.9)] p-4 text-sm text-[#991b1b]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>{error}</span>
              {authRequired ? (
                <button
                  type="button"
                  onClick={openAuthModal}
                  className="rounded-full border border-[#ef4444] bg-white px-3 py-1.5 text-xs font-semibold text-[#991b1b]"
                >
                  Sign in
                </button>
              ) : null}
            </div>
          </section>
        ) : null}

        {degradedNotice ? (
          <section className="rounded-[20px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] p-4 text-sm text-[color:var(--gush-ink-soft)]">
            {degradedNotice}
          </section>
        ) : null}

        {node ? (
          <>
            <section className="rounded-[30px] border border-[color:var(--gush-border)] bg-white p-6 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--gush-ink-faint)]">
                {normalizeText(node.title || "Current Node")}
              </p>
              <p className="mt-4 whitespace-pre-line text-[15px] leading-8 text-[color:var(--gush-ink)]">
                {normalizeText(node.content)}
              </p>
            </section>

            <section className="rounded-[30px] border border-[color:var(--gush-border)] bg-white p-6 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
              <h2 className="text-base font-semibold text-[color:var(--gush-ink-strong)]">Choose your next move</h2>
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
                      className="rounded-2xl border border-[color:var(--gush-border)] bg-white px-4 py-3 text-left text-sm font-medium text-[color:var(--gush-ink)] transition hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busy ? "Generating next segment..." : normalizeText(choice.label)}
                    </button>
                  );
                })}
                {node.choices?.length === 0 ? (
                  <p className="text-sm text-[color:var(--gush-ink-soft)]">
                    End of current branch. More chapters can be configured in story nodes.
                  </p>
                ) : null}
              </div>
            </section>

            {storyStateRows.length > 0 ? (
              <section className="rounded-[24px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] p-4">
                <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--gush-ink-faint)]">
                  Story State
                </h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {storyStateRows.map((item) => (
                    <div
                      key={item.key}
                      className="rounded-xl border border-[color:var(--gush-border)] bg-white px-3 py-2 text-sm text-[color:var(--gush-ink)]"
                    >
                      <span className="font-semibold">{item.key}</span>: {item.value}
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
