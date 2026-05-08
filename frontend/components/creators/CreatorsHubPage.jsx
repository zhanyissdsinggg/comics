"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SurfacePanel from "../common/SurfacePanel";
import EmptyState from "../common/EmptyState";
import Cover from "../common/Cover";
import { apiGet } from "../../lib/apiClient";
import { buildCreatorDirectory } from "../../lib/creatorDirectory";
import { filterBlockedPublicSeries } from "../../lib/publicCatalogVisibility";

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
    (Array.isArray(creator?.genres) ? creator.genres : []).forEach(
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
    .map(([genre]) => genre);
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
    ...(Array.isArray(creator?.genres) ? creator.genres : []),
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

const creatorFilterChipClass =
  "rounded-full border-2 px-4 py-2 text-sm font-black uppercase tracking-[0.04em] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-[transform,border-color,background-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#00E5FF]/20";

function normalizeRoleFilter(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (normalized === "creator") {
    return "creator";
  }
  if (normalized === "studio-team" || normalized === "collective") {
    return "studio-team";
  }
  return "all";
}

function normalizeGenreFilter(value, genres) {
  const normalized = String(value || "")
    .trim()
    .replace(/\s+/g, " ");
  if (!normalized) {
    return "All";
  }

  const match = (Array.isArray(genres) ? genres : []).find(
    (genre) => normalizeGenreValue(genre) === normalizeGenreValue(normalized),
  );

  return match || normalized;
}

function normalizeGenreValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function creatorMatchesGenre(creator, genre) {
  if (!genre || genre === "All") {
    return true;
  }

  const normalizedGenre = normalizeGenreValue(genre);
  return (Array.isArray(creator?.genres) ? creator.genres : []).some(
    (item) => normalizeGenreValue(item) === normalizedGenre,
  );
}

function getCreatorResultsLabel(role, genre) {
  const hasGenre = Boolean(genre && genre !== "All");

  if (hasGenre) {
    if (role === "creator") {
      return `${genre} creators`;
    }

    if (role === "studio-team") {
      return `${genre} studios + teams`;
    }

    return `${genre} profiles`;
  }

  if (role === "creator") {
    return "Creators";
  }

  if (role === "studio-team") {
    return "Studios + Teams";
  }

  return "All Profiles";
}

function getCreatorResultsTitle(role, genre) {
  const label = getCreatorResultsLabel(role, genre);
  return label === "All Profiles" ? "Browse Creators" : label;
}

function buildCreatorsFilterHref({ role, genre }) {
  const params = new URLSearchParams();
  if (role && role !== "all") {
    params.set("type", role);
  }
  if (genre && genre !== "All") {
    params.set("genre", genre);
  }

  const query = params.toString();
  return query ? `/creators?${query}` : "/creators";
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
  initialTypeFilter = "",
  initialGenreFilter = "",
}) {
  const [catalog, setCatalog] = useState(
    Array.isArray(initialCatalog) ? initialCatalog : [],
  );
  const [loading, setLoading] = useState(!hasInitialCatalog);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [activeRole, setActiveRole] = useState(normalizeRoleFilter(initialTypeFilter));
  const [activeGenre, setActiveGenre] = useState(
    normalizeGenreFilter(initialGenreFilter, []),
  );
  const requestRef = useRef(0);

  const retryLoad = useCallback(() => {
    requestRef.current += 1;
    setLoading(true);
    setError("");
    const currentRequest = requestRef.current;

    apiGet("/api/series?adult=0", { cacheMs: 30000 }).then(
      (response) => {
        if (currentRequest !== requestRef.current) {
          return;
        }

        if (!response.ok) {
          setCatalog([]);
          setError(response.error || "Unable to load creators.");
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
  }, []);

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

  useEffect(() => {
    setActiveRole(normalizeRoleFilter(initialTypeFilter));
  }, [initialTypeFilter]);

  useEffect(() => {
    setActiveGenre(normalizeGenreFilter(initialGenreFilter, genreOptions));
  }, [genreOptions, initialGenreFilter]);

  const filteredCreators = useMemo(() => {
    const normalizedQuery = String(query || "").trim().toLowerCase();

    return creators.filter((creator) => {
      const role = normalizeCreatorRole(creator);
      const matchesRole =
        activeRole === "all" ||
        (activeRole === "studio-team"
          ? role === "studio" || role === "team"
          : role === "creator");
      const matchesGenre = creatorMatchesGenre(creator, activeGenre);
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
    { id: "studio-team", label: "Studios + Teams" },
  ];

  const filterButtonClass = (active) =>
    active
      ? `${creatorFilterChipClass} border-black bg-[#FFE500] text-black`
      : `${creatorFilterChipClass} border-white/15 bg-black text-white hover:translate-x-0.5 hover:translate-y-0.5 hover:border-white/30 hover:bg-white/[0.03]`;
  const normalizedQuery = String(query || "").trim().toLowerCase();
  const showFeaturedCreators =
    !normalizedQuery && activeRole === "all" && activeGenre === "All";
  const creatorResultsLabel = getCreatorResultsLabel(activeRole, activeGenre);
  const creatorResultsTitle = getCreatorResultsTitle(activeRole, activeGenre);

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

        {showFeaturedCreators && featuredCreators.length > 0 ? (
          <SurfacePanel
            appearance="dark"
            accent="cyan"
            className="space-y-4"
            data-testid="creator-featured-section"
          >
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

            <div
              role="group"
              aria-labelledby="creator-type-filters-label"
              aria-controls="creator-results-grid"
              data-testid="creator-type-filters"
              className="space-y-2"
            >
              <p
                id="creator-type-filters-label"
                className="text-xs font-medium uppercase tracking-[0.12em] text-white/42"
              >
                Profile type
              </p>
              <div className="flex flex-wrap gap-2">
                {roleFilters.map((item) => {
                  const active = activeRole === item.id;
                  return (
                    <Link
                      key={item.id}
                      href={buildCreatorsFilterHref({
                        role: item.id,
                        genre: activeGenre,
                      })}
                      aria-current={active ? "true" : undefined}
                      className={filterButtonClass(active)}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {genreOptions.length > 0 ? (
            <div
              role="group"
              aria-labelledby="creator-genre-filters-label"
              aria-controls="creator-results-grid"
              data-testid="creator-genre-filters"
              className="space-y-2"
            >
              <p
                id="creator-genre-filters-label"
                className="text-xs font-medium uppercase tracking-[0.12em] text-white/42"
              >
                Genres
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={buildCreatorsFilterHref({
                    role: activeRole,
                    genre: "All",
                  })}
                  aria-current={activeGenre === "All" ? "true" : undefined}
                  className={filterButtonClass(activeGenre === "All")}
                >
                  All
                </Link>
                {genreOptions.map((genre) => {
                  const active = activeGenre === genre;
                  return (
                    <Link
                      key={genre}
                      href={buildCreatorsFilterHref({
                        role: activeRole,
                        genre,
                      })}
                      aria-current={active ? "true" : undefined}
                      className={filterButtonClass(active)}
                    >
                      {genre}
                    </Link>
                  );
                })}
              </div>
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
              title="No creators match these filters."
              description=""
              action={{
                label: "Clear filters",
                href: "/creators",
              }}
            />
          </SurfacePanel>
        ) : null}

        {!error && filteredCreators.length > 0 ? (
          <SurfacePanel appearance="dark" accent="cyan" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p
                  data-testid="creator-results-label"
                  className="text-[11px] font-black uppercase tracking-[0.24em] text-white/55"
                >
                  {creatorResultsLabel}
                </p>
                <h2
                  data-testid="creator-results-heading"
                  className="mt-2 text-[2rem] font-black uppercase leading-[0.95] tracking-[-0.05em] text-white"
                >
                  {creatorResultsTitle}
                </h2>
              </div>
              <p className="text-sm font-bold uppercase tracking-[0.08em] text-white/55">
                {filteredCreators.length}{" "}
                {filteredCreators.length === 1 ? "match" : "matches"}
              </p>
            </div>

            <div
              id="creator-results-grid"
              className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
            >
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
