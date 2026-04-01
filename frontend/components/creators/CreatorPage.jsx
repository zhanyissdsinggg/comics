"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SiteHeader from "../layout/SiteHeader";
import Cover from "../common/Cover";
import EmptyState from "../common/EmptyState";
import NetworkFallback from "../common/NetworkFallback";
import EditorialHero from "../common/EditorialHero";
import SurfacePanel from "../common/SurfacePanel";
import SkeletonCard from "../common/SkeletonCard";
import PortraitCard from "../home/PortraitCard";
import CommerceSuccessBanner from "../common/CommerceSuccessBanner";
import StorefrontPathwaysGrid from "../common/StorefrontPathwaysGrid";
import { apiGet } from "../../lib/apiClient";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import {
  buildPathWithAttribution,
  loadPersistedPaymentAttribution,
  mergePaymentAttribution,
  persistPaymentAttribution,
  readPaymentAttributionFromSearchParams,
} from "../../lib/paymentAttribution";
import {
  consumeCommerceSuccessForPath,
  getCommerceSuccessPresentation,
} from "../../lib/commerceSuccess";
import {
  buildCreatorPathFromSlug,
  humanizeCreatorSlug,
  slugifyCreatorName,
} from "../../lib/creators";
import {
  resolveCreatorIdentity,
  resolveSeriesCreatorIdentity,
  seriesMatchesCreatorSlug,
} from "../../lib/creatorIdentity";

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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

function getCatalogPriority(series) {
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

function getCreatorShelfBadge(series) {
  if (String(series?.status || "").toLowerCase() === "completed") {
    return "Completed";
  }

  const updatedAtMs = Date.parse(series?.updatedAt || 0);
  if (!Number.isNaN(updatedAtMs) && updatedAtMs >= Date.now() - 14 * 24 * 60 * 60 * 1000) {
    return "Updated";
  }

  const episodeCount = Math.max(0, Number(series?.episodeCount || 0));
  if (episodeCount > 0 && episodeCount <= 12) {
    return "Start here";
  }

  return "";
}

function getTopGenres(items) {
  const counts = new Map();

  items.forEach((item) => {
    (Array.isArray(item?.genres) ? item.genres : []).forEach((genre) => {
      const key = String(genre || "").trim();
      if (!key) {
        return;
      }
      counts.set(key, (counts.get(key) || 0) + 1);
    });
  });

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([genre]) => genre);
}

function buildCreatorItems(seriesList, creatorSlug) {
  return seriesList
    .filter((item) => item?.id && seriesMatchesCreatorSlug(item, creatorSlug))
    .sort((left, right) => {
      const popularityDelta = getCatalogPriority(right) - getCatalogPriority(left);
      if (popularityDelta !== 0) {
        return popularityDelta;
      }

      return new Date(right?.updatedAt || 0) - new Date(left?.updatedAt || 0);
    });
}

function getSpotlightSeries(items, originSeriesId) {
  if (!items.length) {
    return null;
  }

  if (originSeriesId) {
    const matched = items.find((item) => item.id === originSeriesId);
    if (matched) {
      return matched;
    }
  }

  return items[0];
}

function formatTitleCountLabel(count) {
  return `${count} title${count === 1 ? "" : "s"}`;
}

function formatCreatorCreditTypeLabel(creditType) {
  if (creditType === "studio") {
    return "Studio";
  }

  if (creditType === "team") {
    return "Team";
  }

  return "Creator";
}

function getCreatorHeroCopy(creatorName, creditType, topGenres) {
  const genreLabel = topGenres.slice(0, 2).join(" and ");

  if (creditType === "studio") {
    return {
      title: "More from this studio.",
      description: genreLabel
        ? `${genreLabel} stories from the same credited studio.`
        : "Stories from the same credited studio.",
    };
  }

  if (creditType === "team") {
    return {
      title: "More from this team.",
      description: genreLabel
        ? `${genreLabel} stories from the same credited team.`
        : "Stories from the same credited team.",
    };
  }

  return {
    title: `More from ${creatorName}.`,
    description: genreLabel
      ? `${creatorName}'s ${genreLabel} work in one place.`
      : `${creatorName}'s published stories in one place.`,
  };
}

function CreatorPageSkeleton() {
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
                  key={`creator-hero-skeleton-${index}`}
                  className="h-28 animate-pulse rounded-[24px] border border-black/6 bg-white/80"
                />
              ))}
            </div>
          </div>
        </SurfacePanel>

        <SurfacePanel appearance="light" accent="blue">
          <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div className="aspect-[3/4] animate-pulse rounded-[28px] border border-black/6 bg-white/85" />
            <div className="space-y-4">
              <div className="h-4 w-32 animate-pulse rounded-full bg-slate-200" />
              <div className="h-12 w-full max-w-2xl animate-pulse rounded-[24px] bg-slate-200" />
              <div className="h-24 w-full animate-pulse rounded-[24px] bg-slate-200" />
              <div className="grid gap-3 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={`creator-spotlight-skeleton-${index}`}
                    className="h-28 animate-pulse rounded-[24px] border border-black/6 bg-white/80"
                  />
                ))}
              </div>
            </div>
          </div>
        </SurfacePanel>

        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
            <SkeletonCard key={`creator-grid-skeleton-${index}`} appearance="light" />
          ))}
        </div>
      </div>
    </main>
  );
}

export default function CreatorPage({
  creatorSlug,
  initialCatalog = [],
  hasInitialCatalog = false,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAdultMode, forceDisableAdultMode } = useAdultGateStore();
  const [catalog, setCatalog] = useState(Array.isArray(initialCatalog) ? initialCatalog : []);
  const [loading, setLoading] = useState(!hasInitialCatalog);
  const [error, setError] = useState("");
  const [commerceNotice, setCommerceNotice] = useState(null);
  const [retryTick, setRetryTick] = useState(0);
  const requestRef = useRef(0);

  const creatorPath = useMemo(
    () => buildCreatorPathFromSlug(creatorSlug),
    [creatorSlug],
  );
  const routeAttribution = useMemo(
    () => readPaymentAttributionFromSearchParams(searchParams),
    [searchParams],
  );
  const retryCreatorPage = useCallback(() => {
    setRetryTick((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!routeAttribution) {
      return;
    }

    const attribution = mergePaymentAttribution(
      loadPersistedPaymentAttribution(),
      routeAttribution,
    );
    if (attribution) {
      persistPaymentAttribution(attribution);
    }
  }, [routeAttribution]);

  useEffect(() => {
    setCommerceNotice(
      getCommerceSuccessPresentation(consumeCommerceSuccessForPath(creatorPath)),
    );
  }, [creatorPath]);

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
            setError(response.error || "Unable to load creator page.");
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
  }, [forceDisableAdultMode, hasInitialCatalog, isAdultMode, retryTick]);

  const creatorItems = useMemo(
    () => buildCreatorItems(catalog, creatorSlug),
    [catalog, creatorSlug],
  );
  const routeCreatorName = useMemo(() => humanizeCreatorSlug(creatorSlug), [creatorSlug]);
  const creatorIdentity = useMemo(() => {
    if (creatorItems.length > 0) {
      return resolveSeriesCreatorIdentity(creatorItems[0]);
    }

    return resolveCreatorIdentity(routeCreatorName);
  }, [creatorItems, routeCreatorName]);
  const creatorName = creatorIdentity.hasPublicCredit
    ? creatorIdentity.displayName
    : routeCreatorName || creatorIdentity.displayName;
  const creatorSlugKey = useMemo(
    () => creatorIdentity.slug || creatorSlug || slugifyCreatorName(creatorName),
    [creatorIdentity.slug, creatorName, creatorSlug],
  );
  const topGenres = useMemo(() => getTopGenres(creatorItems), [creatorItems]);
  const originSeriesId = routeAttribution?.sourceSeriesId || "";
  const originSeries = useMemo(
    () => creatorItems.find((item) => item.id === originSeriesId) || null,
    [creatorItems, originSeriesId],
  );
  const spotlightSeries = useMemo(
    () => getSpotlightSeries(creatorItems, originSeriesId),
    [creatorItems, originSeriesId],
  );

  const heroCopy = useMemo(
    () => getCreatorHeroCopy(creatorName, creatorIdentity.creditType, topGenres),
    [creatorIdentity.creditType, creatorName, topGenres],
  );

  const creatorStats = useMemo(() => {
    const completedCount = creatorItems.filter(
      (item) => String(item?.status || "").toLowerCase() === "completed",
    ).length;
    const strongestGenre = topGenres[0] || "Mixed";
    const formatLabel = Array.from(
      new Set(
        creatorItems
          .map((item) => String(item?.type || "").trim())
          .filter(Boolean),
      ),
    )
      .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
      .join(" / ") || "Series";
    const latestUpdatedAt = creatorItems[0]?.updatedAt;

    return [
      {
        label: "Stories",
        value: formatTitleCountLabel(creatorItems.length),
        hint: "Published titles on this page.",
      },
      {
        label: "Format",
        value: formatLabel,
        hint: "Available on Gush.",
      },
      {
        label: "Status",
        value: completedCount > 0 ? `${completedCount} complete` : "Mostly ongoing",
        hint: completedCount > 0 ? "Finished stories are included here too." : "Most titles on this page are still ongoing.",
      },
      {
        label: "Latest",
        value: latestUpdatedAt ? formatDateLabel(latestUpdatedAt) : "Catalog",
        hint: latestUpdatedAt ? "Most recent update on this page." : "Updates will appear here once available.",
      },
      {
        label: "Genre",
        value: strongestGenre,
        hint: topGenres.length > 1
          ? `${topGenres.slice(0, 2).join(" / ")} show up most often here.`
          : "A notable genre on this page.",
      },
    ];
  }, [creatorItems, topGenres]);

  const spotlightMeta = useMemo(() => {
    if (!spotlightSeries) {
      return [];
    }

    const isCompleted = String(spotlightSeries?.status || "").toLowerCase() === "completed";

    return [
      isCompleted ? "Completed" : `Updated ${formatDateLabel(spotlightSeries?.updatedAt)}`,
      Array.isArray(spotlightSeries?.genres) && spotlightSeries.genres.length > 0
        ? spotlightSeries.genres.slice(0, 2).join(" / ")
        : "Best entry point on this shelf",
    ].filter(Boolean);
  }, [spotlightSeries]);

  const primaryButtonClass =
    "rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800";
  const secondaryButtonClass =
    "rounded-full border border-black/8 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-black/12 hover:bg-[#f8f9fc]";

  const handleOpenTitle = useCallback(
    (series) => {
      if (!series?.id) {
        return;
      }

      const targetPath = `/series/${series.id}`;
      router.push(
        buildPathWithAttribution(targetPath, {
          entryPoint: "CREATOR_PAGE",
          campaignId: creatorSlugKey,
          sourcePath: creatorPath,
          sourceSeriesId: series.id,
          returnTo: targetPath,
        }),
      );
    },
    [creatorPath, creatorSlugKey, router],
  );

  const handleBrowseGenre = useCallback(() => {
    const primaryGenre = topGenres[0];
    if (!primaryGenre) {
      router.push("/search?sort=latest");
      return;
    }

    router.push(`/search?genre=${encodeURIComponent(primaryGenre)}&sort=latest`);
  }, [router, topGenres]);

  const handleReturn = useCallback(() => {
    const returnTo = routeAttribution?.returnTo;
    if (returnTo) {
      router.push(returnTo);
      return;
    }

    if (originSeriesId) {
      router.push(`/series/${originSeriesId}`);
      return;
    }

    router.push("/search");
  }, [originSeriesId, routeAttribution?.returnTo, router]);

  const gridItems = useMemo(
    () =>
      creatorItems.map((item) => ({
        ...item,
        subtitle:
          Array.isArray(item?.genres) && item.genres.length > 0
            ? item.genres.slice(0, 2).join(" | ")
            : String(item?.status || "Series"),
      })),
    [creatorItems],
  );
  const creatorPathways = useMemo(
    () => [
      spotlightSeries
        ? {
            id: "lead-title",
            eyebrow: "Spotlight",
            title: `View ${spotlightSeries.title}.`,
            description: "The lead title on this shelf.",
            cta: "View Series",
            onClick: () => handleOpenTitle(spotlightSeries),
            accentClass:
              "border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.08)] text-slate-900 hover:border-[rgba(47,107,255,0.2)] hover:bg-[rgba(47,107,255,0.12)]",
          }
        : null,
      {
        id: "genre",
        eyebrow: "Genres",
        title: topGenres[0] ? `Explore ${topGenres[0]}.` : "Explore similar reads.",
        description: "Browse more stories with a similar tone.",
        cta: topGenres[0] ? `Explore ${topGenres[0]}` : "Explore Reads",
        onClick: handleBrowseGenre,
        accentClass:
          "border-black/8 bg-white text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]",
      },
      {
        id: "return",
        eyebrow: "Back",
        title: originSeries ? `Back to ${originSeries.title}.` : "Go back.",
        description: originSeries
          ? "Return to the title that led you here."
          : "Return to your last page.",
        cta: originSeries ? `Back to ${originSeries.title}` : "Go back",
        onClick: handleReturn,
        accentClass:
          "border-black/8 bg-white text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]",
      },
    ].filter(Boolean),
    [handleBrowseGenre, handleOpenTitle, handleReturn, originSeries, spotlightSeries, topGenres],
  );
  const emptyCreatorPathways = useMemo(
    () => [
      {
        id: "search-series",
        eyebrow: "Search",
        title: `Search ${creatorName}.`,
        description: "Open the wider catalog around this name.",
        cta: "Search",
        onClick: () => router.push(`/search?q=${encodeURIComponent(creatorName)}&sort=latest`),
        accentClass:
          "border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.08)] text-slate-900 hover:border-[rgba(47,107,255,0.2)] hover:bg-[rgba(47,107,255,0.12)]",
      },
      {
        id: "featured-series",
        eyebrow: "Featured Series",
        title: "Featured Series",
        description: "A broader editorial mix across the catalog.",
        cta: "Browse Series",
        onClick: () => router.push("/rankings?view=featured"),
        accentClass:
          "border-black/8 bg-white text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]",
      },
      {
        id: "catalog",
        eyebrow: "Browse",
        title: "Explore the catalog.",
        description: "Open comics or novels next.",
        cta: "Explore Comics",
        onClick: () => router.push("/comics"),
        accentClass:
          "border-black/8 bg-white text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]",
      },
      {
        id: "return",
        eyebrow: "Back",
        title: originSeries ? `Back to ${originSeries.title}.` : "Go back.",
        description: originSeries ? "Return to the title that led you here." : "Return to your last page.",
        cta: originSeries ? `Back to ${originSeries.title}` : "Go back",
        onClick: handleReturn,
        accentClass:
          "border-black/8 bg-white text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]",
      },
    ],
    [creatorName, handleReturn, originSeries, router],
  );

  if (loading) {
    return <CreatorPageSkeleton />;
  }

  if (error) {
    return (
      <main className="relative min-h-screen bg-[#f4f6fb] text-slate-900">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.1),transparent_24%),linear-gradient(180deg,#eef2f9_0%,#f4f6fb_72%)]" />
        <SiteHeader variant="light" />
        <div className="relative mx-auto max-w-[960px] px-4 py-12 sm:px-6">
          <NetworkFallback
            compact
            title="Oops! This creator page is taking a quick breather."
            description="We're having trouble connecting. Your data is safe, and you can try again or head back to search while this recovers."
            onRetry={retryCreatorPage}
          >
            <button
              type="button"
              onClick={() => router.push("/search")}
              className="rounded-full border border-black/8 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]"
            >
              Search
            </button>
          </NetworkFallback>
        </div>
      </main>
    );
  }

  if (!creatorItems.length) {
    return (
      <main className="relative min-h-screen bg-[#f4f6fb] text-slate-900">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.1),transparent_24%),linear-gradient(180deg,#eef2f9_0%,#f4f6fb_72%)]" />
        <SiteHeader variant="light" />
        <div className="relative mx-auto max-w-[1280px] space-y-6 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
          <EditorialHero
            appearance="light"
            accent="blue"
            eyebrow={formatCreatorCreditTypeLabel(creatorIdentity.creditType)}
            title={`${creatorName} is not in the public catalog yet.`}
            description="Search the catalog or browse featured series for related titles."
            secondary=""
            stats={[
              {
                label: formatCreatorCreditTypeLabel(creatorIdentity.creditType),
                value: creatorName,
                hint: "Use the name to search the wider catalog.",
              },
              {
                label: "Catalog",
                value: isAdultMode ? "18+" : "Standard",
                hint: isAdultMode ? "18+ titles may appear in search." : "Adult-only titles stay hidden on this pass.",
              },
            ]}
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
                  onClick={() => router.push("/rankings?view=featured")}
                  className={secondaryButtonClass}
                >
                  Browse Series
                </button>
                <button
                  type="button"
                  onClick={handleReturn}
                  className={secondaryButtonClass}
                >
                  Go back
                </button>
              </>
            }
          />

          <SurfacePanel appearance="light" accent="blue">
            <EmptyState
              appearance="light"
              icon="book"
              eyebrow="Keep reading"
              title="Try another shelf."
              description="Search or browse featured series."
              action={{
                label: "Search",
                onClick: () => router.push("/search"),
              }}
            />
          </SurfacePanel>

          <SurfacePanel appearance="light" accent="blue" className="space-y-5">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">
                  More to explore
                </p>
                <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  Keep browsing.
                </h2>
                <p className="text-sm leading-7 text-slate-600">
                  Search, browse featured series, or head back to the catalog.
                </p>
            </div>
            <StorefrontPathwaysGrid
              cards={emptyCreatorPathways}
              columnsClassName="md:grid-cols-2 xl:grid-cols-4"
              appearance="light"
            />
          </SurfacePanel>
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
            eyebrow={formatCreatorCreditTypeLabel(creatorIdentity.creditType)}
            title={heroCopy.title}
          description={heroCopy.description}
          secondary={
            originSeries
              ? `From ${originSeries.title}.`
              : ""
          }
          stats={creatorStats}
            actions={
              <>
                {spotlightSeries ? (
                  <button
                    type="button"
                    onClick={() => handleOpenTitle(spotlightSeries)}
                    className={primaryButtonClass}
                  >
                    View Series
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => router.push("/rankings?view=featured")}
                    className={primaryButtonClass}
                  >
                    Browse Series
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleReturn}
                  className={secondaryButtonClass}
              >
                {originSeries ? `Back to ${originSeries.title}` : "Go back"}
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

        {spotlightSeries ? (
          <SurfacePanel appearance="light" accent="blue" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
              <div className="overflow-hidden rounded-[28px] border border-black/6 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.06)]">
                <div className="aspect-[3/4] w-full overflow-hidden">
                  <Cover
                    tone={spotlightSeries.coverTone}
                    coverUrl={spotlightSeries.coverUrl}
                    label={spotlightSeries.title}
                    eyebrow={creatorName}
                    badge={getCreatorShelfBadge(spotlightSeries)}
                    className="h-full w-full"
                  />
                </div>
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">
                  Spotlight
                </p>
                <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  {spotlightSeries.title}
                </h2>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                  {spotlightSeries.description ||
                    `${spotlightSeries.title} is a strong place to start on this shelf.`}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {(Array.isArray(spotlightSeries?.genres) ? spotlightSeries.genres : []).map((genre) => (
                    <span
                      key={genre}
                      className="rounded-full border border-black/8 bg-[#f8f9fc] px-3 py-1 text-xs font-semibold text-slate-600"
                    >
                      {genre}
                    </span>
                  ))}
                  {spotlightSeries?.status ? (
                    <span className="rounded-full border border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.08)] px-3 py-1 text-xs font-semibold text-[var(--gush-accent,#2f6bff)]">
                      {spotlightSeries.status}
                    </span>
                  ) : null}
                </div>

                <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-500">
                  {spotlightMeta.map((item, index) => (
                    <span
                      key={`${spotlightSeries.id}-meta-${index}`}
                      className="rounded-full border border-black/8 bg-[#f8f9fc] px-3 py-1.5"
                    >
                      {item}
                    </span>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handleOpenTitle(spotlightSeries)}
                    className={primaryButtonClass}
                  >
                    View Series
                  </button>
                  <button
                    type="button"
                    onClick={handleBrowseGenre}
                    className={secondaryButtonClass}
                  >
                    {topGenres[0] ? `Explore ${topGenres[0]}` : "Explore Reads"}
                  </button>
                </div>
              </div>
            </div>
          </SurfacePanel>
        ) : null}

        <SurfacePanel appearance="light" accent="blue" className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">
                More from {creatorName}
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Stories by {creatorName}.
              </h2>
            </div>
            <p className="text-sm text-slate-500">
              {formatTitleCountLabel(gridItems.length)} for {creatorName}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {gridItems.map((item) => (
              <PortraitCard
                key={item.id}
                item={item}
                tone={item.coverTone}
                onClick={() => handleOpenTitle(item)}
                appearance="light"
              />
            ))}
          </div>
        </SurfacePanel>
      </div>
    </main>
  );
}
