"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SurfacePanel from "../common/SurfacePanel";
import EmptyState from "../common/EmptyState";
import Cover from "../common/Cover";
import { apiGet } from "../../lib/apiClient";
import { buildCreatorDirectory } from "../../lib/creatorDirectory";
import { buildCreatorEditorialHook } from "../../lib/editorialHooks";
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
    (Array.isArray(creator?.genres) ? creator.genres : []).forEach((genre) => {
      const key = String(genre || "").trim();
      if (!key) {
        return;
      }

      counts.set(key, (counts.get(key) || 0) + 1);
    });
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
    )[0] ||
    creator?.spotlightSeries ||
    null
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
  const creatorHook = buildCreatorEditorialHook(creator, { maxLength: 96 });

  return (
    <Link
      href={creator.path || "/creators"}
      className="group block rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(25,21,35,0.98)_0%,rgba(15,13,22,0.98)_100%)] p-4 text-white shadow-[0_20px_48px_rgba(8,6,20,0.24)] transition-all duration-200 hover:-translate-y-1 hover:border-white/16 hover:shadow-[0_28px_64px_rgba(8,6,20,0.3)]"
      aria-label={`View ${creator.name}`}
    >
      <div className="grid gap-4 sm:grid-cols-[120px_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.03)] p-2 shadow-[0_16px_36px_rgba(8,6,20,0.2)]">
          <Cover
            tone={latestSeries?.coverTone}
            coverUrl={latestSeries?.coverUrl}
            label={latestSeries?.title || creator.name}
            eyebrow={creator.name}
            badge=""
            fallbackVariant="minimal-card"
            className="h-40 rounded-[20px]"
          />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">
                {formatCreditTypeLabel(role)}
              </p>
              <h2 className="mt-2 line-clamp-2 font-display text-xl font-semibold tracking-[-0.04em] text-white">
                {creator.name}
              </h2>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70 shadow-[0_10px_24px_rgba(8,6,20,0.18)]">
              View creator
            </span>
          </div>

          {topGenres.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {topGenres.map((genre) => (
                <span
                  key={`${creator.slug}-${genre}`}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/72 shadow-[0_10px_24px_rgba(8,6,20,0.16)]"
                >
                  {genre}
                </span>
              ))}
            </div>
          ) : null}

          <p className="mt-4 line-clamp-2 text-sm leading-6 text-white/68">
            {creatorHook}
          </p>

          <div className="mt-4 space-y-2 text-sm text-white/72">
            {latestTitle ? (
              <p className="line-clamp-1">
                <span className="font-semibold uppercase tracking-[0.14em] text-white/44">
                  Latest
                </span>{" "}
                <span className="font-semibold text-white">{latestTitle}</span>
              </p>
            ) : null}
            {updatedLabel ? (
              <p className="line-clamp-1">
                <span className="font-semibold uppercase tracking-[0.14em] text-white/44">
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
  "rounded-full border px-4 py-2 text-sm font-semibold uppercase tracking-[0.14em] shadow-[0_12px_28px_rgba(8,6,20,0.18)] transition-[transform,border-color,background-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(255,79,154,0.16)]";

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
  if (genre && genre !== "All") {
    if (role === "creator") {
      return `${genre} creators`;
    }

    if (role === "studio-team") {
      return `${genre} studios and teams`;
    }

    return `${genre} voices`;
  }

  if (role === "creator") {
    return "Creators";
  }

  if (role === "studio-team") {
    return "Studios and teams";
  }

  return "All creators";
}

function getCreatorResultsTitle(role, genre) {
  if (genre && genre !== "All") {
    if (role === "creator") {
      return `${genre} creators`;
    }

    if (role === "studio-team") {
      return `${genre} studios and teams`;
    }

    return `${genre} voices`;
  }

  if (role === "creator") {
    return "Creator voices";
  }

  if (role === "studio-team") {
    return "Studios and teams";
  }

  return "Browse creators";
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
    <main className="min-h-screen overflow-hidden bg-[var(--gush-page-bg)] text-white">
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
                  className="h-12 w-24 animate-pulse rounded-full border border-white/10 bg-[rgba(255,255,255,0.04)]"
                />
              ))}
            </div>
          </div>
        </SurfacePanel>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`creator-card-${index}`}
              className="h-[260px] animate-pulse rounded-[30px] border border-white/10 bg-[rgba(255,255,255,0.04)]"
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
  const [activeRole, setActiveRole] = useState(
    normalizeRoleFilter(initialTypeFilter),
  );
  const [activeGenre, setActiveGenre] = useState(
    normalizeGenreFilter(initialGenreFilter, []),
  );
  const requestRef = useRef(0);

  const retryLoad = useCallback(() => {
    requestRef.current += 1;
    setLoading(true);
    setError("");
    const currentRequest = requestRef.current;

    apiGet("/api/series?adult=0", { cacheMs: 30000 }).then((response) => {
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
    });
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
    const normalizedQuery = String(query || "")
      .trim()
      .toLowerCase();

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

  const roleFilters = [
    { id: "all", label: "All" },
    { id: "creator", label: "Creators" },
    { id: "studio-team", label: "Studios + Teams" },
  ];

  const filterButtonClass = (active) =>
    active
      ? `${creatorFilterChipClass} border-[rgba(255,79,154,0.24)] bg-[rgba(255,79,154,0.14)] text-white`
      : `${creatorFilterChipClass} border-white/10 bg-[rgba(255,255,255,0.03)] text-white/78 hover:-translate-y-0.5 hover:border-white/18 hover:bg-[rgba(255,255,255,0.06)] hover:text-white`;
  const normalizedQuery = String(query || "")
    .trim()
    .toLowerCase();
  const showFeaturedCreators =
    !normalizedQuery && activeRole === "all" && activeGenre === "All";
  const creatorResultsLabel = getCreatorResultsLabel(activeRole, activeGenre);
  const creatorResultsTitle = getCreatorResultsTitle(activeRole, activeGenre);

  if (loading) {
    return <CreatorsHubSkeleton />;
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[var(--gush-page-bg)] text-white">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
        <SurfacePanel appearance="dark" accent="cyan" className="space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/56">
                Creator Directory
              </p>
              <h1 className="font-display text-[2.45rem] font-semibold leading-[0.94] tracking-[-0.05em] text-white sm:text-[3rem]">
                Creators
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
                Artists, writers, studios, and teams with shelves worth
                following.
              </p>
            </div>

            <div className="max-w-md rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.03)] px-4 py-4 shadow-[0_16px_36px_rgba(8,6,20,0.2)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/46">
                Why browse here
              </p>
              <p className="mt-2 text-sm leading-6 text-white/72">
                Find the shelves behind your favorite stories, then follow the
                creators whose pacing, drama, or art style keeps hitting.
              </p>
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
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/56">
                  Spotlight
                </p>
                <h2 className="mt-2 font-display text-[2rem] font-semibold leading-[0.95] tracking-[-0.05em] text-white">
                  Editors' picks
                </h2>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {featuredCreators.map((creator) => (
                <CreatorCard
                  key={`featured-${creator.slug}`}
                  creator={creator}
                />
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
                className="w-full rounded-full border border-white/12 bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm font-medium text-white shadow-[0_14px_32px_rgba(8,6,20,0.18)] outline-none placeholder:text-white/38 focus:border-[rgba(255,79,154,0.3)] focus:ring-4 focus:ring-[rgba(255,79,154,0.12)]"
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
                  className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/56"
                >
                  {creatorResultsLabel}
                </p>
                <h2
                  data-testid="creator-results-heading"
                  className="mt-2 font-display text-[2rem] font-semibold leading-[0.95] tracking-[-0.05em] text-white"
                >
                  {creatorResultsTitle}
                </h2>
              </div>
              <p className="text-sm leading-6 text-white/56">
                Follow the voice that feels closest to your mood.
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
