"use client";

import { useMemo } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { useFollowStore } from "../../store/useFollowStore";
import { useProgressStore } from "../../store/useProgressStore";
import { useHistoryStore } from "../../store/useHistoryStore";
import { useBehaviorStore } from "../../store/useBehaviorStore";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { recommendRails } from "../../lib/reco/recommender";
import { getRecommendations } from "../../lib/recommendation/engine";
import { buildHomeRail } from "../../lib/storefrontRecommendations";
import { useHomeData } from "./HomeDataProvider";
import { usePersonalizedRecommendations } from "../../hooks/useAIRecommendations";

function parseLatestNumber(value) {
  if (!value) {
    return 0;
  }

  const match = String(value).match(/(\d+)/);
  if (!match) {
    return 0;
  }

  return Number.parseInt(match[1], 10) || 0;
}

function createRailItem(series, overrides = {}) {
  return {
    id: series.id,
    seriesId: series.id,
    title: series.title,
    author: series.author || "",
    subtitle: series.status || "Series",
    type: series.type || "",
    seriesType: series.type || "",
    status: series.status || "",
    genres: Array.isArray(series.genres) ? series.genres : [],
    coverTone: series.coverTone,
    coverUrl: series.coverUrl,
    badge: series.badge,
    adult: Boolean(series.adult),
    freeEpisodeCount: Number(series.freeEpisodeCount || 0),
    hasFreeEpisodes: Boolean(series.hasFreeEpisodes || Number(series.freeEpisodeCount || 0) > 0),
    ...overrides,
  };
}

export function useHomeRecommendations() {
  const { seriesList } = useHomeData();
  const { isSignedIn, user } = useAuthStore();
  const { followedSeriesIds } = useFollowStore();
  const { bySeriesId: progressMap } = useProgressStore();
  const { historyItems } = useHistoryStore();
  const { behavior } = useBehaviorStore();
  const { isAdultMode } = useAdultGateStore();

  const { data: aiRecommendations, loading: aiLoading } = usePersonalizedRecommendations(
    isSignedIn ? user?.id : null,
    10,
  );

  const followingUpdates = useMemo(() => {
    if (!followedSeriesIds || followedSeriesIds.length === 0) {
      return [];
    }

    const catalog = seriesList.length > 0 ? seriesList : [];
    const candidates = catalog.filter((series) => followedSeriesIds.includes(series.id));

    return candidates
      .map((series) =>
        createRailItem(series, {
          subtitle: series.latest || "New episode",
        }),
      )
      .sort((a, b) => parseLatestNumber(b.subtitle) - parseLatestNumber(a.subtitle));
  }, [followedSeriesIds, seriesList]);

  const historyRail = useMemo(() => {
    if (!isSignedIn || !Array.isArray(historyItems) || historyItems.length === 0) {
      return [];
    }

    return historyItems
      .map((entry) => {
        const series = seriesList.find((item) => item.id === entry.seriesId);
        if (!series) {
          return null;
        }

        return createRailItem(series, {
          id: `${entry.seriesId}-${entry.episodeId}`,
          subtitle: `Last read ${entry.episodeId}`,
          resumeEpisodeId: entry.episodeId,
        });
      })
      .filter(Boolean)
      .slice(0, 10);
  }, [historyItems, isSignedIn, seriesList]);

  const progressSeriesIds = useMemo(() => {
    if (!progressMap || typeof progressMap !== "object") {
      return [];
    }

    return Object.keys(progressMap);
  }, [progressMap]);

  const historySeriesIds = useMemo(() => {
    if (!Array.isArray(historyItems)) {
      return [];
    }

    return historyItems.map((item) => item.seriesId);
  }, [historyItems]);

  const reco = useMemo(
    () => recommendRails(seriesList, behavior, progressMap, { isAdultMode }),
    [behavior, isAdultMode, progressMap, seriesList],
  );

  const recommendedRail = useMemo(() => {
    if (!isSignedIn || seriesList.length === 0) {
      return [];
    }

    const recommendations = getRecommendations({
      allSeries: seriesList,
      historySeriesIds,
      followedSeriesIds,
      progressSeriesIds,
      limit: 10,
      strategy: "content",
    });

    return recommendations.map((series) =>
      createRailItem(series, {
        subtitle: series.genres?.join(", ") || "",
      }),
    );
  }, [followedSeriesIds, historySeriesIds, isSignedIn, progressSeriesIds, seriesList]);

  const isNewUser = useMemo(
    () => (!historyItems || historyItems.length === 0) && (!progressMap || Object.keys(progressMap).length === 0),
    [historyItems, progressMap],
  );

  const starterItems = useMemo(() => {
    if (!isNewUser || seriesList.length === 0) {
      return [];
    }

    return seriesList
      .filter((series) => series.badge === "Hot" || series.rating >= 4.5)
      .slice(0, 10)
      .map((series) =>
        createRailItem(series, {
          subtitle: series.genres?.join(", ") || "",
        }),
      );
  }, [isNewUser, seriesList]);

  const activeRails = useMemo(() => {
    const rails = [];
    const pushRail = (rail) => {
      if (rail) {
        rails.push(rail);
      }
    };

    pushRail(
      buildHomeRail({
        id: "following",
        items: followingUpdates,
      }),
    );

    if (reco && typeof reco === "object") {
      pushRail(
        buildHomeRail({
          id: "continue",
          items: reco.continueRail,
        }),
      );

      pushRail(
        buildHomeRail({
          id: "because-you-read",
          title: reco.becauseYouReadTitle || "Because You Read",
          items: reco.becauseYouReadRail,
        }),
      );

      pushRail(
        buildHomeRail({
          id: "trending",
          items: reco.trendingRail,
        }),
      );

      pushRail(
        buildHomeRail({
          id: "new",
          items: reco.newRail,
        }),
      );

      pushRail(
        buildHomeRail({
          id: "completed",
          items: reco.completedRail,
        }),
      );

      pushRail(
        buildHomeRail({
          id: "ttf",
          items: reco.ttfRail,
        }),
      );

      pushRail(
        buildHomeRail({
          id: "adult",
          items: reco.adultRail,
        }),
      );
    }

    if (historyRail.length > 0 && !reco?.continueRail?.length) {
      pushRail(
        buildHomeRail({
          id: "history",
          items: historyRail,
        }),
      );
    }

    if (isNewUser) {
      pushRail(
        buildHomeRail({
          id: "starter",
          items: starterItems,
        }),
      );
    }

    if (isSignedIn && !aiLoading && aiRecommendations && aiRecommendations.length > 0) {
      pushRail(
        buildHomeRail({
          id: "ai-recommended",
          items: aiRecommendations.map((series) =>
            createRailItem(series, {
              subtitle: `Rating ${series.rating?.toFixed(1) || "N/A"} | ${series.genres?.join(", ") || ""}`,
            }),
          ),
        }),
      );
    }

    if (isSignedIn) {
      pushRail(
        buildHomeRail({
          id: "recommended",
          items: recommendedRail,
        }),
      );
    }

    return rails;
  }, [
    aiLoading,
    aiRecommendations,
    followingUpdates,
    historyRail,
    isNewUser,
    isSignedIn,
    reco,
    recommendedRail,
    starterItems,
  ]);

  return {
    activeRails,
    followingUpdates,
    historyRail,
    isNewUser,
  };
}
