"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SiteHeader from "../layout/SiteHeader";
import Cover from "../common/Cover";
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
    .sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
    )
    .map(([genre]) => genre);
}

function buildCreatorItems(seriesList, creatorSlug) {
  return seriesList
    .filter((item) => item?.id && seriesMatchesCreatorSlug(item, creatorSlug))
    .sort((left, right) => {
      const popularityDelta =
        getCatalogPriority(right) - getCatalogPriority(left);
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
  if (creditType === "studio") {
    return {
      title: "Studio",
      description: "",
    };
  }

  if (creditType === "team") {
    return {
      title: "Team",
      description: "",
    };
  }

  return {
    title: creatorName,
    description: "",
  };
}

function summarizeSpotlightDescription(text, fallback) {
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

function CreatorPageSkeleton() {
  return (
    <main className="min-h-screen overflow-hidden bg-black text-black">
      <SiteHeader variant="home" />
      <div className="mx-auto flex max-w-[1320px] flex-col gap-8 px-4 py-8 md:px-8 md:py-10">
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
                key={`creator-hero-skeleton-${index}`}
                className="h-24 animate-pulse rounded-[24px] border-[3px] border-black bg-[#ffe500]"
              />
            ))}
          </SurfacePanel>
        </div>

        <SurfacePanel appearance="light" accent="blue">
          <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div className="aspect-[3/4] animate-pulse rounded-[28px] border-[3px] border-black bg-white" />
            <div className="space-y-4">
              <div className="h-4 w-32 animate-pulse rounded-full bg-slate-200" />
              <div className="h-12 w-full max-w-2xl animate-pulse rounded-[24px] bg-slate-200" />
              <div className="h-24 w-full animate-pulse rounded-[24px] bg-slate-200" />
              <div className="grid gap-3 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={`creator-spotlight-skeleton-${index}`}
                    className="h-28 animate-pulse rounded-[24px] border-[3px] border-black bg-[#fff6cf]"
                  />
                ))}
              </div>
            </div>
          </div>
        </SurfacePanel>

        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
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

export default function CreatorPage({
  creatorSlug,
  initialCatalog = [],
  hasInitialCatalog = false,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAdultMode, forceDisableAdultMode } = useAdultGateStore();
  const [catalog, setCatalog] = useState(
    Array.isArray(initialCatalog) ? initialCatalog : [],
  );
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
      getCommerceSuccessPresentation(
        consumeCommerceSuccessForPath(creatorPath),
      ),
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

  const creatorItems = useMemo(
    () => buildCreatorItems(catalog, creatorSlug),
    [catalog, creatorSlug],
  );
  const routeCreatorName = useMemo(
    () => humanizeCreatorSlug(creatorSlug),
    [creatorSlug],
  );
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
    () =>
      creatorIdentity.slug || creatorSlug || slugifyCreatorName(creatorName),
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
    () =>
      getCreatorHeroCopy(creatorName, creatorIdentity.creditType, topGenres),
    [creatorIdentity.creditType, creatorName, topGenres],
  );

  const creatorStats = useMemo(() => {
    const completedCount = creatorItems.filter(
      (item) => String(item?.status || "").toLowerCase() === "completed",
    ).length;
    const strongestGenre = topGenres[0] || "Mixed";
    const latestUpdatedAt = creatorItems[0]?.updatedAt;

    return [
      {
        label: "Stories",
        value: formatTitleCountLabel(creatorItems.length),
      },
      {
        label: "Status",
        value:
          completedCount > 0 ? `${completedCount} complete` : "Mostly ongoing",
      },
      {
        label: "Latest",
        value: latestUpdatedAt ? formatDateLabel(latestUpdatedAt) : "Catalog",
      },
      {
        label: "Genre",
        value: strongestGenre,
      },
    ];
  }, [creatorItems, topGenres]);

  const spotlightMeta = useMemo(() => {
    if (!spotlightSeries) {
      return [];
    }

    const isCompleted =
      String(spotlightSeries?.status || "").toLowerCase() === "completed";

    return [
      isCompleted
        ? "Completed"
        : `Updated ${formatDateLabel(spotlightSeries?.updatedAt)}`,
      Array.isArray(spotlightSeries?.genres) &&
      spotlightSeries.genres.length > 0
        ? spotlightSeries.genres.slice(0, 2).join(" / ")
        : "Lead title on this page",
    ].filter(Boolean);
  }, [spotlightSeries]);

  const primaryButtonClass =
    "inline-flex min-h-[48px] items-center justify-center border-[3px] border-black bg-[#00e5ff] px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)]";
  const secondaryButtonClass =
    "inline-flex min-h-[48px] items-center justify-center border-[3px] border-black bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)]";
  const creatorCardClass =
    "overflow-hidden rounded-[30px] border-[3px] border-black bg-white shadow-[8px_8px_0_0_rgba(0,0,0,1)]";
  const neutralChipClass =
    "border-[3px] border-black bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-black shadow-[3px_3px_0_0_rgba(0,0,0,1)]";

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

    router.push(
      `/search?genre=${encodeURIComponent(primaryGenre)}&sort=latest`,
    );
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
    () =>
      [
        spotlightSeries
          ? {
              id: "lead-title",
              eyebrow: "Spotlight",
              title: `View ${spotlightSeries.title}.`,
              cta: "Open series",
              onClick: () => handleOpenTitle(spotlightSeries),
              accentClass:
                "border-[3px] border-black bg-[#ffe500] text-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:bg-white hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)]",
            }
          : null,
        {
          id: "genre",
          eyebrow: "Genres",
          title: topGenres[0]
            ? `Explore ${topGenres[0]}.`
            : "Explore similar reads.",
          cta: topGenres[0] ? `Explore ${topGenres[0]}` : "Explore Reads",
          onClick: handleBrowseGenre,
          accentClass:
            "border-[3px] border-black bg-[#00e5ff] text-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:bg-white hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)]",
        },
        {
          id: "return",
          eyebrow: "Back",
          title: originSeries ? `Back to ${originSeries.title}.` : "Go back.",
          cta: originSeries ? `Back to ${originSeries.title}` : "Go back",
          onClick: handleReturn,
          accentClass:
            "border-[3px] border-black bg-white text-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:bg-[#fff6cf] hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)]",
        },
      ].filter(Boolean),
    [
      handleBrowseGenre,
      handleOpenTitle,
      handleReturn,
      originSeries,
      spotlightSeries,
      topGenres,
    ],
  );
  const creatorDeskStats = [
    {
      label: "Profile",
      value: formatCreatorCreditTypeLabel(creatorIdentity.creditType),
      tone: "bg-[#ffe500]",
    },
    {
      label: "Titles",
      value: String(creatorItems.length || 0),
      tone: "bg-white",
    },
    {
      label: "Top genre",
      value: topGenres[0] || "Mixed",
      tone: "bg-[#00e5ff]",
    },
  ];
  const emptyCreatorPathways = useMemo(
    () => [
      {
        id: "search-series",
        eyebrow: "Search",
        title: `Search ${creatorName}.`,
        cta: "Search",
        onClick: () =>
          router.push(
            `/search?q=${encodeURIComponent(creatorName)}&sort=latest`,
          ),
        accentClass:
          "border-[3px] border-black bg-[#ffe500] text-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:bg-white hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)]",
      },
      {
        id: "featured-series",
        eyebrow: "Featured Series",
        title: "Featured",
        cta: "Featured",
        onClick: () => router.push("/rankings?view=featured"),
        accentClass:
          "border-[3px] border-black bg-[#00e5ff] text-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:bg-white hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)]",
      },
      {
        id: "catalog",
        eyebrow: "Comics",
        title: "Comics",
        cta: "Comics",
        onClick: () => router.push("/comics"),
        accentClass:
          "border-[3px] border-black bg-white text-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:bg-[#fff6cf] hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)]",
      },
      {
        id: "return",
        eyebrow: "Back",
        title: originSeries ? `Back to ${originSeries.title}.` : "Go back.",
        cta: originSeries ? `Back to ${originSeries.title}` : "Go back",
        onClick: handleReturn,
        accentClass:
          "border-[3px] border-black bg-white text-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:bg-[#fff6cf] hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)]",
      },
    ],
    [creatorName, handleReturn, originSeries, router],
  );

  if (loading) {
    return <CreatorPageSkeleton />;
  }

  if (error) {
    return (
      <main className="min-h-screen overflow-hidden bg-black text-black">
        <SiteHeader variant="home" />
        <div className="mx-auto max-w-[1320px] px-4 py-8 md:px-8 md:py-10">
          <NetworkFallback
            compact
            title="This creator page is unavailable right now."
            description=""
            onRetry={retryCreatorPage}
          >
            <button
              type="button"
              onClick={() => router.push("/search")}
              className={secondaryButtonClass}
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
      <main className="min-h-screen overflow-hidden bg-black text-black">
        <SiteHeader variant="home" />
        <div className="mx-auto flex max-w-[1320px] flex-col gap-8 px-4 py-8 md:px-8 md:py-10">
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <EditorialHero
              accent="blue"
              appearance="light"
              eyebrow={formatCreatorCreditTypeLabel(creatorIdentity.creditType)}
              title={`${creatorName} is not live here yet.`}
              description=""
              stats={[
                {
                  label: formatCreatorCreditTypeLabel(
                    creatorIdentity.creditType,
                  ),
                  value: creatorName,
                },
                {
                  label: "Catalog",
                  value: isAdultMode ? "18+" : "Standard",
                },
              ]}
            />

            <SurfacePanel
              tone="muted"
              accent="blue"
              appearance="light"
              className="flex h-full flex-col justify-between space-y-6"
            >
              <div className="space-y-3">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/55">
                  Next
                </p>
                <div>
                  <h2 className="font-display text-[1.9rem] font-black uppercase tracking-[-0.05em] text-black">
                    Next
                  </h2>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => router.push("/search")}
                  className={primaryButtonClass}
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={handleReturn}
                  className={secondaryButtonClass}
                >
                  Go back
                </button>
              </div>
            </SurfacePanel>
          </section>

          <SurfacePanel appearance="light" accent="blue" className="space-y-5">
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/55">
                Next
              </p>
              <h2 className="font-display text-2xl font-black uppercase tracking-[-0.05em] text-black sm:text-3xl">
                Picks
              </h2>
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
    <main className="min-h-screen overflow-hidden bg-black text-black">
      <SiteHeader variant="home" />

      <div className="mx-auto flex max-w-[1320px] flex-col gap-8 px-4 py-8 md:px-8 md:py-10">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <EditorialHero
            accent="blue"
            appearance="light"
            eyebrow={formatCreatorCreditTypeLabel(creatorIdentity.creditType)}
            title={heroCopy.title}
            description={heroCopy.description}
            secondary={originSeries ? `From ${originSeries.title}.` : ""}
            stats={creatorStats}
          />

          <SurfacePanel
            tone="default"
            accent="amber"
            appearance="dark"
            className="flex h-full flex-col justify-between space-y-6 border-[3px] border-black bg-black p-5 text-white shadow-[10px_10px_0_0_rgba(255,229,0,1)]"
          >
            <div className="space-y-3">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#ffe500]">
                Creator desk
              </p>
              <div>
                <h2 className="font-display text-[1.9rem] font-black uppercase tracking-[-0.05em] text-white">
                  {creatorName}
                </h2>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              {creatorDeskStats.map((item) => (
                <div
                  key={item.label}
                  className={`${item.tone} border-[3px] border-black px-4 py-3 text-black shadow-[4px_4px_0_0_rgba(255,255,255,0.18)]`}
                >
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-black/55">
                    {item.label}
                  </p>
                  <p className="mt-2 text-[1.4rem] font-black uppercase tracking-[-0.04em]">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2.5">
              {spotlightSeries ? (
                <button
                  type="button"
                  onClick={() => handleOpenTitle(spotlightSeries)}
                  className={primaryButtonClass}
                >
                  Open {spotlightSeries.title}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push("/rankings?view=featured")}
                  className={primaryButtonClass}
                >
                  Featured
                </button>
              )}
              <button
                type="button"
                onClick={handleBrowseGenre}
                className={secondaryButtonClass}
              >
                {topGenres[0] ? topGenres[0] : "Genres"}
              </button>
              <button
                type="button"
                onClick={handleReturn}
                className={secondaryButtonClass}
              >
                {originSeries ? `Back to ${originSeries.title}` : "Go back"}
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

        {spotlightSeries ? (
          <SurfacePanel appearance="light" accent="cyan" className="space-y-6 border-[3px] border-black bg-white shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
            <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
              <div className={creatorCardClass}>
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
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/55">
                  Spotlight
                </p>
                <h2 className="mt-3 font-display text-3xl font-black uppercase tracking-[-0.05em] text-black sm:text-4xl">
                  {spotlightSeries.title}
                </h2>
                <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-black/72 sm:text-base">
                  {summarizeSpotlightDescription(
                    spotlightSeries.description,
                    `${spotlightSeries.title} is a strong place to start.`,
                  )}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {(Array.isArray(spotlightSeries?.genres)
                    ? spotlightSeries.genres
                    : []
                  ).map((genre) => (
                    <span key={genre} className={neutralChipClass}>
                      {genre}
                    </span>
                  ))}
                  {spotlightSeries?.status ? (
                    <span className={neutralChipClass}>
                      {spotlightSeries.status}
                    </span>
                  ) : null}
                </div>

                <div className="mt-5 flex flex-wrap gap-3 text-sm font-semibold uppercase tracking-[0.08em] text-black/55">
                  {spotlightMeta.map((item, index) => (
                    <span
                      key={`${spotlightSeries.id}-meta-${index}`}
                      className={neutralChipClass}
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
                    Open series
                  </button>
                  <button
                    type="button"
                    onClick={handleBrowseGenre}
                    className={secondaryButtonClass}
                  >
                    {topGenres[0] ? topGenres[0] : "Genres"}
                  </button>
                </div>
              </div>
            </div>
          </SurfacePanel>
        ) : null}

        <SurfacePanel appearance="light" accent="blue" className="space-y-5 border-[3px] border-black bg-white shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/55">
                Works
              </p>
              <h2 className="mt-2 font-display text-[2.2rem] font-black uppercase tracking-[-0.05em] text-black sm:text-[2.8rem]">
                By {creatorName}
              </h2>
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-black/55">
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
