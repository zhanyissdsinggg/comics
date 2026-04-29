"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../../lib/apiClient";
import { useAuthStore } from "../../store/useAuthStore";
import SurfacePanel from "../common/SurfacePanel";
import {
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../common/StorefrontPagePrimitives";

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
      setError("Sign in to keep going.");
      return;
    }

    setError("Couldn't load your progress.");
  }, []);

  const bootstrap = useCallback(async () => {
    const normalizedSeriesId = normalizeText(seriesId);
    if (!normalizedSeriesId) {
      setError("Invalid story.");
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
      setError("Interactive story isn't live yet.");
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
        setError("Sign in to choose.");
        openAuthModal();
        return;
      }

      if (response.status === 400) {
        setDegradedNotice("That choice isn't available. Reloaded your latest node.");
        await loadProgress(story.id);
        return;
      }

      setError("Couldn't continue right now. Try again.");
    },
    [loadProgress, story?.id],
  );

  const storyStateRows = useMemo(() => toStateRows(progress?.state), [progress?.state]);
  const node = progress?.node || null;
  const storyTitle = normalizeText(story?.title || "Interactive");
  const storyDescription = normalizeText(story?.description);

  if (loading) {
    return (
      <main className="min-h-screen overflow-hidden bg-black text-white">
        <div className="mx-auto max-w-[1320px] px-4 py-8 md:px-8 md:py-10">
          <SurfacePanel tone="muted" accent="cyan" appearance="dark">
            <p className="text-sm font-semibold text-white/75">Loading</p>
          </SurfacePanel>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-black text-white">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-8 px-4 py-8 md:px-8 md:py-10">
        <SurfacePanel tone="muted" accent="cyan" appearance="dark">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/70">
                Interactive
              </p>
              <h1 className="mt-2 text-2xl font-black uppercase tracking-[-0.05em] text-white">
                {storyTitle}
              </h1>
              {storyDescription ? (
                <p className="mt-2 text-sm font-semibold text-white/80">{storyDescription}</p>
              ) : null}
            </div>
            <Link
              href={`/series/${encodeURIComponent(seriesId)}`}
              className={`${storefrontSecondaryButtonClass} h-10 px-4 text-[11px] tracking-[0.08em]`}
            >
              Series
            </Link>
          </div>
        </SurfacePanel>

        {error ? (
          <SurfacePanel tone="muted" accent="pink" appearance="dark" className="text-white">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>{error}</span>
              {authRequired ? (
                <button
                  type="button"
                  onClick={openAuthModal}
                  className={`${storefrontPrimaryButtonClass} h-10 px-4 text-[11px] tracking-[0.08em]`}
                >
                  Sign in
                </button>
              ) : null}
            </div>
          </SurfacePanel>
        ) : null}

        {degradedNotice ? (
          <SurfacePanel tone="muted" accent="yellow" appearance="dark">
            {degradedNotice}
          </SurfacePanel>
        ) : null}

        {node ? (
          <>
            <SurfacePanel tone="muted" accent="cyan" appearance="dark">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/70">
                {normalizeText(node.title || "Current Node")}
              </p>
              <p className="mt-4 whitespace-pre-line text-[15px] leading-8 text-white/85">
                {normalizeText(node.content)}
              </p>
            </SurfacePanel>

            <SurfacePanel tone="muted" accent="yellow" appearance="dark">
              <h2 className="text-base font-black uppercase tracking-[0.01em] text-white">
                Choices
              </h2>
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
                      className={[
                        "w-full rounded-[22px] border-2 border-black bg-[#0b0b0b] px-4 py-3 text-left text-sm font-semibold text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 ease-out hover:translate-x-0.5 hover:translate-y-0.5",
                        disabled ? "opacity-60" : "",
                      ].join(" ")}
                    >
                      {busy ? "Generating..." : normalizeText(choice.label)}
                    </button>
                  );
                })}
                {node.choices?.length === 0 ? (
                  <p className="text-sm font-semibold text-white/70">No choices right now.</p>
                ) : null}
              </div>
            </SurfacePanel>

            {storyStateRows.length > 0 ? (
              <SurfacePanel tone="muted" accent="blue" appearance="dark">
                <h3 className="text-xs font-black uppercase tracking-[0.16em] text-white/70">
                  State
                </h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {storyStateRows.map((item) => (
                    <div
                      key={item.key}
                      className="rounded-[20px] border-2 border-black bg-[#0b0b0b] px-3 py-2 text-sm text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                    >
                      <span className="font-black uppercase tracking-[0.08em] text-white/80">
                        {item.key}
                      </span>
                      : {item.value}
                    </div>
                  ))}
                </div>
              </SurfacePanel>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
