/**
 * HomeRailsContainer - 负责渲染所有的内容rails
 *
 * 职责：
 * - 渲染推荐rails
 * - 处理rail点击事件
 * - 追踪rail曝光
 * - 显示友好的空状态提示
 * - 老王添加：根据activeGenre过滤内容
 */

"use client";

import { useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Rail from "./Rail";
import EmptyState from "../common/EmptyState";
import { track } from "../../lib/analytics";
import { useHomeRecommendations } from "./HomeRecommendations";
import { useHomeData } from "./HomeDataProvider";

export default function HomeRailsContainer({ activeGenre = "all" }) {
  const router = useRouter();
  const { activeRails } = useHomeRecommendations();
  const { seriesList } = useHomeData();
  const recoImpressionRef = useRef(new Set());

  // 老王优化：将seriesGenresMap提取到单独的useMemo，避免重复构建
  const seriesGenresMap = useMemo(() => {
    const map = new Map();
    seriesList.forEach((series) => {
      if (series.genres && Array.isArray(series.genres)) {
        map.set(series.id, series.genres);
      }
    });
    return map;
  }, [seriesList]);

  // 老王添加：根据activeGenre过滤rails
  const filteredRails = useMemo(() => {
    if (activeGenre === "all") {
      return activeRails;
    }

    // 老王注释：过滤每个rail的items，只保留包含activeGenre的series
    return activeRails
      .map((rail) => {
        const filteredItems = rail.items.filter((item) => {
          // 老王注释：从item.id中提取seriesId（可能是"seriesId-episodeId"格式）
          const seriesId = item.id.split("-")[0];
          const genres = seriesGenresMap.get(seriesId);

          if (!genres || genres.length === 0) {
            return false;
          }

          // 老王注释：检查genres数组是否包含activeGenre（不区分大小写）
          return genres.some((g) => g.toLowerCase() === activeGenre.toLowerCase());
        });

        return {
          ...rail,
          items: filteredItems,
        };
      })
      .filter((rail) => rail.items.length > 0); // 老王注释：移除空的rails
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
        track("reco_impression", { railName: rail.title, seriesId: item.id });
      });
    });
  }, [filteredRails]);

  // 老王优化：使用useCallback避免不必要的re-render
  const handleItemClick = useCallback((rail, item) => {
    track("reco_click", {
      railName: rail.title,
      seriesId: item.id,
    });
    router.push(`/series/${item.id}`);
  }, [router]);

  // 老王添加：根据rail类型生成推荐理由
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

  // 老王添加：友好的空状态处理
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
