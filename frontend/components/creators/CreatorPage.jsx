"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SurfacePanel from "../common/SurfacePanel";
import Cover from "../common/Cover";
import EmptyState from "../common/EmptyState";
import PortraitCard from "../home/PortraitCard";
import { apiGet } from "../../lib/apiClient";
import {
  buildCreatorEditorialHook,
  buildEditorialHook,
} from "../../lib/editorialHooks";
import { filterBlockedPublicSeries } from "../../lib/publicCatalogVisibility";
import {
  buildPathWithAttribution,
  loadPersistedPaymentAttribution,
  mergePaymentAttribution,
  persistPaymentAttribution,
  readPaymentAttributionFromSearchParams,
} from "../../lib/paymentAttribution";
import {
  buildCreatorPathFromSlug,
  humanizeCreatorSlug,
  slugifyCreatorName,
} from "../../lib/creators";
import { storefrontPrimaryButtonClass } from "../common/StorefrontPagePrimitives";
import {
  resolveCreatorIdentity,
  resolveSeriesCreatorIdentity,
  seriesMatchesCreatorSlug,
} from "../../lib/creatorIdentity";

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

function buildCreatorItems(seriesList, creatorSlug) {
  return (Array.isArray(seriesList) ? seriesList : [])
    .filter((item) => item?.id && seriesMatchesCreatorSlug(item, creatorSlug))
    .sort((left, right) => {
      const scoreDelta = getCatalogPriority(right) - getCatalogPriority(left);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return Date.parse(right?.updatedAt || 0) - Date.parse(left?.updatedAt || 0);
    });
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
    .map(([genre]) => genre)
    .slice(0, 4);
}

function getCreatorShelfMood(completedCount, ongoingCount) {
  if (completedCount > 0 && ongoingCount > 0) {
    return "Completed arcs to binge, plus fresh chapters still landing.";
  }

  if (ongoingCount > 0) {
    return "Fresh chapters are still landing on this shelf.";
  }

  if (completedCount > 0) {
    return "Finished stories ready for a no-wait weekend binge.";
  }

  return "A focused shelf with a clear point of view.";
}

function buildCreatorMetaCards({
  topGenres,
  latestUpdatedAt,
  completedCount,
  ongoingCount,
}) {
  const leadingGenres =
    Array.isArray(topGenres) && topGenres.length > 0
      ? topGenres.slice(0, 2).join(" / ")
      : "Character-first storytelling";

  return [
    {
      id: "latest",
      label: "Latest drop",
      value: formatDateLabel(latestUpdatedAt) || "Recently updated",
    },
    {
      id: "genres",
      label: "Best known for",
      value: leadingGenres,
    },
    {
      id: "shelf-vibe",
      label: "Shelf vibe",
      value: getCreatorShelfMood(completedCount, ongoingCount),
    },
  ];
}

function buildGridItems(items) {
  return items.map((item) => ({
    ...item,
    subtitle:
      Array.isArray(item?.genres) && item.genres.length > 0
        ? item.genres.slice(0, 2).join(" / ")
        : String(item?.status || "Story"),
  }));
}

function CreatorPageSkeleton() {
  return (
    <main className="min-h-screen overflow-hidden bg-[var(--gush-page-bg)] text-white">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
        <SurfacePanel appearance="dark" accent="cyan" className="space-y-4">
          <div className="h-4 w-24 animate-pulse rounded-full bg-white/20" />
          <div className="h-12 w-full max-w-2xl animate-pulse rounded-[24px] bg-white/20" />
          <div className="h-16 w-full max-w-3xl animate-pulse rounded-[24px] bg-[#111111]" />
        </SurfacePanel>

        <SurfacePanel appearance="dark" accent="cyan" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="rounded-[30px] border border-white/10 bg-[rgba(255,255,255,0.03)] p-2 shadow-[0_20px_48px_rgba(8,6,20,0.22)]">
              <div className="aspect-[3/4] animate-pulse rounded-[24px] bg-[#111111]" />
            </div>
            <div className="space-y-3">
              <div className="h-8 w-48 animate-pulse rounded-full bg-white/20" />
              <div className="h-14 w-full animate-pulse rounded-[24px] bg-[#111111]" />
              <div className="grid gap-3 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={`creator-stat-${index}`}
                    className="h-24 animate-pulse rounded-[22px] border border-white/10 bg-[rgba(255,255,255,0.04)]"
                  />
                ))}
              </div>
            </div>
          </div>
        </SurfacePanel>
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
  const [catalog, setCatalog] = useState(
    Array.isArray(initialCatalog) ? initialCatalog : [],
  );
  const [loading, setLoading] = useState(!hasInitialCatalog);
  const [error, setError] = useState("");
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

  const fetchCreatorCatalog = useCallback(() => {
    requestRef.current += 1;
    const currentRequest = requestRef.current;

    setLoading(true);
    setError("");

    apiGet("/api/series?adult=0", { cacheMs: 30000 }).then((response) => {
      if (currentRequest !== requestRef.current) {
        return;
      }

      if (!response.ok) {
        setCatalog([]);
        setError(response.error || "Unable to load creator page.");
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

    fetchCreatorCatalog();
  }, [fetchCreatorCatalog, hasInitialCatalog]);

  const creatorItems = useMemo(
    () => buildCreatorItems(filterBlockedPublicSeries(catalog), creatorSlug),
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
  const spotlightSeries = creatorItems[0] || null;
  const latestUpdatedAt = spotlightSeries?.updatedAt || "";
  const completedCount = creatorItems.filter(
    (item) => String(item?.status || "").toLowerCase() === "completed",
  ).length;
  const ongoingCount = Math.max(creatorItems.length - completedCount, 0);
  const gridItems = useMemo(() => buildGridItems(creatorItems), [creatorItems]);
  const creatorHook = useMemo(
    () =>
      buildCreatorEditorialHook({
        leadSummary:
          spotlightSeries?.description ||
          spotlightSeries?.summary ||
          spotlightSeries?.synopsis,
        topGenres,
      }),
    [spotlightSeries, topGenres],
  );
  const spotlightHook = useMemo(
    () =>
      spotlightSeries
        ? buildEditorialHook(spotlightSeries, { maxLength: 148 })
        : "",
    [spotlightSeries],
  );
  const creatorMetaCards = useMemo(
    () =>
      buildCreatorMetaCards({
        topGenres,
        latestUpdatedAt,
        completedCount,
        ongoingCount,
      }),
    [completedCount, latestUpdatedAt, ongoingCount, topGenres],
  );

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

  const handleBackToSearch = useCallback(() => {
    router.push("/search");
  }, [router]);

  if (loading) {
    return <CreatorPageSkeleton />;
  }

  if (error) {
    return (
      <main className="min-h-screen overflow-hidden bg-[var(--gush-page-bg)] text-white">
        <div className="mx-auto max-w-[1320px] px-4 py-8 md:px-8 md:py-10">
          <SurfacePanel appearance="dark" accent="cyan">
            <EmptyState
              appearance="dark"
              icon="alert"
              eyebrow="Load failed"
              title="Couldn't load this creator."
              description=""
              action={{ label: "Retry", onClick: fetchCreatorCatalog }}
            />
          </SurfacePanel>
        </div>
      </main>
    );
  }

  if (!creatorItems.length) {
    return (
      <main className="min-h-screen overflow-hidden bg-[var(--gush-page-bg)] text-white">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
          <SurfacePanel appearance="dark" accent="cyan" className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/56">
              {formatCreditTypeLabel(creatorIdentity.creditType)}
            </p>
            <h1 className="font-display text-[2.45rem] font-semibold leading-[0.94] tracking-[-0.05em] text-white sm:text-[3rem]">
              {creatorName}
            </h1>
          </SurfacePanel>

          <SurfacePanel appearance="dark" accent="cyan">
            <EmptyState
              appearance="dark"
              icon="search"
              eyebrow="No titles"
              title="No titles found."
              description=""
              action={{ label: "Search", onClick: handleBackToSearch }}
            />
          </SurfacePanel>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[var(--gush-page-bg)] text-white">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
        <SurfacePanel appearance="dark" accent="cyan" className="space-y-5">
          <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
            <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[rgba(255,255,255,0.03)] p-2 shadow-[0_20px_48px_rgba(8,6,20,0.26)]">
              <Cover
                tone={spotlightSeries?.coverTone}
                coverUrl={spotlightSeries?.coverUrl}
                label={spotlightSeries?.title || creatorName}
                eyebrow={creatorName}
                badge=""
                fallbackVariant="minimal-card"
                className="aspect-[3/4] rounded-[24px]"
              />
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/56">
                {formatCreditTypeLabel(creatorIdentity.creditType)}
              </p>
              <h1 className="mt-3 font-display text-[2.4rem] font-semibold leading-[0.94] tracking-[-0.05em] text-white sm:text-[3rem]">
                {creatorName}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/68 sm:text-[0.98rem]">
                {creatorHook}
              </p>

              {topGenres.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {topGenres.map((genre) => (
                    <span
                      key={`${creatorSlugKey}-${genre}`}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/72 shadow-[0_10px_24px_rgba(8,6,20,0.16)]"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {creatorMetaCards.map((card) => (
                  <div
                    key={card.id}
                    className="rounded-[22px] border border-white/10 bg-[rgba(255,255,255,0.03)] px-4 py-4 shadow-[0_16px_34px_rgba(8,6,20,0.2)]"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/46">
                      {card.label}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/78">
                      {card.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SurfacePanel>

        {spotlightSeries ? (
          <SurfacePanel appearance="dark" accent="cyan" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/56">
                  Start here
                </p>
                <h2 className="mt-2 font-display text-[2rem] font-semibold leading-[0.95] tracking-[-0.05em] text-white">
                  {spotlightSeries.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => handleOpenTitle(spotlightSeries)}
                className={storefrontPrimaryButtonClass}
              >
                View title
              </button>
            </div>

            <p className="max-w-3xl text-sm leading-7 text-white/72">
              {spotlightHook}
            </p>
          </SurfacePanel>
        ) : null}

        <SurfacePanel appearance="dark" accent="cyan" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/56">
                On the shelf
              </p>
              <h2 className="mt-2 font-display text-[2rem] font-semibold leading-[0.95] tracking-[-0.05em] text-white">
                More from {creatorName}
              </h2>
            </div>
            <p className="text-sm leading-6 text-white/56">
              Start with the cover that catches you.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {gridItems.map((item) => (
              <PortraitCard
                key={item.id}
                item={item}
                tone={item.coverTone}
                onClick={() => handleOpenTitle(item)}
              />
            ))}
          </div>
        </SurfacePanel>
      </div>
    </main>
  );
}
