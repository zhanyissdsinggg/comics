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
      label: "Start here",
      value: leadCreator?.name || leadSeries?.title || "Top Series",
      hint: leadCreator
        ? `Open ${leadCreator.name} to branch into linked titles from one strong creator shelf.`
        : "Use Top Series while creator-linked shelves are still filling in.",
    },
    {
      label: "Free starts",
      value: stats.freeStarts > 0 ? `${stats.freeStarts} visible` : "Use title pages",
      hint: stats.freeStarts > 0
        ? "Creator shelves already surface titles with free first episodes."
        : "Free first episodes still show on title pages even when creator coverage is thin.",
    },
    {
      label: "Studio lane",
      value: leadStudio?.name || "Selected credits",
      hint: leadStudio
        ? "Studios with multiple visible titles get their own grouped shelf here."
        : "Studio grouping appears as soon as multi-title credits are visible.",
    },
    {
      label: "Top genre",
      value: genreOptions[0] || "Mixed catalog",
      hint: genreOptions[0]
        ? `${genreOptions[0]} is the clearest creator-led lane in the public directory right now.`
        : "Genre tags fill in as more creator-linked titles appear.",
    },
  ];
}

function buildCreatorShelfMeta(creator) {
  const meta = [];

  if (Number(creator?.freeStartCount || 0) > 0) {
    meta.push(`${creator.freeStartCount} start free`);
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

  return meta.length > 0 ? meta : ["Credits expanding"];
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
        eyebrow: "Live catalog",
        title: "Use comics and novels while creator shelves keep filling in.",
        description:
          "Visible title pages already carry creator and studio credits, so you can keep browsing even when a dedicated creator page is not public yet.",
        label: "Browse comics",
        href: "/comics",
      },
    ],
    [],
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
            secondary="Visible creator shelves come from public title credits. When a specific credit is not surfaced yet, search, Top Series, comics, and novels stay the clean fallback."
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
                  Start from a title
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  Use live titles until creator credits catch up.
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  When public creator credits are missing, the clean fallback is still to open a strong title first, then keep moving through comics, novels, Top Series, or search.
                </p>
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
          secondary="Creator pages open when credits are visible enough to browse cleanly. When a shelf is still thin, keep moving through Search or Top Series instead."
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
                Search series
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
                Pick a lane
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Browse by studio, creator, search, or fallback chart.
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                This page should help you move instead of explaining why metadata is incomplete. Pick the browse path that matches what you already know.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                {
                  eyebrow: "Studios",
                  title: featuredStudios.length > 0 ? `Open ${featuredStudios.length} visible studio shelves.` : "Browse studio-led shelves first.",
                  description: "Filter to studios when you want the fastest grouped shelf built from visible multi-title credits.",
                  cta: "See studios",
                  onClick: () => jumpToCreatorBrowse("studio"),
                },
                {
                  eyebrow: "Creators",
                  title: spotlightCreators[0]?.name ? `Start with ${spotlightCreators[0].name}.` : "Browse creator-led shelves.",
                  description: "Filter to creator pages when you want the clearest voice-led follow-up after one strong title.",
                  cta: "See creators",
                  onClick: () => jumpToCreatorBrowse("creator"),
                },
                {
                  eyebrow: "Search",
                  title: "Search title, creator, or studio.",
                  description: "Use Search when you already know the credit name, lead title, or genre lane you want.",
                  cta: "Open search",
                  onClick: () => router.push("/search"),
                },
                {
                  eyebrow: "Fallback",
                  title: "Use Top Series when creator shelves are still thin.",
                  description: "Top Series stays the safer first click when a creator credit is missing or you just want the strongest public entry point.",
                  cta: "Browse Top Series",
                  onClick: () => router.push("/rankings?type=popular&window=week"),
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
                  Open a strong creator shelf first.
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                {[featuredStudios.length > 0 ? `${featuredStudios.length} studio shelves` : "", featuredVoices.length > 0 ? `${featuredVoices.length} creator shelves` : ""]
                  .filter(Boolean)
                  .join(" | ") || "More shelves appear as credits get cleaner"}
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {[
                featuredStudios.length > 0
                  ? {
                      id: "studios",
                      title: "Studios with visible multi-title shelves",
                      items: featuredStudios,
                    }
                  : null,
                featuredVoices.length > 0
                  ? {
                      id: "creators",
                      title: "Creators worth opening first",
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
                              ? `Start with ${creator.spotlightSeries.title}, then fan out through the rest of this shelf.`
                              : "Open the creator page to see every visible title in one place.",
                          )}
                        </p>
                        {getCreatorTopTitles(creator, 2).length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {getCreatorTopTitles(creator, 2).map((title) => (
                              <span
                                key={`${group.id}-${creator.slug}-featured-title-${title}`}
                                className="rounded-full border border-black/8 bg-[#f8f9fc] px-3 py-1 text-xs text-slate-600"
                              >
                                {title}
                              </span>
                            ))}
                          </div>
                        ) : null}
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
                  <Link
                    href={buildSeriesHref(series, creator, "CREATORS_HUB_ENTRY_TITLE")}
                    onClick={(event) =>
                      handleCreatorSeriesLinkClick(event, series, creator, "CREATORS_HUB_ENTRY_TITLE")
                    }
                    className="group block overflow-hidden rounded-[22px]"
                    aria-label={`Open ${series.title}`}
                  >
                    <Cover
                      tone={series?.coverTone}
                      coverUrl={series?.coverUrl}
                      label={series?.title}
                      eyebrow={creator?.name}
                      badge={series?.badge}
                      className="h-56 rounded-[22px] transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                  </Link>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                          {formatCreditTypeLabel(creator.creditType)}
                        </p>
                        <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                          <Link
                            href={buildSeriesHref(series, creator, "CREATORS_HUB_ENTRY_TITLE")}
                            onClick={(event) =>
                              handleCreatorSeriesLinkClick(event, series, creator, "CREATORS_HUB_ENTRY_TITLE")
                            }
                            className="transition-colors hover:text-[var(--gush-accent,#2f6bff)]"
                          >
                            {series.title}
                          </Link>
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
                      <Link
                        href={buildSeriesHref(series, creator, "CREATORS_HUB_ENTRY_TITLE")}
                        onClick={(event) =>
                          handleCreatorSeriesLinkClick(event, series, creator, "CREATORS_HUB_ENTRY_TITLE")
                        }
                        className={primaryButtonClass}
                      >
                        Open title
                      </Link>
                      <Link
                        href={buildCreatorHref(creator, "CREATORS_HUB_ENTRY_SHELF")}
                        onClick={(event) => handleCreatorLinkClick(event, creator, "CREATORS_HUB_ENTRY_SHELF")}
                        className={secondaryButtonClass}
                      >
                        Open creator
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SurfacePanel>
        ) : null}

        <SurfacePanel id="creator-filters" appearance="light" accent="blue" className="space-y-5">
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
