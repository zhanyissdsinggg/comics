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
        hint: "Writers, artists, and studios with a visible page right now.",
      },
      {
        label: "Series",
        value: stats.titles.toLocaleString(),
        hint: "Titles already tied back to a creator page.",
      },
      {
        label: "Readers",
        value: formatCompactCount(stats.readerProof),
        hint: "Visible audience activity across those creator shelves.",
      },
      {
        label: "Catalog",
        value: isAdultMode ? "18+" : "Standard",
        hint: isAdultMode ? "18+ titles can appear here." : "18+ titles stay hidden here.",
      },
    ],
    [isAdultMode, stats.creators, stats.readerProof, stats.titles],
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
            title="No creator pages are showing yet."
            description="As more titles get clean writer, artist, and studio credits, they will land here automatically."
            secondary="Until then, head back to search or the weekly chart to keep browsing."
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
                  Browse weekly hits
                </button>
              </>
            }
          />
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
          secondary="Search by name or genre, open a creator page, and let the catalog feel smaller in the right way."
          stats={heroStats}
          actions={
            <>
              <button
                type="button"
                onClick={() => router.push("/rankings?type=popular&window=week")}
                className={primaryButtonClass}
              >
                Browse weekly hits
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
                {filteredCreators.length.toLocaleString()} creator{filteredCreators.length === 1 ? "" : "s"} shown
              </p>
              {query || activeGenre !== "All" ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setActiveGenre("All");
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
                            Creator spotlight
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
                        {creator.spotlightSeries?.title
                          ? `Start with ${creator.spotlightSeries.title}, then keep moving through the rest of this shelf.`
                          : "Open this page to see every visible series from this creator or studio in one place."}
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

                      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                        <span>{formatCompactCount(creator.readerProof)} readers</span>
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
                {activeGenre === "All" ? "All genres" : activeGenre}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredCreators.map((creator) => {
                const creatorGenres = Array.isArray(creator?.topGenres) ? creator.topGenres : [];

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
                              Creator
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
                          {creator.spotlightSeries?.title
                            ? `Best entry: ${creator.spotlightSeries.title}.`
                            : "Open the page to see every visible series from this creator or studio."}
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

                        <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
                          <span>{formatCompactCount(creator.readerProof)} readers</span>
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
