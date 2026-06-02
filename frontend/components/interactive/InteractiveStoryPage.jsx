"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiGet, apiPost } from "../../lib/apiClient";
import { trackEvent } from "../../lib/trackEvent";
import { useAuthStore } from "../../store/useAuthStore";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import SurfacePanel from "../common/SurfacePanel";
import {
  storefrontAccentChipClass,
  storefrontBadgeClass,
  storefrontChipClass,
  storefrontInfoCardClass,
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
  storefrontSoftCardClass,
  StorefrontInfoCard,
  StorefrontSectionHeading,
} from "../common/StorefrontPagePrimitives";
import { StorefrontPage } from "../storefront/StorefrontScaffold";

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function isProductionDeployment() {
  const deployEnv = normalizeText(process.env.NEXT_PUBLIC_DEPLOY_ENV).toLowerCase();
  const vercelEnv = normalizeText(process.env.NEXT_PUBLIC_VERCEL_ENV).toLowerCase();
  const nodeEnv = normalizeText(process.env.NODE_ENV).toLowerCase();
  const resolved = deployEnv || vercelEnv || nodeEnv;
  return resolved === "production";
}

function isInteractiveDebugEnabled() {
  const explicit = normalizeText(process.env.NEXT_PUBLIC_SHOW_INTERACTIVE_DEBUG).toLowerCase();
  if (["1", "true", "yes", "on"].includes(explicit)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(explicit)) {
    return false;
  }
  return !isProductionDeployment();
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
  const policy = normalizeText(choice?.unlockPolicy || "").toUpperCase();
  if (choice.lockedReason === "TOKEN_UNLOCK_COMING_SOON") {
    return choice.unlockLabel || "Unlocks Later";
  }
  if (policy === "PREMIUM_ONLY") {
    return choice.unlockLabel || "Premium";
  }
  if (policy === "TOKENS_ONLY") {
    return choice.unlockLabel || "Unlocks Later";
  }
  if (policy === "PREMIUM_OR_TOKENS") {
    return choice.unlockLabel || "Premium Access";
  }
  if (policy === "PREMIUM_AND_TOKENS") {
    return choice.unlockLabel || "Premium Access";
  }
  if (choice.lockedReason === "PREMIUM_REQUIRED") {
    return choice.unlockLabel || "Premium";
  }
  if (choice.lockedReason === "TOKENS_REQUIRED") {
    return choice.unlockLabel || "Unlocks Later";
  }
  return choice.unlockLabel || "Locked";
}

function getLockedReasonDescription(choice) {
  if (!choice?.locked) {
    return "";
  }
  if (choice.lockedReason === "PREMIUM_REQUIRED") {
    return "Premium readers can open this choice.";
  }
  if (choice.lockedReason === "TOKENS_REQUIRED") {
    return "This choice unlocks later.";
  }
  if (choice.lockedReason === "TOKEN_UNLOCK_COMING_SOON") {
    return "This choice unlocks later.";
  }
  return "This choice is locked for now.";
}

function getRouteDepth(progress) {
  return Number(progress?.path?.length || progress?.currentDepth || 0);
}

function getStoryWhyPlayItems(story) {
  const slug = normalizeText(story?.slug).toLowerCase();
  if (slug === "the-locker-letter") {
    return [
      "2 endings",
      "17 choices",
      "Hidden clue path",
      "Quick mystery run",
    ];
  }
  if (slug === "solar-wind-first-contact") {
    return [
      "2 endings",
      "13 choices",
      "Space signal mystery",
      "Quick sci-fi run",
    ];
  }
  if (slug === "last-bus-home") {
    return [
      "2 endings",
      "15 choices",
      "Midnight transit mystery",
      "Fast urban thriller",
    ];
  }
  if (slug === "the-group-chat-leak") {
    return [
      "2 endings",
      "15 choices",
      "School rumor fallout",
      "Late-night social drama",
    ];
  }
  if (slug === "pool-light-signal") {
    return [
      "2 endings",
      "15 choices",
      "Summer pool mystery",
      "Small-town secret run",
    ];
  }
  return [];
}

function getStoryVisual(story) {
  const slug = normalizeText(story?.slug).toLowerCase();
  if (slug.includes("solar") || slug.includes("signal")) {
    return {
      accent: "cyan",
      posterClass:
        "bg-[linear-gradient(135deg,#09111d_0%,#10305a_48%,#63d4ff_100%)]",
      glowClass:
        "bg-[radial-gradient(circle_at_18%_18%,rgba(103,232,249,0.36),transparent_24%),radial-gradient(circle_at_78%_24%,rgba(167,139,250,0.24),transparent_28%)]",
      vibe: "Signal Route",
    };
  }
  if (slug.includes("chat") || slug.includes("locker")) {
    return {
      accent: "rose",
      posterClass:
        "bg-[linear-gradient(135deg,#170912_0%,#4f1738_46%,#ff7ab1_100%)]",
      glowClass:
        "bg-[radial-gradient(circle_at_20%_18%,rgba(255,79,154,0.34),transparent_24%),radial-gradient(circle_at_80%_20%,rgba(125,211,252,0.16),transparent_26%)]",
      vibe: "Rumor Route",
    };
  }
  if (slug.includes("pool") || slug.includes("bus")) {
    return {
      accent: "amber",
      posterClass:
        "bg-[linear-gradient(135deg,#1c1207_0%,#6e3511_44%,#ffb15e_100%)]",
      glowClass:
        "bg-[radial-gradient(circle_at_20%_18%,rgba(251,191,36,0.34),transparent_22%),radial-gradient(circle_at_80%_20%,rgba(255,79,154,0.14),transparent_28%)]",
      vibe: "Midnight Route",
    };
  }
  return {
    accent: "cyan",
    posterClass:
      "bg-[linear-gradient(135deg,#0b1020_0%,#2a1955_48%,#ff4f9a_100%)]",
    glowClass:
      "bg-[radial-gradient(circle_at_20%_18%,rgba(125,244,255,0.24),transparent_24%),radial-gradient(circle_at_80%_20%,rgba(255,79,154,0.22),transparent_28%)]",
    vibe: "Story Route",
  };
}

function getAnalyticsPayload({
  story,
  progress,
  choice = null,
  contentMode,
  sourceSection,
}) {
  const node = progress?.node || null;
  return {
    storyId: story?.id || progress?.story?.id || undefined,
    slug: story?.slug || progress?.story?.slug || undefined,
    nodeId: node?.id || undefined,
    choiceId: choice?.id || undefined,
    contentMode,
    routeDepth: getRouteDepth(progress),
    isEnding: Boolean(node?.isEnding),
    sourceSection,
  };
}

function LoadingShell() {
  return (
    <StorefrontPage accentClass="from-[rgba(255,79,154,0.14)] via-[rgba(167,139,250,0.08)] to-[rgba(103,232,249,0.14)]">
      <div className="py-3">
        <div className="grid gap-4">
          <SurfacePanel tone="muted" accent="cyan" appearance="dark" className="min-h-[200px]" />
          <SurfacePanel tone="muted" accent="blue" appearance="dark" className="min-h-[220px]" />
          <SurfacePanel tone="muted" accent="amber" appearance="dark" className="min-h-[240px]" />
        </div>
      </div>
    </StorefrontPage>
  );
}

export default function InteractiveStoryPage({
  storySlug,
  storyId = "",
  seriesId = "",
  mode = "play",
  initialStory = null,
  initialProgress = null,
  initialContentMode = "normal",
}) {
  const [loading, setLoading] = useState(false);
  const [story, setStory] = useState(initialStory);
  const [progress, setProgress] = useState(initialProgress);
  const [error, setError] = useState("");
  const [authRequired, setAuthRequired] = useState(false);
  const [submittingChoiceId, setSubmittingChoiceId] = useState("");
  const [unlockingChoiceId, setUnlockingChoiceId] = useState("");
  const [degradedNotice, setDegradedNotice] = useState("");
  const [hasTrackedChoiceView, setHasTrackedChoiceView] = useState(false);
  const [hasTrackedStart, setHasTrackedStart] = useState(Boolean(initialProgress));
  const { hydrated, isSignedIn } = useAuthStore();
  const { contentMode } = useAdultGateStore();
  const storyBodyRef = useRef(null);

  const normalizedSlug = normalizeText(storySlug);
  const resolvedContentMode = normalizeText(contentMode || initialContentMode || "normal").toLowerCase();

  const loadStory = useCallback(async () => {
    if (!normalizedSlug) {
      setError("Invalid story.");
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
      return null;
    }
    setStory(response.data.story);
    setError("");
    return response.data.story;
  }, [normalizedSlug]);

  const loadProgress = useCallback(async () => {
    if (!normalizedSlug) {
      return null;
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
      return response.data.progress;
    }

    if (response.status === 401) {
      setAuthRequired(true);
      setProgress(null);
      if (mode === "play") {
        setError("Sign in to start reading.");
      }
      return null;
    }

    if (response.status === 404) {
      setProgress(null);
      setError("Interactive story isn't available.");
      return null;
    }

    setError("Couldn't load your progress.");
    return null;
  }, [mode, normalizedSlug]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    let active = true;
    async function bootstrap() {
      setLoading(!initialStory || (mode === "play" && !initialProgress));
      setError("");
      setDegradedNotice("");

      const storyPayload = initialStory || (await loadStory());
      if (!active || !storyPayload) {
        setLoading(false);
        return;
      }

      if (mode === "play" && !initialProgress) {
        await loadProgress();
      }

      if (active) {
        setLoading(false);
      }
    }

    void bootstrap();
    return () => {
      active = false;
    };
  }, [hydrated, initialProgress, initialStory, loadProgress, loadStory, mode]);

  useEffect(() => {
    if (!story?.id && !progress?.story?.id) {
      return;
    }
    trackEvent("interactive_story_view", {
      ...getAnalyticsPayload({
        story,
        progress,
        contentMode: resolvedContentMode,
        sourceSection: mode === "play" ? "interactive_play" : "interactive_detail",
      }),
      seriesId: seriesId || story?.seriesId || progress?.story?.seriesId || undefined,
    });
  }, [mode, progress, resolvedContentMode, seriesId, story]);

  useEffect(() => {
    if (mode !== "play" || !progress?.node || hasTrackedChoiceView) {
      return;
    }
    if (progress.node.isEnding) {
      trackEvent("interactive_ending_reached", {
        ...getAnalyticsPayload({
          story,
          progress,
          contentMode: resolvedContentMode,
          sourceSection: "interactive_play",
        }),
      });
      return;
    }

    trackEvent("interactive_choice_view", {
      ...getAnalyticsPayload({
        story,
        progress,
        contentMode: resolvedContentMode,
        sourceSection: "interactive_play",
      }),
      visibleChoices: Array.isArray(progress?.node?.choices) ? progress.node.choices.length : 0,
    });
    setHasTrackedChoiceView(true);
  }, [hasTrackedChoiceView, mode, progress, resolvedContentMode, story]);

  useEffect(() => {
    setHasTrackedChoiceView(false);
  }, [progress?.node?.id]);

  useEffect(() => {
    if (mode !== "play" || !progress?.node?.id || hasTrackedStart) {
      return;
    }
    trackEvent("interactive_story_start", {
      ...getAnalyticsPayload({
        story,
        progress,
        contentMode: resolvedContentMode,
        sourceSection: "interactive_play",
      }),
    });
    setHasTrackedStart(true);
  }, [hasTrackedStart, mode, progress, resolvedContentMode, story]);

  useEffect(() => {
    if (!storyBodyRef.current) {
      return;
    }
    storyBodyRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [progress?.node?.id]);

  const handleUnlock = useCallback(
    async (choice) => {
      if (!story?.slug || !choice?.id) {
        return;
      }

      setUnlockingChoiceId(choice.id);
      setError("");
      setDegradedNotice("");
      const response = await apiPost(
        `/api/interactive-stories/slug/${encodeURIComponent(story.slug)}/unlock-choice`,
        {
          choiceId: choice.id,
          idempotencyKey: createIdempotencyKey(),
        },
        { timeoutMs: 15000 },
      );
      setUnlockingChoiceId("");

      if (response.ok && response.data?.progress) {
        setProgress(response.data.progress);
        trackEvent("interactive_choice_unlock", {
          ...getAnalyticsPayload({
            story,
            progress: response.data.progress,
            choice,
            contentMode: resolvedContentMode,
            sourceSection: "interactive_play",
          }),
        });
        return;
      }

      if (response.status === 401) {
        setAuthRequired(true);
        openAuthModal();
        return;
      }

      if (response.status === 403) {
        trackEvent("interactive_choice_locked", {
          ...getAnalyticsPayload({
            story,
            progress,
            choice,
            contentMode: resolvedContentMode,
            sourceSection: "interactive_play",
          }),
          reason: response.data?.reason || choice.lockedReason || "LOCKED",
        });
        setDegradedNotice(
          response.data?.reason === "TOKEN_UNLOCK_COMING_SOON"
            ? "This choice unlocks later."
            : "That choice is still locked for this account.",
        );
        await loadProgress();
        return;
      }

      setDegradedNotice("Couldn't unlock this choice right now.");
    },
    [loadProgress, progress, resolvedContentMode, story],
  );

  const handleChoose = useCallback(
    async (choice) => {
      if (!story?.slug || !choice?.id || submittingChoiceId || unlockingChoiceId) {
        return;
      }

      if (choice.locked) {
        trackEvent("interactive_choice_locked", {
          ...getAnalyticsPayload({
            story,
            progress,
            choice,
            contentMode: resolvedContentMode,
            sourceSection: "interactive_play",
          }),
          reason: choice.lockedReason || "LOCKED",
        });
        return;
      }

      setSubmittingChoiceId(choice.id);
      setError("");
      setDegradedNotice("");
      trackEvent("interactive_choice_click", {
        ...getAnalyticsPayload({
          story,
          progress,
          choice,
          contentMode: resolvedContentMode,
          sourceSection: "interactive_play",
        }),
      });

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

      if (response.status === 403) {
        setDegradedNotice(
          response.data?.reason === "TOKEN_UNLOCK_COMING_SOON"
            ? "This choice unlocks later."
            : "That choice is locked right now.",
        );
        await loadProgress();
        return;
      }

      if (response.status === 409) {
        setDegradedNotice(
          response.data?.reason === "TARGET_NODE_NOT_AVAILABLE"
            ? "That path isn't open yet."
            : response.data?.reason === "REQUEST_IN_PROGRESS"
              ? "That choice is already being processed. Give it a second."
              : "Synced your latest scene.",
        );
        await loadProgress();
        return;
      }

      if (response.status === 400) {
        setDegradedNotice("That choice isn't available anymore. Reloaded your latest scene.");
        await loadProgress();
        return;
      }

      setError("Couldn't continue right now. Try again.");
    },
    [loadProgress, progress, resolvedContentMode, story, submittingChoiceId, unlockingChoiceId],
  );

  const handleRestart = useCallback(async () => {
    if (!story?.slug || submittingChoiceId || unlockingChoiceId) {
      return;
    }
    const response = await apiPost(
      `/api/interactive-stories/slug/${encodeURIComponent(story.slug)}/restart`,
      {},
      { timeoutMs: 15000 },
    );
    if (response.ok && response.data?.progress) {
      setProgress(response.data.progress);
      setDegradedNotice("");
      trackEvent("interactive_restart", {
        ...getAnalyticsPayload({
          story,
          progress: response.data.progress,
          contentMode: resolvedContentMode,
          sourceSection: "interactive_play",
        }),
      });
      return;
    }
    if (response.status === 401) {
      setAuthRequired(true);
      openAuthModal();
      return;
    }
    setDegradedNotice("Couldn't restart right now.");
  }, [progress, resolvedContentMode, story, submittingChoiceId, unlockingChoiceId]);

  const storyStateRows = useMemo(() => toStateRows(progress?.state), [progress?.state]);
  const node = progress?.node || null;
  const storyTitle = normalizeText(story?.title || progress?.story?.title || "Interactive");
  const storyDescription = normalizeText(story?.description || progress?.story?.description);
  const isEnding = Boolean(node?.isEnding);
  const path = Array.isArray(progress?.path) ? progress.path : [];
  const routeDepth = Math.max(1, getRouteDepth(progress));
  const continueLabel = progress?.node?.id ? "Continue Reading" : "Start Reading";
  const detailHref = `/interactive/${encodeURIComponent(normalizedSlug)}`;
  const playHref = `${detailHref}/play`;
  const showSignInStart = authRequired && !node?.id;
  const showRawState = isInteractiveDebugEnabled();
  const whyPlayItems = useMemo(() => getStoryWhyPlayItems(story), [story]);
  const storyVisual = useMemo(() => getStoryVisual(story), [story]);
  const linkedSeriesId = normalizeText(
    seriesId || story?.seriesId || progress?.story?.seriesId,
  );
  const genreItems = useMemo(
    () =>
      Array.isArray(story?.genre)
        ? story.genre.map((item) => normalizeText(item)).filter(Boolean).slice(0, 3)
        : [],
    [story?.genre],
  );
  const routeInsightCards = useMemo(
    () => [
      {
        eyebrow: "Start State",
        value: progress?.node?.title ? "Already in progress" : "Fresh entry",
        description: progress?.node?.title
          ? `Resume from ${normalizeText(progress.node.title)} without losing your path.`
          : "Jump in from the opening scene and let the branch build from your first choice.",
      },
      {
        eyebrow: "Choice Pressure",
        value: `${Number(story?.choicesCount || 0)} decision points`,
        description:
          "Choices shape the route rather than acting like passive flavor text, so each branch feels deliberate.",
      },
      {
        eyebrow: "Ending Spread",
        value: `${Number(story?.endingsCount || 0)} possible endings`,
        description:
          "Short runs with multiple outcomes make replaying feel like discovery instead of grind.",
      },
    ],
    [progress?.node?.title, story?.choicesCount, story?.endingsCount],
  );
  const panelEyebrowClass =
    "text-[10px] font-semibold uppercase tracking-[0.2em] text-white/64";
  const statCardClass = `${storefrontSoftCardClass} px-4 py-3.5`;

  if (loading) {
    return <LoadingShell />;
  }

  if (mode !== "play") {
    return (
      <StorefrontPage accentClass="from-[rgba(255,79,154,0.14)] via-[rgba(167,139,250,0.08)] to-[rgba(103,232,249,0.14)]">
        <div className="flex flex-col gap-6">
          <SurfacePanel
            tone="highlight"
            accent={storyVisual.accent}
            appearance="dark"
          >
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div>
                <p className={panelEyebrowClass}>
                  Interactive Story
                </p>
                <h1 className="mt-2 font-display text-[2.5rem] font-semibold leading-[0.92] tracking-[-0.07em] text-white">
                  {storyTitle}
                </h1>
                {storyDescription ? (
                  <p className="mt-4 max-w-3xl text-sm leading-[1.72] text-white/80">
                    {storyDescription}
                  </p>
                ) : null}
                <div className="mt-5 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">
                  <span className={storefrontBadgeClass}>
                    {normalizeText(story?.contentMode || "NORMAL")}
                  </span>
                  {genreItems.map((item) => (
                    <span key={item} className={storefrontBadgeClass}>
                      {item}
                    </span>
                  ))}
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href={playHref} className={storefrontPrimaryButtonClass}>
                    {continueLabel}
                  </Link>
                  {linkedSeriesId ? (
                    <Link
                      href={`/series/${encodeURIComponent(linkedSeriesId)}`}
                      className={storefrontSecondaryButtonClass}
                    >
                      View Series
                    </Link>
                  ) : null}
                </div>
              </div>
              <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.035))] px-5 py-5 shadow-[0_24px_58px_rgba(8,6,20,0.28)] backdrop-blur-xl">
                <div className={`absolute inset-0 ${storyVisual.posterClass}`} />
                <div className={`absolute inset-0 ${storyVisual.glowClass}`} />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,10,18,0.08)_0%,rgba(8,10,18,0.76)_58%,rgba(8,10,18,0.94)_100%)]" />
                <div className="relative">
                  <div className="flex items-center justify-between gap-3">
                    <span className={`${storefrontBadgeClass} px-3 py-1 text-[10px] tracking-[0.18em] text-white/72`}>
                      {normalizeText(story?.contentMode || "normal")}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/54">
                      {storyVisual.vibe}
                    </span>
                  </div>
                  <div className="mt-16 space-y-3">
                    <div className={storefrontInfoCardClass}>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
                        Endings
                      </div>
                      <div className="mt-2 font-display text-[2rem] font-semibold tracking-[-0.06em] text-white">
                        {Number(story?.endingsCount || 0)}
                      </div>
                    </div>
                    <div className={storefrontInfoCardClass}>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
                        Choices
                      </div>
                      <div className="mt-2 font-display text-[2rem] font-semibold tracking-[-0.06em] text-white">
                        {Number(story?.choicesCount || 0)}
                      </div>
                    </div>
                    <div className={storefrontInfoCardClass}>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
                        Progress
                      </div>
                      <div className="mt-2 text-sm leading-[1.68] text-white/80">
                        {progress?.node?.title
                          ? `Now reading: ${normalizeText(progress.node.title)}`
                          : "You haven't started yet."}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SurfacePanel>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <SurfacePanel
              tone="muted"
              accent={storyVisual.accent}
              appearance="dark"
              className="space-y-5"
            >
              <StorefrontSectionHeading
                eyebrow="Why Start"
                title="A short branch with real route pressure"
                description="Interactive stories should feel like a playable shelf, not a plain synopsis page. This layout keeps the hook, decision structure, and replay angle in one pass."
              />

              {whyPlayItems.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {whyPlayItems.map((item) => (
                    <div key={item} className={storefrontSoftCardClass}>
                      <p className="text-sm font-semibold tracking-[-0.02em] text-white">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-3">
                {routeInsightCards.map((item) => (
                  <div key={item.eyebrow} className={storefrontInfoCardClass}>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50">
                      {item.eyebrow}
                    </p>
                    <p className="mt-2 font-display text-[1.25rem] font-semibold tracking-[-0.04em] text-white">
                      {item.value}
                    </p>
                    <p className="mt-3 text-sm leading-[1.72] text-white/66">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </SurfacePanel>

            <div className="grid gap-4">
              <StorefrontInfoCard
                eyebrow="Current Route"
                title={progress?.node?.title ? normalizeText(progress.node.title) : "Ready to begin"}
                description={
                  progress?.node?.title
                    ? "Your latest scene is waiting. Pick back up from the current branch without resetting your path."
                    : "You have not started this branch yet. The first choice will define the route tone immediately."
                }
              />

              <StorefrontInfoCard
                eyebrow="How It Plays"
                title="Read, choose, land an ending"
                description="The flow stays simple on purpose so the story tension does the work."
              >
                <div className="mt-4 grid gap-3">
                  <div className={storefrontSoftCardClass}>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
                      Step 01
                    </p>
                    <p className="mt-2 text-sm leading-[1.72] text-white/72">
                      Open the current scene and read the setup before the branch options appear.
                    </p>
                  </div>
                  <div className={storefrontSoftCardClass}>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
                      Step 02
                    </p>
                    <p className="mt-2 text-sm leading-[1.72] text-white/72">
                      Choose a route. Some choices stay premium or unlock later, but the decision flow remains clear.
                    </p>
                  </div>
                  <div className={storefrontSoftCardClass}>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
                      Step 03
                    </p>
                    <p className="mt-2 text-sm leading-[1.72] text-white/72">
                      Reach an ending, restart, and test another route without losing the branch structure.
                    </p>
                  </div>
                </div>
              </StorefrontInfoCard>

              {linkedSeriesId ? (
                <StorefrontInfoCard
                  eyebrow="Series Tie-In"
                  title="Want the broader world behind this branch?"
                  description="This interactive route sits inside the same universe as the linked main series."
                >
                  <div className="mt-4">
                    <Link
                      href={`/series/${encodeURIComponent(linkedSeriesId)}`}
                      className={storefrontSecondaryButtonClass}
                    >
                      Open linked series
                    </Link>
                  </div>
                </StorefrontInfoCard>
              ) : null}
            </div>
          </section>
        </div>
      </StorefrontPage>
    );
  }

  return (
    <StorefrontPage accentClass="from-[rgba(255,79,154,0.14)] via-[rgba(167,139,250,0.08)] to-[rgba(103,232,249,0.14)]">
      <div className="flex flex-col gap-6">
        <SurfacePanel tone="highlight" accent={storyVisual.accent} appearance="dark">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className={`${storefrontBadgeClass} px-3 py-1 text-[10px] tracking-[0.18em] text-white/74`}>
                  Interactive
                </span>
                <span className={`${storefrontAccentChipClass} min-h-[32px] px-3 py-1 text-[10px] tracking-[0.18em] text-cyan-100`}>
                  {storyVisual.vibe}
                </span>
              </div>
              <h1 className="mt-4 font-display text-[2.35rem] font-semibold leading-[0.9] tracking-[-0.07em] text-white md:text-[2.9rem]">
                {storyTitle}
              </h1>
              {storyDescription ? (
                <p className="mt-4 max-w-2xl text-sm leading-[1.72] text-white/78">
                  {storyDescription}
                </p>
              ) : null}
              <div className="mt-5 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">
                <span className={`${storefrontBadgeClass} px-3 py-2`}>
                  Step {routeDepth}
                </span>
                <span className={`${storefrontBadgeClass} px-3 py-2`}>
                  {Number(story?.choicesCount || 0)} choices
                </span>
                <span className={`${storefrontBadgeClass} px-3 py-2`}>
                  {Number(story?.endingsCount || 0)} endings
                </span>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link
                  href={detailHref}
                  className={`${storefrontSecondaryButtonClass} min-h-[44px] px-4 text-[11px] tracking-[0.08em]`}
                >
                  Story Page
                </Link>
                {seriesId || story?.seriesId ? (
                  <Link
                    href={`/series/${encodeURIComponent(seriesId || story.seriesId)}`}
                    className={`${storefrontSecondaryButtonClass} min-h-[44px] px-4 text-[11px] tracking-[0.08em]`}
                  >
                    Series
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.035))] px-5 py-5 shadow-[0_22px_54px_rgba(8,6,20,0.24)] backdrop-blur-xl">
              <div className={`absolute inset-0 ${storyVisual.posterClass}`} />
              <div className={`absolute inset-0 ${storyVisual.glowClass}`} />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,10,18,0.08)_0%,rgba(8,10,18,0.78)_64%,rgba(8,10,18,0.94)_100%)]" />
              <div className="relative">
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/52">
                  Current route
                </div>
                <div className={storefrontInfoCardClass}>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
                    Scene
                  </div>
                  <div className="mt-2 text-sm font-semibold leading-[1.6] text-white">
                    {normalizeText(node?.title || "Opening scene")}
                  </div>
                </div>
                <div className={`mt-3 ${storefrontInfoCardClass}`}>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
                    Endings reached
                  </div>
                  <div className="mt-2 font-display text-[1.75rem] font-semibold tracking-[-0.05em] text-white">
                    {Number(progress?.endingsReached || 0)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SurfacePanel>

        {error ? (
          <SurfacePanel tone="danger" accent="rose" appearance="dark" className="text-white">
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
          <SurfacePanel tone="warning" accent="amber" appearance="dark">
            {degradedNotice}
          </SurfacePanel>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-4">
            <div ref={storyBodyRef} className="scroll-mt-24">
              <SurfacePanel
                tone="muted"
                accent={isEnding ? "rose" : storyVisual.accent}
                appearance="dark"
              >
                {showSignInStart ? (
                  <div className="grid gap-4">
                    <p className={panelEyebrowClass}>
                      Sign in to start reading
                    </p>
                    <p className="text-sm leading-[1.72] text-white/80">
                      Sign in to save your choices and keep your progress synced.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={openAuthModal}
                        className={storefrontPrimaryButtonClass}
                      >
                        Sign in to start reading
                      </button>
                      <Link href={detailHref} className={storefrontSecondaryButtonClass}>
                        Back to overview
                      </Link>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="relative mb-5 overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.035))] backdrop-blur-xl">
                      <div className={`absolute inset-x-0 top-0 h-[220px] ${storyVisual.posterClass}`} />
                      <div className={`absolute inset-x-0 top-0 h-[220px] ${storyVisual.glowClass}`} />
                      <div className="absolute inset-x-0 top-0 h-[220px] bg-[linear-gradient(180deg,rgba(8,10,18,0.08)_0%,rgba(8,10,18,0.82)_88%,rgba(8,10,18,0.96)_100%)]" />
                      <div className="relative px-5 pb-5 pt-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            {isEnding ? (
                              <div className={`${storefrontAccentChipClass} mb-3 inline-flex min-h-[32px] px-3 py-1 text-[10px] tracking-[0.2em] text-white`}>
                                Ending
                              </div>
                            ) : null}
                            <p className={panelEyebrowClass}>
                              Now Reading
                            </p>
                            <h2 className="mt-2 font-display text-[2rem] font-semibold leading-[0.94] tracking-[-0.05em] text-white">
                              {normalizeText(node?.title || "Opening scene")}
                            </h2>
                          </div>
                          <div className={`${storefrontBadgeClass} px-3 py-2 text-[10px] tracking-[0.16em] text-white/65`}>
                            Step {routeDepth}
                          </div>
                        </div>

                        <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-[linear-gradient(90deg,#67e8f9_0%,#fda4af_100%)] transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(18, routeDepth * 18))}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <p className="whitespace-pre-line text-[15px] leading-[1.9] text-white/85 transition-opacity duration-300">
                      {normalizeText(node?.content || story?.baseContext)}
                    </p>

                    {isEnding ? (
                      <div className="mt-6 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={handleRestart}
                          className={storefrontPrimaryButtonClass}
                        >
                          Restart
                        </button>
                        <Link href={detailHref} className={storefrontSecondaryButtonClass}>
                          Try another path
                        </Link>
                      </div>
                    ) : null}
                  </>
                )}
              </SurfacePanel>
            </div>

            {!isEnding && !showSignInStart ? (
              <SurfacePanel tone="muted" accent="amber" appearance="dark">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-semibold tracking-[-0.02em] text-white">
                    Choices
                  </h2>
                  <div className={panelEyebrowClass}>
                    Pick carefully
                  </div>
                </div>
                <div className="mt-4 grid gap-3">
                  {(node?.choices || []).map((choice) => {
                    const choosing = submittingChoiceId === choice.id;
                    const unlocking = unlockingChoiceId === choice.id;
                    const disabled =
                      Boolean(submittingChoiceId) ||
                      Boolean(unlockingChoiceId) ||
                      authRequired ||
                      choosing ||
                      unlocking;
                    const lockCopy = getLockedCopy(choice);

                    return (
                      <div
                        key={choice.id}
                        className={[
                          "rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.03)_100%)] p-4 shadow-[0_20px_42px_rgba(0,0,0,0.22)] backdrop-blur-xl transition-all duration-150 ease-out",
                          choice.locked ? "border-white/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.02)_100%)]" : "hover:-translate-y-0.5 hover:border-white/16 hover:shadow-[0_24px_48px_rgba(0,0,0,0.26)]",
                          choosing || unlocking ? "translate-y-0.5 opacity-90" : "",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-white">
                              {choosing
                                ? "Loading..."
                                : unlocking
                                  ? "Unlocking..."
                                  : normalizeText(choice.label)}
                            </div>
                            {choice.description ? (
                              <div className="mt-1 text-xs leading-[1.6] text-white/65">
                                {normalizeText(choice.description)}
                              </div>
                            ) : null}
                            {choice.locked ? (
                              <div className="mt-2 text-[11px] leading-5 text-amber-200/90">
                                {getLockedReasonDescription(choice)}
                              </div>
                            ) : null}
                          </div>
                          {choice.locked ? (
                            <span className={`${storefrontBadgeClass} px-2.5 py-1 text-[10px] tracking-[0.14em] text-white/70`}>
                              {lockCopy}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            aria-label={normalizeText(choice.label)}
                            disabled={disabled || Boolean(choice.locked)}
                            onClick={() => handleChoose(choice)}
                            className={[
                              storefrontPrimaryButtonClass,
                              "h-11 px-5 text-[11px] tracking-[0.08em]",
                              disabled || choice.locked ? "opacity-60" : "",
                            ].join(" ")}
                          >
                            {choice.locked ? "Locked" : "Choose This Route"}
                          </button>
                          {choice.locked ? (
                            <button
                              type="button"
                              aria-label={`Unlock ${normalizeText(choice.label)}`}
                              disabled={disabled}
                              onClick={() => handleUnlock(choice)}
                              className={[
                                storefrontSecondaryButtonClass,
                                "h-11 px-5 text-[11px] tracking-[0.08em]",
                                disabled ? "opacity-60" : "",
                              ].join(" ")}
                            >
                              Unlock Route
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SurfacePanel>
            ) : null}
          </div>

          <div className="grid gap-4">
            <SurfacePanel tone="muted" accent="blue" appearance="dark">
              <h3 className={panelEyebrowClass}>
                Your story so far
              </h3>
              <div className="mt-3 grid gap-2">
                {path.map((item, index) => (
                  <div key={`${item.nodeId}-${index}`} className={statCardClass}>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
                      Step {index + 1}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-white">
                      {normalizeText(item.title)}
                    </div>
                  </div>
                ))}
                {path.length === 0 ? (
                  <div className={`${statCardClass} text-sm text-white/65`}>
                    Start reading to see your path.
                  </div>
                ) : null}
              </div>
            </SurfacePanel>

            {showRawState && storyStateRows.length > 0 ? (
              <SurfacePanel tone="muted" accent="rose" appearance="dark">
                <h3 className={panelEyebrowClass}>
                  State
                </h3>
                <div className="mt-3 grid gap-2">
                  {storyStateRows.map((item) => (
                    <div key={item.key} className={`${statCardClass} text-sm text-white`}>
                      <span className="font-semibold uppercase tracking-[0.08em] text-white/80">
                        {item.key}
                      </span>
                      : {item.value}
                    </div>
                  ))}
                </div>
              </SurfacePanel>
            ) : null}

            <SurfacePanel tone="muted" accent="amber" appearance="dark">
              <h3 className={panelEyebrowClass}>
                Try Again
              </h3>
              <div className="mt-3 text-sm leading-[1.68] text-white/75">
                Endings reached: {Number(progress?.endingsReached || 0)}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleRestart}
                  className={`${storefrontSecondaryButtonClass} h-10 px-4 text-[11px] tracking-[0.08em]`}
                >
                  Start Again
                </button>
                <Link
                  href={detailHref}
                  className={`${storefrontSecondaryButtonClass} h-10 px-4 text-[11px] tracking-[0.08em]`}
                >
                  Story Page
                </Link>
              </div>
            </SurfacePanel>
          </div>
        </section>
      </div>
    </StorefrontPage>
  );
}
