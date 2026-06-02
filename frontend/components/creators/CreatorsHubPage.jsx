"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EditorialHero from "../common/EditorialHero";
import SurfacePanel from "../common/SurfacePanel";
import EmptyState from "../common/EmptyState";
import Cover from "../common/Cover";
import { apiGet } from "../../lib/apiClient";
import {
  buildCreatorDirectory,
  getCreatorDirectoryStats,
} from "../../lib/creatorDirectory";
import { buildCreatorEditorialHook } from "../../lib/editorialHooks";
import { filterBlockedPublicSeries } from "../../lib/publicCatalogVisibility";
import {
  storefrontAccentChipClass,
  storefrontChipClass,
  storefrontHighlightBadgeClass,
  storefrontInfoCardClass,
  storefrontInputClass,
  StorefrontSectionHeading,
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
  storefrontSoftCardClass,
} from "../common/StorefrontPagePrimitives";
import { StorefrontPage } from "../storefront/StorefrontScaffold";

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

function formatCompactCount(value) {
  const safeValue = Math.max(0, Number(value || 0));
  if (safeValue >= 1000) {
    return `${(safeValue / 1000).toFixed(safeValue >= 10000 ? 0 : 1)}k`;
  }
  return `${safeValue}`;
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
      className="group block rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(25,21,35,0.98)_0%,rgba(15,13,22,0.98)_100%)] p-4 text-white shadow-[0_20px_48px_rgba(8,6,20,0.24)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-1.5 hover:border-white/16 hover:shadow-[0_28px_64px_rgba(8,6,20,0.3)]"
      aria-label={`View ${creator.name}`}
    >
      <div className="grid gap-4 sm:grid-cols-[120px_minmax(0,1fr)]">
        <div className={`overflow-hidden rounded-[24px] ${storefrontSoftCardClass} p-2`}>
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
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/55">
                {formatCreditTypeLabel(role)}
              </p>
              <h2 className="mt-2 line-clamp-2 font-display text-[1.45rem] font-semibold leading-[0.98] tracking-[-0.05em] text-white">
                {creator.name}
              </h2>
            </div>
            <span className={`${storefrontChipClass} min-h-[38px] px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-white/70`}>
              View creator
            </span>
          </div>

          {topGenres.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {topGenres.map((genre) => (
                <span
                  key={`${creator.slug}-${genre}`}
                  className={`${storefrontChipClass} min-h-[38px] px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-white/72`}
                >
                  {genre}
                </span>
              ))}
            </div>
          ) : null}

          <p className="mt-4 line-clamp-2 text-sm leading-[1.68] text-white/68">
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

function FeaturedCreatorSpotlight({ creator }) {
  const spotlightSeries = creator?.spotlightSeries || null;
  const creatorHook = buildCreatorEditorialHook(creator, { maxLength: 140 });
  const updatedLabel = formatDateLabel(creator?.latestUpdatedAt);
  const role = normalizeCreatorRole(creator);
  const topGenres = Array.isArray(creator?.topGenres)
    ? creator.topGenres.slice(0, 3)
    : [];

  return (
    <Link
      href={creator.path || "/creators"}
      className="group grid overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(140deg,rgba(24,19,34,0.98)_0%,rgba(12,10,20,0.98)_58%,rgba(11,15,28,0.98)_100%)] shadow-[0_30px_80px_rgba(6,5,18,0.4)] transition-all duration-200 hover:-translate-y-1.5 hover:border-white/18 hover:shadow-[0_36px_96px_rgba(6,5,18,0.46)] lg:grid-cols-[220px_minmax(0,1fr)]"
    >
      <div className="relative overflow-hidden p-3">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,79,154,0.18),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(103,232,249,0.12),transparent_28%)]" />
        <Cover
          tone={spotlightSeries?.coverTone}
          coverUrl={spotlightSeries?.coverUrl}
          label={spotlightSeries?.title || creator?.name}
          eyebrow={creator?.name}
          badge=""
          fallbackVariant="minimal-card"
          className="relative h-full min-h-[240px] rounded-[26px] border border-white/12 shadow-[0_18px_44px_rgba(8,6,20,0.28)]"
        />
      </div>

      <div className="relative flex min-w-0 flex-col justify-between gap-5 p-5 sm:p-6">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={storefrontHighlightBadgeClass}>
              Spotlight
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/48">
              {formatCreditTypeLabel(role)}
            </span>
          </div>

          <div>
            <h2 className="font-display text-[2rem] font-semibold leading-[0.92] tracking-[-0.06em] text-white sm:text-[2.35rem]">
              {creator?.name}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-[1.72] text-white/70">
              {creatorHook}
            </p>
          </div>

          {topGenres.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {topGenres.map((genre) => (
                <span
                  key={`${creator?.slug || creator?.name}-${genre}-spotlight`}
                  className={`${storefrontChipClass} min-h-[38px] px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-white/76`}
                >
                  {genre}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className={storefrontInfoCardClass}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/46">
              Open with
            </p>
            <p className="mt-2 text-base font-semibold tracking-[-0.03em] text-white">
              {spotlightSeries?.title || "Featured shelf"}
            </p>
            <p className="mt-1 text-sm text-white/58">
              {updatedLabel ? `Updated ${updatedLabel}` : "Latest shelf pick"}
            </p>
          </div>

          <span className={`${storefrontChipClass} min-h-11 gap-2 px-4 text-white group-hover:border-[rgba(255,79,154,0.28)] group-hover:bg-[rgba(255,79,154,0.12)]`}>
            View creator
            <ArrowRight className="size-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function FeaturedCreatorRailCard({ creator }) {
  const spotlightSeries = creator?.spotlightSeries || null;
  const creatorHook = buildCreatorEditorialHook(creator, { maxLength: 88 });

  return (
    <Link
      href={creator.path || "/creators"}
      className="group flex items-center gap-4 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(22,18,32,0.96)_0%,rgba(14,12,22,0.98)_100%)] p-4 shadow-[0_18px_44px_rgba(8,6,20,0.28)] transition-all duration-200 hover:-translate-y-1 hover:border-white/18 hover:shadow-[0_24px_56px_rgba(8,6,20,0.34)]"
    >
      <div className={`w-[90px] shrink-0 overflow-hidden ${storefrontSoftCardClass} p-2`}>
        <Cover
          tone={spotlightSeries?.coverTone}
          coverUrl={spotlightSeries?.coverUrl}
          label={spotlightSeries?.title || creator?.name}
          eyebrow={creator?.name}
          badge=""
          fallbackVariant="minimal-card"
          className="aspect-[3/4] rounded-[16px]"
        />
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/48">
          {formatCreditTypeLabel(normalizeCreatorRole(creator))}
        </p>
        <h3 className="mt-2 line-clamp-1 font-display text-[1.2rem] font-semibold tracking-[-0.05em] text-white">
          {creator?.name}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-[1.64] text-white/64">
          {creatorHook}
        </p>
      </div>
    </Link>
  );
}

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

  return "All creators";
}

function getCreatorResultsTitle(role, genre) {
  if (genre && genre !== "All") {
    if (role === "creator") {
      return `${genre} creators`;
    }

    if (role === "studio-team") {
      return `${genre} studios + teams`;
    }

    return `${genre} profiles`;
  }

  if (role === "creator") {
    return "Creator voices";
  }

  if (role === "studio-team") {
    return "Studios + Teams";
  }

  return "Browse creators";
}

function formatCreatorMatchCount(count) {
  const safeCount = Math.max(0, Number(count || 0));
  return safeCount === 1 ? "1 match" : `${safeCount} matches`;
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
    <StorefrontPage accentClass="from-[rgba(255,79,154,0.14)] via-[rgba(167,139,250,0.08)] to-[rgba(103,232,249,0.12)]">
      <div className="flex flex-col gap-6">
        <SurfacePanel appearance="dark" accent="cyan" className="space-y-4">
          <div className="h-4 w-24 animate-pulse rounded-full bg-white/20" />
          <div className="h-12 w-full max-w-2xl animate-pulse rounded-[24px] bg-white/20" />
          <div className="h-14 w-full max-w-xl animate-pulse rounded-[24px] bg-[rgba(255,255,255,0.035)]" />
        </SurfacePanel>

        <SurfacePanel appearance="dark" accent="cyan" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <div className="h-12 animate-pulse rounded-full bg-[rgba(255,255,255,0.035)]" />
            <div className="flex gap-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`creator-chip-${index}`}
                  className={`h-12 w-24 animate-pulse ${storefrontChipClass}`}
                />
              ))}
            </div>
          </div>
        </SurfacePanel>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`creator-card-${index}`}
              className={`h-[260px] animate-pulse ${storefrontInfoCardClass}`}
            />
          ))}
        </div>
      </div>
    </StorefrontPage>
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
  const creatorStats = useMemo(
    () => getCreatorDirectoryStats(creators),
    [creators],
  );

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
      ? `${storefrontAccentChipClass} px-4 text-sm font-semibold uppercase tracking-[0.14em]`
      : `${storefrontChipClass} px-4 text-sm font-semibold uppercase tracking-[0.14em]`;
  const normalizedQuery = String(query || "")
    .trim()
    .toLowerCase();
  const showFeaturedCreators =
    !normalizedQuery && activeRole === "all" && activeGenre === "All";
  const creatorResultsLabel = getCreatorResultsLabel(activeRole, activeGenre);
  const creatorResultsTitle = getCreatorResultsTitle(activeRole, activeGenre);
  const creatorResultsCountLabel = formatCreatorMatchCount(
    filteredCreators.length,
  );
  const genrePreview = genreOptions.slice(0, 6);

  if (loading) {
    return <CreatorsHubSkeleton />;
  }

  return (
    <StorefrontPage accentClass="from-[rgba(255,79,154,0.14)] via-[rgba(167,139,250,0.08)] to-[rgba(103,232,249,0.12)]">
      <div className="flex flex-col gap-6">
        <EditorialHero
          accent="cyan"
          eyebrow="Creator Directory"
          secondary="Writers, artists, studios, teams"
          title="Find the shelf behind the story you keep opening."
          description="Browse the people and teams shaping the drama, pacing, chemistry, and cover art that keeps readers tapping into the next chapter."
          actions={
            <>
              <Link
                href="/creators?type=creator"
                className={storefrontPrimaryButtonClass}
              >
                Browse creators
              </Link>
              <Link
                href="/creators?type=studio-team"
                className={storefrontSecondaryButtonClass}
              >
                Browse studios + teams
              </Link>
            </>
          }
          stats={[
            {
              label: "Profiles",
              value: formatCompactCount(creatorStats.creators),
              hint: "Public creator shelves ready to browse.",
            },
            {
              label: "Titles",
              value: formatCompactCount(creatorStats.titles),
              hint: "Stories credited across the directory.",
            },
            {
              label: "Completed",
              value: formatCompactCount(creatorStats.completedTitles),
              hint: "Finished series ready for a binge.",
            },
            {
              label: "Reader proof",
              value: formatCompactCount(creatorStats.readerProof),
              hint: "Shelf activity built from current title volume.",
            },
          ]}
        />

        {showFeaturedCreators && featuredCreators.length > 0 ? (
          <SurfacePanel
            appearance="dark"
            accent="cyan"
            className="space-y-5"
            data-testid="creator-featured-section"
          >
            <StorefrontSectionHeading
              eyebrow="Spotlight"
              title="Creators to open tonight"
              description="A faster way into the shelves shaping the site's strongest moods right now."
            />

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_minmax(300px,0.82fr)]">
              <FeaturedCreatorSpotlight creator={featuredCreators[0]} />
              <div className="grid gap-4">
                {featuredCreators.slice(1).map((creator) => (
                  <FeaturedCreatorRailCard
                    key={`featured-${creator.slug}`}
                    creator={creator}
                  />
                ))}
                {featuredCreators.length === 1 ? (
                  <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.03)_100%)] p-5 shadow-[0_18px_44px_rgba(8,6,20,0.22)]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/48">
                      Why it matters
                    </p>
                    <p className="mt-3 text-sm leading-[1.72] text-white/68">
                      Creator pages turn one favorite title into a whole shelf
                      with the same voice, tone, and emotional pull.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </SurfacePanel>
        ) : null}

        <SurfacePanel appearance="dark" accent="cyan" className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_320px]">
            <div className="space-y-4">
              <StorefrontSectionHeading
                eyebrow="Browse filters"
                title="Search by voice, genre, or team"
                description="Keep the current content flow. Just open the shelf that matches tonight's mood."
              />

              <label className="block">
                <span className="sr-only">Search creators</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search creators, studios, or genres"
                  className={`${storefrontInputClass} mt-0 min-h-[48px]`}
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
            </div>

            <div className="space-y-4">
              <div className={`${storefrontInfoCardClass} p-5`}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/48">
                  Directory mood
                </p>
                <p className="mt-3 text-sm leading-[1.72] text-white/72">
                  Find the shelf behind your favorite cover, then keep going
                  until you hit the next title with the same taste level.
                </p>
              </div>

              <div className={`${storefrontSoftCardClass} rounded-[28px] p-5 shadow-[0_20px_48px_rgba(8,6,20,0.26)]`}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/48">
                  Genre preview
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {genrePreview.length > 0 ? (
                    genrePreview.map((genre) => (
                      <Link
                        key={`${genre}-preview`}
                        href={buildCreatorsFilterHref({
                          role: "all",
                          genre,
                        })}
                        className={`${storefrontChipClass} min-h-[38px] px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-white/76`}
                      >
                        {genre}
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-white/56">
                      Browse the current directory first.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
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
          <SurfacePanel appearance="dark" accent="cyan" className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p
                  data-testid="creator-results-label"
                  className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/56"
                >
                  {creatorResultsLabel}
                </p>
                <h2
                  data-testid="creator-results-heading"
                  className="mt-2 font-display text-[1.9rem] font-semibold leading-[0.94] tracking-[-0.06em] text-white"
                >
                  {creatorResultsTitle}
                </h2>
                <p className="mt-2 text-sm font-medium text-white/56">
                  {creatorResultsCountLabel}
                </p>
              </div>
              <p className="text-sm leading-[1.68] text-white/56">
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
    </StorefrontPage>
  );
}
