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

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCompactCount(value) {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(Math.max(0, toNumber(value)));
}

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

function CreatorDirectorySkeleton() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <SiteHeader />
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <SurfacePanel className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-3">
              <div className="h-4 w-28 animate-pulse rounded-full bg-white/10" />
              <div className="h-14 w-full max-w-3xl animate-pulse rounded-[24px] bg-white/10" />
              <div className="h-20 w-full max-w-2xl animate-pulse rounded-[24px] bg-white/10" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`creators-hero-skeleton-${index}`}
                  className="h-28 animate-pulse rounded-[24px] border border-white/10 bg-black/20"
                />
              ))}
            </div>
          </div>
        </SurfacePanel>

        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`creators-card-skeleton-${index}`}
              className="h-[340px] animate-pulse rounded-[28px] border border-white/10 bg-black/20"
            />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <SkeletonCard key={`creator-grid-skeleton-${index}`} />
          ))}
        </div>
      </div>
    </main>
  );
}

export default function CreatorsHubPage() {
  const router = useRouter();
  const { isAdultMode, forceDisableAdultMode } = useAdultGateStore();
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [activeGenre, setActiveGenre] = useState("All");
  const [commerceNotice, setCommerceNotice] = useState(null);
  const requestRef = useRef(0);

  useEffect(() => {
    setCommerceNotice(getCommerceSuccessPresentation(consumeCommerceSuccessForPath("/creators")));
  }, []);

  useEffect(() => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    const adultFlag = isAdultMode ? "1" : "0";
    setLoading(true);
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
          setCatalog([]);
          setError(response.error || "Unable to load creators.");
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
  }, [forceDisableAdultMode, isAdultMode]);

  const creators = useMemo(() => buildCreatorDirectory(catalog), [catalog]);
  const genreOptions = useMemo(() => buildGenreOptions(creators), [creators]);
  const filteredCreators = useMemo(() => {
    const normalizedQuery = String(query || "").trim().toLowerCase();

    return creators.filter((creator) => {
      const matchesGenre =
        activeGenre === "All" ||
        (Array.isArray(creator?.topGenres) ? creator.topGenres : []).includes(activeGenre);

      if (!matchesGenre) {
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
  }, [activeGenre, creators, query]);
  const spotlightCreators = useMemo(() => filteredCreators.slice(0, 3), [filteredCreators]);
  const stats = useMemo(() => getCreatorDirectoryStats(creators), [creators]);

  const heroStats = useMemo(
    () => [
      {
        label: "Creators",
        value: stats.creators.toLocaleString(),
        hint: "Writers, artists, and studio identities visible in the current catalog mode.",
      },
      {
        label: "Titles",
        value: stats.titles.toLocaleString(),
        hint: "Published titles currently mapped back into creator discovery.",
      },
      {
        label: "Reader signals",
        value: formatCompactCount(stats.readerProof),
        hint: "Combined reader activity across creator pages.",
      },
      {
        label: "Mode",
        value: isAdultMode ? "18+" : "Standard",
        hint: isAdultMode ? "18+ creator pages can appear here." : "18+ creator pages stay hidden.",
      },
    ],
    [isAdultMode, stats.creators, stats.readerProof, stats.titles],
  );

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

  if (loading) {
    return <CreatorDirectorySkeleton />;
  }

  if (error) {
    return (
      <main className="min-h-screen bg-neutral-950 text-neutral-100">
        <SiteHeader />
        <div className="mx-auto max-w-[960px] px-4 py-12 sm:px-6">
          <SurfacePanel>
            <EmptyState
              icon="alert"
              title="Creator directory unavailable"
              description="We could not load the creator directory right now. Retry or go back to search."
              action={{
                label: "Retry",
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
      <main className="min-h-screen bg-neutral-950 text-neutral-100">
        <SiteHeader />
        <div className="mx-auto max-w-[1280px] space-y-6 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
          <EditorialHero
            eyebrow="Creator directory"
            title="No creator pages are visible in this catalog mode yet."
            description="Once published titles expose stable creator or studio names, they will appear here automatically."
            secondary="Go back to search, charts, or home so browsing never stalls."
            stats={heroStats}
            actions={
              <>
                <button
                  type="button"
                  onClick={() => router.push("/search")}
                  className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200"
                >
                  Open search
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/rankings?type=popular&window=week")}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
                >
                  See weekly chart
                </button>
              </>
            }
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <SiteHeader />

      <div className="mx-auto max-w-[1280px] space-y-6 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        {commerceNotice ? (
          <CommerceSuccessBanner
            notice={commerceNotice}
            onDismiss={() => setCommerceNotice(null)}
          />
        ) : null}

        <EditorialHero
          eyebrow="Creator directory"
          title="Meet the creators behind your next read."
          description="Jump from a hit series to the writer, artist, or studio behind it, then browse everything else they have published."
          secondary="Use this directory to compare creators, spot multi-title studios, and find more from the same team."
          stats={heroStats}
          actions={
            <>
              <button
                type="button"
                onClick={() => router.push("/rankings?type=popular&window=week")}
                className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200"
              >
                See weekly chart
              </button>
              <button
                type="button"
                onClick={() => router.push("/search")}
                className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
              >
                Search all series
              </button>
            </>
          }
        />

        <SurfacePanel className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                Filter the directory
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Search creators without losing the full directory.
              </h2>
            </div>
            <p className="text-sm text-neutral-400">
              {filteredCreators.length.toLocaleString()} creator{filteredCreators.length === 1 ? "" : "s"} visible
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search creators, studios, or leading genres"
              className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-neutral-100 outline-none transition-colors placeholder:text-neutral-500 focus:border-emerald-400/40"
            />

            <div className="flex flex-wrap gap-2.5">
              {["All", ...genreOptions].map((genre) => {
                const isActive = activeGenre === genre;
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => setActiveGenre(genre)}
                    className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                      isActive
                        ? "border-white bg-white text-neutral-950"
                        : "border-white/10 bg-white/[0.04] text-neutral-300 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                    }`}
                  >
                    {genre}
                  </button>
                );
              })}
            </div>
          </div>
        </SurfacePanel>

        {spotlightCreators.length > 0 ? (
          <SurfacePanel className="space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                  Creator spotlight
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  Start with the strongest creator pages.
                </h2>
              </div>
              <p className="text-sm text-neutral-400">
                Sorted by title count, reader activity, and recent updates.
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              {spotlightCreators.map((creator) => (
                <button
                  key={creator.slug}
                  type="button"
                  onClick={() => openCreator(creator, "CREATORS_HUB_SPOTLIGHT")}
                  className="rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4 text-left shadow-[0_24px_80px_rgba(0,0,0,0.18)] transition hover:border-white/20 hover:bg-white/[0.05]"
                >
                  <Cover
                    tone={creator.spotlightSeries?.coverTone}
                    coverUrl={creator.spotlightSeries?.coverUrl}
                    className="h-56 rounded-[22px]"
                  />
                  <div className="mt-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-500">
                          Creator page
                        </p>
                        <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
                          {creator.name}
                        </h3>
                      </div>
                      <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                        {creator.titleCount} title{creator.titleCount === 1 ? "" : "s"}
                      </span>
                    </div>
                    <p className="text-sm leading-6 text-neutral-400">
                      {creator.spotlightSeries?.title
                        ? `${creator.spotlightSeries.title} is a good place to start with this creator.`
                        : "Open this page to compare the strongest published titles from this creator or studio."}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {creator.topGenres.map((genre) => (
                        <span
                          key={`${creator.slug}-${genre}`}
                          className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-neutral-300"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-[20px] border border-white/10 bg-black/20 px-3 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                          Reader signals
                        </p>
                        <p className="mt-2 text-lg font-semibold text-white">{formatCompactCount(creator.readerProof)}</p>
                      </div>
                      <div className="rounded-[20px] border border-white/10 bg-black/20 px-3 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                          Completed
                        </p>
                        <p className="mt-2 text-lg font-semibold text-white">{creator.completedCount}</p>
                      </div>
                      <div className="rounded-[20px] border border-white/10 bg-black/20 px-3 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                          Updated
                        </p>
                        <p className="mt-2 text-lg font-semibold text-white">{formatDateLabel(creator.latestUpdatedAt)}</p>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </SurfacePanel>
        ) : null}

        {filteredCreators.length === 0 ? (
          <SurfacePanel>
            <EmptyState
              icon="search"
              title="No creators match the current filter"
              description="Try a broader keyword or clear the active genre chip to reopen the full creator directory."
              action={{
                label: "Show all creators",
                onClick: () => {
                  setQuery("");
                  setActiveGenre("All");
                },
              }}
            />
          </SurfacePanel>
        ) : (
          <SurfacePanel className="space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                  Full directory
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  Compare creators before you pick the next title.
                </h2>
              </div>
              <p className="text-sm text-neutral-400">
                Filtered by {activeGenre === "All" ? "all genres" : activeGenre}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredCreators.map((creator) => (
                <button
                  key={creator.slug}
                  type="button"
                  onClick={() => openCreator(creator)}
                  className="rounded-[26px] border border-white/10 bg-black/10 p-4 text-left transition hover:border-white/20 hover:bg-white/[0.05]"
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
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                            Creator
                          </p>
                          <h3 className="mt-2 text-xl font-semibold tracking-tight text-white">
                            {creator.name}
                          </h3>
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-neutral-300">
                          {creator.titleCount} titles
                        </span>
                      </div>

                      <p className="mt-3 text-sm leading-6 text-neutral-400">
                        {creator.spotlightSeries?.title
                          ? `${creator.spotlightSeries.title} is the current lead title on this creator page.`
                          : "Open the page to compare related titles from this creator or studio."}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {creator.topGenres.map((genre) => (
                          <span
                            key={`${creator.slug}-grid-${genre}`}
                            className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-neutral-300"
                          >
                            {genre}
                          </span>
                        ))}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3 text-xs text-neutral-400">
                        <span>{formatCompactCount(creator.readerProof)} reader signals</span>
                        <span>{creator.completedCount} completed</span>
                        <span>{formatDateLabel(creator.latestUpdatedAt)}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </SurfacePanel>
        )}
      </div>
    </main>
  );
}
