"use client";

import Link from "next/link";
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
import { slugifyCreatorName } from "../../lib/creators";
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

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getSeriesSignalScore(series) {
  return Math.max(
    toNumber(series?.followers),
    toNumber(series?.views),
    toNumber(series?.ratingCount),
    Math.round(toNumber(series?.rating) * 100),
  );
}

function getFallbackSeriesBadge(series) {
  if (String(series?.status || "").toLowerCase() === "completed") {
    return "Completed";
  }
  if (Number(series?.freeEpisodeCount || 0) > 0 || series?.hasFreeEpisodes) {
    return "Free";
  }

  const badges = [series?.badge, ...(Array.isArray(series?.badges) ? series.badges : [])]
    .filter(Boolean)
    .map((badge) => String(badge).trim());

  return badges[0] || "";
}

function buildFallbackSeriesSubtitle(series) {
  if (Array.isArray(series?.genres) && series.genres.length > 0) {
    return series.genres.slice(0, 2).join(" / ");
  }
  if (Number(series?.freeEpisodeCount || 0) > 0 || series?.hasFreeEpisodes) {
    const freeCount = Number(series?.freeEpisodeCount || 0);
    return `${freeCount} free chapter${freeCount === 1 ? "" : "s"}`;
  }
  if (series?.updatedAt) {
    return formatDateLabel(series.updatedAt);
  }
  return String(series?.type || "Series");
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

function buildCreatorDirectoryHeroStats({
  creators,
  featuredStudios,
  genreOptions,
  spotlightCreators,
  stats,
}) {
  const leadCreator = spotlightCreators[0] || creators[0] || null;
  const leadStudio = featuredStudios[0] || creators.find((creator) => creator?.creditType === "studio") || null;
  const leadSeries = leadCreator?.spotlightSeries || creators[0]?.spotlightSeries || null;

  return [
    {
      label: "Featured",
      value: leadCreator?.name || leadSeries?.title || "Top Series",
      hint: "",
    },
    {
      label: "Free starts",
      value: stats.freeStarts > 0 ? `${stats.freeStarts} free starts` : "Title pages",
      hint: "",
    },
    {
      label: "Studios",
      value: leadStudio?.name || "Studio picks",
      hint: "",
    },
    {
      label: "Genre",
      value: genreOptions[0] || "Mixed catalog",
      hint: "",
    },
  ];
}

function buildCreatorShelfMeta(creator) {
  const meta = [];

  if (Number(creator?.freeStartCount || 0) > 0) {
    meta.push(`${creator.freeStartCount} free start${Number(creator.freeStartCount) === 1 ? "" : "s"}`);
  }
  if (Number(creator?.ongoingCount || 0) > 0) {
    meta.push(`${creator.ongoingCount} active`);
  }
  if (Number(creator?.completedCount || 0) > 0) {
    meta.push(`${creator.completedCount} completed`);
  }
  if (creator?.latestUpdatedAt) {
    meta.push(formatDateLabel(creator.latestUpdatedAt));
  }

  return meta.length > 0 ? meta : ["Curated shelf"];
}

function CreatorDirectorySkeleton() {
  return (
    <main className="gush-page-shell">
      <div className="gush-page-ambient" />
      <SiteHeader variant="light" />
      <div className="gush-page-main gush-section-stack">
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
  const fallbackEntryTitles = useMemo(
    () =>
      [...catalog]
        .filter((series) => series?.id)
        .sort((left, right) => {
          const rightFree = Number(right?.freeEpisodeCount || 0) > 0 || right?.hasFreeEpisodes ? 1 : 0;
          const leftFree = Number(left?.freeEpisodeCount || 0) > 0 || left?.hasFreeEpisodes ? 1 : 0;
          if (rightFree !== leftFree) {
            return rightFree - leftFree;
          }

          const scoreDelta = getSeriesSignalScore(right) - getSeriesSignalScore(left);
          if (scoreDelta !== 0) {
            return scoreDelta;
          }

          return Date.parse(right?.updatedAt || 0) - Date.parse(left?.updatedAt || 0);
        })
        .slice(0, 4)
        .map((series) => ({
          id: series.id,
          title: series.title,
          subtitle: buildFallbackSeriesSubtitle(series),
          genres: Array.isArray(series?.genres) ? series.genres : [],
          type: series?.type || "",
          seriesType: series?.type || "",
          status: series?.status || "",
          freeEpisodeCount: Number(series?.freeEpisodeCount || 0),
          author: series?.author || "",
          adult: Boolean(series?.adult),
          coverUrl: series.coverUrl,
          coverTone: series.coverTone,
          badge: getFallbackSeriesBadge(series),
        })),
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
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 6)
      .map(([genre, count]) => ({ genre, count }));
  }, [catalog]);
  const creatorFallbackCards = useMemo(
    () => [
      {
        eyebrow: "Find a creator",
        title: "Search by creator, studio, or title.",
        description: "",
        label: "Search",
        href: "/search",
      },
      {
        eyebrow: "Editor picks",
        title: "Featured creators.",
        description: "",
        label: "View Top Series",
        href: "/rankings?type=popular&window=week",
      },
      {
        eyebrow: "Browse more",
        title: "Browse by format.",
        description: "",
        label: "Explore Comics",
        href: "/comics",
      },
    ],
    [],
  );
  const creatorLookup = useMemo(
    () => new Map(creators.map((creator) => [creator.slug, creator])),
    [creators],
  );

  const heroStats = useMemo(
    () =>
      buildCreatorDirectoryHeroStats({
        creators,
        featuredStudios,
        genreOptions,
        spotlightCreators,
        stats,
      }),
    [creators, featuredStudios, genreOptions, spotlightCreators, stats],
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
  const jumpToCreatorBrowse = (nextCredit = "all") => {
    setQuery("");
    setActiveGenre("All");
    setCreditFilter(nextCredit);

    if (typeof document === "undefined") {
      return;
    }

    window.requestAnimationFrame(() => {
      document.getElementById("creator-filters")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };
  const jumpToGenreBrowse = (genre) => {
    setQuery("");
    setCreditFilter("all");
    setActiveGenre(genre || "All");

    if (typeof document === "undefined") {
      return;
    }

    window.requestAnimationFrame(() => {
      document.getElementById("creator-filters")?.scrollIntoView({ behavior: "smooth", block: "start" });
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

  const handleCreatorLinkClick = (event, creator, entryPoint = "CREATORS_HUB_GRID") => {
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

  const buildSeriesHref = (series, creator, entryPoint = "CREATORS_HUB_TITLE") => {
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
            freeStarts: Number(series?.freeEpisodeCount || 0),
          };
        })
        .filter(Boolean),
    [spotlightCreators],
  );
  const guidedDiscoveryEntries = useMemo(() => {
    const entries = [];
    const seenSeriesIds = new Set();

    creatorEntryTitles.forEach(({ creator, series, freeStarts }) => {
      if (!series?.id || seenSeriesIds.has(series.id)) {
        return;
      }

      seenSeriesIds.add(series.id);
      entries.push({
        id: `creator-${series.id}`,
        mode: "creator",
        creator,
        series,
        freeStarts,
      });
    });

    fallbackEntryTitles.forEach((series) => {
      if (!series?.id || seenSeriesIds.has(series.id) || entries.length >= 4) {
        return;
      }

      const linkedCreator = series.author
        ? creatorLookup.get(slugifyCreatorName(series.author))
        : null;

      seenSeriesIds.add(series.id);
      entries.push({
        id: `story-${series.id}`,
        mode: linkedCreator ? "creator" : "story",
        creator: linkedCreator,
        series,
        freeStarts: Number(series?.freeEpisodeCount || 0),
      });
    });

    return entries.slice(0, 4);
  }, [creatorEntryTitles, creatorLookup, fallbackEntryTitles]);

  if (loading) {
    return <CreatorDirectorySkeleton />;
  }

  if (error) {
    return (
      <main className="gush-page-shell">
        <div className="gush-page-ambient" />
        <SiteHeader variant="light" />
        <div className="relative mx-auto max-w-[960px] px-4 py-12 sm:px-6">
          <SurfacePanel appearance="light" tone="danger" accent="rose">
            <EmptyState
              appearance="light"
              icon="alert"
              eyebrow="Load issue"
              title="Couldn't open the creator directory."
              description="Reload the page, or jump into Search while the directory reconnects."
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
      <main className="gush-page-shell">
        <div className="gush-page-ambient" />
        <SiteHeader variant="light" />
        <div className="relative mx-auto max-w-[1280px] space-y-6 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
          <EditorialHero
            appearance="light"
            accent="blue"
            eyebrow="Creators"
            title="Creator shelves."
            description="Writers, artists, and studios in one place."
            stats={heroStats}
            actions={
              <>
                <button
                  type="button"
                  onClick={() => router.push("/search")}
                  className={primaryButtonClass}
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/rankings?type=popular&window=week")}
                  className={secondaryButtonClass}
                >
                  View Top Series
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
                  Lead titles
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  Lead titles.
                </h2>
              </div>

              {fallbackEntryTitles.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {fallbackEntryTitles.map((series) => (
                    <Link
                      key={`creator-fallback-${series.id}`}
                      href={buildFallbackTitleHref(series)}
                      onClick={(event) => handleFallbackTitleLinkClick(event, series)}
                      className="group block overflow-hidden rounded-[28px] border border-black/6 bg-white text-left shadow-[0_18px_42px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-black/10 hover:shadow-[0_22px_48px_rgba(15,23,42,0.08)]"
                      aria-label={`Open ${series.title}`}
                    >
                      <div className="relative aspect-[3/4] overflow-hidden bg-neutral-900">
                        <Cover
                          tone={series.coverTone}
                          coverUrl={series.coverUrl}
                          label={series.title}
                          eyebrow={series.subtitle}
                          badge={series.badge}
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

              {fallbackGenrePicks.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {fallbackGenrePicks.map((item) => (
                    <button
                      key={`creator-fallback-genre-${item.genre}`}
                      type="button"
                      onClick={() => router.push(`/search?q=${encodeURIComponent(item.genre)}&sort=popular`)}
                      className="rounded-full border border-black/8 bg-[#f8f9fc] px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-white hover:text-slate-950"
                    >
                      {item.genre}
                      <span className="ml-2 text-xs text-slate-400">{item.count}</span>
                    </button>
                  ))}
                </div>
              ) : null}

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
                  Explore Novels
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/rankings")}
                  className={secondaryButtonClass}
                >
                  View Top Series
                </button>
              </div>
            </SurfacePanel>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="gush-page-shell">
      <div className="gush-page-ambient" />
      <SiteHeader variant="light" />

      <div className="relative mx-auto max-w-[1280px] space-y-6 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <EditorialHero
          appearance="light"
          accent="blue"
          eyebrow="Creators"
          title="Creator shelves."
          description="Writers, artists, and studios in one place."
          stats={heroStats}
          actions={
            <>
              <button
                type="button"
                onClick={() => router.push("/rankings?type=popular&window=week")}
                className={primaryButtonClass}
              >
                View Top Series
              </button>
              <button
                type="button"
                onClick={() => router.push("/search")}
                className={secondaryButtonClass}
              >
                Search
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
                Browse paths
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Ways in.
              </h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                {
                  eyebrow: "Studios",
                  title: featuredStudios.length > 0 ? `${featuredStudios.length} studio shelves.` : "Studio shelves.",
                  description: "Shared teams and linked titles in one place.",
                  cta: "View Studios",
                  onClick: () => jumpToCreatorBrowse("studio"),
                },
                {
                  eyebrow: "Creators",
                  title: spotlightCreators[0]?.name ? spotlightCreators[0].name : "Creator shelves.",
                  description: "A closer read of one voice.",
                  cta: "View Creators",
                  onClick: () => jumpToCreatorBrowse("creator"),
                },
                {
                  eyebrow: "Search",
                  title: "Search a creator, studio, or title.",
                  description: "Open a name you already know.",
                  cta: "Search",
                  onClick: () => router.push("/search"),
                },
                {
                  eyebrow: "Story lanes",
                  title: genreOptions[0] ? `Explore ${genreOptions[0]}.` : "Story lanes.",
                  description: genreOptions[0]
                    ? `Creator shelves in ${genreOptions[0]}.`
                    : "A broader way into the catalog.",
                  cta: genreOptions[0] ? `Explore ${genreOptions[0]}` : "View Top Series",
                  onClick: () =>
                    genreOptions[0] ? jumpToGenreBrowse(genreOptions[0]) : router.push("/rankings?type=popular&window=week"),
                },
              ].map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={item.onClick}
                  className="rounded-[22px] border border-black/6 bg-[#f8f9fc] px-4 py-4 text-left transition hover:border-black/12 hover:bg-white"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    {item.eyebrow}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-950">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
                  <span className="mt-4 inline-flex text-xs font-semibold text-[var(--gush-accent,#2f6bff)]">
                    {item.cta}
                  </span>
                </button>
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
                  Featured shelves.
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                {[featuredStudios.length > 0 ? `${featuredStudios.length} studio shelves` : "", featuredVoices.length > 0 ? `${featuredVoices.length} creator shelves` : ""]
                  .filter(Boolean)
                  .join(" | ") || "Curated shelves ready to browse"}
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {[
                featuredStudios.length > 0
                  ? {
                      id: "studios",
                      title: "Studios with standout catalogs",
                      items: featuredStudios,
                    }
                  : null,
                featuredVoices.length > 0
                  ? {
                      id: "creators",
                      title: "Creators worth following next",
                      items: featuredVoices,
                    }
                  : null,
              ]
                .filter(Boolean)
                .map((group) => (
                  <div key={group.id} className="space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                      {group.title}
                    </p>
                    {group.items.map((creator) => (
                      <Link
                        key={`featured-${group.id}-${creator.slug}`}
                        href={buildCreatorHref(creator, "CREATORS_HUB_FEATURED")}
                        onClick={(event) => handleCreatorLinkClick(event, creator, "CREATORS_HUB_FEATURED")}
                        className="block w-full rounded-[24px] border border-black/6 bg-white/90 px-4 py-4 text-left shadow-[0_12px_28px_rgba(15,23,42,0.04)] transition hover:border-black/12 hover:bg-white"
                        aria-label={`Open ${creator.name}`}
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
                              ? `Featuring ${creator.spotlightSeries.title}.`
                              : "Titles from this creator or studio.",
                          )}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                          {buildCreatorShelfMeta(creator).map((item) => (
                            <span key={`${group.id}-${creator.slug}-featured-meta-${item}`}>{item}</span>
                          ))}
                        </div>
                      </Link>
                    ))}
                  </div>
                ))}
            </div>
          </SurfacePanel>
        </section>

        {guidedDiscoveryEntries.length > 0 ? (
          <SurfacePanel appearance="light" accent="blue" className="space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Editor-led discovery
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  Open a standout work, then follow the creator trail.
                </h2>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {guidedDiscoveryEntries.map(({ id, creator, series, freeStarts, mode }) => (
                <div
                  key={id}
                  className="rounded-[28px] border border-black/6 bg-white p-4 shadow-[0_18px_42px_rgba(15,23,42,0.06)]"
                >
                  <Link
                    href={
                      creator
                        ? buildSeriesHref(series, creator, "CREATORS_HUB_GUIDED_TITLE")
                        : buildFallbackTitleHref(series)
                    }
                    onClick={(event) => {
                      if (creator) {
                        handleCreatorSeriesLinkClick(event, series, creator, "CREATORS_HUB_GUIDED_TITLE");
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
                      eyebrow={creator?.name || series?.subtitle || "Featured title"}
                      badge={series?.badge}
                      className="h-56 rounded-[22px] transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                  </Link>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                          {creator ? formatCreditTypeLabel(creator.creditType) : "Story pick"}
                        </p>
                        <h3 className="mt-2 font-display text-xl font-semibold tracking-tight text-slate-950">
                          <Link
                            href={
                              creator
                                ? buildSeriesHref(series, creator, "CREATORS_HUB_GUIDED_TITLE")
                                : buildFallbackTitleHref(series)
                            }
                            onClick={(event) => {
                              if (creator) {
                                handleCreatorSeriesLinkClick(event, series, creator, "CREATORS_HUB_GUIDED_TITLE");
                                return;
                              }
                              handleFallbackTitleLinkClick(event, series);
                            }}
                            className="transition-colors hover:text-[var(--gush-accent,#2f6bff)]"
                          >
                            {series.title}
                          </Link>
                        </h3>
                      </div>
                      <span className="rounded-full border border-black/8 bg-[#f8f9fc] px-3 py-1 text-xs text-slate-600">
                        {creator?.name || series?.type || "Series"}
                      </span>
                    </div>

                    <p className="text-sm leading-6 text-slate-600">
                      {summarizeLeadCopy(
                        series?.description,
                        creator
                          ? `From ${creator.name}.`
                          : "Featured.",
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
                      <Link
                        href={
                          creator
                            ? buildSeriesHref(series, creator, "CREATORS_HUB_GUIDED_TITLE")
                            : buildFallbackTitleHref(series)
                        }
                        onClick={(event) => {
                          if (creator) {
                            handleCreatorSeriesLinkClick(event, series, creator, "CREATORS_HUB_GUIDED_TITLE");
                            return;
                          }
                          handleFallbackTitleLinkClick(event, series);
                        }}
                        className={primaryButtonClass}
                      >
                        View Series
                      </Link>
                      {creator ? (
                        <Link
                          href={buildCreatorHref(creator, "CREATORS_HUB_GUIDED_SHELF")}
                          onClick={(event) => handleCreatorLinkClick(event, creator, "CREATORS_HUB_GUIDED_SHELF")}
                          className={secondaryButtonClass}
                        >
                          View Creator
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              series?.genres?.[0]
                                ? `/search?q=${encodeURIComponent(series.genres[0])}&sort=popular`
                                : series?.type === "novel"
                                  ? "/novels"
                                  : "/comics",
                            )
                          }
                          className={secondaryButtonClass}
                        >
                          {series?.type === "novel" ? "Explore Novels" : "Explore Comics"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {fallbackGenrePicks.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {fallbackGenrePicks.slice(0, 6).map((item) => (
                  <button
                    key={`creator-guided-genre-${item.genre}`}
                    type="button"
                    onClick={() => router.push(`/search?q=${encodeURIComponent(item.genre)}&sort=popular`)}
                    className="rounded-full border border-black/8 bg-[#f8f9fc] px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-white hover:text-slate-950"
                  >
                    {item.genre}
                    <span className="ml-2 text-xs text-slate-400">{item.count}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </SurfacePanel>
        ) : null}

        <SurfacePanel id="creator-filters" appearance="light" accent="blue" className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Creators
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  Search creators, studios, or titles.
                </h2>
              </div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-slate-500">
                {filteredCreators.length.toLocaleString()} creator shel{filteredCreators.length === 1 ? "f" : "ves"} shown
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
              placeholder="Search creators, studios, or titles"
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

            {genreOptions.length > 0 ? (
              <>
                <details className="overflow-hidden rounded-[20px] border border-black/8 bg-white sm:hidden">
                  <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-900">
                    Browse genres
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      {activeGenre === "All" ? `${genreOptions.length} lanes` : activeGenre}
                    </span>
                  </summary>
                  <div className="flex flex-wrap gap-2.5 border-t border-black/8 px-4 py-4">
                    {["All", ...genreOptions].map((genre) => (
                      <button
                        key={`mobile-${genre}`}
                        type="button"
                        onClick={() => setActiveGenre(genre)}
                        className={filterButtonClass(activeGenre === genre)}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </details>

                <div className="hidden flex-wrap gap-2.5 sm:flex">
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
              </>
            ) : null}
          </div>
        </SurfacePanel>

        {spotlightCreators.length > 0 ? (
          <SurfacePanel appearance="light" accent="blue" className="space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Featured
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  Featured shelves.
                </h2>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              {spotlightCreators.map((creator) => {
                const creatorGenres = Array.isArray(creator?.topGenres) ? creator.topGenres.slice(0, 2) : [];

                return (
                  <Link
                    key={creator.slug}
                    href={buildCreatorHref(creator, "CREATORS_HUB_SPOTLIGHT")}
                    onClick={(event) => handleCreatorLinkClick(event, creator, "CREATORS_HUB_SPOTLIGHT")}
                    className="group block rounded-[30px] border border-black/6 bg-white p-4 text-left shadow-[0_18px_42px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-black/10 hover:shadow-[0_22px_48px_rgba(15,23,42,0.08)]"
                    aria-label={`Open ${creator.name}`}
                  >
                    <Cover
                      tone={creator.spotlightSeries?.coverTone}
                      coverUrl={creator.spotlightSeries?.coverUrl}
                      label={creator.spotlightSeries?.title || creator.name}
                      eyebrow={creator.name}
                      badge={creator.spotlightSeries?.badge}
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
                            ? `Featuring ${creator.spotlightSeries.title}.`
                            : "Linked titles from this creator or studio.",
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

                      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                        {buildCreatorShelfMeta(creator).map((item) => (
                          <span key={`${creator.slug}-spotlight-meta-${item}`}>{item}</span>
                        ))}
                      </div>
                    </div>
                  </Link>
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
              eyebrow="No match"
              title="Try a wider search."
              description="Clear a filter or widen the search."
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
                  Creator directory.
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
                const creatorGenres = Array.isArray(creator?.topGenres) ? creator.topGenres.slice(0, 2) : [];

                return (
                  <Link
                    key={creator.slug}
                    href={buildCreatorHref(creator)}
                    onClick={(event) => handleCreatorLinkClick(event, creator)}
                    className="group block rounded-[28px] border border-black/6 bg-white p-4 text-left shadow-[0_18px_42px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-black/10 hover:shadow-[0_22px_48px_rgba(15,23,42,0.08)]"
                    aria-label={`Open ${creator.name}`}
                  >
                    <div className="grid gap-4 sm:grid-cols-[132px_minmax(0,1fr)]">
                      <Cover
                        tone={creator.spotlightSeries?.coverTone}
                        coverUrl={creator.spotlightSeries?.coverUrl}
                        label={creator.spotlightSeries?.title || creator.name}
                        eyebrow={creator.name}
                        badge={creator.spotlightSeries?.badge}
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
                              ? `Featuring ${creator.spotlightSeries.title}.`
                              : "Linked titles in one place.",
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

                        <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
                          {buildCreatorShelfMeta(creator).map((item) => (
                            <span key={`${creator.slug}-list-meta-${item}`}>{item}</span>
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
