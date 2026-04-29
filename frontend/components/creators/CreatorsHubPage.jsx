"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SurfacePanel from "../common/SurfacePanel";
import EmptyState from "../common/EmptyState";
import Cover from "../common/Cover";
import { apiGet } from "../../lib/apiClient";
import { buildCreatorDirectory } from "../../lib/creatorDirectory";
import { filterBlockedPublicSeries } from "../../lib/publicCatalogVisibility";
import { useAdultGateStore } from "../../store/useAdultGateStore";

function formatCreditTypeLabel(creditType) {
  if (creditType === "studio") {
    return "Studio";
  }

  if (creditType === "team") {
    return "Team";
  }

  return "Creator";
}

function formatDateLabel(value) {
  if (!value) {
    return "";
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}

function buildGenreOptions(creators) {
  const counts = new Map();

  (Array.isArray(creators) ? creators : []).forEach((creator) => {
    (Array.isArray(creator?.topGenres) ? creator.topGenres : []).forEach(
      (genre) => {
        const key = String(genre || "").trim();
        if (!key) {
          return;
        }

        counts.set(key, (counts.get(key) || 0) + 1);
      },
    );
  });

  return [...counts.entries()]
    .sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
    )
    .map(([genre]) => genre)
    .slice(0, 8);
}

function normalizeCreatorRole(creator) {
  const value = String(creator?.creditType || "")
    .trim()
    .toLowerCase();

  if (value === "studio" || value === "team" || value === "creator") {
    return value;
  }

  const fallbackName = String(creator?.name || "")
    .trim()
    .toLowerCase();
  if (fallbackName.includes("studio")) {
    return "studio";
  }
  if (fallbackName.includes("team")) {
    return "team";
  }

  return "creator";
}

function formatTitleCountLabel(count) {
  const total = Math.max(0, Number(count || 0));
  return `${total} title${total === 1 ? "" : "s"}`;
}

function buildCreatorSearchText(creator) {
  return [
    creator?.name,
    creator?.spotlightSeries?.title,
    ...(Array.isArray(creator?.topGenres) ? creator.topGenres : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getLatestUpdatedTitle(creator) {
  const items = Array.isArray(creator?.series) ? creator.series : [];
  if (items.length === 0) {
    return "";
  }

  const latest = [...items].sort(
    (left, right) =>
      Date.parse(right?.updatedAt || 0) - Date.parse(left?.updatedAt || 0),
  )[0];

  return latest?.title || creator?.spotlightSeries?.title || "";
}

function getLatestUpdatedSeries(creator) {
  const items = Array.isArray(creator?.series) ? creator.series : [];
  if (items.length === 0) {
    return creator?.spotlightSeries || null;
  }

  return (
    [...items].sort(
      (left, right) =>
        Date.parse(right?.updatedAt || 0) - Date.parse(left?.updatedAt || 0),
    )[0] || creator?.spotlightSeries || null
  );
}

function CreatorCard({ creator }) {
  const role = normalizeCreatorRole(creator);
  const latestSeries = getLatestUpdatedSeries(creator);
  const latestTitle = latestSeries?.title || getLatestUpdatedTitle(creator);
  const topGenres = Array.isArray(creator?.topGenres)
    ? creator.topGenres.slice(0, 3)
    : [];
  const updatedLabel = formatDateLabel(creator?.latestUpdatedAt);

  return (
    <Link
      href={creator.path || "/creators"}
      className="group block rounded-[28px] border-2 border-white/15 bg-black p-4 text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 hover:translate-x-0.5 hover:translate-y-0.5 hover:border-white/25"
      aria-label={`View ${creator.name}`}
    >
      <div className="grid gap-4 sm:grid-cols-[120px_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-[22px] border-2 border-white/15 bg-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <Cover
            tone={latestSeries?.coverTone}
            coverUrl={latestSeries?.coverUrl}
            label={latestSeries?.title || creator.name}
            eyebrow={creator.name}
            badge=""
            fallbackVariant="minimal-card"
            className="h-40 rounded-[18px]"
          />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/55">
                {formatCreditTypeLabel(role)}
              </p>
              <h2 className="mt-2 line-clamp-2 text-xl font-black uppercase tracking-[0.01em] text-white">
                {creator.name}
              </h2>
            </div>
            <span className="rounded-full border-2 border-black bg-[#FFE500] px-3 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              {formatTitleCountLabel(creator.titleCount)}
            </span>
          </div>

          {topGenres.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {topGenres.map((genre) => (
                <span
                  key={`${creator.slug}-${genre}`}
                  className="rounded-full border-2 border-white/15 bg-[#111111] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/75"
                >
                  {genre}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-4 space-y-2 text-sm text-white/72">
            {latestTitle ? (
              <p className="line-clamp-1">
                <span className="font-black uppercase tracking-[0.08em] text-white/48">
                  Latest
                </span>{" "}
                <span className="font-semibold text-white">{latestTitle}</span>
              </p>
            ) : null}
            {updatedLabel ? (
              <p className="line-clamp-1">
                <span className="font-black uppercase tracking-[0.08em] text-white/48">
                  Updated
                </span>{" "}
                <span>{updatedLabel}</span>
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

function CreatorsHubSkeleton() {
  return (
    <main className="min-h-screen overflow-hidden bg-black text-white">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
        <SurfacePanel appearance="dark" accent="cyan" className="space-y-4">
          <div className="h-4 w-24 animate-pulse rounded-full bg-white/20" />
          <div className="h-12 w-full max-w-2xl animate-pulse rounded-[24px] bg-white/20" />
          <div className="h-14 w-full max-w-xl animate-pulse rounded-[24px] bg-[#111111]" />
        </SurfacePanel>

        <SurfacePanel appearance="dark" accent="cyan" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <div className="h-12 animate-pulse rounded-full bg-[#111111]" />
            <div className="flex gap-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`creator-chip-${index}`}
                  className="h-12 w-24 animate-pulse rounded-full bg-[#111111]"
                />
              ))}
            </div>
          </div>
        </SurfacePanel>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`creator-card-${index}`}
              className="h-[260px] animate-pulse rounded-[28px] border-2 border-white/15 bg-[#111111]"
            />
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
  const { isAdultMode, forceDisableAdultMode } = useAdultGateStore();
  const [catalog, setCatalog] = useState(
    Array.isArray(initialCatalog) ? initialCatalog : [],
  );
  const [loading, setLoading] = useState(!hasInitialCatalog);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [activeRole, setActiveRole] = useState("all");
  const [activeGenre, setActiveGenre] = useState("All");
  const requestRef = useRef(0);

  const retryLoad = useCallback(() => {
    requestRef.current += 1;
    setLoading(true);
    setError("");
    const adultFlag = isAdultMode ? "1" : "0";
    const currentRequest = requestRef.current;

    apiGet(`/api/series?adult=${adultFlag}`, { cacheMs: 30000 }).then(
      (response) => {
        if (currentRequest !== requestRef.current) {
          return;
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
          setLoading(false);
          return;
        }

        setCatalog(
          filterBlockedPublicSeries(
            Array.isArray(response.data?.series) ? response.data.series : [],
          ),
        );
        setError("");
        setLoading(false);
      },
    );
  }, [forceDisableAdultMode, isAdultMode]);

  useEffect(() => {
    if (hasInitialCatalog) {
      setLoading(false);
      return;
    }

    retryLoad();
  }, [hasInitialCatalog, retryLoad]);

  const creators = useMemo(
    () => buildCreatorDirectory(filterBlockedPublicSeries(catalog)),
    [catalog],
  );
  const genreOptions = useMemo(() => buildGenreOptions(creators), [creators]);
  const featuredCreators = useMemo(() => creators.slice(0, 3), [creators]);
  const filteredCreators = useMemo(() => {
    const normalizedQuery = String(query || "").trim().toLowerCase();

    return creators.filter((creator) => {
      const role = normalizeCreatorRole(creator);
      const matchesRole =
        activeRole === "all" ||
        (activeRole === "collective"
          ? role === "studio" || role === "team"
          : role === "creator");
      const matchesGenre =
        activeGenre === "All" ||
        (Array.isArray(creator?.topGenres) ? creator.topGenres : []).includes(
          activeGenre,
        );
      const matchesQuery =
        !normalizedQuery ||
        buildCreatorSearchText(creator).includes(normalizedQuery);

      return matchesRole && matchesGenre && matchesQuery;
    });
  }, [activeGenre, activeRole, creators, query]);
  const totalTitles = useMemo(
    () =>
      creators.reduce(
        (sum, creator) => sum + Math.max(0, Number(creator?.titleCount || 0)),
        0,
      ),
    [creators],
  );

  const roleFilters = [
    { id: "all", label: "All" },
    { id: "creator", label: "Creators" },
    { id: "collective", label: "Studios + Teams" },
  ];

  const filterButtonClass = (active) =>
    active
      ? "rounded-full border-2 border-black bg-[#FFE500] px-4 py-2 text-sm font-black uppercase tracking-[0.04em] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
      : "rounded-full border-2 border-white/15 bg-black px-4 py-2 text-sm font-black uppercase tracking-[0.04em] text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 hover:translate-x-0.5 hover:translate-y-0.5 hover:border-white/30";

  if (loading) {
    return <CreatorsHubSkeleton />;
  }

  return (
    <main className="min-h-screen overflow-hidden bg-black text-white">

      <div className="mx-auto flex max-w-[1320px] flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
        <SurfacePanel appearance="dark" accent="cyan" className="space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/55">
                Creator Directory
              </p>
              <h1 className="text-[2.35rem] font-black uppercase leading-[0.92] tracking-[-0.05em] text-white sm:text-[3rem]">
                Creators
              </h1>
              <p className="max-w-2xl text-sm font-semibold leading-7 text-white/70 sm:text-base">
                Browse the people, studios, and teams behind the stories on Gush.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border-2 border-white/15 bg-[#111111] px-4 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/45">
                  Profiles
                </p>
                <p className="mt-2 text-2xl font-black uppercase tracking-[-0.04em] text-white">
                  {creators.length}
                </p>
              </div>
              <div className="rounded-[22px] border-2 border-white/15 bg-[#111111] px-4 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/45">
                  Titles
                </p>
                <p className="mt-2 text-2xl font-black uppercase tracking-[-0.04em] text-white">
                  {totalTitles}
                </p>
              </div>
              <div className="rounded-[22px] border-2 border-white/15 bg-[#111111] px-4 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/45">
                  Genres
                </p>
                <p className="mt-2 text-2xl font-black uppercase tracking-[-0.04em] text-white">
                  {genreOptions.length || 0}
                </p>
              </div>
            </div>
          </div>
        </SurfacePanel>

        {featuredCreators.length > 0 ? (
          <SurfacePanel appearance="dark" accent="cyan" className="space-y-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/55">
                  Spotlight
                </p>
                <h2 className="mt-2 text-[2rem] font-black uppercase leading-[0.95] tracking-[-0.05em] text-white">
                  Top Creators
                </h2>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {featuredCreators.map((creator) => (
                <CreatorCard key={`featured-${creator.slug}`} creator={creator} />
              ))}
            </div>
          </SurfacePanel>
        ) : null}

        <SurfacePanel appearance="dark" accent="cyan" className="space-y-4">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
            <label className="block">
              <span className="sr-only">Search creators</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search creators, studios, or genres"
                className="w-full rounded-full border-2 border-white/15 bg-black px-4 py-3 text-sm font-semibold text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none placeholder:text-white/35 focus:border-[#00E5FF]/60 focus:ring-4 focus:ring-[#00E5FF]/12"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              {roleFilters.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveRole(item.id)}
                  className={filterButtonClass(activeRole === item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {genreOptions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveGenre("All")}
                className={filterButtonClass(activeGenre === "All")}
              >
                All
              </button>
              {genreOptions.map((genre) => (
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
          ) : null}
        </SurfacePanel>

        {error ? (
          <SurfacePanel appearance="dark" accent="cyan">
            <EmptyState
              appearance="dark"
              icon="alert"
              eyebrow="Load failed"
              title="Couldn't load creators."
              description=""
              action={{ label: "Retry", onClick: retryLoad }}
            />
          </SurfacePanel>
        ) : null}

        {!error && filteredCreators.length === 0 ? (
          <SurfacePanel appearance="dark" accent="cyan">
            <EmptyState
              appearance="dark"
              icon="search"
              eyebrow="No match"
              title="No creators found."
              description=""
              action={{
                label: "Clear filters",
                onClick: () => {
                  setQuery("");
                  setActiveRole("all");
                  setActiveGenre("All");
                },
              }}
            />
          </SurfacePanel>
        ) : null}

        {!error && filteredCreators.length > 0 ? (
          <SurfacePanel appearance="dark" accent="cyan" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/55">
                  All Profiles
                </p>
                <h2 className="mt-2 text-[2rem] font-black uppercase leading-[0.95] tracking-[-0.05em] text-white">
                  Browse Creators
                </h2>
              </div>
              <p className="text-sm font-bold uppercase tracking-[0.08em] text-white/55">
                {filteredCreators.length} match
                {filteredCreators.length === 1 ? "" : "es"}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredCreators.map((creator) => (
                <CreatorCard key={creator.slug} creator={creator} />
              ))}
            </div>
          </SurfacePanel>
        ) : null}
      </div>
    </main>
  );
}
