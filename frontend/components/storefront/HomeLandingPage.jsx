"use client";

import { useEffect, useMemo } from "react";
import { HomeDataProvider, useHomeData } from "../home/HomeDataProvider";
import { useAuthStore } from "../../store/useAuthStore";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { useProgressStore } from "../../store/useProgressStore";
import { trackEvent } from "../../lib/trackEvent";
import { EmptyShelf, StorefrontPage } from "./StorefrontScaffold";
import {
  buildCompletedRail,
  buildContinueReadingItems,
  buildGenreLabel,
  buildLatestInstallmentLabel,
  buildPopularRail,
  buildReadHref,
  buildStatusLabel,
  buildUpdatedRail,
  filterSeriesByType,
  pickFeaturedSeries,
  uniqueBySeriesId,
} from "./landingUtils";
import {
  CompletedBingeSection,
  FeaturedHero,
  HomeFooter,
  HomeHeader,
  InteractiveStoriesBanner,
  NewEpisodesToday,
  ReadersRightNow,
  ReadTonightSection,
  TrendingCovers,
} from "./home";

function normalizeHotKeywordEntry(entry) {
  const label = String(
    entry?.label || entry?.keyword || entry?.value || entry || "",
  ).trim();
  const value = String(entry?.value || entry?.keyword || label).trim();
  if (!label || !value) {
    return null;
  }

  return {
    label,
    value,
  };
}

function HomeLandingContent({ initialHomeData = null }) {
  const { seriesList, hotKeywords, loading } = useHomeData();
  const { isSignedIn } = useAuthStore();
  const { bySeriesId, loadProgress } = useProgressStore();
  const featuredSeriesId = String(
    initialHomeData?.canonicalHome?.featuredSeriesId || "",
  ).trim();

  useEffect(() => {
    trackEvent("home_view", {
      sourceSection: "home_page",
    });
  }, []);

  useEffect(() => {
    if (isSignedIn) {
      void loadProgress();
    }
  }, [isSignedIn, loadProgress]);

  const homeModel = useMemo(() => {
    const featured = pickFeaturedSeries(seriesList, featuredSeriesId);
    const featuredId = String(featured?.id || "").trim();
    const popularPool = buildPopularRail(seriesList, 30).filter(
      (series) => String(series?.id || "").trim() !== featuredId,
    );
    const readersRightNow = popularPool.slice(0, 4);
    const readersNowIds = new Set(
      readersRightNow.map((series) => String(series?.id || "").trim()),
    );
    const trending = popularPool
      .filter((series) => !readersNowIds.has(String(series?.id || "").trim()))
      .slice(0, 8);
    const usedIds = new Set(
      [featuredId, ...readersRightNow, ...trending]
        .map((series) =>
          typeof series === "string"
            ? series
            : String(series?.id || "").trim(),
        )
        .filter(Boolean),
    );
    const updates = buildUpdatedRail(seriesList, 20).filter(
      (series) => !usedIds.has(String(series?.id || "").trim()),
    );
    const continueItems = buildContinueReadingItems(seriesList, bySeriesId).slice(
      0,
      8,
    );
    const continueIds = new Set(
      continueItems.map((series) => String(series?.id || "").trim()),
    );
    const completed = buildCompletedRail(seriesList, 12).filter(
      (series) =>
        !usedIds.has(String(series?.id || "").trim()) &&
        !continueIds.has(String(series?.id || "").trim()),
    );
    const interactiveStories = buildPopularRail(
      filterSeriesByType(seriesList, "interactive"),
      6,
    ).filter((series) => String(series?.id || "").trim() !== featuredId);
    const readTonight = uniqueBySeriesId([
      ...continueItems,
      ...updates,
      ...popularPool,
    ]).filter((series) => String(series?.id || "").trim() !== featuredId);
    const rankingsPreview = buildPopularRail(seriesList, 5);
    const searchSuggestions = (Array.isArray(hotKeywords) ? hotKeywords : [])
      .map(normalizeHotKeywordEntry)
      .filter(Boolean)
      .slice(0, 6);

    return {
      featured,
      readersRightNow,
      trending,
      updates: updates.slice(0, 3),
      continueItems,
      completedLead: completed[0] || null,
      completedItems: completed.slice(1, 5),
      interactiveStories: interactiveStories.slice(0, 4),
      readTonight: readTonight.slice(0, 4),
      rankingsPreview,
      searchSuggestions,
    };
  }, [bySeriesId, featuredSeriesId, hotKeywords, seriesList]);

  const featuredStats = homeModel.featured
    ? [
        {
          label: "Latest",
          value: buildLatestInstallmentLabel(homeModel.featured),
        },
        {
          label: "Shelf",
          value: buildStatusLabel(homeModel.featured),
        },
        {
          label: "Genres",
          value: buildGenreLabel(homeModel.featured, 2) || "Trending",
        },
      ]
    : [];

  return (
    <StorefrontPage theme="home">
      {homeModel.featured ? (
        <>
          <HomeHeader suggestions={homeModel.searchSuggestions} />
          <FeaturedHero
            series={homeModel.featured}
            primaryHref={
              initialHomeData?.canonicalHome?.featuredReadHref ||
              buildReadHref(homeModel.featured)
            }
            secondaryHref={`/series/${homeModel.featured.id}`}
            stats={featuredStats}
            chips={(Array.isArray(homeModel.featured?.genres)
              ? homeModel.featured.genres
              : []
            ).slice(0, 3)}
          />
        </>
      ) : loading ? null : (
        <EmptyShelf
          title="The front page is getting ready"
          description="New stories will land here as soon as they go live in this mode."
          actionHref="/search"
        />
      )}

      <ReadersRightNow items={homeModel.readersRightNow} />
      <TrendingCovers items={homeModel.trending} />
      <NewEpisodesToday items={homeModel.updates} />
      <CompletedBingeSection
        lead={homeModel.completedLead}
        items={homeModel.completedItems}
      />
      <InteractiveStoriesBanner items={homeModel.interactiveStories} />
      <ReadTonightSection
        items={homeModel.readTonight}
        suggestions={homeModel.searchSuggestions}
        rankings={homeModel.rankingsPreview}
      />
      <HomeFooter />
    </StorefrontPage>
  );
}

export default function HomeLandingPage({
  initialSearchParams = {},
  initialHomeData = null,
}) {
  void initialSearchParams;
  const { contentMode } = useAdultGateStore();
  const initialPayloadMode = String(initialHomeData?.contentMode || "").trim();
  const effectiveInitialData =
    initialHomeData && initialPayloadMode === contentMode ? initialHomeData : null;

  return (
    <HomeDataProvider initialData={effectiveInitialData}>
      <HomeLandingContent initialHomeData={effectiveInitialData} />
    </HomeDataProvider>
  );
}
