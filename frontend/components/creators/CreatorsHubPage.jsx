"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "../layout/SiteHeader";
import Cover from "../common/Cover";
import EditorialHero from "../common/EditorialHero";
import SurfacePanel from "../common/SurfacePanel";
import EmptyState from "../common/EmptyState";
import SkeletonCard from "../common/SkeletonCard";
import CommerceSuccessBanner from "../common/CommerceSuccessBanner";
import { apiGet } from "../../lib/apiClient";
import { buildCreatorDirectory, getCreatorDirectoryStats } from "../../lib/creatorDirectory";
import {
  consumeCommerceSuccessForPath,
  getCommerceSuccessPresentation,
} from "../../lib/commerceSuccess";
import { buildPathWithAttribution } from "../../lib/paymentAttribution";
import { trackEvent } from "../../lib/trackEvent";
import { useAdultGateStore } from "../../store/useAdultGateStore";

function formatDateLabel(value) {
  if (!value) {
    return "Recently updated";
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return "Recently updated";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(parsed));
}

function buildGenreOptions(creators) {
  const counts = new Map();

  (Array.isArray(creators) ? creators : []).forEach((creator) => {
    (Array.isArray(creator?.topGenres) ? creator.topGenres : []).forEach((genre) => {
      const key = String(genre || "").trim();
      if (!key) {
        return;
      }

      counts.set(key, (counts.get(key) || 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([genre]) => genre)
    .slice(0, 8);
}

function formatCreditTypeLabel(creditType) {
  return creditType === "studio" ? "Studio" : "Creator";
}

function summarizeLeadCopy(text, fallback) {
  const source = String(text || "").replace(/\s+/g, " ").trim();
  if (!source) {
    return fallback;
  }

  if (source.length <= 120) {
    return source;
  }

  return `${source.slice(0, 117).trimEnd()}...`;
}

function getCreatorTopTitles(creator, limit = 3) {
  return (Array.isArray(creator?.series) ? creator.series : [])
    .map((item) => String(item?.title || "").trim())
    .filter(Boolean)
    .slice(0, limit);
}

function getCreatorLeadSeries(creator) {
  const series = Array.isArray(creator?.series) ? creator.series : [];
  if (creator?.spotlightSeries?.id) {
    return creator.spotlightSeries;
  }
  return series.find((item) => item?.id) || null;
}

function CreatorDirectorySkeleton() {
  return (
    <main className="relative min-h-screen bg-[#f4f6fb] text-slate-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.1),transparent_24%),linear-gradient(180deg,#eef2f9_0%,#f4f6fb_72%)]" />
      <SiteHeader variant="light" />
      <div className="relative mx-auto max-w-[1280px] space-y-6 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <SurfacePanel appearance="light" accent="blue" className="space-y-6">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-center">
            <div className="space-y-3">
              <div className="h-4 w-28 animate-pulse rounded-full bg-slate-200" />
              <div className="h-14 w-full max-w-3xl animate-pulse rounded-[24px] bg-slate-200" />
              <div className="h-20 w-full max-w-2xl animate-pulse rounded-[24px] bg-slate-200" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`creators-hero-skeleton-${index}`}
                  className="h-28 animate-pulse rounded-[24px] border border-black/6 bg-white/80"
                />
              ))}
            </div>
          </div>
        </SurfacePanel>

        <div className="grid gap-4 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`creators-card-skeleton-${index}`}
              className="h-[360px] animate-pulse rounded-[28px] border border-black/6 bg-white/85 shadow-[0_18px_42px_rgba(15,23,42,0.06)]"
            />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <SkeletonCard key={`creator-grid-skeleton-${index}`} appearance="light" />
          ))}
        </div>
      </div>
    </main>
  );
}

export default function CreatorsHubPage({
  initialCatalog = [],
  hasInitialCatalog = false,
}) {
  const router = useRouter();
  const { isAdultMode, forceDisableAdultMode } = useAdultGateStore();
  const [catalog, setCatalog] = useState(Array.isArray(initialCatalog) ? initialCatalog : []);
  const [loading, setLoading] = useState(!hasInitialCatalog);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [activeGenre, setActiveGenre] = useState("All");
  const [creditFilter, setCreditFilter] = useState("all");
  const [commerceNotice, setCommerceNotice] = useState(null);
  const requestRef = useRef(0);

  useEffect(() => {
    setCommerceNotice(getCommerceSuccessPresentation(consumeCommerceSuccessForPath("/creators")));
  }, []);

  useEffect(() => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    const adultFlag = isAdultMode ? "1" : "0";
    if (!hasInitialCatalog) {
      setLoading(true);
    }
    setError("");

    const isCurrentRequest = () => requestRef.current === requestId;
    const applyResponse = (response) => {
      if (!isCurrentRequest()) {
        return false;
      }

      if (!response.ok) {
        if (response.error === "ADULT_GATED") {
          forceDisableAdultMode();
          setCatalog([]);
          setError("");
        } else {
          if (!hasInitialCatalog) {
            setCatalog([]);
            setError(response.error || "Unable to load creators.");
          }
        }
        return true;
      }

      setCatalog(Array.isArray(response.data?.series) ? response.data.series : []);
      setError("");
      return true;
    };

    apiGet(`/api/series?adult=${adultFlag}`, { cacheMs: 30000 }).then((response) => {
      if (!applyResponse(response)) {
        return;
      }

      if (isCurrentRequest()) {
        setLoading(false);
      }

      if (response.ok && response.stale) {
        apiGet(`/api/series?adult=${adultFlag}`, {
          cacheMs: 30000,
          bust: true,
          dedupeMs: 0,
        }).then((freshResponse) => {
          if (!isCurrentRequest()) {
            return;
          }
          applyResponse(freshResponse);
        });
      }
    });
  }, [forceDisableAdultMode, hasInitialCatalog, isAdultMode]);

  const creators = useMemo(() => buildCreatorDirectory(catalog), [catalog]);
  const genreOptions = useMemo(() => buildGenreOptions(creators), [creators]);
  const filteredCreators = useMemo(() => {
    const normalizedQuery = String(query || "").trim().toLowerCase();

    return creators.filter((creator) => {
      const matchesCredit =
        creditFilter === "all" ||
        (creditFilter === "studio" ? creator?.creditType === "studio" : creator?.creditType !== "studio");
      const matchesGenre =
        activeGenre === "All" ||
        (Array.isArray(creator?.topGenres) ? creator.topGenres : []).includes(activeGenre);

      if (!matchesCredit || !matchesGenre) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        creator.name,
        creator.spotlightSeries?.title,
        ...(Array.isArray(creator?.topGenres) ? creator.topGenres : []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [activeGenre, creators, creditFilter, query]);
  const spotlightCreators = useMemo(() => filteredCreators.slice(0, 3), [filteredCreators]);
  const featuredStudios = useMemo(
    () => creators.filter((creator) => creator?.creditType === "studio").slice(0, 3),
    [creators],
  );
  const featuredVoices = useMemo(
    () => creators.filter((creator) => creator?.creditType !== "studio" && creator?.titleCount > 1).slice(0, 3),
    [creators],
  );
  const stats = useMemo(() => getCreatorDirectoryStats(creators), [creators]);
  const creatorFallbackCards = useMemo(
    () => [
      {
        eyebrow: "Find a creator",
        title: "Search by creator, studio, or genre.",
        description:
          "Start from search when you already know a creator name, a studio, or just the lane of story you want.",
        label: "Search series",
        href: "/search",
      },
      {
        eyebrow: "Start here",
        title: "Creator spotlight",
        description:
          "Top Series is still the easiest first stop when creator pages are sparse. Open a strong title first, then follow the creator trail as more credits appear.",
        label: "Browse Top Series",
        href: "/rankings?type=popular&window=week",
      },
      {
        eyebrow: "Full list",
        title: "Browse every visible creator page.",
        description:
          "This directory fills in automatically as more titles expose clean writer, artist, and studio credits.",
        label: "Browse comics",
        href: "/comics",
      },
    ],
    [],
  );

  const heroStats = useMemo(
    () => [
      {
        label: "Creators",
        value: stats.creators.toLocaleString(),
        hint: "Writers, artists, and studios with a visible page right now.",
      },
      {
        label: "Studios",
        value: stats.studios.toLocaleString(),
        hint: "Multi-title teams and studio credits with a visible page.",
      },
      {
        label: "Series",
        value: stats.titles.toLocaleString(),
        hint: "Titles already tied back to a creator page.",
      },
      {
        label: "Free starts",
        value: stats.freeStarts.toLocaleString(),
        hint: "Creator-linked titles that still give readers a low-risk first click.",
      },
    ],
    [stats.creators, stats.freeStarts, stats.studios, stats.titles],
  );

  const primaryButtonClass =
    "rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800";
  const secondaryButtonClass =
    "rounded-full border border-black/8 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-black/12 hover:bg-[#f8f9fc]";
  const filterButtonClass = (isActive) =>
    `rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors ${
      isActive
        ? "border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.08)] text-[var(--gush-accent,#2f6bff)]"
        : "border-black/8 bg-white text-slate-600 hover:border-black/12 hover:bg-[#f8f9fc] hover:text-slate-900"
    }`;

  const openCreator = (creator, entryPoint = "CREATORS_HUB_GRID") => {
    if (!creator?.path) {
      return;
    }

    trackEvent("creator_directory_click", {
      entryPoint,
      creatorName: creator.name,
      creatorSlug: creator.slug,
      sourceSeriesId: creator.spotlightSeries?.id || undefined,
    });

    router.push(
      buildPathWithAttribution(creator.path, {
        entryPoint,
        campaignId: creator.slug,
        sourcePath: "/creators",
        sourceSeriesId: creator.spotlightSeries?.id || undefined,
        returnTo: creator.path,
      }),
    );
  };

  const openSeriesFromCreator = (series, creator, entryPoint = "CREATORS_HUB_TITLE") => {
    if (!series?.id) {
      return;
    }

    const targetPath = `/series/${series.id}`;
    trackEvent("creator_directory_series_click", {
      entryPoint,
      creatorName: creator?.name,
      creatorSlug: creator?.slug,
      seriesId: series.id,
      seriesTitle: series.title,
    });

    router.push(
      buildPathWithAttribution(targetPath, {
        entryPoint,
        campaignId: creator?.slug || "creators_hub",
        sourcePath: "/creators",
        sourceSeriesId: series.id,
        returnTo: targetPath,
      }),
    );
  };

  const creatorEntryTitles = useMemo(
    () =>
      spotlightCreators
        .map((creator) => {
          const series = getCreatorLeadSeries(creator);
          if (!series?.id) {
            return null;
          }

          return {
            creator,
            series,
            freeStarts: Number(series?.freeEpisodeCount || 0),
          };
        })
        .filter(Boolean),
    [spotlightCreators],
  );

  if (loading) {
    return <CreatorDirectorySkeleton />;
  }

  if (error) {
    return (
      <main className="relative min-h-screen bg-[#f4f6fb] text-slate-900">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.1),transparent_24%),linear-gradient(180deg,#eef2f9_0%,#f4f6fb_72%)]" />
        <SiteHeader variant="light" />
        <div className="relative mx-auto max-w-[960px] px-4 py-12 sm:px-6">
          <SurfacePanel appearance="light" tone="danger" accent="rose">
            <EmptyState
              appearance="light"
              icon="alert"
              eyebrow="Load issue"
              title="Creators are unavailable right now."
              description="The page did not load cleanly. Try again, or jump back into search while this recovers."
              action={{
                label: "Try again",
                onClick: () => window.location.reload(),
              }}
            />
          </SurfacePanel>
        </div>
      </main>
    );
  }

  if (!creators.length) {
    return (
      <main className="relative min-h-screen bg-[#f4f6fb] text-slate-900">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.1),transparent_24%),linear-gradient(180deg,#eef2f9_0%,#f4f6fb_72%)]" />
        <SiteHeader variant="light" />
        <div className="relative mx-auto max-w-[1280px] space-y-6 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
          <EditorialHero
            appearance="light"
            accent="blue"
            eyebrow="Creators"
            title="Find the creators worth following."
            description="Move from one favorite title to the writer, artist, or studio behind it, then keep browsing from the same creative voice."
            secondary="Creator pages are still expanding. Until every credit is public, search by creator, studio, or genre and use Top Series as the cleaner fallback."
            stats={heroStats}
            actions={
              <>
                <button
                  type="button"
                  onClick={() => router.push("/search")}
                  className={primaryButtonClass}
                >
                  Search series
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/rankings?type=popular&window=week")}
                  className={secondaryButtonClass}
                >
                  Browse Top Series
                </button>
              </>
            }
          />

          {commerceNotice ? (
            <CommerceSuccessBanner
              notice={commerceNotice}
              onDismiss={() => setCommerceNotice(null)}
            />
          ) : null}

          <section className="grid gap-4 xl:grid-cols-[1.06fr_0.94fr]">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              {creatorFallbackCards.slice(0, 2).map((card) => (
                <SurfacePanel key={card.title} appearance="light" accent="blue" className="space-y-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                      {card.eyebrow}
                    </p>
                    <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                      {card.title}
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{card.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push(card.href)}
                    className={secondaryButtonClass}
                  >
                    {card.label}
                  </button>
                </SurfacePanel>
              ))}
            </div>

            <SurfacePanel appearance="light" accent="blue" className="space-y-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Directory view
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  {creatorFallbackCards[2].title}
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {creatorFallbackCards[2].description}
                </p>
              </div>

              <div className="grid gap-3">
                {[
                  "Search still works better than guessing when you know the creator name already.",
                  "Top Series is the faster detour when you want a title worth opening before the creator directory fills in.",
                  "Comics and novels stay the best browse routes until more creator credits are public.",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-[22px] border border-black/6 bg-[#f8f9fc] px-4 py-4 text-sm leading-6 text-slate-600"
                  >
                    {item}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => router.push(creatorFallbackCards[2].href)}
                  className={primaryButtonClass}
                >
                  {creatorFallbackCards[2].label}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/novels")}
                  className={secondaryButtonClass}
                >
                  Browse novels
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/rankings")}
                  className={secondaryButtonClass}
                >
                  Open Top Series
                </button>
              </div>
            </SurfacePanel>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-[#f4f6fb] text-slate-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.1),transparent_24%),linear-gradient(180deg,#eef2f9_0%,#f4f6fb_72%)]" />
      <SiteHeader variant="light" />

      <div className="relative mx-auto max-w-[1280px] space-y-6 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <EditorialHero
          appearance="light"
          accent="blue"
          eyebrow="Creators"
          title="Find the creators worth following."
          description="Jump from one favorite series to the writer, artist, or studio behind it, then keep reading from the same voice."
          secondary="Creator pages are live in beta. Use them when credits are visible, then fall back to Search or Top Series when a shelf is still filling in."
          stats={heroStats}
          actions={
            <>
              <button
                type="button"
                onClick={() => router.push("/rankings?type=popular&window=week")}
                className={primaryButtonClass}
              >
                Browse Top Series
              </button>
              <button
                type="button"
                onClick={() => router.push("/search")}
                className={secondaryButtonClass}
              >
                Search all series
              </button>
            </>
          }
        />

        {commerceNotice ? (
          <CommerceSuccessBanner
            notice={commerceNotice}
            onDismiss={() => setCommerceNotice(null)}
          />
        ) : null}

        <section className="grid gap-4 xl:grid-cols-[1.04fr_0.96fr]">
          <SurfacePanel appearance="light" accent="blue" className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Creator pages beta
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Not every title exposes clean credits yet.
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                When a creator or studio page exists, it is the fastest way to branch into related work. When the credit is still missing, Search and Top Series should keep you moving instead of dead-ending.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                "Use creator pages when you want the clearest follow-up after one strong title.",
                "Use Search if you already know the creator name, studio, genre, or lead series.",
                "Use Top Series when a creator shelf is still thin and you want the safer first click.",
                "Use Comics or Novels when you want the wider catalog before narrowing to one voice.",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[22px] border border-black/6 bg-[#f8f9fc] px-4 py-4 text-sm leading-6 text-slate-600"
                >
                  {item}
                </div>
              ))}
            </div>
          </SurfacePanel>

          <SurfacePanel appearance="light" accent="blue" className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Featured shelves
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  Open a strong creator shelf first.
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                {featuredStudios.length > 0 ? `${featuredStudios.length} studios surfaced` : "More studios appear as credits get cleaner"}
              </p>
            </div>

            <div className="space-y-3">
              {(featuredStudios.length > 0 ? featuredStudios : featuredVoices).map((creator) => (
                <button
                  key={`featured-${creator.slug}`}
                  type="button"
                  onClick={() => openCreator(creator, "CREATORS_HUB_FEATURED")}
                  className="w-full rounded-[24px] border border-black/6 bg-white/90 px-4 py-4 text-left shadow-[0_12px_28px_rgba(15,23,42,0.04)] transition hover:border-black/12 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                        {formatCreditTypeLabel(creator.creditType)}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-slate-950">{creator.name}</h3>
                    </div>
                    <span className="rounded-full border border-black/8 bg-[#f8f9fc] px-3 py-1 text-xs text-slate-600">
                      {creator.titleCount} titles
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {summarizeLeadCopy(
                      creator.leadSummary,
                      creator.spotlightSeries?.title
                        ? `Start with ${creator.spotlightSeries.title}, then fan out through the rest of this shelf.`
                        : "Open the creator page to see every visible title in one place.",
                    )}
                  </p>
                  {getCreatorTopTitles(creator, 2).length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {getCreatorTopTitles(creator, 2).map((title) => (
                        <span
                          key={`${creator.slug}-featured-title-${title}`}
                          className="rounded-full border border-black/8 bg-[#f8f9fc] px-3 py-1 text-xs text-slate-600"
                        >
                          {title}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                    {creator.freeStartCount > 0 ? <span>{creator.freeStartCount} start free</span> : null}
                    <span>{creator.ongoingCount} active</span>
                    <span>{formatDateLabel(creator.latestUpdatedAt)}</span>
                  </div>
                </button>
              ))}
            </div>
          </SurfacePanel>
        </section>

        {creatorEntryTitles.length > 0 ? (
          <SurfacePanel appearance="light" accent="blue" className="space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Start from a title
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  Open one strong title, then branch into the creator shelf.
                </h2>
              </div>
              <p className="text-sm text-slate-500">
                Useful when you want a faster first click than browsing the full directory.
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              {creatorEntryTitles.map(({ creator, series, freeStarts }) => (
                <div
                  key={`${creator.slug}-${series.id}`}
                  className="rounded-[28px] border border-black/6 bg-white p-4 shadow-[0_18px_42px_rgba(15,23,42,0.06)]"
                >
                  <Cover
                    tone={series?.coverTone}
                    coverUrl={series?.coverUrl}
                    className="h-56 rounded-[22px]"
                  />
                  <div className="mt-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                          {formatCreditTypeLabel(creator.creditType)}
                        </p>
                        <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                          {series.title}
                        </h3>
                      </div>
                      <span className="rounded-full border border-black/8 bg-[#f8f9fc] px-3 py-1 text-xs text-slate-600">
                        {creator.name}
                      </span>
                    </div>

                    <p className="text-sm leading-6 text-slate-600">
                      {summarizeLeadCopy(
                        series?.description,
                        `Start with ${series.title}, then open ${creator.name}'s full shelf if the voice lands.`,
                      )}
                    </p>

                    <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                      {freeStarts > 0 ? (
                        <span className="rounded-full border border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.08)] px-3 py-1 text-[var(--gush-accent,#2f6bff)]">
                          {freeStarts} free start{freeStarts === 1 ? "" : "s"}
                        </span>
                      ) : null}
                      <span className="rounded-full border border-black/8 bg-[#f8f9fc] px-3 py-1">
                        {series?.type || "Series"}
                      </span>
                      <span className="rounded-full border border-black/8 bg-[#f8f9fc] px-3 py-1">
                        {series?.status || "Ongoing"}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => openSeriesFromCreator(series, creator, "CREATORS_HUB_ENTRY_TITLE")}
                        className={primaryButtonClass}
                      >
                        Open title
                      </button>
                      <button
                        type="button"
                        onClick={() => openCreator(creator, "CREATORS_HUB_ENTRY_SHELF")}
                        className={secondaryButtonClass}
                      >
                        Open creator
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SurfacePanel>
        ) : null}

        <SurfacePanel appearance="light" accent="blue" className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Find a creator
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  Search by creator, studio, or genre.
                </h2>
              </div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-slate-500">
                {filteredCreators.length.toLocaleString()} creator page{filteredCreators.length === 1 ? "" : "s"} shown
              </p>
              {query || activeGenre !== "All" || creditFilter !== "all" ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setActiveGenre("All");
                    setCreditFilter("all");
                  }}
                  className={secondaryButtonClass}
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search creators or studios"
              className="rounded-[20px] border border-black/8 bg-white px-4 py-3 text-sm text-slate-900 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none transition-colors placeholder:text-slate-400 focus:border-[rgba(47,107,255,0.18)] focus:ring-4 focus:ring-[rgba(47,107,255,0.08)]"
            />

            <div className="flex flex-wrap gap-2.5">
              {[
                { id: "all", label: "All credits" },
                { id: "creator", label: "Creators" },
                { id: "studio", label: "Studios" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCreditFilter(item.id)}
                  className={filterButtonClass(creditFilter === item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2.5">
              {["All", ...genreOptions].map((genre) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => setActiveGenre(genre)}
                  className={filterButtonClass(activeGenre === genre)}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>
        </SurfacePanel>

        {spotlightCreators.length > 0 ? (
          <SurfacePanel appearance="light" accent="blue" className="space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Start here
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  A few creator pages worth opening first.
                </h2>
              </div>
              <p className="text-sm text-slate-500">
                Picked from the strongest visible creator shelves.
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              {spotlightCreators.map((creator) => {
                const creatorGenres = Array.isArray(creator?.topGenres) ? creator.topGenres : [];
                const creatorTopTitles = getCreatorTopTitles(creator, 3);

                return (
                  <button
                    key={creator.slug}
                    type="button"
                    onClick={() => openCreator(creator, "CREATORS_HUB_SPOTLIGHT")}
                    className="group rounded-[30px] border border-black/6 bg-white p-4 text-left shadow-[0_18px_42px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-black/10 hover:shadow-[0_22px_48px_rgba(15,23,42,0.08)]"
                  >
                    <Cover
                      tone={creator.spotlightSeries?.coverTone}
                      coverUrl={creator.spotlightSeries?.coverUrl}
                      className="h-56 rounded-[22px]"
                    />
                    <div className="mt-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                            {formatCreditTypeLabel(creator.creditType)} spotlight
                          </p>
                          <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                            {creator.name}
                          </h3>
                        </div>
                        <span className="rounded-full border border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.08)] px-3 py-1 text-xs font-semibold text-[var(--gush-accent,#2f6bff)]">
                          {creator.titleCount} title{creator.titleCount === 1 ? "" : "s"}
                        </span>
                      </div>

                      <p className="text-sm leading-6 text-slate-600">
                        {summarizeLeadCopy(
                          creator.leadSummary,
                          creator.spotlightSeries?.title
                            ? `Start with ${creator.spotlightSeries.title}, then keep moving through the rest of this shelf.`
                            : "Open this page to see every visible series from this creator or studio in one place.",
                        )}
                      </p>

                      {creatorGenres.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {creatorGenres.map((genre) => (
                            <span
                              key={`${creator.slug}-${genre}`}
                              className="rounded-full border border-black/8 bg-[#f8f9fc] px-3 py-1 text-xs text-slate-600"
                            >
                              {genre}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {creatorTopTitles.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {creatorTopTitles.map((title) => (
                            <span
                              key={`${creator.slug}-spotlight-title-${title}`}
                              className="rounded-full border border-black/8 bg-white px-3 py-1 text-xs text-slate-600"
                            >
                              {title}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                        {creator.freeStartCount > 0 ? <span>{creator.freeStartCount} start free</span> : null}
                        <span>{creator.ongoingCount} active</span>
                        <span>{creator.completedCount} completed</span>
                        <span>{formatDateLabel(creator.latestUpdatedAt)}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </SurfacePanel>
        ) : null}

        {filteredCreators.length === 0 ? (
          <SurfacePanel appearance="light" accent="blue">
            <EmptyState
              appearance="light"
              icon="search"
              eyebrow="No matches"
              title="Nothing matches this filter yet."
              description="Try a broader search or remove the active genre to bring the full creator list back."
              action={{
                label: "Show all creators",
                onClick: () => {
                  setQuery("");
                  setActiveGenre("All");
                  setCreditFilter("all");
                },
              }}
            />
          </SurfacePanel>
        ) : (
          <SurfacePanel appearance="light" accent="blue" className="space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Full list
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  Browse every visible creator page.
                </h2>
              </div>
              <p className="text-sm text-slate-500">
                {[
                  creditFilter === "studio" ? "Studios only" : creditFilter === "creator" ? "Creators only" : "All credits",
                  activeGenre === "All" ? "All genres" : activeGenre,
                ].join(" | ")}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredCreators.map((creator) => {
                const creatorGenres = Array.isArray(creator?.topGenres) ? creator.topGenres : [];
                const creatorTopTitles = getCreatorTopTitles(creator, 3);

                return (
                  <button
                    key={creator.slug}
                    type="button"
                    onClick={() => openCreator(creator)}
                    className="group rounded-[28px] border border-black/6 bg-white p-4 text-left shadow-[0_18px_42px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-black/10 hover:shadow-[0_22px_48px_rgba(15,23,42,0.08)]"
                  >
                    <div className="grid gap-4 sm:grid-cols-[132px_minmax(0,1fr)]">
                      <Cover
                        tone={creator.spotlightSeries?.coverTone}
                        coverUrl={creator.spotlightSeries?.coverUrl}
                        className="h-44 rounded-[20px]"
                      />
                      <div className="min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                              {formatCreditTypeLabel(creator.creditType)}
                            </p>
                            <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                              {creator.name}
                            </h3>
                          </div>
                          <span className="rounded-full border border-black/8 bg-[#f8f9fc] px-2.5 py-1 text-xs text-slate-600">
                            {creator.titleCount} titles
                          </span>
                        </div>

                        <p className="mt-3 text-sm leading-6 text-slate-600">
                          {summarizeLeadCopy(
                            creator.leadSummary,
                            creator.spotlightSeries?.title
                              ? `Best entry: ${creator.spotlightSeries.title}.`
                              : "Open the page to see every visible series from this creator or studio.",
                          )}
                        </p>

                        {creatorGenres.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {creatorGenres.map((genre) => (
                              <span
                                key={`${creator.slug}-grid-${genre}`}
                                className="rounded-full border border-black/8 bg-[#f8f9fc] px-2.5 py-1 text-xs text-slate-600"
                              >
                                {genre}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        {creatorTopTitles.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {creatorTopTitles.map((title) => (
                              <span
                                key={`${creator.slug}-grid-title-${title}`}
                                className="rounded-full border border-black/8 bg-white px-2.5 py-1 text-xs text-slate-600"
                              >
                                {title}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
                          {creator.freeStartCount > 0 ? <span>{creator.freeStartCount} start free</span> : null}
                          <span>{creator.ongoingCount} active</span>
                          <span>{creator.completedCount} completed</span>
                          <span>{formatDateLabel(creator.latestUpdatedAt)}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </SurfacePanel>
        )}
      </div>
    </main>
  );
}
