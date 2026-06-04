"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../../lib/apiClient";
import { trackEvent } from "../../lib/trackEvent";
import { useAuthStore } from "../../store/useAuthStore";
import SurfacePanel from "../common/SurfacePanel";
import {
  storefrontAccentChipClass,
  storefrontBadgeClass,
  storefrontChipClass,
  storefrontInfoCardClass,
  storefrontSoftCardClass,
} from "../common/StorefrontPagePrimitives";
import { StorefrontPage } from "../storefront/StorefrontScaffold";

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeStories(value) {
  return Array.isArray(value) ? value : [];
}

function getContinueMap(progressList) {
  const map = new Map();
  for (const item of Array.isArray(progressList) ? progressList : []) {
    const slug = normalizeText(item?.story?.slug);
    if (!slug) {
      continue;
    }
    map.set(slug, item);
  }
  return map;
}

function getStoryVisual(story, index = 0) {
  const slug = normalizeText(story?.slug).toLowerCase();

  if (slug.includes("solar") || slug.includes("signal")) {
    return {
      accent: "cyan",
      cardAccent: "blue",
      posterClass:
        "bg-[linear-gradient(135deg,#09111d_0%,#10305a_48%,#63d4ff_100%)]",
      glowClass:
        "bg-[radial-gradient(circle_at_18%_18%,rgba(103,232,249,0.36),transparent_24%),radial-gradient(circle_at_78%_24%,rgba(167,139,250,0.24),transparent_28%)]",
      routeLabel: "Signal Route",
    };
  }

  if (slug.includes("chat") || slug.includes("locker")) {
    return {
      accent: "rose",
      cardAccent: "rose",
      posterClass:
        "bg-[linear-gradient(135deg,#170912_0%,#4f1738_46%,#ff7ab1_100%)]",
      glowClass:
        "bg-[radial-gradient(circle_at_20%_18%,rgba(255,79,154,0.34),transparent_24%),radial-gradient(circle_at_80%_20%,rgba(125,211,252,0.16),transparent_26%)]",
      routeLabel: "Rumor Route",
    };
  }

  if (slug.includes("pool") || slug.includes("bus")) {
    return {
      accent: "amber",
      cardAccent: "amber",
      posterClass:
        "bg-[linear-gradient(135deg,#1c1207_0%,#6e3511_44%,#ffb15e_100%)]",
      glowClass:
        "bg-[radial-gradient(circle_at_20%_18%,rgba(251,191,36,0.34),transparent_22%),radial-gradient(circle_at_80%_20%,rgba(255,79,154,0.14),transparent_28%)]",
      routeLabel: "Midnight Route",
    };
  }

  if (index === 0) {
    return {
      accent: "cyan",
      cardAccent: "rose",
      posterClass:
        "bg-[linear-gradient(135deg,#0b1020_0%,#2a1955_48%,#ff4f9a_100%)]",
      glowClass:
        "bg-[radial-gradient(circle_at_20%_18%,rgba(125,244,255,0.24),transparent_24%),radial-gradient(circle_at_80%_20%,rgba(255,79,154,0.22),transparent_28%)]",
      routeLabel: "Prime Route",
    };
  }

  return {
    accent: index % 2 === 0 ? "blue" : "rose",
    cardAccent: index % 2 === 0 ? "blue" : "rose",
    posterClass:
      index % 2 === 0
        ? "bg-[linear-gradient(135deg,#0b1324_0%,#1f3562_50%,#6eb7ff_100%)]"
        : "bg-[linear-gradient(135deg,#120a1f_0%,#3f184b_44%,#ff88b5_100%)]",
    glowClass:
      index % 2 === 0
        ? "bg-[radial-gradient(circle_at_20%_18%,rgba(96,165,250,0.24),transparent_24%),radial-gradient(circle_at_80%_20%,rgba(103,232,249,0.2),transparent_28%)]"
        : "bg-[radial-gradient(circle_at_20%_18%,rgba(255,79,154,0.26),transparent_24%),radial-gradient(circle_at_80%_20%,rgba(196,181,253,0.18),transparent_28%)]",
    routeLabel: "Story Route",
  };
}

export default function InteractiveLandingPage({
  initialStories = [],
  initialContentMode = "normal",
  showLaunchChecklist = false,
}) {
  const [stories] = useState(() => normalizeStories(initialStories));
  const [continueMap, setContinueMap] = useState(() => new Map());
  const [activeFilter, setActiveFilter] = useState("all");
  const { hydrated, isSignedIn } = useAuthStore();

  useEffect(() => {
    if (!hydrated) {
      return undefined;
    }
    if (!isSignedIn || stories.length === 0) {
      setContinueMap(new Map());
      return undefined;
    }

    let cancelled = false;
    const slugs = stories
      .slice(0, 24)
      .map((story) => normalizeText(story?.slug))
      .filter(Boolean);

    apiGet(
      `/api/interactive-stories/progress/bulk?slugs=${encodeURIComponent(slugs.join(","))}`,
      {
        suppressAuthModal: true,
        cacheMs: 0,
        bust: true,
      },
    )
      .then((items) => {
        if (!cancelled) {
          const progressList = Array.isArray(items?.data?.progress)
            ? items.data.progress
            : [];
          setContinueMap(getContinueMap(progressList));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setContinueMap(new Map());
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, isSignedIn, stories]);

  useEffect(() => {
    trackEvent("interactive_story_view", {
      storyId: undefined,
      slug: undefined,
      nodeId: undefined,
      choiceId: undefined,
      contentMode: initialContentMode,
      routeDepth: 0,
      isEnding: false,
      sourceSection: "interactive_landing",
      storiesCount: stories.length,
    });
  }, [initialContentMode, stories.length]);

  const featuredStories = useMemo(() => stories.slice(0, 3), [stories]);
  const hasStories = stories.length > 0;
  const totalEndings = useMemo(
    () =>
      stories.reduce((sum, item) => sum + Number(item?.endingsCount || 0), 0),
    [stories],
  );
  const resumeCount = useMemo(() => continueMap.size, [continueMap]);
  const averageChoices = useMemo(() => {
    if (stories.length === 0) {
      return 0;
    }
    const totalChoices = stories.reduce(
      (sum, item) => sum + Number(item?.choicesCount || 0),
      0,
    );
    return Math.round(totalChoices / stories.length);
  }, [stories]);
  const filteredStories = useMemo(() => {
    if (activeFilter === "shortest") {
      return [...stories].sort(
        (left, right) =>
          Number(left?.choicesCount || 0) - Number(right?.choicesCount || 0),
      );
    }
    if (activeFilter === "endings") {
      return [...stories].sort(
        (left, right) =>
          Number(right?.endingsCount || 0) - Number(left?.endingsCount || 0),
      );
    }
    return stories;
  }, [activeFilter, stories]);

  const spotlightStory = featuredStories[0] || filteredStories[0] || null;
  const spotlightVisual = getStoryVisual(spotlightStory, 0);
  const filterChipClass = (active) =>
    `${active ? storefrontAccentChipClass : storefrontChipClass} px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em]`;

  return (
    <StorefrontPage accentClass="from-[rgba(255,79,154,0.14)] via-[rgba(167,139,250,0.08)] to-[rgba(103,232,249,0.12)]">
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.18fr)_minmax(300px,0.82fr)]">
          <SurfacePanel
            tone="highlight"
            accent="cyan"
            appearance="dark"
            className="min-h-[360px] overflow-hidden"
          >
            <div className="absolute inset-y-0 right-0 hidden w-[46%] lg:block">
              <div className={`absolute inset-0 ${spotlightVisual.posterClass}`} />
              <div className={`absolute inset-0 ${spotlightVisual.glowClass}`} />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,12,20,0.96)_0%,rgba(11,12,20,0.62)_34%,rgba(11,12,20,0.08)_100%)]" />
              <div className={`absolute bottom-8 right-8 w-[240px] ${storefrontInfoCardClass} p-5`}>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/58">
                  Tonight's Route
                </div>
                <div className="mt-3 font-display text-[1.6rem] font-semibold leading-[0.92] tracking-[-0.05em] text-white">
                  {spotlightStory
                    ? normalizeText(spotlightStory.title)
                    : "Shadowed Choices"}
                </div>
                <div className="mt-3 space-y-2">
                  {[
                    "Trust them",
                    "Walk away",
                    "Tell the truth",
                  ].map((item, index) => (
                    <div
                      key={item}
                      className={`rounded-full border px-4 py-2 text-[11px] font-semibold shadow-[var(--gush-shadow-press)] ${
                        index === 0
                          ? "border-cyan-200/30 bg-cyan-200/10 text-cyan-100"
                          : index === 1
                            ? "border-fuchsia-200/20 bg-fuchsia-200/8 text-fuchsia-100"
                            : "border-amber-200/20 bg-amber-200/8 text-amber-100"
                      }`}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative max-w-3xl">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className={`${storefrontAccentChipClass} min-h-[32px] px-3 py-1 text-[10px] tracking-[0.24em] text-cyan-100`}>
                  Interactive Stories
                </span>
                <span className={`${storefrontBadgeClass} px-3 py-1 text-[10px] tracking-[0.2em] text-white/66`}>
                  {initialContentMode === "adult" ? "Adult mode" : "Normal mode"}
                </span>
              </div>
              <h1 className="mt-4 max-w-3xl font-display text-[2.85rem] font-semibold leading-[0.88] tracking-[-0.07em] text-white sm:text-[3.95rem]">
                Your Choice Changes the Story
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-[1.78] text-white/74 sm:text-base">
                Enter a route, push the scene somewhere risky, and see how fast
                one decision changes the ending waiting for you.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setActiveFilter("all")}
                  className={filterChipClass(activeFilter === "all")}
                >
                  All stories
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("endings")}
                  className={filterChipClass(activeFilter === "endings")}
                >
                  Most endings
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("shortest")}
                  className={filterChipClass(activeFilter === "shortest")}
                >
                  Quick runs
                </button>
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <div className={`${storefrontInfoCardClass} p-4`}>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
                    Published
                  </div>
                  <div className="mt-2 font-display text-[1.85rem] font-semibold tracking-[-0.05em] text-white">
                    {stories.length}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-white/62">
                    Branching stories ready to open tonight.
                  </p>
                </div>
                <div className={`${storefrontInfoCardClass} p-4`}>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
                    Replay factor
                  </div>
                  <div className="mt-2 font-display text-[1.85rem] font-semibold tracking-[-0.05em] text-white">
                    {totalEndings}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-white/62">
                    Possible endings across the current shelf.
                  </p>
                </div>
                <div className={`${storefrontInfoCardClass} p-4`}>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
                    Continue now
                  </div>
                  <div className="mt-2 font-display text-[1.85rem] font-semibold tracking-[-0.05em] text-white">
                    {resumeCount}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-white/62">
                    Saved routes waiting to pull you back in.
                  </p>
                </div>
              </div>
            </div>
          </SurfacePanel>

          <SurfacePanel
            tone="muted"
            accent={showLaunchChecklist ? "amber" : "rose"}
            appearance="dark"
            className="flex flex-col justify-between"
          >
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/54">
                {showLaunchChecklist ? "Story Guide" : "Tonight's Shelf"}
              </p>
              {showLaunchChecklist ? (
                <div className="mt-4 grid gap-3 text-sm text-white/80">
                  <div className={`${storefrontInfoCardClass} p-4`}>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
                      Mode
                    </div>
                    <div className="mt-2 text-lg font-semibold tracking-[-0.04em]">
                      {initialContentMode === "adult" ? "Adult mode" : "Normal mode"}
                    </div>
                  </div>
                  <div className={`${storefrontInfoCardClass} p-4`}>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
                      Published stories
                    </div>
                    <div className="mt-2 text-lg font-semibold tracking-[-0.04em]">
                      {stories.length}
                    </div>
                  </div>
                  <div className={`${storefrontInfoCardClass} p-4`}>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
                      Average choices
                    </div>
                    <div className="mt-2 text-lg font-semibold tracking-[-0.04em]">
                      {averageChoices}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-3 text-sm leading-[1.72] text-white/78">
                  {hasStories ? (
                    <>
                      <div className={`${storefrontInfoCardClass} p-5`}>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">
                          Spotlight
                        </div>
                        <div className="mt-3 font-display text-[1.8rem] font-semibold leading-[0.94] tracking-[-0.05em] text-white">
                          {spotlightStory
                            ? normalizeText(spotlightStory.title)
                            : "Shadow of Truth"}
                        </div>
                        <p className="mt-3 text-sm leading-[1.7] text-white/68">
                          {spotlightStory
                            ? normalizeText(
                                spotlightStory.description ||
                                  "A branching interactive story.",
                              )
                            : "Open a route, make the wrong choice, and see where the night goes."}
                        </p>
                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                          <div className={storefrontSoftCardClass}>
                            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/52">
                              Route type
                            </div>
                            <div className="mt-2 text-sm font-semibold text-white">
                              {spotlightVisual.routeLabel}
                            </div>
                          </div>
                          <div className={storefrontSoftCardClass}>
                            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/52">
                              Average path
                            </div>
                            <div className="mt-2 text-sm font-semibold text-white">
                              {averageChoices} choices
                            </div>
                          </div>
                        </div>
                      </div>
                      <p>
                        Start with one choice, follow the route, and watch how
                        fast the scene twists around you.
                      </p>
                      <p>Some routes may unlock later through premium access.</p>
                    </>
                  ) : (
                    <>
                      <p>
                        More interactive stories are on the way. Check back soon
                        for new routes, secret endings, and scenes worth
                        replaying.
                      </p>
                      <p>
                        The first wave is just the start. More stories will land
                        soon with new turns, bad decisions, and endings worth
                        chasing.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </SurfacePanel>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/48">
                Featured Paths
              </p>
              <h2 className="mt-2 font-display text-[1.9rem] font-semibold leading-[0.96] tracking-[-0.06em] text-white">
                Open a route you will keep thinking about
              </h2>
            </div>
            <p className="text-sm text-white/54">
              Built for quick suspense, sharp turns, and replayable endings.
            </p>
          </div>

          <section className="grid gap-4 lg:grid-cols-3">
            {featuredStories.map((story, index) => {
              const visual = getStoryVisual(story, index);
              const continueProgress = continueMap.get(normalizeText(story.slug));

              return (
                <Link
                  key={story.id}
                  href={`/interactive/${encodeURIComponent(story.slug)}`}
                  className="group"
                >
                  <SurfacePanel
                    tone={index === 0 ? "highlight" : "muted"}
                    accent={visual.accent}
                    appearance="dark"
                    className="h-full transition duration-200 group-hover:-translate-y-1"
                  >
                    <div className={`relative overflow-hidden ${storefrontInfoCardClass} p-4`}>
                      <div className={`absolute inset-0 ${visual.posterClass}`} />
                      <div className={`absolute inset-0 ${visual.glowClass}`} />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,10,18,0.1)_0%,rgba(8,10,18,0.78)_84%,rgba(8,10,18,0.94)_100%)]" />
                      <div className="relative">
                        <div className="flex items-center justify-between gap-3">
                          <span className={storefrontBadgeClass}>
                            {normalizeText(story.contentMode)}
                          </span>
                          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100/84">
                            Featured
                          </span>
                        </div>
                        <div className="mt-12 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/52">
                          {visual.routeLabel}
                        </div>
                        <h2 className="mt-3 font-display text-[2rem] font-semibold leading-[0.94] tracking-[-0.05em] text-white">
                          {normalizeText(story.title)}
                        </h2>
                        <p className="mt-3 line-clamp-3 text-sm leading-[1.68] text-white/74">
                          {normalizeText(
                            story.description || "A branching interactive story.",
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">
                      <span className={storefrontBadgeClass}>
                        {Number(story.choicesCount || 0)} choices
                      </span>
                      <span className={storefrontBadgeClass}>
                        {Number(story.endingsCount || 0)} endings
                      </span>
                      {continueProgress?.node?.id ? (
                        <span className="inline-flex min-h-[44px] items-center rounded-full border border-cyan-200/24 bg-cyan-200/10 px-4 text-cyan-100 shadow-[0_14px_28px_rgba(8,6,20,0.16)] backdrop-blur-xl">
                          Continue now
                        </span>
                      ) : null}
                    </div>
                  </SurfacePanel>
                </Link>
              );
            })}
          </section>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/48">
                Browse Stories
              </p>
              <h2 className="mt-2 font-display text-[1.9rem] font-semibold leading-[0.96] tracking-[-0.06em] text-white">
                Pick your next route
              </h2>
            </div>
            <p className="text-sm text-white/54">
              {filteredStories.length} story
              {filteredStories.length === 1 ? "" : "ies"} in the current shelf.
            </p>
          </div>

          <section
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
            data-testid="interactive-story-grid"
          >
            {filteredStories.map((story, index) => {
              const continueProgress = continueMap.get(normalizeText(story.slug));
              const isResume = Boolean(continueProgress?.node?.id);
              const visual = getStoryVisual(story, index);

              return (
                <Link
                  key={story.id}
                  href={`/interactive/${encodeURIComponent(story.slug)}`}
                  className={`group ${storefrontInfoCardClass} p-5 transition-all duration-200 hover:-translate-y-1.5 hover:border-white/18 hover:shadow-[var(--gush-shadow-panel)]`}
                >
                  <div className={`relative overflow-hidden ${storefrontSoftCardClass} px-4 py-4`}>
                    <div className={`absolute inset-0 ${visual.posterClass}`} />
                    <div className={`absolute inset-0 ${visual.glowClass}`} />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,10,18,0.06)_0%,rgba(8,10,18,0.76)_88%,rgba(8,10,18,0.92)_100%)]" />
                    <div className="relative">
                      <div className="flex items-center justify-between gap-3">
                        <span className={`${storefrontBadgeClass} px-3 py-1 text-[10px] tracking-[0.18em] text-white/70`}>
                          {story.contentMode}
                        </span>
                        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200/70">
                          {isResume ? "Continue" : "Open Story"}
                        </span>
                      </div>
                      <div className="mt-12 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/52">
                        {visual.routeLabel}
                      </div>
                      <h2 className="mt-3 font-display text-[1.95rem] font-semibold leading-[0.94] tracking-[-0.05em] text-white">
                        {normalizeText(story.title)}
                      </h2>
                      <p className="mt-3 line-clamp-3 text-sm leading-[1.68] text-white/72">
                        {normalizeText(
                          story.description || "A branching interactive story.",
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">
                    <span className={`${storefrontBadgeClass} px-3 py-2`}>
                      {Number(story.choicesCount || 0)} choices
                    </span>
                    <span className={`${storefrontBadgeClass} px-3 py-2`}>
                      {Number(story.endingsCount || 0)} endings
                    </span>
                  </div>
                  {isResume ? (
                    <div className="mt-4 rounded-[calc(var(--gush-radius-lg)-2px)] border border-cyan-200/20 bg-cyan-200/8 px-4 py-3 text-xs leading-[1.6] text-cyan-100/88 shadow-[var(--gush-shadow-press)]">
                      {continueProgress?.node?.title
                        ? `Jump back in from ${normalizeText(continueProgress.node.title)}.`
                        : "Jump back in where you left off."}
                    </div>
                  ) : (
                    <div className={`mt-4 ${storefrontSoftCardClass} px-4 py-3 text-xs leading-[1.6] text-white/62`}>
                      One route, multiple endings, and enough bad decisions to
                      make a second run worth it.
                    </div>
                  )}
                  <div className={`mt-6 ${storefrontChipClass} text-xs uppercase tracking-[0.16em] text-white/70 group-hover:border-cyan-200/30 group-hover:text-cyan-100`}>
                    {isResume ? "Continue Reading" : "Open Story"}
                  </div>
                </Link>
              );
            })}
            {filteredStories.length === 0 ? (
              <div className={`${storefrontInfoCardClass} p-6 text-sm leading-[1.72] text-white/70`}>
                {showLaunchChecklist
                  ? "No interactive stories are published yet."
                  : "More interactive stories are on the way. Check back soon for fresh routes and new endings."}
              </div>
            ) : null}
          </section>
        </section>
    </StorefrontPage>
  );
}
