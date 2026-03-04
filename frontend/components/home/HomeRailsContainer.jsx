/**
 * HomeRailsContainer - 鐠愮喕鐭楀〒鍙夌厠閹碘偓閺堝娈戦崘鍛啇rails
 *
 * 閼卞矁鐭楅敍? * - 濞撳弶鐓嬮幒銊ㄥ礃rails
 * - 婢跺嫮鎮妑ail閻愮懓鍤禍瀣╂
 * - 鏉╁€熼嚋rail閺囨繂鍘? * - 閺勫墽銇氶崣瀣偨閻ㄥ嫮鈹栭悩鑸碘偓浣瑰絹缁€? * - 閼颁胶甯囧ǎ璇插閿涙碍鐗撮幑鐢tiveGenre鏉╁洦鎶ら崘鍛啇
 */

"use client";

import { useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Rail from "./Rail";
import EmptyState from "../common/EmptyState";
import { trackEvent } from "../../lib/trackEvent";
import { useHomeRecommendations } from "./HomeRecommendations";
import { useHomeData } from "./HomeDataProvider";

export default function HomeRailsContainer({ activeGenre = "all" }) {
  const router = useRouter();
  const { activeRails } = useHomeRecommendations();
  const { seriesList } = useHomeData();
  const recoImpressionRef = useRef(new Set());

    // Build a map for efficient genre filtering
  const seriesGenresMap = useMemo(() => {
    const map = new Map();
    seriesList.forEach((series) => {
      if (series.genres && Array.isArray(series.genres)) {
        map.set(series.id, series.genres);
      }
    });
    return map;
  }, [seriesList]);

  // 閼颁胶甯囧ǎ璇插閿涙碍鐗撮幑鐢tiveGenre鏉╁洦鎶ails
  const filteredRails = useMemo(() => {
    if (activeGenre === "all") {
      return activeRails;
    }

    // 閼颁胶甯囧▔銊╁櫞閿涙俺绻冨銈嗙槨娑撶尯ail閻ㄥ埇tems閿涘苯褰ф穱婵堟殌閸栧懎鎯坅ctiveGenre閻ㄥ墕eries
    return activeRails
      .map((rail) => {
        const filteredItems = rail.items.filter((item) => {
                    // Item ids can be in the form seriesId-episodeId
          const seriesId = item.id.split("-")[0];
          const genres = seriesGenresMap.get(seriesId);

          if (!genres || genres.length === 0) {
            return false;
          }

                    // Keep items whose genre matches the active chip
          return genres.some((g) => g.toLowerCase() === activeGenre.toLowerCase());
        });

        return {
          ...rail,
          items: filteredItems,
        };
      })
      .filter((rail) => rail.items.length > 0); // 閼颁胶甯囧▔銊╁櫞閿涙氨些闂勩倗鈹栭惃鍓卆ils
  }, [activeRails, activeGenre, seriesGenresMap]);

  // Track rail impressions
  useEffect(() => {
    filteredRails.forEach((rail) => {
      rail.items.forEach((item) => {
        const key = `${rail.id}:${item.id}`;
        if (recoImpressionRef.current.has(key)) {
          return;
        }
        recoImpressionRef.current.add(key);
        trackEvent("reco_impression", { railName: rail.title, seriesId: item.id });
      });
    });
  }, [filteredRails]);

  // 閼颁胶甯囨导妯哄閿涙矮濞囬悽鈺眘eCallback闁灝鍘ゆ稉宥呯箑鐟曚胶娈憆e-render
  const handleItemClick = useCallback((rail, item) => {
    trackEvent("reco_click", {
      railName: rail.title,
      seriesId: item.id,
    });
    router.push(`/series/${item.id}`);
  }, [router]);

  // 閼颁胶甯囧ǎ璇插閿涙碍鐗撮幑鐣哸il缁鐎烽悽鐔稿灇閹恒劏宕橀悶鍡欐暠
  const getRailReason = useCallback((rail) => {
    const title = rail.title.toLowerCase();
    if (title.includes("trending") || title.includes("popular")) {
      return "Most popular this week";
    }
    if (title.includes("new") || title.includes("latest")) {
      return "Recently added";
    }
    if (title.includes("recommended") || title.includes("for you")) {
      return "Based on your reading history";
    }
    if (title.includes("completed") || title.includes("finished")) {
      return "Binge-worthy completed series";
    }
    if (title.includes("free")) {
      return "Free to read";
    }
    return "Recommended for you";
  }, []);

    // Friendly empty state for current filter
  if (filteredRails.length === 0) {
    return (
      <EmptyState
        icon={activeGenre === "all" ? "inbox" : "search"}
        title={activeGenre === "all" ? "No content available" : `No ${activeGenre} series found`}
        description={activeGenre === "all"
          ? "Check back later for new content."
          : `Try browsing all genres or adjust your filters.`}
        action={activeGenre !== "all" ? {
          label: "Show All",
          onClick: () => router.push("/"),
        } : undefined}
      />
    );
  }

  return (
    <div className="space-y-10">
      {filteredRails.map((rail) => (
        <Rail
          key={rail.id}
          title={rail.title}
          items={rail.items}
          reason={getRailReason(rail)}
          onItemClick={(item) => handleItemClick(rail, item)}
        />
      ))}
    </div>
  );
}
