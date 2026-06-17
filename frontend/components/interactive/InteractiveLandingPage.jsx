"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Flag,
  GitBranch,
  Lock,
  Map as MapIcon,
  MousePointerClick,
  Play,
  RefreshCw,
  Sparkles,
  Trophy,
} from "lucide-react";
import { apiGet } from "../../lib/apiClient";
import { trackEvent } from "../../lib/trackEvent";
import { siteMaterialImages } from "../../lib/siteMaterialAssets";
import { useAuthStore } from "../../store/useAuthStore";
import {
  storefrontAccentChipClass,
  storefrontBadgeClass,
  storefrontChipClass,
  storefrontInfoCardClass,
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../common/StorefrontPagePrimitives";
import { StorefrontPage } from "../storefront/StorefrontScaffold";

const ROUTE_TYPE_CHIPS = [
  "Mystery Route",
  "Secret Ending",
  "Romance Choice",
  "Escape Route",
  "Group Chat Drama",
  "Sci-Fi Signal",
  "Replayable",
];

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

function getStoryGenre(story, visual) {
  const genres = Array.isArray(story?.genres)
    ? story.genres
    : Array.isArray(story?.genre)
      ? story.genre
      : [];
  const genreLabel = genres
    .map((item) => normalizeText(item))
    .filter(Boolean)
    .slice(0, 2)
    .join(" / ");
  return genreLabel || normalizeText(story?.genre) || visual.routeLabel;
}

function getStoryStatus(story) {
  const status = normalizeText(story?.status);
  if (status) {
    return status;
  }
  return Number(story?.endingsCount || 0) > 1 ? "Replayable" : "Ready to read";
}

function buildStoryHref(story) {
  return `/interactive/${encodeURIComponent(normalizeText(story?.slug))}`;
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="font-display text-[2.05rem] font-semibold leading-[0.94] tracking-[-0.06em] text-white sm:text-[2.75rem]">
          {title}
        </h2>
        <p className="mt-2 max-w-[38rem] text-sm leading-[1.72] text-white/64">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function RouteTypeRail() {
  return (
    <section aria-label="Route types" className="-mx-4 overflow-x-auto px-4 pb-1 no-scrollbar sm:mx-0 sm:px-0">
      <div className="flex min-w-max gap-2.5">
        {ROUTE_TYPE_CHIPS.map((chip, index) => (
          <a
            key={chip}
            href="#choice-based-stories"
            className={`min-h-[44px] shrink-0 px-4 text-sm ${
              index === 0
                ? "inline-flex items-center gap-2 rounded-full border border-cyan-200/24 bg-cyan-200/[0.12] font-semibold text-cyan-50 shadow-[0_16px_34px_rgba(103,232,249,0.14)]"
                : `${storefrontChipClass} text-white/76`
            }`}
          >
            {index === 0 ? <GitBranch className="size-4" /> : null}
            {chip}
          </a>
        ))}
      </div>
    </section>
  );
}

function ChoiceBranchMap({ compact = false, className = "" }) {
  const nodes = [
    { choice: "Trust them", ending: "Found ending", tone: "cyan" },
    { choice: "Walk away", ending: "Hidden ending", tone: "rose" },
    { choice: "Tell the truth", ending: "Rare ending", tone: "amber" },
  ];

  return (
    <div
      className={`relative overflow-hidden rounded-[28px] border border-white/10 bg-[rgba(7,8,18,0.74)] p-4 shadow-[0_26px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl ${className}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(103,232,249,0.18),transparent_26%),radial-gradient(circle_at_80%_80%,rgba(255,79,154,0.2),transparent_30%)]" />
      <div className="relative">
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="inline-flex min-h-[32px] items-center gap-2 rounded-full border border-cyan-200/18 bg-cyan-200/10 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
            <MapIcon className="size-3.5" />
            Route map
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/42">
            Tap a branch
          </span>
        </div>

        <div className="relative grid gap-3">
          <div className="absolute bottom-8 left-5 top-5 w-px bg-[linear-gradient(180deg,rgba(255,255,255,0.34),rgba(103,232,249,0.78),rgba(255,79,154,0.62),rgba(251,191,36,0.7))]" />
          <div className={`relative grid items-center gap-3 ${compact ? "grid-cols-[40px_minmax(0,1fr)]" : "grid-cols-[40px_minmax(0,1fr)_auto]"}`}>
            <span className="relative z-10 flex size-10 items-center justify-center rounded-full border border-white/18 bg-white/10 text-white shadow-[0_0_28px_rgba(255,255,255,0.12)]">
              <Play className="size-4 fill-current" />
            </span>
            <div className="rounded-2xl border border-white/14 bg-white/[0.075] px-3 py-2">
              <p className="text-sm font-semibold tracking-[-0.01em] text-white">
                Start
              </p>
              <p className="mt-1 text-xs text-white/52">Open the first scene.</p>
            </div>
            {!compact ? (
              <span className="hidden min-h-[32px] items-center rounded-full border border-white/10 bg-white/5 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/58 sm:inline-flex">
                Scene 01
              </span>
            ) : null}
          </div>

          {nodes.map((node) => {
            const toneClass =
              node.tone === "cyan"
                ? "border-cyan-200/28 bg-cyan-200/10 text-cyan-100 shadow-[0_0_32px_rgba(103,232,249,0.16)]"
                : node.tone === "amber"
                  ? "border-amber-200/26 bg-amber-200/10 text-amber-100 shadow-[0_0_32px_rgba(251,191,36,0.14)]"
                  : "border-fuchsia-200/24 bg-fuchsia-200/10 text-fuchsia-100 shadow-[0_0_32px_rgba(255,79,154,0.16)]";

            return (
              <div
                key={node.choice}
                className={`relative grid items-center gap-3 ${compact ? "grid-cols-[40px_minmax(0,1fr)]" : "grid-cols-[40px_minmax(0,1fr)_auto]"}`}
              >
                <span className={`relative z-10 flex size-10 items-center justify-center rounded-full border ${toneClass}`}>
                  <span className="size-2 rounded-full bg-current" />
                </span>
                <div className={`rounded-2xl border px-3 py-2 transition-transform duration-150 hover:-translate-y-0.5 ${toneClass}`}>
                  <p className="text-sm font-semibold tracking-[-0.01em]">
                    {node.choice}
                  </p>
                  {compact ? (
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/48">
                      {node.ending}
                    </p>
                  ) : null}
                </div>
                {!compact ? (
                  <span className="inline-flex min-h-[32px] items-center rounded-full border border-white/10 bg-white/5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/58 sm:px-3 sm:tracking-[0.16em]">
                    {node.ending}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MiniBranchIndicator() {
  return (
    <div className="mt-4 flex items-center gap-2">
      {[0, 1, 2].map((item) => (
        <span
          key={item}
          className={`size-2 rounded-full ${
            item === 0
              ? "bg-cyan-200 shadow-[0_0_18px_rgba(103,232,249,0.8)]"
              : item === 1
                ? "bg-fuchsia-300 shadow-[0_0_18px_rgba(255,79,154,0.72)]"
                : "bg-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.7)]"
          }`}
        />
      ))}
      <span className="h-px flex-1 bg-[linear-gradient(90deg,rgba(103,232,249,0.52),rgba(255,79,154,0.3),transparent)]" />
    </div>
  );
}

function RouteProgressBar({ index = 0 }) {
  const activeCount = 2 + (index % 3);

  return (
    <div className="mt-4">
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {[0, 1, 2, 3].map((item) => (
          <span
            key={item}
            className={`h-2 flex-1 rounded-full ${
              item < activeCount
                ? "bg-[linear-gradient(90deg,#67e8f9_0%,#ec4899_100%)] shadow-[0_0_16px_rgba(236,72,153,0.24)]"
                : "bg-white/10"
            }`}
          />
        ))}
      </div>
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/46">
        Route progress
      </p>
    </div>
  );
}

function PathCard({ story, index, continueProgress = null, compact = false }) {
  const visual = getStoryVisual(story, index);
  const genre = getStoryGenre(story, visual);
  const isResume = Boolean(continueProgress?.node?.id);
  const choicesCount = Math.max(1, Number(story?.choicesCount || 0));
  const endingsCount = Math.max(1, Number(story?.endingsCount || 0));
  const replayable = endingsCount > 1;

  return (
    <Link
      href={buildStoryHref(story)}
      className={`group block ${compact ? "w-[78vw] min-w-[264px] max-w-[340px] shrink-0 sm:w-[320px]" : ""}`}
    >
      <article
        className={`${storefrontInfoCardClass} h-full overflow-hidden p-4 transition-all duration-200 hover:-translate-y-1.5 hover:border-cyan-200/24 hover:shadow-[0_28px_90px_rgba(103,232,249,0.14)]`}
      >
        <div className="relative min-h-[220px] overflow-hidden rounded-[26px] border border-white/10">
          <div className={`absolute inset-0 ${visual.posterClass}`} />
          <div className={`absolute inset-0 ${visual.glowClass}`} />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,10,18,0.05)_0%,rgba(8,10,18,0.2)_34%,rgba(8,10,18,0.88)_100%)]" />
          <div className="relative flex h-full min-h-[220px] flex-col justify-between p-4">
            <div className="flex items-center justify-between gap-2">
              <span className={`${storefrontBadgeClass} px-3 py-1 text-white/74`}>
                {genre}
              </span>
              <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/62">
                {isResume ? "Resume" : "Story"}
              </span>
            </div>
            <div>
              <RouteProgressBar index={index} />
              <h3 className="mt-4 font-display text-[1.65rem] font-semibold leading-[0.96] tracking-[-0.05em] text-white">
                {normalizeText(story?.title)}
              </h3>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className={`${storefrontBadgeClass} px-3 py-1.5 text-white/68`}>
            {choicesCount} choices
          </span>
          <span className={`${storefrontBadgeClass} px-3 py-1.5 text-white/68`}>
            {endingsCount} endings
          </span>
          {replayable ? (
            <span className={`${storefrontBadgeClass} px-3 py-1.5 text-cyan-100`}>
              <RefreshCw className="mr-1 size-3" />
              Replayable
            </span>
          ) : null}
        </div>

        <div className={`mt-5 ${storefrontChipClass} w-full justify-center text-xs uppercase tracking-[0.16em] text-white/78 group-hover:border-cyan-200/30 group-hover:text-cyan-100`}>
          Start Story
        </div>
      </article>
    </Link>
  );
}

function EndingGallery() {
  const endings = [
    {
      label: "Found",
      title: "First light",
      text: "A route you can reach on the first run.",
      icon: Flag,
      className: "border-cyan-200/24 bg-cyan-200/10 text-cyan-100",
    },
    {
      label: "Hidden",
      title: "Quiet clue",
      text: "A branch tucked behind one risky choice.",
      icon: Sparkles,
      className: "border-fuchsia-200/24 bg-fuchsia-200/10 text-fuchsia-100",
    },
    {
      label: "Locked",
      title: "Not yet",
      text: "A scene waiting for the right path.",
      icon: Lock,
      className: "border-white/14 bg-white/[0.07] text-white/72",
    },
    {
      label: "Rare",
      title: "Perfect turn",
      text: "The ending readers replay for.",
      icon: Trophy,
      className: "border-amber-200/26 bg-amber-200/10 text-amber-100",
    },
  ];

  return (
    <section className="space-y-4">
      <SectionHeader
        title="Ending Gallery"
        subtitle="Found, hidden, locked, and rare endings give each replay a reason."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {endings.map((ending) => {
          const Icon = ending.icon;
          return (
            <article
              key={ending.label}
              className={`${storefrontInfoCardClass} relative overflow-hidden p-4`}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_16%,rgba(255,255,255,0.07),transparent_26%)]" />
              <div className="relative">
                <div className={`flex size-12 items-center justify-center rounded-2xl border ${ending.className}`}>
                  <Icon className="size-5" />
                </div>
                <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/48">
                  {ending.label}
                </p>
                <h3 className="mt-2 text-[1.18rem] font-semibold tracking-[-0.03em] text-white">
                  {ending.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/62">
                  {ending.text}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default function InteractiveLandingPage({
  initialStories = [],
  initialContentMode = "normal",
  showLaunchChecklist = false,
}) {
  const [stories] = useState(() => normalizeStories(initialStories));
  const [continueMap, setContinueMap] = useState(() => new Map());
  const { hydrated, isSignedIn } = useAuthStore();
  void showLaunchChecklist;

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

  const tonightStory = stories[0] || null;
  const featuredStories = useMemo(() => stories.slice(0, 4), [stories]);
  const choiceStories = useMemo(() => stories.slice(0, 8), [stories]);
  const moreStories = useMemo(() => stories.slice(8), [stories]);
  const spotlightVisual = getStoryVisual(tonightStory, 0);
  const startRouteHref = tonightStory ? buildStoryHref(tonightStory) : "#choice-based-stories";

  return (
    <StorefrontPage
      accentClass="from-[rgba(255,79,154,0.14)] via-[rgba(167,139,250,0.08)] to-[rgba(103,232,249,0.12)]"
      contentClassName="space-y-10 lg:space-y-12"
    >
      <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(135deg,rgba(11,9,24,0.98)_0%,rgba(29,16,55,0.98)_42%,rgba(9,18,31,0.98)_100%)] p-5 shadow-[0_34px_110px_rgba(0,0,0,0.42)] sm:p-7 lg:p-8">
        <div className="absolute inset-0" aria-hidden="true">
          <img
            src={siteMaterialImages.interactiveTonightsRouteHero}
            alt=""
            aria-hidden="true"
            role="presentation"
            className="h-full w-full scale-[1.02] object-cover object-[center_right] opacity-68"
          />
          <div className={`absolute inset-0 ${spotlightVisual.glowClass}`} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(255,79,154,0.26),transparent_24%),radial-gradient(circle_at_76%_20%,rgba(103,232,249,0.18),transparent_24%),linear-gradient(90deg,rgba(8,7,18,0.98)_0%,rgba(13,9,27,0.88)_48%,rgba(8,12,24,0.72)_100%)]" />
        </div>
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,440px)] lg:items-center">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className={`${storefrontAccentChipClass} min-h-[34px] px-3 py-1 text-[10px] tracking-[0.02em] text-cyan-100`}>
                Interactive Stories
              </span>
              <span className={`${storefrontBadgeClass} px-3 py-1 text-[10px] tracking-[0.02em] text-white/64`}>
                {initialContentMode === "adult" ? "Mature picks" : "Story routes"}
              </span>
            </div>
            <h1 className="mt-5 max-w-[10ch] font-display text-[3.2rem] font-semibold leading-[0.9] tracking-[-0.055em] text-white sm:text-[4.8rem]">
              Choose your first move.
            </h1>
            <p className="mt-5 max-w-[39rem] text-base leading-[1.75] text-white/72">
              Start with one tap, follow the branch, and unlock a different ending when the choice turns.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href="#choice-based-stories"
                className={`${storefrontPrimaryButtonClass} min-h-[48px] px-6 text-[#190d18]`}
              >
                Browse Paths
                <Sparkles className="size-4" />
              </a>
              <Link
                href={startRouteHref}
                className={`${storefrontSecondaryButtonClass} min-h-[48px] px-6 text-white/84`}
              >
                Start Tonight's Route
                <Play className="size-4" />
              </Link>
            </div>
            <div className="mt-6 flex max-w-[620px] flex-wrap gap-2">
              {ROUTE_TYPE_CHIPS.slice(0, 4).map((chip) => (
                <span
                  key={chip}
                  className={`${storefrontBadgeClass} min-h-[32px] px-3 text-white/68`}
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>

          <ChoiceBranchMap className="lg:min-h-[360px]" />
        </div>
      </section>

      <RouteTypeRail />

      {tonightStory ? (
        <section className="space-y-4">
          <SectionHeader
            title="Tonight's Route"
            subtitle="One story readers are replaying tonight."
          />
          <Link href={buildStoryHref(tonightStory)} className="group block">
            <article className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[rgba(255,255,255,0.035)] p-4 shadow-[var(--gush-shadow-panel)] transition-all duration-200 hover:-translate-y-1 hover:border-cyan-200/24 sm:p-5">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)] lg:items-stretch">
                <div className="relative min-h-[330px] overflow-hidden rounded-[28px] border border-white/10 p-5">
                  <div className={`absolute inset-0 ${spotlightVisual.posterClass}`} />
                  <div className={`absolute inset-0 ${spotlightVisual.glowClass}`} />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,10,18,0.04)_0%,rgba(8,10,18,0.42)_46%,rgba(8,10,18,0.94)_100%)]" />
                  <div className="relative flex min-h-[290px] flex-col justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`${storefrontBadgeClass} px-3 py-1.5 text-white/76`}>
                        {getStoryGenre(tonightStory, spotlightVisual)}
                      </span>
                      <span className={`${storefrontBadgeClass} px-3 py-1.5 text-white/66`}>
                        {getStoryStatus(tonightStory)}
                      </span>
                    </div>
                    <div>
                      <MiniBranchIndicator />
                      <h2 className="mt-4 max-w-[13ch] font-display text-[2.6rem] font-semibold leading-[0.9] tracking-[-0.065em] text-white sm:text-[3.4rem]">
                        {normalizeText(tonightStory.title)}
                      </h2>
                      <p className="mt-4 max-w-[34rem] text-sm leading-[1.72] text-white/72">
                        {normalizeText(
                          tonightStory.description ||
                            "A route with sharp turns and replayable endings.",
                        )}
                      </p>
                      <div className={`mt-5 ${storefrontPrimaryButtonClass} min-h-[46px] px-5 text-[#190d18]`}>
                        Start Story
                        <Play className="size-4" />
                      </div>
                    </div>
                  </div>
                </div>
                <ChoiceBranchMap />
              </div>
            </article>
          </Link>
        </section>
      ) : null}

      {featuredStories.length > 0 ? (
        <section className="space-y-4">
          <SectionHeader
            title="Featured Paths"
            subtitle="Stories with choices worth replaying."
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {featuredStories.map((story, index) => (
              <PathCard
                key={story.id || story.slug}
                story={story}
                index={index}
                continueProgress={continueMap.get(normalizeText(story.slug))}
              />
            ))}
          </div>
        </section>
      ) : null}

      {choiceStories.length > 0 ? (
        <section
          id="choice-based-stories"
          data-testid="interactive-story-grid"
          className="space-y-4"
        >
          <SectionHeader
            title="Choice-Based Stories"
            subtitle="Stories where one tap changes the scene."
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {choiceStories.map((story, index) => (
              <PathCard
                key={story.id || story.slug}
                story={story}
                index={index}
                continueProgress={continueMap.get(normalizeText(story.slug))}
              />
            ))}
          </div>
        </section>
      ) : null}

      <EndingGallery />

      <section className="space-y-4">
        <SectionHeader
          title="How Choices Work"
          subtitle="Read, choose, and unlock a different scene."
        />
        <div className="relative grid gap-4 lg:grid-cols-3">
          <div className="absolute left-[16%] right-[16%] top-10 hidden h-px bg-[linear-gradient(90deg,rgba(103,232,249,0.08),rgba(255,79,154,0.48),rgba(251,191,36,0.08))] lg:block" />
          {[
            {
              title: "Read the scene",
              text: "Catch the setup.",
              icon: BookOpen,
              tone: "cyan",
            },
            {
              title: "Pick a choice",
              text: "Tap the branch.",
              icon: MousePointerClick,
              tone: "rose",
            },
            {
              title: "Unlock a route",
              text: "Reach a new ending.",
              icon: Flag,
              tone: "amber",
            },
          ].map((step, index) => {
            const Icon = step.icon;
            const toneClass =
              step.tone === "cyan"
                ? "border-cyan-200/22 bg-cyan-200/10 text-cyan-100"
                : step.tone === "amber"
                  ? "border-amber-200/22 bg-amber-200/10 text-amber-100"
                  : "border-fuchsia-200/22 bg-fuchsia-200/10 text-fuchsia-100";

            return (
              <div
                key={step.title}
                className={`${storefrontInfoCardClass} relative overflow-hidden p-5`}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_16%,rgba(255,255,255,0.07),transparent_26%)]" />
                <div className="relative">
                  <div className={`flex size-12 items-center justify-center rounded-2xl border ${toneClass}`}>
                    <Icon className="size-5" />
                  </div>
                  <p className="mt-5 text-xs font-semibold normal-case tracking-[0.01em] text-white/42">
                    Step {index + 1}
                  </p>
                  <h3 className="mt-2 font-display text-[1.55rem] font-semibold tracking-[-0.045em] text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-white/62">
                    {step.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {moreStories.length > 0 ? (
        <section className="space-y-4">
          <SectionHeader
            title="More Interactive Stories"
            subtitle="More interactive stories waiting on the shelf."
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {moreStories.map((story, index) => (
              <PathCard
                key={story.id || story.slug}
                story={story}
                index={index + 8}
                continueProgress={continueMap.get(normalizeText(story.slug))}
              />
            ))}
          </div>
        </section>
      ) : null}
    </StorefrontPage>
  );
}
