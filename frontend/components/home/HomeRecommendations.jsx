/**
 * HomeRecommendations - 负责计算和管理首页推荐内容
 *
 * 职责：
 * - 计算推荐rails
 * - 管理历史记录rail
 * - 管理关注更新rail
 * - 组装最终的activeRails
 */

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
import { useHomeData } from "./HomeDataProvider";
import { usePersonalizedRecommendations } from "../../hooks/useAIRecommendations"; // 老王添加：AI推荐hook

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

export function useHomeRecommendations() {
  const { seriesList } = useHomeData();
  const { isSignedIn, user } = useAuthStore();
  const { followedSeriesIds } = useFollowStore();
  const { progressMap } = useProgressStore();
  const { historyItems } = useHistoryStore();
  const { behavior } = useBehaviorStore();
  const { isAdultMode } = useAdultGateStore();

  // 老王添加：AI个性化推荐
  const { data: aiRecommendations, loading: aiLoading } = usePersonalizedRecommendations(
    isSignedIn ? user?.id : null,
    10
  );

  // Following updates rail
  const followingUpdates = useMemo(() => {
    if (!followedSeriesIds || followedSeriesIds.length === 0) {
      return [];
    }
    const catalog = seriesList.length > 0 ? seriesList : [];
    const candidates = catalog.filter((series) =>
      followedSeriesIds.includes(series.id)
    );
    return candidates
      .map((series) => ({
        id: series.id,
        title: series.title,
        subtitle: series.latest || "New episode",
        coverTone: series.coverTone,
        coverUrl: series.coverUrl,
        badge: series.badge,
      }))
      .sort((a, b) => parseLatestNumber(b.subtitle) - parseLatestNumber(a.subtitle));
  }, [followedSeriesIds, seriesList]);

  // History rail
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
        return {
          id: `${entry.seriesId}-${entry.episodeId}`,
          title: series.title,
          subtitle: `Last read ${entry.episodeId}`,
          coverTone: series.coverTone,
          coverUrl: series.coverUrl,
          badge: series.badge,
        };
      })
      .filter(Boolean)
      .slice(0, 10);
  }, [isSignedIn, historyItems, seriesList]);

  // Progress-based series IDs
  const progressSeriesIds = useMemo(() => {
    if (!progressMap || typeof progressMap !== "object") {
      return [];
    }
    return Object.keys(progressMap);
  }, [progressMap]);

  // History series IDs
  const historySeriesIds = useMemo(() => {
    if (!Array.isArray(historyItems)) {
      return [];
    }
    return historyItems.map((item) => item.seriesId);
  }, [historyItems]);

  // Recommendation rails from recommender
  const reco = useMemo(
    () => recommendRails(seriesList, behavior, progressMap, { isAdultMode }),
    [behavior, progressMap, isAdultMode, seriesList]
  );

  // Content-based recommendations
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
    return recommendations.map((series) => ({
      id: series.id,
      title: series.title,
      subtitle: series.genres?.join(", ") || "",
      coverTone: series.coverTone,
      coverUrl: series.coverUrl,
      badge: series.badge,
    }));
  }, [seriesList, historySeriesIds, followedSeriesIds, progressSeriesIds, isSignedIn]);

  // Check if user is new (no history or progress)
  const isNewUser = useMemo(() => {
    return (
      (!historyItems || historyItems.length === 0) &&
      (!progressMap || Object.keys(progressMap).length === 0)
    );
  }, [historyItems, progressMap]);

  // Starter items for new users
  const starterItems = useMemo(() => {
    if (!isNewUser || seriesList.length === 0) {
      return [];
    }
    return seriesList
      .filter((s) => s.badge === "Hot" || s.rating >= 4.5)
      .slice(0, 10)
      .map((series) => ({
        id: series.id,
        title: series.title,
        subtitle: series.genres?.join(", ") || "",
        coverTone: series.coverTone,
        coverUrl: series.coverUrl,
        badge: series.badge,
      }));
  }, [isNewUser, seriesList]);

  // Assemble active rails
  const activeRails = useMemo(() => {
    const rails = [];

    // Following updates (if user follows any series)
    if (followingUpdates.length > 0) {
      rails.push({
        id: "following",
        title: "Following Updates",
        items: followingUpdates,
      });
    }

    // Add recommendation rails from recommender
    if (reco && typeof reco === "object") {
      // Continue reading rail
      if (reco.continueRail && reco.continueRail.length > 0) {
        rails.push({
          id: "continue",
          title: "Continue Reading",
          items: reco.continueRail,
        });
      }

      // Because you read rail
      if (reco.becauseYouReadRail && reco.becauseYouReadRail.length > 0) {
        rails.push({
          id: "because-you-read",
          title: reco.becauseYouReadTitle || "Because You Read",
          items: reco.becauseYouReadRail,
        });
      }

      // Trending rail
      if (reco.trendingRail && reco.trendingRail.length > 0) {
        rails.push({
          id: "trending",
          title: "Trending Now",
          items: reco.trendingRail,
        });
      }

      // New releases rail
      if (reco.newRail && reco.newRail.length > 0) {
        rails.push({
          id: "new",
          title: "New Releases",
          items: reco.newRail,
        });
      }

      // Completed rail
      if (reco.completedRail && reco.completedRail.length > 0) {
        rails.push({
          id: "completed",
          title: "Completed Series",
          items: reco.completedRail,
        });
      }

      // TTF rail
      if (reco.ttfRail && reco.ttfRail.length > 0) {
        rails.push({
          id: "ttf",
          title: "Free Soon",
          items: reco.ttfRail,
        });
      }

      // Adult rail (if in adult mode)
      if (reco.adultRail && reco.adultRail.length > 0) {
        rails.push({
          id: "adult",
          title: "Adult Content",
          items: reco.adultRail,
        });
      }
    }

    // History rail (if user has history) - 老王注释：这个可能和continueRail重复，但保留以防万一
    if (historyRail.length > 0 && !reco?.continueRail?.length) {
      rails.push({
        id: "history",
        title: "Continue Reading",
        items: historyRail,
      });
    }

    // For new users, add starter rail
    if (isNewUser && starterItems.length > 0) {
      rails.push({
        id: "starter",
        title: "Start Here",
        items: starterItems,
      });
    }

    // 老王添加：AI个性化推荐rail（优先级高于本地推荐）
    if (isSignedIn && !aiLoading && aiRecommendations && aiRecommendations.length > 0) {
      rails.push({
        id: "ai-recommended",
        title: "🤖 AI Picks for You",
        items: aiRecommendations.map((series) => ({
          id: series.id,
          title: series.title,
          subtitle: `⭐ ${series.rating?.toFixed(1) || "N/A"} · ${series.genres?.join(", ") || ""}`,
          coverTone: series.coverTone,
          coverUrl: series.coverUrl,
          badge: series.badge,
        })),
      });
    }

    // Recommended rail (if signed in)
    if (isSignedIn && recommendedRail.length > 0) {
      rails.push({
        id: "recommended",
        title: "Recommended for You",
        items: recommendedRail,
      });
    }

    return rails;
  }, [
    reco,
    isAdultMode,
    historyRail,
    isNewUser,
    starterItems,
    isSignedIn,
    recommendedRail,
    followingUpdates,
    aiRecommendations, // 老王添加：AI推荐依赖
    aiLoading, // 老王添加：AI推荐加载状态
  ]);

  return {
    activeRails,
    followingUpdates,
    historyRail,
    isNewUser,
  };
}
