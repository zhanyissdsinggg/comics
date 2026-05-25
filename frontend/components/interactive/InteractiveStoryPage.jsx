"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../../lib/apiClient";
import { trackEvent } from "../../lib/trackEvent";
import { useAuthStore } from "../../store/useAuthStore";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import SurfacePanel from "../common/SurfacePanel";
import {
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../common/StorefrontPagePrimitives";

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `interactive_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
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

function getLockedCopy(choice) {
  if (!choice?.locked) {
    return "";
  }
  if (choice.lockedReason === "PREMIUM_REQUIRED") {
    return choice.unlockLabel || "Premium choice";
  }
  if (choice.lockedReason === "TOKENS_REQUIRED") {
    return choice.unlockLabel || `${Number(choice.requiresTokens || 0)} tokens`;
  }
  return choice.unlockLabel || "Locked";
}

export default function InteractiveStoryPage({
  storySlug,
  storyId = "",
  seriesId = "",
  mode = "play",
}) {
  const [loading, setLoading] = useState(mode !== "play");
  const [story, setStory] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");
  const [authRequired, setAuthRequired] = useState(false);
  const [submittingChoiceId, setSubmittingChoiceId] = useState("");
  const [degradedNotice, setDegradedNotice] = useState("");
  const { hydrated, isSignedIn } = useAuthStore();
  const { contentMode } = useAdultGateStore();

  const normalizedSlug = normalizeText(storySlug);

  const loadStory = useCallback(async () => {
    if (!normalizedSlug) {
      setError("Invalid story.");
      setLoading(false);
      return null;
    }
    const response = await apiGet(
      `/api/interactive-stories/slug/${encodeURIComponent(normalizedSlug)}`,
      {
        bust: true,
        cacheMs: 0,
      },
    );
    if (!response.ok || !response.data?.story) {
      setStory(null);
      setError("Interactive story isn't available.");
      setLoading(false);
      return null;
    }
    setStory(response.data.story);
    setError("");
    return response.data.story;
  }, [normalizedSlug]);

  const loadProgress = useCallback(async () => {
    if (!normalizedSlug) {
      return;
    }
    const response = await apiGet(
      `/api/interactive-stories/slug/${encodeURIComponent(normalizedSlug)}/current`,
      {
        bust: true,
        cacheMs: 0,
      },
    );

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

    if (response.status === 404) {
      setError("Interactive story isn't available.");
      return;
    }

    setError("Couldn't load your progress.");
  }, [normalizedSlug]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    let active = true;
    async function bootstrap() {
      if (mode !== "play") {
        setLoading(true);
        const result = await loadStory();
        if (!active) {
          return;
        }
        if (result) {
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError("");
      setDegradedNotice("");
      const result = await loadStory();
      if (!active || !result) {
        return;
      }
      await loadProgress();
      if (!active) {
        return;
      }
      setLoading(false);
    }

    void bootstrap();
    return () => {
      active = false;
    };
  }, [hydrated, isSignedIn, loadProgress, loadStory, mode]);

  useEffect(() => {
    if (!story?.id) {
      return;
    }
    trackEvent("interactive_story_view", {
      storyId: story.id || storyId || undefined,
      storySlug: normalizedSlug || undefined,
      seriesId: seriesId || story.seriesId || undefined,
      contentMode,
      sourceSection: mode === "play" ? "interactive_play" : "interactive_detail",
    });
  }, [contentMode, mode, normalizedSlug, seriesId, story?.id, story?.seriesId, storyId]);

  const handleChoose = useCallback(
    async (choice) => {
      if (!story?.slug || !choice?.id || choice.locked) {
        return;
      }

      setSubmittingChoiceId(choice.id);
      setError("");
      setDegradedNotice("");

      const response = await apiPost(
        `/api/interactive-stories/slug/${encodeURIComponent(story.slug)}/choose`,
        {
          choiceId: choice.id,
          idempotencyKey: createIdempotencyKey(),
        },
        { timeoutMs: 15000 },
      );
      setSubmittingChoiceId("");

      if (response.ok && response.data?.progress) {
        setProgress(response.data.progress);
        setAuthRequired(false);
        return;
      }

      if (response.status === 401) {
        setAuthRequired(true);
        setError("Sign in to choose.");
        openAuthModal();
        return;
      }

      if (response.status === 403 && response.data?.reason === "CHOICE_LOCKED") {
        setDegradedNotice("That choice is locked right now.");
        await loadProgress();
        return;
      }

      if (response.status === 409) {
        setDegradedNotice("Choice already submitted. Synced your latest node.");
        await loadProgress();
        return;
      }

      if (response.status === 400) {
        setDegradedNotice("That choice isn't available anymore. Reloaded your latest node.");
        await loadProgress();
        return;
      }

      setError("Couldn't continue right now. Try again.");
    },
    [loadProgress, story?.slug],
  );

  const storyStateRows = useMemo(
    () => toStateRows(progress?.state),
    [progress?.state],
  );
  const node = progress?.node || null;
  const storyTitle = normalizeText(story?.title || progress?.story?.title || "Interactive");
  const storyDescription = normalizeText(story?.description || progress?.story?.description);
  const isEnding = Boolean(node?.isEnding);

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

  if (mode !== "play") {
    return (
      <main className="min-h-screen overflow-hidden bg-black text-white">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
          <SurfacePanel tone="muted" accent="cyan" appearance="dark">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/70">
              Interactive Story
            </p>
            <h1 className="mt-2 text-3xl font-black uppercase tracking-[-0.05em] text-white">
              {storyTitle}
            </h1>
            {storyDescription ? (
              <p className="mt-4 max-w-3xl text-sm leading-7 text-white/80">
                {storyDescription}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/interactive/${encodeURIComponent(normalizedSlug)}/play`}
                className={storefrontPrimaryButtonClass}
              >
                Start story
              </Link>
              {seriesId || story?.seriesId ? (
                <Link
                  href={`/series/${encodeURIComponent(seriesId || story.seriesId)}`}
                  className={storefrontSecondaryButtonClass}
                >
                  View series
                </Link>
              ) : null}
            </div>
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
                <p className="mt-2 text-sm font-semibold text-white/80">
                  {storyDescription}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/interactive/${encodeURIComponent(normalizedSlug)}`}
                className={`${storefrontSecondaryButtonClass} h-10 px-4 text-[11px] tracking-[0.08em]`}
              >
                Story
              </Link>
              {seriesId || story?.seriesId ? (
                <Link
                  href={`/series/${encodeURIComponent(seriesId || story.seriesId)}`}
                  className={`${storefrontSecondaryButtonClass} h-10 px-4 text-[11px] tracking-[0.08em]`}
                >
                  Series
                </Link>
              ) : null}
            </div>
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
            <SurfacePanel tone="muted" accent={isEnding ? "pink" : "cyan"} appearance="dark">
              {isEnding ? (
                <div className="mb-3 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white">
                  Ending
                </div>
              ) : null}
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/70">
                {normalizeText(node.title || "Current Node")}
              </p>
              <p className="mt-4 whitespace-pre-line text-[15px] leading-8 text-white/85 transition-opacity duration-300">
                {normalizeText(node.content)}
              </p>
              {isEnding ? (
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href={`/interactive/${encodeURIComponent(normalizedSlug)}/play`}
                    className={storefrontPrimaryButtonClass}
                  >
                    Restart
                  </Link>
                  <Link
                    href={`/interactive/${encodeURIComponent(normalizedSlug)}`}
                    className={storefrontSecondaryButtonClass}
                  >
                    Try another path
                  </Link>
                </div>
              ) : null}
            </SurfacePanel>

            {!isEnding ? (
              <SurfacePanel tone="muted" accent="yellow" appearance="dark">
                <h2 className="text-base font-black uppercase tracking-[0.01em] text-white">
                  Choices
                </h2>
                <div className="mt-4 grid gap-3">
                  {(node.choices || []).map((choice) => {
                    const disabled =
                      Boolean(submittingChoiceId) ||
                      authRequired ||
                      Boolean(choice.locked);
                    const busy = submittingChoiceId === choice.id;
                    const lockCopy = getLockedCopy(choice);

                    return (
                      <button
                        key={choice.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => handleChoose(choice)}
                        className={[
                          "w-full rounded-[22px] border-2 border-black bg-[#0b0b0b] px-4 py-3 text-left text-sm font-semibold text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 ease-out hover:translate-x-0.5 hover:translate-y-0.5",
                          disabled ? "opacity-60" : "",
                          choice.locked ? "border-white/30 bg-[#111111]" : "",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div>{busy ? "Loading..." : normalizeText(choice.label)}</div>
                            {choice.description ? (
                              <div className="mt-1 text-xs leading-5 text-white/65">
                                {normalizeText(choice.description)}
                              </div>
                            ) : null}
                          </div>
                          {choice.locked ? (
                            <span className="rounded-full border border-white/20 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-white/70">
                              {lockCopy}
                            </span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </SurfacePanel>
            ) : null}

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
