"use client";

import { useEffect, useMemo } from "react";
import { HomeDataProvider, useHomeData } from "../home/HomeDataProvider";
import { useAuthStore } from "../../store/useAuthStore";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { useProgressStore } from "../../store/useProgressStore";
import {
  HOME_COMPLETED_PRIORITY_TITLES,
  HOME_FEATURED_TITLE,
  HOME_PRIORITY_TITLES,
  HOME_TRENDING_PRIORITY_TITLES,
  HOME_UPDATES_PRIORITY_TITLES,
  pickSeriesByExactTitle,
  prioritizeSeriesByTitles,
  withHomeArtwork,
} from "../../lib/homeArtwork";
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
  void initialHomeData;

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
    const featured =
      pickSeriesByExactTitle(seriesList, HOME_FEATURED_TITLE) ||
      pickFeaturedSeries(seriesList);
    const featuredId = String(featured?.id || "").trim();
    const popularPool = buildPopularRail(seriesList, 30).filter(
      (series) => String(series?.id || "").trim() !== featuredId,
    );
    const readersRightNow = prioritizeSeriesByTitles(
      popularPool,
      HOME_PRIORITY_TITLES,
      4,
    );
    const trending = prioritizeSeriesByTitles(
      popularPool,
      HOME_TRENDING_PRIORITY_TITLES,
      6,
    );
    const updates = prioritizeSeriesByTitles(
      uniqueBySeriesId([
        ...buildUpdatedRail(seriesList, 12).filter(
          (series) => String(series?.id || "").trim() !== featuredId,
        ),
        ...popularPool,
      ]),
      HOME_UPDATES_PRIORITY_TITLES,
      3,
    );
    const continueItems = buildContinueReadingItems(seriesList, bySeriesId).slice(
      0,
      8,
    );
    const completed = prioritizeSeriesByTitles(
      uniqueBySeriesId([
        ...buildCompletedRail(seriesList, 12).filter(
          (series) => String(series?.id || "").trim() !== featuredId,
        ),
        ...popularPool.filter(
          (series) => String(series?.id || "").trim() !== featuredId,
        ),
      ]),
      HOME_COMPLETED_PRIORITY_TITLES,
      3,
    );
    const interactiveStories = uniqueBySeriesId([
      ...buildPopularRail(filterSeriesByType(seriesList, "interactive"), 6).filter(
        (series) => String(series?.id || "").trim() !== featuredId,
      ),
      ...popularPool,
    ]).slice(0, 5);
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
      featured: withHomeArtwork(featured, "hero"),
      readersRightNow: readersRightNow.map((series) =>
        withHomeArtwork(series, "cover"),
      ),
      trending: trending.map((series) => withHomeArtwork(series, "cover")),
      updates: updates.map((series) => {
        const title = String(series?.title || "").trim();
        return withHomeArtwork(
          series,
          title === HOME_FEATURED_TITLE ? "hero" : "cover",
        );
      }),
      continueItems,
      completedLead: withHomeArtwork(completed[0] || null, "cover"),
      completedItems: completed
        .slice(1, 3)
        .map((series) => withHomeArtwork(series, "cover")),
      interactiveStories,
      readTonight: readTonight.slice(0, 4),
      rankingsPreview,
      searchSuggestions,
    };
  }, [bySeriesId, hotKeywords, seriesList]);

  const featuredMetaChips = homeModel.featured
    ? [
        `Latest · ${buildLatestInstallmentLabel(homeModel.featured)}`,
        buildStatusLabel(homeModel.featured),
        buildGenreLabel(homeModel.featured, 2) || "Trending",
      ]
    : [];

  return (
    <StorefrontPage theme="home">
      {homeModel.featured ? (
        <>
          <HomeHeader suggestions={homeModel.searchSuggestions} />
          <FeaturedHero
            series={homeModel.featured}
            primaryHref={buildReadHref(homeModel.featured)}
            secondaryHref={`/series/${homeModel.featured.id}`}
            metaChips={featuredMetaChips}
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
