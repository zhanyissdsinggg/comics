"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../../lib/apiClient";
import { trackEvent } from "../../lib/trackEvent";
import { useAuthStore } from "../../store/useAuthStore";
import SurfacePanel from "../common/SurfacePanel";

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

    apiGet(`/api/interactive-stories/progress/bulk?slugs=${encodeURIComponent(slugs.join(","))}`, {
      suppressAuthModal: true,
      cacheMs: 0,
      bust: true,
    })
      .then((items) => {
        if (!cancelled) {
          const progressList = Array.isArray(items?.data?.progress) ? items.data.progress : [];
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
    () => stories.reduce((sum, item) => sum + Number(item?.endingsCount || 0), 0),
    [stories],
  );
  const filteredStories = useMemo(() => {
    if (activeFilter === "shortest") {
      return [...stories].sort(
        (left, right) => Number(left?.choicesCount || 0) - Number(right?.choicesCount || 0),
      );
    }
    if (activeFilter === "endings") {
      return [...stories].sort(
        (left, right) => Number(right?.endingsCount || 0) - Number(left?.endingsCount || 0),
      );
    }
    return stories;
  }, [activeFilter, stories]);

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,rgba(31,88,119,0.22)_0%,rgba(13,16,27,0.98)_42%,#07080d_100%)] text-white">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-8 px-4 py-8 md:px-8 md:py-10">
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <SurfacePanel tone="highlight" accent="cyan" appearance="dark" className="min-h-[320px]">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-200/70">
              Interactive Stories
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black uppercase tracking-[-0.06em] text-white sm:text-5xl">
              Your Choice Changes the Story
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72 sm:text-base">
              Every choice changes the route. Unlock secret scenes, hidden clues,
              and different endings.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={`rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] transition ${
                  activeFilter === "all"
                    ? "border-cyan-200/50 bg-cyan-200/12 text-cyan-100"
                    : "border-white/10 bg-white/5 text-white/70"
                }`}
              >
                All stories
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("endings")}
                className={`rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] transition ${
                  activeFilter === "endings"
                    ? "border-cyan-200/50 bg-cyan-200/12 text-cyan-100"
                    : "border-white/10 bg-white/5 text-white/70"
                }`}
              >
                Most endings
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("shortest")}
                className={`rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] transition ${
                  activeFilter === "shortest"
                    ? "border-cyan-200/50 bg-cyan-200/12 text-cyan-100"
                    : "border-white/10 bg-white/5 text-white/70"
                }`}
              >
                Quick runs
              </button>
            </div>
          </SurfacePanel>

          <SurfacePanel tone="muted" accent="amber" appearance="dark" className="flex flex-col justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-100/70">
                {showLaunchChecklist ? "Launch checklist" : "What to expect"}
              </p>
              {showLaunchChecklist ? (
                <div className="mt-4 grid gap-3 text-sm text-white/80">
                  <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/60">
                      Mode
                    </div>
                    <div className="mt-2 text-lg font-black uppercase tracking-[-0.04em]">
                      {initialContentMode === "adult" ? "Adult mode" : "Normal mode"}
                    </div>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/60">
                      Published stories
                    </div>
                    <div className="mt-2 text-lg font-black uppercase tracking-[-0.04em]">
                      {stories.length}
                    </div>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/60">
                      Replay factor
                    </div>
                    <div className="mt-2 text-lg font-black uppercase tracking-[-0.04em]">
                      {totalEndings} endings
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-3 text-sm leading-7 text-white/78">
                  {hasStories ? (
                    <>
                      <p>
                        Start in normal mode, pick a route, and carry your choices all the way to a real ending.
                      </p>
                      <p>
                        Locked routes can open with premium access or tokens when a story supports them.
                      </p>
                      <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/60">
                          Live today
                        </div>
                        <div className="mt-2 text-lg font-black uppercase tracking-[-0.04em]">
                          {stories.length} stories, {totalEndings} endings
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <p>
                        Interactive stories are almost here. The first live routes will open as soon as they finish release review.
                      </p>
                      <p>
                        Come back soon for branching teen-safe stories with replayable endings built for quick restarts and new routes.
                      </p>
                      <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/60">
                          Coming soon
                        </div>
                        <div className="mt-2 text-lg font-black uppercase tracking-[-0.04em]">
                          Fresh interactive stories are on the way
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </SurfacePanel>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {featuredStories.map((story, index) => (
            <Link
              key={story.id}
              href={`/interactive/${encodeURIComponent(story.slug)}`}
              className="group"
            >
              <SurfacePanel
                tone={index === 0 ? "highlight" : "muted"}
                accent={index === 0 ? "rose" : "blue"}
                appearance="dark"
                className="h-full transition duration-200 group-hover:-translate-y-1"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/64">
                    {normalizeText(story.contentMode)}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200/70">
                    Featured
                  </span>
                </div>
                <h2 className="mt-5 text-2xl font-black tracking-[-0.05em] text-white">
                  {normalizeText(story.title)}
                </h2>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/68">
                  {normalizeText(story.description || "A branching interactive story.")}
                </p>
                <div className="mt-5 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/60">
                  <span className="rounded-full border border-white/10 px-3 py-2">
                    {Number(story.choicesCount || 0)} choices
                  </span>
                  <span className="rounded-full border border-white/10 px-3 py-2">
                    {Number(story.endingsCount || 0)} endings
                  </span>
                </div>
              </SurfacePanel>
            </Link>
          ))}
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="interactive-story-grid">
          {filteredStories.map((story) => {
            const continueProgress = continueMap.get(normalizeText(story.slug));
            const isResume = Boolean(continueProgress?.node?.id);
            return (
              <Link
                key={story.id}
                href={`/interactive/${encodeURIComponent(story.slug)}`}
                className="group rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(24,28,38,0.98)_0%,rgba(12,14,22,0.98)_100%)] p-5 shadow-[0_22px_48px_rgba(0,0,0,0.22)] transition-all duration-200 hover:-translate-y-1 hover:border-white/18"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/64">
                    {story.contentMode}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200/70">
                    {isResume ? "Resume ready" : "Open"}
                  </span>
                </div>
                <h2 className="mt-4 text-2xl font-black tracking-[-0.05em] text-white">
                  {normalizeText(story.title)}
                </h2>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/68">
                  {normalizeText(story.description || "A branching interactive story.")}
                </p>
                <div className="mt-5 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/60">
                  <span className="rounded-full border border-white/10 px-3 py-2">
                    {Number(story.choicesCount || 0)} choices
                  </span>
                  <span className="rounded-full border border-white/10 px-3 py-2">
                    {Number(story.endingsCount || 0)} endings
                  </span>
                </div>
                {isResume ? (
                  <div className="mt-4 rounded-[18px] border border-cyan-200/20 bg-cyan-200/8 px-4 py-3 text-xs leading-5 text-cyan-100/88">
                    Continue from {normalizeText(continueProgress?.node?.title || "your last node")}.
                  </div>
                ) : null}
                <div className="mt-6 inline-flex items-center rounded-full border border-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/70 transition group-hover:border-cyan-200/30 group-hover:text-cyan-100">
                  {isResume ? "View details" : "Enter story"}
                </div>
              </Link>
            );
          })}
          {filteredStories.length === 0 ? (
            <div className="rounded-[28px] border border-white/10 bg-[rgba(12,14,22,0.98)] p-6 text-sm leading-7 text-white/70">
              {showLaunchChecklist
                ? "No interactive stories are published yet."
                : "Interactive stories are almost here. Check back soon for the first live routes."}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
