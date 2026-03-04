/**
 * HomeRecommendations - 闂佽崵濮甸崝妤呭窗閺囥垺鍎楁俊銈呭暞婵ジ鏌ㄥ☉妯侯伀闁哄棭鍓熼弻娑橆煥閸愵亞浼囧銈嗘尰閹倿骞冮崼鏇炲耿婵炴垼椴哥粋鍐╀繆閻愵亜鈧洟鎮樺杈ㄦ殰鐟滅増甯楅崵鎺楁煙闁箑澧柡浣哥埣閹? *
 * 闂備胶鍘у畷顒勬儗娓氣偓閹苯螖閸涱喗娅? * - 闂佽崵濮崇欢銈囨閺囥垺鍋╁┑鐘宠壘缁犳娊鏌曟繛鍨缂佲偓閸嶇ils
 * - 缂傚倷鑳舵刊瀵告閺囥垹绠栧┑鐘叉搐閸屻劑鏌涢埄鍐炬當闁芥垵顦甸幃瑙勬媴鐟欏嫮鍑＄紓鍌氱Т閸氱けil
 * - 缂傚倷鑳舵刊瀵告閺囥垹绠栧┑鐘叉搐缁€鍌炴煣韫囷絽浜濋柡鍡楃墦閺岋繝宕惰閹界娀鏌＄仦绛嬫祩ail
 * - 缂傚倸鍊风粈浣衡偓姘煎灦钘熷┑鐘叉搐鐎氬鏌嶈閸撴稓妲愰幒妤€閱囬柕蹇ョ磿閺嗙嚰ctiveRails
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
import { usePersonalizedRecommendations } from "../../hooks/useAIRecommendations"; // 闂備礁銈搁。锕傛嚄閸撲焦鏆滈柛銉仈鎼达絾瀚氶柟缁樺俯濞奸亶姊洪幐搴ｂ姇妞ゆ垵鈹夐梻浣筋潐娴滀粙宕濊箛鎾舵殾婵帞鍔噊k

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

  // 闂備礁銈搁。锕傛嚄閸撲焦鏆滈柛銉仈鎼达絾瀚氶柟缁樺俯濞奸亶姊洪幐搴ｂ姇妞ゆ垵鈹夊┑鐐村灦閹尖晜绂嶅┑瀣劦妞ゆ埈鍓欓崯顐︻敋瑜旈弻鐔煎箒閹烘垵顫呴悗?
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

    // History rail (if user has history) - 闂備礁銈搁。锕傛嚄閸撲焦鏆滈柛銉戔偓閺嬫牠鏌曟繛鐐珔婵炲懐鍋ら弻銊モ槈濞嗗簼瀛╃紓浣虹帛閻楁绮欐径鎰垫晜闁告洦鍋夐澶愭⒑閻撳海鏋冩俊顐㈠楠炲繘鎯傞惇鏀弔inueRail闂傚倷鐒﹁ぐ鍐矓閹绢啟鍥蓟閵夛附娅栭柣蹇曞仩閸嬫劗绮欑拠鐫酣宕堕妸褏鐣奸梺鍝勬閸嬫挻绻涚€电袨闁稿酣娼у嵄缂備焦顭囬埢鏃堟煕閵夘垰顩い?
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
    // AI recommendations rail
    if (isSignedIn && !aiLoading && aiRecommendations && aiRecommendations.length > 0) {
      rails.push({
        id: "ai-recommended",
        title: "AI Picks for You",
        items: aiRecommendations.map((series) => ({
          id: series.id,
          title: series.title,
          subtitle: `Rating ${series.rating?.toFixed(1) || "N/A"} | ${series.genres?.join(", ") || ""}`,
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
    historyRail,
    isNewUser,
    starterItems,
    isSignedIn,
    recommendedRail,
    followingUpdates,
    aiRecommendations, // AI recommendations dependency
    aiLoading,
  ]);

  return {
    activeRails,
    followingUpdates,
    historyRail,
    isNewUser,
  };
}
