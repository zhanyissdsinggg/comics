"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SiteHeader from "../layout/SiteHeader";
import Cover from "../common/Cover";
import EmptyState from "../common/EmptyState";
import EditorialHero from "../common/EditorialHero";
import SurfacePanel from "../common/SurfacePanel";
import SkeletonCard from "../common/SkeletonCard";
import PortraitCard from "../home/PortraitCard";
import CommerceSuccessBanner from "../common/CommerceSuccessBanner";
import StorefrontCampaignPanel from "../common/StorefrontCampaignPanel";
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
  creatorMatchesSlug,
  getCreatorDisplayName,
  humanizeCreatorSlug,
  slugifyCreatorName,
} from "../../lib/creators";

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

function getPopularityScore(series) {
  return Math.max(
    toNumber(series?.followers),
    toNumber(series?.views),
    toNumber(series?.ratingCount),
    Math.round(toNumber(series?.rating) * 100),
  );
}

function getReaderProofTotal(items) {
  return items.reduce((sum, item) => sum + getPopularityScore(item), 0);
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
    .filter((item) => item?.id && creatorMatchesSlug(item?.author, creatorSlug))
    .sort((left, right) => {
      const popularityDelta = getPopularityScore(right) - getPopularityScore(left);
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

function getCreatorHeroCopy(creatorName, isStudioShelf, topGenres) {
  const genreLabel = topGenres.slice(0, 2).join(" and ");

  if (isStudioShelf) {
    return {
      title: "More from this studio.",
      description: genreLabel
        ? `If one release clicked, this is the fastest way to find the rest of the studio's ${genreLabel} shelf.`
        : "If one release clicked, this is the fastest way to find the rest of the studio's shelf.",
    };
  }

  return {
    title: `More from ${creatorName}.`,
    description: genreLabel
      ? `If one series hooked you, start here for more of ${creatorName}'s ${genreLabel} work.`
      : `If one series hooked you, start here for more of ${creatorName}'s work.`,
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
  const requestRef = useRef(0);

  const creatorPath = useMemo(
    () => buildCreatorPathFromSlug(creatorSlug),
    [creatorSlug],
  );
  const routeAttribution = useMemo(
    () => readPaymentAttributionFromSearchParams(searchParams),
    [searchParams],
  );

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
  }, [forceDisableAdultMode, hasInitialCatalog, isAdultMode]);

  const creatorItems = useMemo(
    () => buildCreatorItems(catalog, creatorSlug),
    [catalog, creatorSlug],
  );
  const creatorName = useMemo(() => {
    if (creatorItems.length > 0) {
      return getCreatorDisplayName(creatorItems[0]?.author);
    }

    return humanizeCreatorSlug(creatorSlug);
  }, [creatorItems, creatorSlug]);
  const isStudioShelf = creatorName === "Studio";
  const creatorSlugKey = useMemo(
    () => slugifyCreatorName(creatorName),
    [creatorName],
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
    () => getCreatorHeroCopy(creatorName, isStudioShelf, topGenres),
    [creatorName, isStudioShelf, topGenres],
  );

  const creatorStats = useMemo(() => {
    const completedCount = creatorItems.filter(
      (item) => String(item?.status || "").toLowerCase() === "completed",
    ).length;
    const readerProof = getReaderProofTotal(creatorItems);
    const strongestGenre = topGenres[0] || "Mixed";

    return [
      {
        label: "Shelf",
        value: formatTitleCountLabel(creatorItems.length),
        hint: "Everything public on this creator shelf right now.",
      },
      {
        label: "Reading mode",
        value: completedCount > 0 ? `${completedCount} complete` : "Mostly ongoing",
        hint: completedCount > 0 ? "Finished reads are ready to binge." : "This page leans ongoing right now.",
      },
      {
        label: "Audience",
        value: readerProof > 0 ? `${formatCompactCount(readerProof)} readers` : "Fresh shelf",
        hint: readerProof > 0
          ? "Visible audience activity across this creator's titles."
          : "This shelf is live, but audience proof is still thin in the visible data.",
      },
      {
        label: "Best known for",
        value: strongestGenre,
        hint: topGenres.length > 1
          ? `${topGenres.slice(0, 2).join(" | ")} show up the most on this page.`
          : "This is the clearest genre signal on the shelf.",
      },
    ];
  }, [creatorItems, topGenres]);

  const spotlightMeta = useMemo(() => {
    if (!spotlightSeries) {
      return [];
    }

    const isCompleted = String(spotlightSeries?.status || "").toLowerCase() === "completed";
    const popularityScore = getPopularityScore(spotlightSeries);

    return [
      popularityScore > 0 ? `${formatCompactCount(popularityScore)} readers` : null,
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
      router.push("/search?sort=popular");
      return;
    }

    router.push(`/search?genre=${encodeURIComponent(primaryGenre)}&sort=popular`);
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
            title: `Open ${spotlightSeries.title} first.`,
            description:
              "Start with the clearest entry point on this shelf, then fan back out into the rest of the creator page.",
            cta: "Open title",
            onClick: () => handleOpenTitle(spotlightSeries),
            accentClass:
              "border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.08)] text-slate-900 hover:border-[rgba(47,107,255,0.2)] hover:bg-[rgba(47,107,255,0.12)]",
          }
        : null,
      {
        id: "search-creator",
        eyebrow: "Search",
        title: `Search ${creatorName} across the catalog.`,
        description:
          "Search is still the quickest fallback when a creator shelf is smaller than you expected.",
        cta: "Search creator",
        onClick: () => router.push(`/search?q=${encodeURIComponent(creatorName)}&sort=popular`),
        accentClass:
          "border-black/8 bg-white text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]",
      },
      {
        id: "genre",
        eyebrow: "Browse lane",
        title: topGenres[0] ? `Browse more ${topGenres[0]} reads.` : "Browse similar reads.",
        description:
          "Use the strongest genre signal on this page to widen discovery without losing the same vibe.",
        cta: topGenres[0] ? `Browse ${topGenres[0]}` : "Browse similar",
        onClick: handleBrowseGenre,
        accentClass:
          "border-black/8 bg-white text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]",
      },
      {
        id: "return",
        eyebrow: "Return path",
        title: originSeries ? `Go back to ${originSeries.title}.` : "Go back to your last browse path.",
        description: originSeries
          ? "Jump back after checking the creator shelf so discovery keeps moving instead of turning into a dead end."
          : "Use your last path or Top Series if you only wanted one quick detour through creator credits.",
        cta: originSeries ? `Back to ${originSeries.title}` : "Go back",
        onClick: handleReturn,
        accentClass:
          "border-black/8 bg-white text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]",
      },
    ].filter(Boolean),
    [creatorName, handleBrowseGenre, handleOpenTitle, handleReturn, originSeries, router, spotlightSeries, topGenres],
  );
  const emptyCreatorPathways = useMemo(
    () => [
      {
        id: "search-series",
        eyebrow: "Search",
        title: `Search ${creatorName} or a related title.`,
        description:
          "When the creator shelf is empty, search is still the fastest backup path into the visible catalog.",
        cta: "Search series",
        onClick: () => router.push(`/search?q=${encodeURIComponent(creatorName)}&sort=popular`),
        accentClass:
          "border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.08)] text-slate-900 hover:border-[rgba(47,107,255,0.2)] hover:bg-[rgba(47,107,255,0.12)]",
      },
      {
        id: "top-series",
        eyebrow: "Top Series",
        title: "Use the safer first click while credits fill in.",
        description:
          "Top Series is still the cleanest fallback when a creator page resolves but the public shelf is thin.",
        cta: "Browse Top Series",
        onClick: () => router.push("/rankings?type=popular&window=week"),
        accentClass:
          "border-black/8 bg-white text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]",
      },
      {
        id: "catalog",
        eyebrow: "Browse",
        title: "Open the wider catalog instead of dead-ending here.",
        description:
          "Comics and novels stay useful even when creator credits are still expanding title by title.",
        cta: "Browse comics",
        onClick: () => router.push("/comics"),
        accentClass:
          "border-black/8 bg-white text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]",
      },
      {
        id: "return",
        eyebrow: "Return path",
        title: originSeries ? `Go back to ${originSeries.title}.` : "Go back to your last browse path.",
        description:
          "If you came here from a title, jump back there. If not, head back to search and keep the session moving.",
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
          <SurfacePanel appearance="light" tone="danger" accent="rose">
            <EmptyState
              appearance="light"
              icon="alert"
              eyebrow="Load issue"
              title="This creator page is unavailable right now."
              description="The page did not load cleanly. Try again, or head back to search while this recovers."
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

  if (!creatorItems.length) {
    return (
      <main className="relative min-h-screen bg-[#f4f6fb] text-slate-900">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.1),transparent_24%),linear-gradient(180deg,#eef2f9_0%,#f4f6fb_72%)]" />
        <SiteHeader variant="light" />
        <div className="relative mx-auto max-w-[1280px] space-y-6 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
          <EditorialHero
            appearance="light"
            accent="blue"
            eyebrow={isStudioShelf ? "Studio" : "Creator"}
            title={`No public titles from ${creatorName} yet.`}
            description="This page resolves correctly, but nothing visible is attached to it in the current catalog view."
            secondary="Try search, Top Series, or your last series instead."
            stats={[
              {
                label: "Creator",
                value: creatorName,
                hint: "The page exists, but the shelf is empty right now.",
              },
              {
                label: "Catalog",
                value: isAdultMode ? "18+" : "Standard",
                hint: isAdultMode ? "18+ titles can appear here." : "18+ titles stay hidden here.",
              },
            ]}
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
              eyebrow="Nothing to read"
              title="No visible titles on this page."
              description="Jump back to search or Top Series so the browse flow does not stop here."
              action={{
                label: "Search series",
                onClick: () => router.push("/search"),
              }}
            />
          </SurfacePanel>

          <SurfacePanel appearance="light" accent="blue" className="space-y-5">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">
                  Keep browsing
                </p>
                <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  Use this creator page as a browse waypoint, not a dead end.
                </h2>
                <p className="text-sm leading-7 text-slate-600">
                  Credits are still expanding. Until this shelf fills in, jump back into search, Top Series, or the wider catalog.
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
          eyebrow={isStudioShelf ? "Studio" : "Creator"}
          title={heroCopy.title}
          description={heroCopy.description}
          secondary={
            originSeries
              ? `You came here from ${originSeries.title}. Start with the lead pick below, then branch out from there.`
              : "Start with the lead pick below, then branch out across the rest of the shelf."
          }
          stats={creatorStats}
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
                onClick={handleBrowseGenre}
                className={secondaryButtonClass}
              >
                {topGenres[0] ? `Browse ${topGenres[0]}` : "Browse similar reads"}
              </button>
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
                    `Start with ${spotlightSeries.title} if you want the clearest first read from this creator.`}
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
                      className={`rounded-full border px-3 py-1.5 ${
                        index === 0
                          ? "border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.08)] text-slate-900"
                          : "border-black/8 bg-[#f8f9fc]"
                      }`}
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
                    Read now
                  </button>
                  <button
                    type="button"
                    onClick={handleBrowseGenre}
                    className={secondaryButtonClass}
                  >
                    {topGenres[0] ? `Browse ${topGenres[0]}` : "Browse similar reads"}
                  </button>
                  <button
                    type="button"
                    onClick={handleReturn}
                    className={secondaryButtonClass}
                  >
                    {originSeries ? `Back to ${originSeries.title}` : "Go back"}
                  </button>
                </div>
              </div>
            </div>
          </SurfacePanel>
        ) : null}

        {spotlightSeries ? (
          <StorefrontCampaignPanel
            series={spotlightSeries}
            sourcePath={creatorPath}
            returnTo={creatorPath}
            appearance="light"
          />
        ) : null}

        <SurfacePanel appearance="light" accent="blue" className="space-y-5">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">
              What do you want to do next?
            </p>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Use this creator page like a real browse path.
            </h2>
            <p className="text-sm leading-7 text-slate-600">
              Open the lead title, widen into a genre, search the creator name, or jump back to where you came from.
            </p>
          </div>
          <StorefrontPathwaysGrid
            cards={creatorPathways}
            columnsClassName="md:grid-cols-2 xl:grid-cols-4"
            appearance="light"
          />
        </SurfacePanel>

        <SurfacePanel appearance="light" accent="blue" className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">
                More from {creatorName}
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Every visible title in one place.
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
