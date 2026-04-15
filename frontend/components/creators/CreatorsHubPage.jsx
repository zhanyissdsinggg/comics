"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "../layout/SiteHeader";
import Cover from "../common/Cover";
import EditorialHero from "../common/EditorialHero";
import SurfacePanel from "../common/SurfacePanel";
import EmptyState from "../common/EmptyState";
import SkeletonCard from "../common/SkeletonCard";
import CommerceSuccessBanner from "../common/CommerceSuccessBanner";
import { apiGet } from "../../lib/apiClient";
import { buildCreatorDirectory } from "../../lib/creatorDirectory";
import {
  consumeCommerceSuccessForPath,
  getCommerceSuccessPresentation,
} from "../../lib/commerceSuccess";
import {
  resolveSeriesCreatorIdentity,
  resolveSeriesCreatorName,
} from "../../lib/creatorIdentity";
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

  return Array.from(counts.entries())
    .sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
    )
    .map(([genre]) => genre)
    .slice(0, 8);
}

function formatCreditTypeLabel(creditType) {
  if (creditType === "studio") {
    return "Studio";
  }

  if (creditType === "team") {
    return "Team";
  }

  return "Creator";
}

function isCollectiveCreditType(creditType) {
  return creditType === "team" || creditType === "studio";
}

function getSeriesSignalScore(series) {
  const updatedAtMs = Date.parse(series?.updatedAt || 0);
  const episodeCount = Math.max(0, Number(series?.episodeCount || 0));
  const hasDescription = Boolean(String(series?.description || "").trim());
  const completedBonus =
    String(series?.status || "").toLowerCase() === "completed"
      ? 12 * 60 * 60 * 1000
      : 0;

  return (
    (Number.isNaN(updatedAtMs) ? 0 : updatedAtMs) +
    Math.min(episodeCount, 200) * 60 * 60 * 1000 +
    (hasDescription ? 3 * 60 * 60 * 1000 : 0) +
    completedBonus
  );
}

function getCreatorStoryBadge(series) {
  if (String(series?.status || "").toLowerCase() === "completed") {
    return "Completed";
  }

  const updatedAtMs = Date.parse(series?.updatedAt || 0);
  if (
    !Number.isNaN(updatedAtMs) &&
    updatedAtMs >= Date.now() - 14 * 24 * 60 * 60 * 1000
  ) {
    return "Updated";
  }

  const episodeCount = Math.max(0, Number(series?.episodeCount || 0));
  if (episodeCount > 0 && episodeCount <= 12) {
    return "First picks";
  }

  return "";
}

function canStartFromChapterOne(series) {
  return Math.max(0, Number(series?.episodeCount || 0)) > 0;
}

function buildFallbackSeriesSubtitle(series) {
  if (Array.isArray(series?.genres) && series.genres.length > 0) {
    return series.genres.slice(0, 2).join(" / ");
  }
  if (series?.updatedAt) {
    return formatDateLabel(series.updatedAt);
  }
  return String(series?.type || "Series");
}

function summarizeLeadCopy(text, fallback) {
  const source = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!source) {
    return fallback;
  }

  if (source.length <= 120) {
    return source;
  }

  return `${source.slice(0, 117).trimEnd()}...`;
}

function getCreatorLeadSeries(creator) {
  const series = Array.isArray(creator?.series) ? creator.series : [];
  if (creator?.spotlightSeries?.id) {
    return creator.spotlightSeries;
  }
  return series.find((item) => item?.id) || null;
}

function isModifiedEvent(event) {
  return Boolean(
    event.metaKey ||
    event.altKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.button !== 0,
  );
}

function buildCreatorShelfMeta(creator) {
  const meta = [];

  if (Number(creator?.ongoingCount || 0) > 0) {
    meta.push(`${creator.ongoingCount} ongoing`);
  }
  if (Number(creator?.completedCount || 0) > 0) {
    meta.push(`${creator.completedCount} completed`);
  }
  if (creator?.latestUpdatedAt) {
    meta.push(formatDateLabel(creator.latestUpdatedAt));
  }

  return meta.length > 0 ? meta : ["Featured creator"];
}

function formatSeriesTypeLabel(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (!normalized) {
    return "Series";
  }
  if (normalized === "comic") {
    return "Comic";
  }
  if (normalized === "novel") {
    return "Novel";
  }
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatTitleCountLabel(count) {
  const total = Number(count || 0);
  return `${total} title${total === 1 ? "" : "s"}`;
}

function buildCreatorWorksSummary(creator) {
  const leadSeries = getCreatorLeadSeries(creator);
  const genres = Array.isArray(creator?.topGenres)
    ? creator.topGenres.slice(0, 2)
    : [];

  if (leadSeries?.title) {
    return `Known for ${leadSeries.title}.`;
  }

  if (genres.length > 0) {
    return `Works across ${genres.join(" / ")}.`;
  }

  return "Live work in the catalog.";
}

function CreatorDirectorySkeleton() {
  return (
    <main className="gush-home-shell overflow-hidden">
      <div className="gush-page-ambient" />
      <SiteHeader variant="home" />
      <div className="gush-page-main gush-section-stack">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <SurfacePanel appearance="light" accent="blue" className="space-y-6">
            <div className="space-y-3">
              <div className="h-4 w-28 animate-pulse rounded-full bg-slate-200" />
              <div className="h-14 w-full max-w-3xl animate-pulse rounded-[24px] bg-slate-200" />
              <div className="h-20 w-full max-w-2xl animate-pulse rounded-[24px] bg-slate-100" />
            </div>
          </SurfacePanel>
          <SurfacePanel
            tone="muted"
            appearance="light"
            accent="blue"
            className="space-y-3"
          >
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`creators-hero-stat-${index}`}
                className="h-24 animate-pulse rounded-[24px] border border-[color:var(--gush-border)] bg-white"
              />
            ))}
          </SurfacePanel>
        </div>

        <SurfacePanel appearance="light" accent="blue" className="space-y-4">
          <div className="h-3 w-28 animate-pulse rounded-full bg-slate-200" />
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`creators-filter-skeleton-${index}`}
                className="h-11 animate-pulse rounded-full border border-[color:var(--gush-border)] bg-white"
              />
            ))}
          </div>
        </SurfacePanel>

        <div className="grid gap-4 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`creators-card-skeleton-${index}`}
              className="h-[360px] animate-pulse rounded-[28px] border border-[color:var(--gush-border)] bg-white shadow-[0_18px_42px_rgba(15,23,42,0.06)]"
            />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <SkeletonCard
              key={`creator-grid-skeleton-${index}`}
              appearance="light"
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
  const router = useRouter();
  const { isAdultMode, forceDisableAdultMode } = useAdultGateStore();
  const [catalog, setCatalog] = useState(
    Array.isArray(initialCatalog) ? initialCatalog : [],
  );
  const [loading, setLoading] = useState(!hasInitialCatalog);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [activeGenre, setActiveGenre] = useState("All");
  const [creditFilter, setCreditFilter] = useState("all");
  const [commerceNotice, setCommerceNotice] = useState(null);
  const [retryTick, setRetryTick] = useState(0);
  const requestRef = useRef(0);

  const retryCreatorsDirectory = useCallback(() => {
    setRetryTick((current) => current + 1);
  }, []);

  useEffect(() => {
    setCommerceNotice(
      getCommerceSuccessPresentation(
        consumeCommerceSuccessForPath("/creators"),
      ),
    );
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

      setCatalog(
        Array.isArray(response.data?.series) ? response.data.series : [],
      );
      setError("");
      return true;
    };

    apiGet(`/api/series?adult=${adultFlag}`, { cacheMs: 30000 }).then(
      (response) => {
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
      },
    );
  }, [forceDisableAdultMode, hasInitialCatalog, isAdultMode, retryTick]);

  const creators = useMemo(() => buildCreatorDirectory(catalog), [catalog]);
  const genreOptions = useMemo(() => buildGenreOptions(creators), [creators]);
  const filteredCreators = useMemo(() => {
    const normalizedQuery = String(query || "")
      .trim()
      .toLowerCase();

    return creators.filter((creator) => {
      const matchesCredit =
        creditFilter === "all" ||
        (creditFilter === "team"
          ? isCollectiveCreditType(creator?.creditType)
          : !isCollectiveCreditType(creator?.creditType));
      const matchesGenre =
        activeGenre === "All" ||
        (Array.isArray(creator?.topGenres) ? creator.topGenres : []).includes(
          activeGenre,
        );

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
  const spotlightCreators = useMemo(
    () => filteredCreators.slice(0, 3),
    [filteredCreators],
  );
  const featuredTeams = useMemo(
    () =>
      creators
        .filter((creator) => isCollectiveCreditType(creator?.creditType))
        .slice(0, 3),
    [creators],
  );
  const featuredVoices = useMemo(
    () =>
      creators
        .filter(
          (creator) =>
            !isCollectiveCreditType(creator?.creditType) &&
            creator?.titleCount > 1,
        )
        .slice(0, 3),
    [creators],
  );
  const fallbackEntryTitles = useMemo(
    () =>
      [...catalog]
        .filter((series) => series?.id)
        .sort((left, right) => {
          const scoreDelta =
            getSeriesSignalScore(right) - getSeriesSignalScore(left);
          if (scoreDelta !== 0) {
            return scoreDelta;
          }

          return (
            Date.parse(right?.updatedAt || 0) - Date.parse(left?.updatedAt || 0)
          );
        })
        .slice(0, 4)
        .map((series) => {
          const creatorIdentity = resolveSeriesCreatorIdentity(series);

          return {
            id: series.id,
            title: series.title,
            subtitle: buildFallbackSeriesSubtitle(series),
            genres: Array.isArray(series?.genres) ? series.genres : [],
            type: series?.type || "",
            seriesType: series?.type || "",
            status: series?.status || "",
            description: series?.description || "",
            episodeCount: Number(series?.episodeCount || 0),
            updatedAt: series?.updatedAt || "",
            author: resolveSeriesCreatorName(series),
            creatorIdentity,
            adult: Boolean(series?.adult),
            coverUrl: series.coverUrl,
            coverTone: series.coverTone,
          };
        }),
    [catalog],
  );
  const fallbackGenrePicks = useMemo(() => {
    const counts = new Map();

    catalog.forEach((series) => {
      (Array.isArray(series?.genres) ? series.genres : []).forEach((genre) => {
        const key = String(genre || "").trim();
        if (!key) {
          return;
        }
        counts.set(key, (counts.get(key) || 0) + 1);
      });
    });

    return Array.from(counts.entries())
      .sort(
        (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
      )
      .slice(0, 6)
      .map(([genre, count]) => ({ genre, count }));
  }, [catalog]);
  const creatorLookup = useMemo(
    () => new Map(creators.map((creator) => [creator.slug, creator])),
    [creators],
  );
  const featuredCreatorCards = useMemo(() => {
    const entries = [...featuredVoices, ...featuredTeams, ...spotlightCreators];
    const bySlug = new Map();

    entries.forEach((creator) => {
      if (creator?.slug && !bySlug.has(creator.slug)) {
        bySlug.set(creator.slug, creator);
      }
    });

    return Array.from(bySlug.values()).slice(0, 6);
  }, [featuredTeams, featuredVoices, spotlightCreators]);
  const collectiveCreatorCount = useMemo(
    () =>
      creators.filter((creator) => isCollectiveCreditType(creator?.creditType))
        .length,
    [creators],
  );
  const creditedSeriesCount = useMemo(
    () =>
      creators.reduce(
        (total, creator) =>
          total + Math.max(0, Number(creator?.titleCount || 0)),
        0,
      ),
    [creators],
  );
  const creatorHeroStats = useMemo(
    () => [
      {
        label: "Profiles",
        value: creators.length.toLocaleString(),
      },
      {
        label: "Teams",
        value: collectiveCreatorCount.toLocaleString(),
      },
      {
        label: "Titles",
        value: creditedSeriesCount.toLocaleString(),
      },
    ],
    [collectiveCreatorCount, creators.length, creditedSeriesCount],
  );

  const primaryButtonClass =
    "rounded-full bg-[color:var(--gush-ink-strong)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.08)] transition-colors hover:bg-black/82";
  const secondaryButtonClass =
    "rounded-full border border-[color:var(--gush-border)] bg-white px-5 py-2.5 text-sm font-semibold text-[color:var(--gush-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] transition-colors hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)]";
  const filterButtonClass = (isActive) =>
    `rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors ${
      isActive
        ? "border-[color:var(--gush-border-strong)] bg-[color:var(--gush-page-bg-muted)] text-[color:var(--gush-ink-strong)]"
        : "border-[color:var(--gush-border)] bg-white text-[color:var(--gush-ink-soft)] hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] hover:text-[color:var(--gush-ink)]"
    }`;
  const creatorCardClass =
    "block w-full rounded-[30px] border border-[color:var(--gush-border)] bg-white p-4 text-left shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] hover:shadow-[0_14px_30px_rgba(15,23,42,0.06)]";
  const neutralChipClass =
    "rounded-full border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-elevated)] px-3 py-1 text-xs text-[color:var(--gush-ink-soft)]";
  const jumpToGenreBrowse = (genre) => {
    setQuery("");
    setCreditFilter("all");
    setActiveGenre(genre || "All");

    if (typeof document === "undefined") {
      return;
    }

    window.requestAnimationFrame(() => {
      document
        .getElementById("creator-list")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };
  const jumpToCreatorList = () => {
    if (typeof document === "undefined") {
      return;
    }

    window.requestAnimationFrame(() => {
      document
        .getElementById("creator-list")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const buildCreatorHref = (creator, entryPoint = "CREATORS_HUB_GRID") => {
    if (!creator?.path) {
      return "#";
    }

    return buildPathWithAttribution(creator.path, {
      entryPoint,
      campaignId: creator.slug,
      sourcePath: "/creators",
      sourceSeriesId: creator.spotlightSeries?.id || undefined,
      returnTo: creator.path,
    });
  };

  const handleCreatorLinkClick = (
    event,
    creator,
    entryPoint = "CREATORS_HUB_GRID",
  ) => {
    if (!creator?.path) {
      event.preventDefault();
      return;
    }

    trackEvent("creator_directory_click", {
      entryPoint,
      creatorName: creator.name,
      creatorSlug: creator.slug,
      sourceSeriesId: creator.spotlightSeries?.id || undefined,
    });

    if (isModifiedEvent(event)) {
      return;
    }
  };

  const buildSeriesHref = (
    series,
    creator,
    entryPoint = "CREATORS_HUB_TITLE",
  ) => {
    if (!series?.id) {
      return "#";
    }

    const targetPath = `/series/${encodeURIComponent(series.id)}`;
    return buildPathWithAttribution(targetPath, {
      entryPoint,
      campaignId: creator?.slug || "creators_hub",
      sourcePath: "/creators",
      sourceSeriesId: series.id,
      returnTo: targetPath,
    });
  };

  const handleCreatorSeriesLinkClick = (
    event,
    series,
    creator,
    entryPoint = "CREATORS_HUB_TITLE",
  ) => {
    if (!series?.id) {
      event.preventDefault();
      return;
    }

    trackEvent("creator_directory_series_click", {
      entryPoint,
      creatorName: creator?.name,
      creatorSlug: creator?.slug,
      seriesId: series.id,
      seriesTitle: series.title,
    });

    if (isModifiedEvent(event)) {
      return;
    }
  };
  const buildFallbackTitleHref = (series) => {
    if (!series?.id) {
      return "#";
    }

    const targetPath = `/series/${encodeURIComponent(series.id)}`;
    return buildPathWithAttribution(targetPath, {
      entryPoint: "CREATORS_HUB_FALLBACK_TITLE",
      campaignId: "creators_fallback",
      sourcePath: "/creators",
      sourceSeriesId: series.id,
      returnTo: targetPath,
    });
  };
  const handleFallbackTitleLinkClick = (event, series) => {
    if (!series?.id) {
      event.preventDefault();
      return;
    }

    trackEvent("creator_directory_fallback_title_click", {
      entryPoint: "CREATORS_HUB_FALLBACK_TITLE",
      seriesId: series.id,
      seriesTitle: series.title,
    });

    if (isModifiedEvent(event)) {
      return;
    }
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
            canStartFromChapterOne: canStartFromChapterOne(series),
          };
        })
        .filter(Boolean),
    [spotlightCreators],
  );
  const guidedDiscoveryEntries = useMemo(() => {
    const entries = [];
    const seenSeriesIds = new Set();

    creatorEntryTitles.forEach(
      ({ creator, series, canStartFromChapterOne: hasOpeningChapter }) => {
        if (!series?.id || seenSeriesIds.has(series.id)) {
          return;
        }

        seenSeriesIds.add(series.id);
        entries.push({
          id: `creator-${series.id}`,
          mode: "creator",
          creator,
          series,
          canStartFromChapterOne: hasOpeningChapter,
        });
      },
    );

    fallbackEntryTitles.forEach((series) => {
      if (!series?.id || seenSeriesIds.has(series.id) || entries.length >= 4) {
        return;
      }

      const linkedCreator = series?.creatorIdentity?.slug
        ? creatorLookup.get(series.creatorIdentity.slug)
        : null;

      seenSeriesIds.add(series.id);
      entries.push({
        id: `story-${series.id}`,
        mode: linkedCreator ? "creator" : "story",
        creator: linkedCreator,
        series,
        canStartFromChapterOne: canStartFromChapterOne(series),
      });
    });

    return entries.slice(0, 4);
  }, [creatorEntryTitles, creatorLookup, fallbackEntryTitles]);

  if (loading) {
    return <CreatorDirectorySkeleton />;
  }

  if (error || !creators.length) {
    const fallbackDescription = error
      ? "Creator pages are unavailable right now."
      : "A full creator directory is not live yet.";
    const fallbackDeskTitle = error
      ? "Try again or browse titles."
      : "Browse titles.";

    return (
      <main className="gush-home-shell overflow-hidden">
        <div className="gush-page-ambient" />
        <SiteHeader variant="home" />
        <div className="gush-page-main gush-section-stack">
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <EditorialHero
              accent="blue"
              appearance="light"
              eyebrow="Creator credits"
              title={
                error
                  ? "Creator pages are unavailable."
                  : "Creator directory is not live yet."
              }
              description={fallbackDescription}
              stats={[
                {
                  label: "Story picks",
                  value: fallbackEntryTitles.length.toLocaleString(),
                  hint: "Live catalog picks.",
                },
                {
                  label: "Genre lanes",
                  value: fallbackGenrePicks.length.toLocaleString(),
                  hint: "Live genre lanes.",
                },
              ]}
            />

            <SurfacePanel
              tone="muted"
              accent="blue"
              appearance="light"
              className="flex h-full flex-col justify-between space-y-6"
            >
              <div>
                <h2 className="font-display text-[1.7rem] font-semibold tracking-tight text-[color:var(--gush-ink-strong)] dark:text-white">
                  {fallbackDeskTitle}
                </h2>
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => router.push("/comics")}
                  className={primaryButtonClass}
                >
                  Browse Comics
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/search")}
                  className={secondaryButtonClass}
                >
                  Search
                </button>
                {error ? (
                  <button
                    type="button"
                    onClick={retryCreatorsDirectory}
                    className={secondaryButtonClass}
                  >
                    Retry
                  </button>
                ) : null}
              </div>
            </SurfacePanel>
          </section>

          {commerceNotice ? (
            <CommerceSuccessBanner
              notice={commerceNotice}
              onDismiss={() => setCommerceNotice(null)}
            />
          ) : null}

          <SurfacePanel appearance="light" accent="blue" className="space-y-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                First picks
              </p>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Start with these titles.
              </h2>
            </div>

            {fallbackEntryTitles.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {fallbackEntryTitles.map((series) => (
                  <Link
                    key={`creator-fallback-${series.id}`}
                    href={buildFallbackTitleHref(series)}
                    onClick={(event) =>
                      handleFallbackTitleLinkClick(event, series)
                    }
                    className={`group overflow-hidden ${creatorCardClass}`}
                    aria-label={`Open ${series.title}`}
                  >
                    <div className="relative aspect-[3/4] overflow-hidden bg-[color:var(--gush-page-bg-muted)]">
                      <Cover
                        tone={series.coverTone}
                        coverUrl={series.coverUrl}
                        label={series.title}
                        eyebrow={series.subtitle}
                        badge={getCreatorStoryBadge(series)}
                        fallbackVariant="minimal-card"
                        className="h-full w-full transition-transform duration-700 group-hover:scale-[1.04]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                    </div>
                    <div className="space-y-2.5 px-4 py-4">
                      <p className="line-clamp-2 text-[15px] font-semibold leading-5 text-slate-900 transition-colors group-hover:text-slate-950">
                        {series.title}
                      </p>
                      <p className="line-clamp-1 text-xs text-slate-500 transition-colors group-hover:text-slate-600">
                        {series.subtitle}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : null}
          </SurfacePanel>

          <section className="grid gap-4 xl:grid-cols-[1.04fr_0.96fr]">
            <SurfacePanel
              appearance="light"
              accent="blue"
              className="space-y-5"
            >
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Browse
                </p>
                <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  Start from a genre.
                </h2>
              </div>

              {fallbackGenrePicks.length > 0 ? (
                <div className="flex flex-wrap gap-2.5">
                  {fallbackGenrePicks.map((item) => (
                    <button
                      key={`creator-fallback-genre-${item.genre}`}
                      type="button"
                      onClick={() =>
                        router.push(
                          `/search?q=${encodeURIComponent(item.genre)}&sort=latest`,
                        )
                      }
                      className={filterButtonClass(false)}
                    >
                      {item.genre}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Use comics, novels, or search.
                </p>
              )}
            </SurfacePanel>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="gush-home-shell overflow-hidden">
      <div className="gush-page-ambient" />
      <SiteHeader variant="home" />

      <div className="gush-page-main gush-section-stack">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <EditorialHero
            accent="blue"
            appearance="light"
            eyebrow="Creators"
            title="Browse creators."
            description="Writers, artists, studios, and teams behind live titles."
            stats={creatorHeroStats}
          />

          <SurfacePanel
            tone="muted"
            accent="blue"
            appearance="light"
            className="flex h-full flex-col justify-between space-y-6"
          >
            <div>
              <h2 className="font-display text-[1.7rem] font-semibold tracking-tight text-slate-950">
                Open the directory.
              </h2>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={jumpToCreatorList}
                className={primaryButtonClass}
              >
                Open directory
              </button>
              <button
                type="button"
                onClick={() => router.push("/rankings")}
                className={secondaryButtonClass}
              >
                Browse titles
              </button>
            </div>
          </SurfacePanel>
        </section>

        {commerceNotice ? (
          <CommerceSuccessBanner
            notice={commerceNotice}
            onDismiss={() => setCommerceNotice(null)}
          />
        ) : null}

        <SurfacePanel appearance="light" accent="blue" className="space-y-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Search
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Find creators.
              </h2>
            </div>
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

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search creators, studios, or titles"
              className="rounded-[22px] border border-[color:var(--gush-border)] bg-white px-4 py-3.5 text-sm text-slate-900 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none transition-colors placeholder:text-slate-400 focus:border-[color:var(--gush-border-strong)] focus:ring-4 focus:ring-slate-200/80"
            />

            <div className="flex flex-wrap gap-2.5">
              {[
                { id: "all", label: "All" },
                { id: "creator", label: "Creators" },
                { id: "team", label: "Studios & Teams" },
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
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => setActiveGenre("All")}
              className={filterButtonClass(activeGenre === "All")}
            >
              All genres
            </button>
            {genreOptions.map((genre) => (
              <button
                key={`genre-filter-${genre}`}
                type="button"
                onClick={() => setActiveGenre(genre)}
                className={filterButtonClass(activeGenre === genre)}
              >
                {genre}
              </button>
            ))}
          </div>
        </SurfacePanel>

        <SurfacePanel appearance="light" accent="blue" className="space-y-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              Featured
            </p>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Featured creators.
            </h2>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {featuredCreatorCards.map((creator) => {
              const leadSeries = getCreatorLeadSeries(creator);
              const creatorGenres = Array.isArray(creator?.topGenres)
                ? creator.topGenres.slice(0, 2)
                : [];

              return (
                <Link
                  key={`featured-${creator.slug}`}
                  href={buildCreatorHref(creator, "CREATORS_HUB_FEATURED")}
                  onClick={(event) =>
                    handleCreatorLinkClick(
                      event,
                      creator,
                      "CREATORS_HUB_FEATURED",
                    )
                  }
                  className={creatorCardClass}
                  aria-label={`Open ${creator.name}`}
                >
                  <div className="grid gap-4 sm:grid-cols-[128px_minmax(0,1fr)]">
                    <div className="overflow-hidden rounded-[20px] border border-[color:var(--gush-border)] bg-white/90 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
                      <Cover
                        tone={leadSeries?.coverTone}
                        coverUrl={leadSeries?.coverUrl}
                        label={leadSeries?.title || creator.name}
                        eyebrow={creator.name}
                        badge={getCreatorStoryBadge(leadSeries)}
                        fallbackVariant="minimal-card"
                        className="h-44 rounded-[20px]"
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                            {formatCreditTypeLabel(creator.creditType)}
                          </p>
                          <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
                            {creator.name}
                          </h3>
                        </div>
                        <span className={neutralChipClass}>
                          {formatTitleCountLabel(creator.titleCount)}
                        </span>
                      </div>

                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {buildCreatorWorksSummary(creator)}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {creatorGenres.map((genre) => (
                          <span
                            key={`${creator.slug}-featured-${genre}`}
                            className={neutralChipClass}
                          >
                            {genre}
                          </span>
                        ))}
                      </div>

                      {leadSeries?.title ? (
                        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--gush-ink-faint)]">
                          Lead title: {leadSeries.title}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </SurfacePanel>

        {guidedDiscoveryEntries.length > 0 ? (
          <SurfacePanel appearance="light" accent="blue" className="space-y-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                First picks
              </p>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Start with these titles.
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {guidedDiscoveryEntries.map(
                ({
                  id,
                  creator,
                  series,
                  canStartFromChapterOne: hasOpeningChapter,
                }) => (
                  <div
                    key={id}
                    className="rounded-[30px] border border-[color:var(--gush-border)] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)]"
                  >
                    <Link
                      href={
                        creator
                          ? buildSeriesHref(
                              series,
                              creator,
                              "CREATORS_HUB_GUIDED_TITLE",
                            )
                          : buildFallbackTitleHref(series)
                      }
                      onClick={(event) => {
                        if (creator) {
                          handleCreatorSeriesLinkClick(
                            event,
                            series,
                            creator,
                            "CREATORS_HUB_GUIDED_TITLE",
                          );
                          return;
                        }
                        handleFallbackTitleLinkClick(event, series);
                      }}
                      className="group block overflow-hidden rounded-[22px]"
                      aria-label={`Open ${series.title}`}
                    >
                      <Cover
                        tone={series?.coverTone}
                        coverUrl={series?.coverUrl}
                        label={series?.title}
                        eyebrow={
                          creator?.name || series?.subtitle || "Featured title"
                        }
                        badge={getCreatorStoryBadge(series)}
                        fallbackVariant="minimal-card"
                        className="h-56 rounded-[22px] transition-transform duration-500 group-hover:scale-[1.02]"
                      />
                    </Link>
                    <div className="mt-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                            {creator
                              ? formatCreditTypeLabel(creator.creditType)
                              : "Story pick"}
                          </p>
                          <h3 className="mt-2 font-display text-xl font-semibold tracking-tight text-slate-950">
                            <Link
                              href={
                                creator
                                  ? buildSeriesHref(
                                      series,
                                      creator,
                                      "CREATORS_HUB_GUIDED_TITLE",
                                    )
                                  : buildFallbackTitleHref(series)
                              }
                              onClick={(event) => {
                                if (creator) {
                                  handleCreatorSeriesLinkClick(
                                    event,
                                    series,
                                    creator,
                                    "CREATORS_HUB_GUIDED_TITLE",
                                  );
                                  return;
                                }
                                handleFallbackTitleLinkClick(event, series);
                              }}
                              className="transition-colors hover:text-[var(--gush-accent)]"
                            >
                              {series.title}
                            </Link>
                          </h3>
                        </div>
                        <span className={neutralChipClass}>
                          {creator?.name || series?.type || "Series"}
                        </span>
                      </div>

                      <p className="text-sm leading-6 text-slate-600">
                        {summarizeLeadCopy(
                          series?.description,
                          creator ? `From ${creator.name}.` : "Featured.",
                        )}
                      </p>

                      <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                        <span className={neutralChipClass}>
                          {series?.type || "Series"}
                        </span>
                        <span className={neutralChipClass}>
                          {series?.status || "Ongoing"}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <Link
                          href={
                            creator
                              ? buildSeriesHref(
                                  series,
                                  creator,
                                  "CREATORS_HUB_GUIDED_TITLE",
                                )
                              : buildFallbackTitleHref(series)
                          }
                          onClick={(event) => {
                            if (creator) {
                              handleCreatorSeriesLinkClick(
                                event,
                                series,
                                creator,
                                "CREATORS_HUB_GUIDED_TITLE",
                              );
                              return;
                            }
                            handleFallbackTitleLinkClick(event, series);
                          }}
                          className={primaryButtonClass}
                        >
                          {hasOpeningChapter ? "Read Chapter 1" : "Open series"}
                        </Link>
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          </SurfacePanel>
        ) : null}

        <SurfacePanel appearance="light" accent="blue" className="space-y-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              Browse
            </p>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Browse genres.
            </h2>
          </div>

          {genreOptions.length > 0 ? (
            <div className="flex flex-wrap gap-2.5">
              {genreOptions.map((genre) => (
                <button
                  key={`browse-genre-${genre}`}
                  type="button"
                  onClick={() => jumpToGenreBrowse(genre)}
                  className={filterButtonClass(activeGenre === genre)}
                >
                  {genre}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Use comics, novels, or search.
            </p>
          )}
        </SurfacePanel>

        <SurfacePanel
          id="creator-list"
          appearance="light"
          accent="blue"
          className="space-y-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Directory
              </p>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                All creators
              </h2>
            </div>
            <p className="text-sm text-slate-500">
              {filteredCreators.length.toLocaleString()} match
              {filteredCreators.length === 1 ? "" : "es"}
            </p>
          </div>
        </SurfacePanel>

        {filteredCreators.length === 0 ? (
          <SurfacePanel appearance="light" accent="blue">
            <EmptyState
              appearance="light"
              icon="search"
              eyebrow="No match"
              title="Try a broader search"
              description="Clear a filter or broaden the term."
              action={{
                label: "Show all",
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
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredCreators.map((creator) => {
                const leadSeries = getCreatorLeadSeries(creator);
                const creatorGenres = Array.isArray(creator?.topGenres)
                  ? creator.topGenres.slice(0, 2)
                  : [];

                return (
                  <Link
                    key={creator.slug}
                    href={buildCreatorHref(creator)}
                    onClick={(event) => handleCreatorLinkClick(event, creator)}
                    className={`group ${creatorCardClass}`}
                    aria-label={`Open ${creator.name}`}
                  >
                    <div className="grid gap-4 sm:grid-cols-[132px_minmax(0,1fr)]">
                      <Cover
                        tone={leadSeries?.coverTone}
                        coverUrl={leadSeries?.coverUrl}
                        label={leadSeries?.title || creator.name}
                        eyebrow={creator.name}
                        badge={getCreatorStoryBadge(leadSeries)}
                        fallbackVariant="minimal-card"
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
                          <span className={neutralChipClass}>
                            {formatTitleCountLabel(creator.titleCount)}
                          </span>
                        </div>

                        <p className="mt-3 text-sm leading-6 text-slate-600">
                          {buildCreatorWorksSummary(creator)}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {creatorGenres.map((genre) => (
                            <span
                              key={`${creator.slug}-grid-${genre}`}
                              className={neutralChipClass}
                            >
                              {genre}
                            </span>
                          ))}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
                          {buildCreatorShelfMeta(creator).map((item) => (
                            <span key={`${creator.slug}-list-meta-${item}`}>
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </SurfacePanel>
        )}
      </div>
    </main>
  );
}
