"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Shuffle, Sparkles } from "lucide-react";
import { apiGet, apiPost } from "../../lib/apiClient";
import { openAuthPrompt } from "../../lib/openAuthPrompt";
import { emitToast } from "../../lib/toastBus";
import { trackEvent } from "../../lib/trackEvent";
import { useAuthStore } from "../../store/useAuthStore";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import SurfacePanel from "../common/SurfacePanel";
import {
  getInteractiveNodeImage,
  normalizeText,
} from "./interactiveShared";

function openAuthModal() {
  openAuthPrompt();
}

function getAdultQueryParam(contentMode) {
  return contentMode === "adult" ? "1" : "0";
}

function buildModeAwarePath(path, contentMode) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}adult=${getAdultQueryParam(contentMode)}`;
}

function getGateErrorMessage(reason) {
  if (reason === "NEED_LOGIN") {
    return "Sign in to access this 18+ interactive story.";
  }
  if (reason === "NEED_AGE_CONFIRM") {
    return "Confirm age access before opening this 18+ interactive story.";
  }
  if (reason === "NEED_ADULT_MODE") {
    return "Turn on Mature Mode to access this 18+ interactive story.";
  }
  return "This interactive story isn't available in the current mode.";
}

function getGateSupportMessage(reason) {
  if (reason === "NEED_ADULT_MODE") {
    return "Switch to Mature Mode in account settings, then reload this story.";
  }
  if (reason === "NEED_AGE_CONFIRM") {
    return "Complete age confirmation before opening this route.";
  }
  if (reason === "NEED_LOGIN") {
    return "Sign in to check whether this route is available for your account.";
  }
  return "";
}

export default function InteractiveStoryPage({ seriesId = "", slug = "" }) {
  const requestIdRef = useRef(0);
  const [story, setStory] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [accessGateReason, setAccessGateReason] = useState("");
  const [submittingChoiceId, setSubmittingChoiceId] = useState("");
  const [error, setError] = useState("");
  const [transitioning, setTransitioning] = useState(false);
  const { contentMode } = useAdultGateStore();
  const { hydrated, isSignedIn } = useAuthStore();

  const isCurrentRequest = useCallback(
    (requestId) => requestId === requestIdRef.current,
    [],
  );

  const loadCurrent = useCallback(
    async (resolvedSlug, requestId = requestIdRef.current) => {
      const response = await apiGet(
        buildModeAwarePath(
          `/api/interactive-stories/slug/${encodeURIComponent(resolvedSlug)}/current`,
          contentMode,
        ),
        {
          bust: true,
          cacheMs: 0,
        },
      );

      if (!isCurrentRequest(requestId)) {
        return null;
      }

      if (response.ok && response.data?.progress) {
        setProgress(response.data.progress);
        setAuthRequired(false);
        setAccessGateReason("");
        setError("");
        return response.data.progress;
      }

      if (response.status === 401) {
        setProgress(null);
        setAuthRequired(true);
        setAccessGateReason("");
        setError("Sign in to save your route.");
        return null;
      }

      if (response.status === 403 || response.error === "ADULT_GATED") {
        setProgress(null);
        setAuthRequired(response.data?.reason === "NEED_LOGIN");
        setAccessGateReason(String(response.data?.reason || response.error || ""));
        setError(getGateErrorMessage(response.data?.reason));
        return null;
      }

      setProgress(null);
      setAuthRequired(false);
      setAccessGateReason("");
      setError("Couldn't load this story path.");
      return null;
    },
    [contentMode],
  );

  const resolveStory = useCallback(async () => {
    const normalizedSlug = normalizeText(slug);
    const normalizedSeriesId = normalizeText(seriesId);
    if (!normalizedSlug && !normalizedSeriesId) {
      setError("Invalid interactive story.");
      setLoading(false);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setLoading(true);
    setError("");
    setAuthRequired(false);
    setAccessGateReason("");
    setTransitioning(false);

    let nextStory = null;
    if (normalizedSlug) {
      const response = await apiGet(
        buildModeAwarePath(
          `/api/interactive-stories/slug/${encodeURIComponent(normalizedSlug)}`,
          contentMode,
        ),
        {
          bust: true,
          cacheMs: 0,
        },
      );
      if (!isCurrentRequest(requestId)) {
        return;
      }
      if (response.ok && response.data?.story) {
        nextStory = response.data.story;
      } else if (response.status === 403 || response.error === "ADULT_GATED") {
        setStory(null);
        setProgress(null);
        setAuthRequired(response.data?.reason === "NEED_LOGIN");
        setAccessGateReason(String(response.data?.reason || response.error || ""));
        setError(getGateErrorMessage(response.data?.reason));
        setLoading(false);
        return;
      }
    } else {
      const response = await apiGet(
        buildModeAwarePath(
          `/api/interactive-stories/by-series/${encodeURIComponent(normalizedSeriesId)}`,
          contentMode,
        ),
        {
          bust: true,
          cacheMs: 0,
        },
      );
      if (!isCurrentRequest(requestId)) {
        return;
      }
      if (response.ok && response.data?.story) {
        nextStory = response.data.story;
      } else if (response.status === 403 || response.error === "ADULT_GATED") {
        setStory(null);
        setProgress(null);
        setAuthRequired(response.data?.reason === "NEED_LOGIN");
        setAccessGateReason(String(response.data?.reason || response.error || ""));
        setError(getGateErrorMessage(response.data?.reason));
        setLoading(false);
        return;
      }
    }

    if (!nextStory?.slug) {
      setStory(null);
      setProgress(null);
      setError("This interactive story isn't available right now.");
      setLoading(false);
      return;
    }

    setStory(nextStory);
    await loadCurrent(nextStory.slug, requestId);
    if (!isCurrentRequest(requestId)) {
      return;
    }
    setLoading(false);
  }, [contentMode, isCurrentRequest, loadCurrent, seriesId, slug]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    void resolveStory();
  }, [hydrated, isSignedIn, resolveStory]);

  const handleChoose = useCallback(
    async (choiceId) => {
      if (!story?.slug || !choiceId) {
        return;
      }

      if (authRequired) {
        openAuthModal();
        return;
      }

      setSubmittingChoiceId(choiceId);
      setTransitioning(true);
      setError("");
      trackEvent("interactive_choice_select", {
        contentMode,
        contentType: "interactive",
        sourceSection: "interactive_story",
        storySlug: story.slug,
        nodeId: progress?.node?.id || "",
      });

      const response = await apiPost(
        buildModeAwarePath(
          `/api/interactive-stories/slug/${encodeURIComponent(story.slug)}/choose`,
          contentMode,
        ),
        { choiceId },
        {
          timeoutMs: 20_000,
        },
      );

      setSubmittingChoiceId("");
      setTransitioning(false);

      if (response.ok && response.data?.progress) {
        setProgress(response.data.progress);
        setAuthRequired(false);
        setAccessGateReason("");
        return;
      }

      if (response.status === 401) {
        setAuthRequired(true);
        setAccessGateReason("");
        setError("Sign in to keep your route.");
        openAuthModal();
        return;
      }

      if (response.status === 403 || response.error === "ADULT_GATED") {
        setAuthRequired(response.data?.reason === "NEED_LOGIN");
        setAccessGateReason(String(response.data?.reason || response.error || ""));
        setError(getGateErrorMessage(response.data?.reason));
        return;
      }

      emitToast({
        message: "That choice isn't available anymore. Reloaded the latest node.",
      });
      await loadCurrent(story.slug);
    },
    [authRequired, contentMode, loadCurrent, progress?.node?.id, story?.slug],
  );

  const handleRestart = useCallback(async () => {
    if (!story?.slug) {
      return;
    }
    await resolveStory();
  }, [resolveStory, story?.slug]);

  useEffect(() => {
    if (!story?.slug) {
      return;
    }

    trackEvent("interactive_story_start", {
      contentMode,
      contentType: "interactive",
      sourceSection: "interactive_story",
      storySlug: story.slug,
    });
  }, [contentMode, story?.slug]);

  const node = progress?.node || null;
  const isEnding = Boolean(node?.isEnding) || (Array.isArray(node?.choices) && node.choices.length === 0);
  const nodeImage = getInteractiveNodeImage(progress?.story || story, node);
  const approvedPanels = Array.isArray(node?.panels) ? node.panels : [];
  const pathPreview = useMemo(
    () => (Array.isArray(progress?.path) ? progress.path.slice(-5) : []),
    [progress?.path],
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#0d0b13_0%,#120f18_46%,#16121d_100%)] text-white">
        <div className="mx-auto max-w-[1080px] px-4 py-8 sm:px-6">
          <div className="h-[560px] animate-pulse rounded-[32px] border border-white/10 bg-white/5" />
        </div>
      </main>
    );
  }

  if (!story) {
    if (accessGateReason) {
      return (
        <main className="min-h-screen bg-[linear-gradient(180deg,#0d0b13_0%,#120f18_46%,#16121d_100%)] text-white">
          <div className="mx-auto flex max-w-[1080px] flex-col gap-6 px-4 py-8 sm:px-6">
            <SurfacePanel tone="danger" accent="rose" appearance="dark">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-base font-semibold text-white">
                    {error || "This interactive story isn't available in the current mode."}
                  </p>
                  {getGateSupportMessage(accessGateReason) ? (
                    <p className="mt-2 text-sm text-white/70">
                      {getGateSupportMessage(accessGateReason)}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-3">
                  {authRequired || accessGateReason === "NEED_LOGIN" ? (
                    <Button
                      size="sm"
                      data-testid="interactive-story-locked-signin"
                      onClick={openAuthModal}
                    >
                      Sign in
                    </Button>
                  ) : null}
                  <Button asChild variant="outline" size="sm">
                    <Link href="/interactive">Back to Interactive</Link>
                  </Button>
                </div>
              </div>
            </SurfacePanel>
          </div>
        </main>
      );
    }

    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#0d0b13_0%,#120f18_46%,#16121d_100%)] text-white">
        <div className="mx-auto max-w-[1080px] px-4 py-8 sm:px-6">
          <SurfacePanel tone="danger" accent="rose" appearance="dark">
            {error || "Interactive story unavailable."}
          </SurfacePanel>
        </div>
      </main>
    );
  }

  if (!node) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#0d0b13_0%,#120f18_46%,#16121d_100%)] text-white">
        <div className="mx-auto flex max-w-[1080px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
          <SurfacePanel tone="highlight" accent="cyan" appearance="dark">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge>{story.contentMode === "adult" ? "18+ Story" : "Normal Story"}</Badge>
                  {story.genre ? <Badge variant="outline">{story.genre}</Badge> : null}
                </div>
                <h1 className="mt-3 text-[1.9rem] font-black uppercase tracking-[-0.06em] text-white sm:text-[2.5rem]">
                  {normalizeText(story.title)}
                </h1>
                {story.description ? (
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-white/72">
                    {normalizeText(story.description)}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/interactive/${encodeURIComponent(story.slug)}`}>
                    Details
                  </Link>
                </Button>
              </div>
            </div>
          </SurfacePanel>

          <SurfacePanel tone="danger" accent="rose" appearance="dark">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-base font-semibold text-white">
                  {error || "Interactive story unavailable."}
                </p>
                {getGateSupportMessage(accessGateReason) ? (
                  <p className="mt-2 text-sm text-white/70">
                    {getGateSupportMessage(accessGateReason)}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-3">
                {authRequired || accessGateReason === "NEED_LOGIN" ? (
                  <Button
                    size="sm"
                    data-testid="interactive-story-gate-signin"
                    onClick={openAuthModal}
                  >
                    Sign in
                  </Button>
                ) : null}
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  data-testid="interactive-story-gate-back"
                >
                  <Link href={`/interactive/${encodeURIComponent(story.slug)}`}>
                    Back to details
                  </Link>
                </Button>
              </div>
            </div>
          </SurfacePanel>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#0d0b13_0%,#120f18_46%,#16121d_100%)] text-white">
      <div className="mx-auto flex max-w-[1080px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <SurfacePanel tone="highlight" accent="cyan" appearance="dark">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge>{progress.story.contentMode === "adult" ? "18+ Story" : "Normal Story"}</Badge>
                {progress.story.genre ? (
                  <Badge variant="outline">{progress.story.genre}</Badge>
                ) : null}
              </div>
              <h1 className="mt-3 text-[1.9rem] font-black uppercase tracking-[-0.06em] text-white sm:text-[2.5rem]">
                {normalizeText(progress.story.title)}
              </h1>
              {progress.story.description ? (
                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/72">
                  {normalizeText(progress.story.description)}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/interactive/${encodeURIComponent(progress.story.slug)}`}>
                  Details
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={handleRestart}>
                <RotateCcw className="size-4" />
                Restart
              </Button>
            </div>
          </div>
        </SurfacePanel>

        {error ? (
          <SurfacePanel tone="danger" accent="rose" appearance="dark">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>{error}</span>
              {authRequired ? (
                <Button size="sm" onClick={openAuthModal}>
                  Sign in
                </Button>
              ) : null}
            </div>
          </SurfacePanel>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className={`space-y-5 transition-opacity duration-300 ${transitioning ? "opacity-70" : "opacity-100"}`}>
            {approvedPanels.length > 0 ? (
              <div className="space-y-4">
                {approvedPanels.map((panel, index) => (
                  <div
                    key={panel.id || `${panel.panelNumber}-${index}`}
                    className="overflow-hidden rounded-[28px] border border-white/10 bg-black shadow-[0_24px_60px_rgba(0,0,0,0.28)]"
                  >
                    <div className="relative">
                      <img
                        src={panel.imageUrl}
                        alt={normalizeText(panel.dialogue || `${node.title || "Story scene"} panel ${index + 1}`)}
                        className="aspect-[16/9] w-full object-cover"
                      />
                      {panel.dialogue ? (
                        <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-[22px] border border-white/20 bg-[rgba(7,9,14,0.78)] px-4 py-3 shadow-[0_10px_25px_rgba(0,0,0,0.35)] backdrop-blur-md">
                          <p className="text-sm font-semibold leading-6 text-white sm:text-[15px]">
                            {normalizeText(panel.dialogue)}
                          </p>
                        </div>
                      ) : null}
                      <div className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/80">
                        Panel {panel.panelNumber || index + 1}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : nodeImage ? (
              <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black">
                <img
                  src={nodeImage}
                  alt={normalizeText(node.title || "Story scene")}
                  className="aspect-[16/9] w-full object-cover"
                />
              </div>
            ) : null}

            <Card className="border-white/10 bg-[rgba(255,255,255,0.98)]">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">Node</Badge>
                  {isEnding ? <Badge>Ending</Badge> : null}
                  {node.endingType ? <Badge variant="outline">{node.endingType}</Badge> : null}
                </div>
                <CardTitle>{normalizeText(node.title || "Current node")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-[15px] leading-8 text-slate-700">
                  {normalizeText(node.body)}
                </p>
              </CardContent>
            </Card>

            <SurfacePanel tone="muted" accent="amber" appearance="dark">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-[#ffe500]" />
                <h2 className="text-lg font-black uppercase tracking-[-0.04em] text-white">
                  {isEnding ? "Ending" : "Choose your next move"}
                </h2>
              </div>

              {isEnding ? (
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button onClick={handleRestart}>
                    <RotateCcw className="size-4" />
                    Restart
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/interactive/${encodeURIComponent(progress.story.slug)}`}>
                      <Shuffle className="size-4" />
                      Try another path
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="mt-4 grid gap-3">
                  {(node.choices || []).map((choice) => {
                    const busy = submittingChoiceId === choice.id;
                    const requiresPremium = choice.requiresPremium || Number(choice.requiresTokens || 0) > 0;
                    return (
                      <button
                        key={choice.id}
                        type="button"
                        disabled={Boolean(submittingChoiceId)}
                        onClick={() => void handleChoose(choice.id)}
                        className="w-full rounded-[24px] border-2 border-black bg-white px-4 py-4 text-left text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-60"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-black uppercase tracking-[-0.02em]">
                              {busy ? "Loading..." : normalizeText(choice.label)}
                            </p>
                            {choice.description ? (
                              <p className="mt-2 text-sm leading-6 text-slate-600">
                                {normalizeText(choice.description)}
                              </p>
                            ) : null}
                          </div>
                          {requiresPremium ? (
                            <div className="shrink-0 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                              {choice.requiresPremium ? "Premium" : ""}
                              {choice.requiresPremium && choice.requiresTokens ? " / " : ""}
                              {choice.requiresTokens ? `${choice.requiresTokens} Tokens` : ""}
                            </div>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </SurfacePanel>
          </div>

          <div className="space-y-5">
            <SurfacePanel tone="muted" accent="blue" appearance="dark">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
                Route Log
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {pathPreview.length > 0 ? (
                  pathPreview.map((item, index) => (
                    <Badge key={`${item}-${index}`} variant="outline">
                      {index + 1}. {item}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-white/65">No path saved yet.</p>
                )}
              </div>
            </SurfacePanel>

            <SurfacePanel tone="muted" accent="rose" appearance="dark">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
                Story State
              </h3>
              <div className="mt-3 grid gap-2">
                {Object.entries(progress.state || {})
                  .filter(([key]) => key !== "flags")
                  .slice(0, 8)
                  .map(([key, value]) => (
                    <div
                      key={key}
                      className="rounded-[18px] border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
                    >
                      <span className="font-semibold uppercase tracking-[0.12em] text-white/55">
                        {key}
                      </span>
                      : {String(value)}
                    </div>
                  ))}
              </div>
            </SurfacePanel>
          </div>
        </div>
      </div>
    </main>
  );
}
