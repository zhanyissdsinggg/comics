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
      title: "Browse the studio shelf without losing the return path.",
      description: genreLabel
        ? `Move across this studio lane, surface the strongest ${genreLabel} picks first, and keep a clean way back into the title that started the session.`
        : "Move across the studio lane, surface the strongest titles first, and keep a clean way back into the title that started the session.",
    };
  }

  return {
    title: `Explore ${creatorName}'s published shelf with clearer momentum.`,
    description: genreLabel
      ? `See how ${creatorName}'s ${genreLabel} titles stack up, open the strongest spotlight first, and keep the return trip to the originating series obvious.`
      : `See how ${creatorName}'s published titles stack up, open the strongest spotlight first, and keep the return trip to the originating series obvious.`,
  };
}

function CreatorPageSkeleton() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <SiteHeader />
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <SurfacePanel className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-3">
              <div className="h-4 w-28 animate-pulse rounded-full bg-white/10" />
              <div className="h-14 w-full max-w-3xl animate-pulse rounded-[24px] bg-white/10" />
              <div className="h-20 w-full max-w-2xl animate-pulse rounded-[24px] bg-white/10" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`creator-hero-skeleton-${index}`}
                  className="h-28 animate-pulse rounded-[24px] border border-white/10 bg-black/20"
                />
              ))}
            </div>
          </div>
        </SurfacePanel>

        <SurfacePanel>
          <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div className="aspect-[3/4] animate-pulse rounded-[28px] border border-white/10 bg-white/10" />
            <div className="space-y-4">
              <div className="h-4 w-32 animate-pulse rounded-full bg-white/10" />
              <div className="h-12 w-full max-w-2xl animate-pulse rounded-[24px] bg-white/10" />
              <div className="h-24 w-full animate-pulse rounded-[24px] bg-white/10" />
              <div className="grid gap-3 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={`creator-spotlight-skeleton-${index}`}
                    className="h-28 animate-pulse rounded-[24px] border border-white/10 bg-black/20"
                  />
                ))}
              </div>
            </div>
          </div>
        </SurfacePanel>

        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
            <SkeletonCard key={`creator-grid-skeleton-${index}`} />
          ))}
        </div>
      </div>
    </main>
  );
}

export default function CreatorPage({ creatorSlug }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAdultMode, forceDisableAdultMode } = useAdultGateStore();
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
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
    setLoading(true);
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
          setCatalog([]);
          setError(response.error || "Unable to load creator page.");
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
  }, [forceDisableAdultMode, isAdultMode]);

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
    const strongestGenre = topGenres[0] || "Editorial";

    return [
      {
        label: "Titles",
        value: formatTitleCountLabel(creatorItems.length),
        hint: "Everything currently visible inside this creator or studio lane.",
      },
      {
        label: "Completed",
        value: String(completedCount),
        hint: completedCount > 0
          ? "Finished runs are ready for uninterrupted reading sessions."
          : "Live titles dominate this shelf right now.",
      },
      {
        label: "Reader proof",
        value: formatCompactCount(readerProof),
        hint: "Combined momentum signals gathered from ratings, followers, and views.",
      },
      {
        label: "Lead lane",
        value: strongestGenre,
        hint: topGenres.length > 1
          ? `${topGenres.slice(0, 2).join(" | ")} define the clearest genre fit.`
          : "Use the strongest genre signal to keep discovery focused.",
      },
    ];
  }, [creatorItems, topGenres]);

  const spotlightStats = useMemo(() => {
    if (!spotlightSeries) {
      return [];
    }

    const releaseLabel =
      String(spotlightSeries?.status || "").toLowerCase() === "completed"
        ? "Completed"
        : formatDateLabel(spotlightSeries?.updatedAt);

    return [
      {
        label: "Reader proof",
        value: formatCompactCount(getPopularityScore(spotlightSeries)),
        hint: "The strongest visible signal attached to this title right now.",
      },
      {
        label: "Release pulse",
        value: releaseLabel,
        hint:
          String(spotlightSeries?.status || "").toLowerCase() === "completed"
            ? "A finished run with no wait between chapters."
            : "Keeps the title looking active for returning readers.",
      },
      {
        label: "Shelf fit",
        value:
          String(spotlightSeries?.status || "").toLowerCase() === "completed"
            ? "Binge-ready"
            : "Return weekly",
        hint: Array.isArray(spotlightSeries?.genres) && spotlightSeries.genres.length > 0
          ? spotlightSeries.genres.slice(0, 2).join(" | ")
          : "Editorially adjacent title inside this creator shelf.",
      },
    ];
  }, [spotlightSeries]);

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

  if (loading) {
    return <CreatorPageSkeleton />;
  }

  if (error) {
    return (
      <main className="min-h-screen bg-neutral-950 text-neutral-100">
        <SiteHeader />
        <div className="mx-auto max-w-[960px] px-4 py-12 sm:px-6">
          <SurfacePanel>
            <EmptyState
              icon="alert"
              title="Creator page unavailable"
              description="We could not load this creator shelf right now. Retry or move back into search."
              action={{
                label: "Retry",
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
      <main className="min-h-screen bg-neutral-950 text-neutral-100">
        <SiteHeader />
        <div className="mx-auto max-w-[1280px] space-y-6 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
          <EditorialHero
            eyebrow="Creator page"
            title={`No published titles are visible for ${creatorName} yet.`}
            description="This creator or studio shelf does not currently expose any live titles in the active catalog mode."
            secondary="Move back to search, rankings, or the source series so discovery never dead-ends."
            stats={[
              {
                label: "Creator",
                value: creatorName,
                hint: "Slug resolved successfully, but the public shelf is empty right now.",
              },
              {
                label: "Mode",
                value: isAdultMode ? "18+" : "Standard",
                hint: isAdultMode ? "Protected catalog mode is active." : "Age-gated titles stay hidden here.",
              },
            ]}
            actions={
              <>
                <button
                  type="button"
                  onClick={() => router.push("/search")}
                  className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200"
                >
                  Open search
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/rankings?type=popular&window=week")}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
                >
                  Open weekly chart
                </button>
                <button
                  type="button"
                  onClick={handleReturn}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
                >
                  Return to series
                </button>
              </>
            }
          />

          <SurfacePanel>
            <EmptyState
              icon="book"
              title="No creator titles available"
              description="Try search, rankings, or head back to the originating series to keep the session moving."
              action={{
                label: "Browse search",
                onClick: () => router.push("/search"),
              }}
            />
          </SurfacePanel>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <SiteHeader />

      <div className="mx-auto max-w-[1280px] space-y-6 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        {commerceNotice ? (
          <CommerceSuccessBanner
            notice={commerceNotice}
            onDismiss={() => setCommerceNotice(null)}
          />
        ) : null}

        <EditorialHero
          eyebrow={isStudioShelf ? "Studio shelf" : "Creator page"}
          title={heroCopy.title}
          description={heroCopy.description}
          secondary={
            originSeries
              ? `Started from ${originSeries.title}. Use this shelf to branch out without losing the route back.`
              : "Use this shelf to compare titles from the same creative lane before you commit to the next reading session."
          }
          stats={creatorStats}
          actions={
            <>
              <button
                type="button"
                onClick={() => router.push("/rankings?type=popular&window=week")}
                className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200"
              >
                Open weekly chart
              </button>
              <button
                type="button"
                onClick={handleBrowseGenre}
                className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
              >
                {topGenres[0] ? `Browse ${topGenres[0]}` : "Browse related titles"}
              </button>
              <button
                type="button"
                onClick={handleReturn}
                className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
              >
                {originSeries ? `Return to ${originSeries.title}` : "Return to series"}
              </button>
            </>
          }
        />

        {spotlightSeries ? (
          <SurfacePanel className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
              <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black/20 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
                <div className="aspect-[3/4] w-full overflow-hidden">
                  <Cover
                    tone={spotlightSeries.coverTone}
                    coverUrl={spotlightSeries.coverUrl}
                    className="h-full w-full"
                  />
                </div>
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-emerald-300/85">
                  Spotlight title
                </p>
                <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {spotlightSeries.title}
                </h2>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-neutral-300 sm:text-base">
                  {spotlightSeries.description ||
                    `Start with ${spotlightSeries.title} if you want the clearest read on how this creator lane hooks, updates, and converts curiosity into a longer session.`}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {(Array.isArray(spotlightSeries?.genres) ? spotlightSeries.genres : []).map((genre) => (
                    <span
                      key={genre}
                      className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-neutral-200"
                    >
                      {genre}
                    </span>
                  ))}
                  {spotlightSeries?.status ? (
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-neutral-300">
                      {spotlightSeries.status}
                    </span>
                  ) : null}
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {spotlightStats.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">
                        {stat.label}
                      </p>
                      <p className="mt-3 font-display text-2xl font-semibold tracking-tight text-white">
                        {stat.value}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-neutral-400">{stat.hint}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handleOpenTitle(spotlightSeries)}
                    className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200"
                  >
                    Open series
                  </button>
                  <button
                    type="button"
                    onClick={handleBrowseGenre}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
                  >
                    {topGenres[0] ? `Search ${topGenres[0]}` : "Browse related genres"}
                  </button>
                  <button
                    type="button"
                    onClick={handleReturn}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
                  >
                    {originSeries ? `Return to ${originSeries.title}` : "Return to series"}
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
          />
        ) : null}

        <SurfacePanel className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-emerald-300/85">
                More from this lane
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Compare every visible title before the session cools off.
              </h2>
            </div>
            <p className="text-sm text-neutral-400">
              {formatTitleCountLabel(gridItems.length)} visible for {creatorName}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
