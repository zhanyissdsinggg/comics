"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PortraitCard from "../home/PortraitCard";
import SkeletonCard from "../common/SkeletonCard";
import FilterBar from "../common/FilterBar";
import EmptyState from "../common/EmptyState";
import SurfacePanel from "../common/SurfacePanel";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { useAuthStore } from "../../store/useAuthStore";
import { apiGet } from "../../lib/apiClient";
import { resolveSeriesCreatorName } from "../../lib/creatorIdentity";
import {
  canViewMatureContent,
  getPublicGenres,
  isMatureGenreValue,
  shouldShowMatureFilter,
} from "../../lib/matureContent";
import { getSearchParam, toURLSearchParams } from "../../lib/pageSearchParams";
import { formatInstallmentCount } from "../../lib/seriesFormatLabels";
import AgeGateModal from "../layout/AgeGateModal";
import LoginGateModal from "../layout/LoginGateModal";
import {
  LOGIN_GATE_DESCRIPTION,
  LOGIN_GATE_TITLE,
} from "../../lib/adultGateCopy";

const PAGE_CONFIG = {
  comic: {
    title: "Comics",
    heroDescription: "Browse trending comics, fresh chapter drops, and finished reads in one place.",
    pathname: "/comics",
    emptyTitle: "No comics found",
    emptyDescription: "Try a different filter or jump back into the full catalog.",
    smallDatasetMessage: "",
  },
  novel: {
    title: "Novels",
    heroDescription: "Browse current novels, recent updates, and finished stories without the extra clutter.",
    pathname: "/novels",
    emptyTitle: "No novels found",
    emptyDescription: "Try a different filter or come back after more titles land.",
    smallDatasetMessage: "More novels coming soon",
  },
};

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toTimestamp(value) {
  const parsed = typeof value === "number" ? value : Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function getEpisodeCount(series) {
  return Math.max(0, toNumber(series?.episodeCount));
}

function getEditorialScore(series) {
  return (
    toTimestamp(series?.updatedAt) +
    getEpisodeCount(series) * 1000 +
    (normalizeStatus(series?.status) === "completed" ? 5000 : 0)
  );
}

function getSeriesBadge(series) {
  if (normalizeStatus(series?.status) === "completed") {
    return "Finished";
  }

  if (toTimestamp(series?.updatedAt) >= Date.now() - 14 * 24 * 60 * 60 * 1000) {
    return "Updated";
  }

  if (getEpisodeCount(series) > 0 && getEpisodeCount(series) <= 12) {
    return "Top Pick";
  }

  return "";
}

function getSeriesSubtitle(series) {
  const creatorName = resolveSeriesCreatorName(series);
  const genres = Array.isArray(series?.genres) ? series.genres.slice(0, 2) : [];

  if (genres.length > 0) {
    return genres.join(" / ");
  }
  if (creatorName) {
    return creatorName;
  }
  if (getEpisodeCount(series) > 0) {
    return formatInstallmentCount(series, getEpisodeCount(series));
  }
  return normalizeStatus(series?.status) === "completed" ? "Finished" : "Ongoing";
}

function mapSeriesCardItem(series) {
  return {
    id: series.id,
    title: series.title,
    subtitle: "",
    genres: Array.isArray(series?.genres) ? series.genres : [],
    type: series?.type || "",
    seriesType: series?.type || "",
    status: series?.status || "",
    adult: Boolean(series?.adult),
    coverUrl: series.coverUrl,
    coverTone: series.coverTone,
    badge: "",
  };
}

function CatalogSection({
  title,
  items,
  href,
  ctaLabel,
}) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[1.3rem] font-semibold tracking-[-0.03em] text-white">
            {title}
          </h2>
        </div>
        {href ? (
          <Link href={href} className="text-sm text-white/65 hover:text-white">
            {ctaLabel}
          </Link>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {items.map((item) => (
          <PortraitCard
            key={item.id}
            item={item}
            tone={item.coverTone}
            href={`/series/${encodeURIComponent(item.id)}`}
            density="compact"
            showActionLabel
            actionLabel="Read more"
            interactionMode="link"
          />
        ))}
      </div>
    </section>
  );
}

export default function SeriesPage({
  type = "comic",
  initialSearchParams = {},
  initialSeries = [],
  hasInitialSeries = false,
  matureCatalogAvailable = false,
}) {
  const router = useRouter();
  const {
    adultConfirmed,
    ageRuleKey,
    legalAge,
    isAdultMode,
    enableAdultMode,
    confirmAge,
  } = useAdultGateStore();
  const { hydrated, isSignedIn, signIn } = useAuthStore();
  const [series, setSeries] = useState(Array.isArray(initialSeries) ? initialSeries : []);
  const [loading, setLoading] = useState(!hasInitialSeries);
  const [activeModal, setActiveModal] = useState(null);
  const [authError, setAuthError] = useState("");

  const config = PAGE_CONFIG[type] || PAGE_CONFIG.comic;
  const searchParams = useMemo(
    () => toURLSearchParams(initialSearchParams),
    [initialSearchParams],
  );

  const selectedGenre = getSearchParam(initialSearchParams, "genre", "all");
  const sortBy = getSearchParam(initialSearchParams, "sort", "latest");
  const status = getSearchParam(initialSearchParams, "status", "all");
  const isNovelPage = type === "novel";

  useEffect(() => {
    async function loadSeries() {
      try {
        if (!hasInitialSeries) {
          setLoading(true);
        }

        const response = await apiGet(`/api/series?adult=${isAdultMode ? "1" : "0"}`, {
          cacheMs: 300000,
        });

        if (!response.ok) {
          throw new Error(response.message || response.error || `Failed to load ${type}s`);
        }

        setSeries((response.data?.series || []).filter((item) => item.type === type));
      } catch (error) {
        console.error(`Failed to load ${type}s:`, error);
      } finally {
        setLoading(false);
      }
    }

    loadSeries();
  }, [hasInitialSeries, isAdultMode, type]);

  const updateParams = useCallback(
    (updates) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        const nextValue = typeof value === "string" ? value.trim() : value;
        if (!nextValue || nextValue === "all") {
          params.delete(key);
        } else {
          params.set(key, String(nextValue));
        }
      });

      const nextQuery = params.toString();
      router.replace(nextQuery ? `${config.pathname}?${nextQuery}` : config.pathname);
    },
    [config.pathname, router, searchParams],
  );

  const handleResetFilters = useCallback(() => {
    router.replace(config.pathname);
  }, [config.pathname, router]);

  const genres = useMemo(() => {
    const genreSet = new Set();
    series.forEach((item) => {
      if (Array.isArray(item?.genres)) {
        item.genres.forEach((genre) => genreSet.add(genre));
      }
    });
    return getPublicGenres(
      Array.from(genreSet).sort((left, right) => left.localeCompare(right)),
      {
        includeMature:
          shouldShowMatureFilter(series) || Boolean(matureCatalogAvailable),
      },
    );
  }, [matureCatalogAvailable, series]);

  const genreHrefMap = useMemo(() => {
    return genres.reduce((map, genre) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("genre", genre);
      const nextQuery = params.toString();
      map[genre] = nextQuery ? `${config.pathname}?${nextQuery}` : config.pathname;
      return map;
    }, {});
  }, [config.pathname, genres, searchParams]);

  const filteredAndSortedSeries = useMemo(() => {
    let result = [...series];

    if (selectedGenre !== "all") {
      result = result.filter((item) =>
        isMatureGenreValue(selectedGenre)
          ? Boolean(item?.adult)
          : Array.isArray(item.genres)
            ? item.genres.some(
                (genre) => genre.toLowerCase() === selectedGenre.toLowerCase(),
              )
            : false,
      );
    }

    if (status !== "all") {
      result = result.filter((item) => {
        const itemStatus = normalizeStatus(item.status);
        if (status === "completed") {
          return itemStatus === "completed";
        }
        if (status === "ongoing") {
          return itemStatus !== "completed";
        }
        return true;
      });
    }

    return result.sort((left, right) => {
      if (sortBy === "title") {
        return String(left?.title || "").localeCompare(String(right?.title || ""));
      }
      if (sortBy === "latest") {
        return toTimestamp(right?.updatedAt) - toTimestamp(left?.updatedAt);
      }
      return getEditorialScore(right) - getEditorialScore(left);
    });
  }, [selectedGenre, series, sortBy, status]);

  const trendingItems = useMemo(
    () =>
      [...series]
        .sort((left, right) => getEditorialScore(right) - getEditorialScore(left))
        .slice(0, 6)
        .map(mapSeriesCardItem),
    [series],
  );

  const newUpdateItems = useMemo(
    () =>
      [...series]
        .sort((left, right) => toTimestamp(right?.updatedAt) - toTimestamp(left?.updatedAt))
        .slice(0, 6)
        .map(mapSeriesCardItem),
    [series],
  );

  const completedItems = useMemo(
    () =>
      [...series]
        .filter((item) => normalizeStatus(item?.status) === "completed")
        .sort((left, right) => getEditorialScore(right) - getEditorialScore(left))
        .slice(0, 4)
        .map(mapSeriesCardItem),
    [series],
  );

  const smallNovelCatalog = isNovelPage && series.length < 6;
  const showNovelShelves = !isNovelPage || series.length >= 6;
  const handleGenreChange = useCallback(
    (value, options = {}) => {
      if (!isMatureGenreValue(value)) {
        updateParams({ genre: value });
        return;
      }

      if (options?.bypassGate) {
        updateParams({ genre: value });
        return;
      }

      if (!hydrated || !isSignedIn) {
        setActiveModal("login");
        return;
      }

      if (!canViewMatureContent({ adultConfirmed, isAdultMode })) {
        setActiveModal("age");
        return;
      }

      if (!isAdultMode) {
        enableAdultMode();
      }

      updateParams({ genre: value });
    },
    [
      adultConfirmed,
      enableAdultMode,
      hydrated,
      isAdultMode,
      isSignedIn,
      updateParams,
    ],
  );

  const handleLogin = useCallback(
    async ({ email, password, mode }) => {
      const response = await signIn(email, password, mode);
      if (response?.status === 202) {
        setAuthError("");
        return response;
      }
      if (!response?.ok) {
        setAuthError("Invalid email or password.");
        return response;
      }

      setAuthError("");
      if (!adultConfirmed) {
        setActiveModal("age");
        return response;
      }

      if (!isAdultMode) {
        enableAdultMode();
      }

      setActiveModal(null);
      updateParams({ genre: "Mature" });
      return response;
    },
    [adultConfirmed, enableAdultMode, isAdultMode, signIn, updateParams],
  );

  const handleAgeConfirm = useCallback(() => {
    confirmAge(ageRuleKey);
    setActiveModal(null);
    updateParams({ genre: "Mature" });
  }, [ageRuleKey, confirmAge, updateParams]);

  return (
    <>
      <main className="min-h-screen bg-[#050505] text-white">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8">
        <section className="rounded-[28px] border border-white/10 bg-[#0b0b0b] p-5 sm:p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
                {config.title}
              </p>
              <h1 className="text-[2rem] font-semibold tracking-[-0.05em] text-white sm:text-[2.6rem]">
                {config.title}
              </h1>
              <p className="max-w-[42rem] text-sm leading-6 text-white/64">
                {config.heroDescription}
              </p>
            </div>

            <div>
              <Link
                href={`/search?format=${type}`}
                className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/12 bg-white/[0.03] px-5 text-sm font-medium text-white/78 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                Search {config.title.toLowerCase()}
              </Link>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <SkeletonCard key={`series-shelf-skeleton-${index}`} appearance="dark" />
              ))}
            </div>
            <div className="rounded-[24px] border border-white/10 bg-[#111111] p-5">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
                {Array.from({ length: 10 }).map((_, index) => (
                  <SkeletonCard key={`series-grid-skeleton-${index}`} appearance="dark" />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {showNovelShelves ? (
              <div className="space-y-10">
                <CatalogSection
                  title="Trending"
                  ctaLabel="See all"
                  href="/rankings"
                  items={trendingItems}
                />
                <CatalogSection
                  title="New updates"
                  ctaLabel="Latest"
                  href={`${config.pathname}?sort=latest`}
                  items={newUpdateItems}
                />
                <CatalogSection
                  title="Completed"
                  ctaLabel="Finished"
                  href={`${config.pathname}?status=completed`}
                  items={completedItems}
                />
              </div>
            ) : smallNovelCatalog ? (
              <SurfacePanel className="space-y-3" appearance="dark" accent="cyan">
                <h2 className="text-[1.3rem] font-semibold tracking-[-0.03em] text-white">
                  {config.smallDatasetMessage}
                </h2>
                <p className="text-sm leading-6 text-white/64">
                  The catalog is still small, so everything is right below in one clean list.
                </p>
              </SurfacePanel>
            ) : null}

            <section className="space-y-5 rounded-[24px] border border-white/10 bg-[#111111] p-5 sm:p-6">
              <div className="space-y-2">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
                  Catalog
                </p>
                <h2 className="text-[1.55rem] font-semibold tracking-[-0.04em] text-white">
                  All {config.title.toLowerCase()}
                </h2>
              </div>

              <FilterBar
                genres={genres}
                genreHrefMap={genreHrefMap}
                selectedGenre={selectedGenre}
                onGenreChange={handleGenreChange}
                sortBy={sortBy}
                onSortChange={(value) => updateParams({ sort: value })}
                status={status}
                onStatusChange={(value) => updateParams({ status: value })}
                onReset={handleResetFilters}
                appearance="dark"
                density={isNovelPage ? "quiet" : "default"}
              />

              {filteredAndSortedSeries.length === 0 ? (
                <EmptyState
                  icon={isNovelPage ? "book" : "search"}
                  title={config.emptyTitle}
                  description={config.emptyDescription}
                  appearance="dark"
                  action={{
                    label: "Reset filters",
                    onClick: handleResetFilters,
                  }}
                />
              ) : (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {filteredAndSortedSeries.map((item) => (
                    <PortraitCard
                      key={item.id}
                      item={mapSeriesCardItem(item)}
                      tone={item.coverTone}
                      href={`/series/${encodeURIComponent(item.id)}`}
                      density="compact"
                      showActionLabel
                      actionLabel="Read more"
                      interactionMode="link"
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
        </div>
      </main>

      <LoginGateModal
        open={activeModal === "login"}
        onClose={() => {
          setActiveModal(null);
          setAuthError("");
        }}
        onSubmit={handleLogin}
        title={LOGIN_GATE_TITLE}
        description={LOGIN_GATE_DESCRIPTION}
        errorMessage={authError}
      />
      <AgeGateModal
        open={activeModal === "age"}
        onClose={() => setActiveModal(null)}
        onConfirm={handleAgeConfirm}
        ageRuleKey={ageRuleKey}
        legalAge={legalAge}
      />
    </>
  );
}
