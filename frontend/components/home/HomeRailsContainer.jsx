/**
 * HomeRailsContainer - 负责渲染所有的内容rails
 *
 * 职责：
 * - 渲染推荐rails
 * - 处理rail点击事件
 * - 追踪rail曝光
 * - 显示友好的空状态提示
 */

"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Rail from "./Rail";
import { track } from "../../lib/analytics";
import { useHomeRecommendations } from "./HomeRecommendations";
import { useAuthStore } from "../../store/useAuthStore";
import { useFollowStore } from "../../store/useFollowStore";

export default function HomeRailsContainer() {
  const router = useRouter();
  const { activeRails, followingUpdates } = useHomeRecommendations();
  const { isSignedIn } = useAuthStore();
  const { followedSeriesIds } = useFollowStore();
  const recoImpressionRef = useRef(new Set());

  // Track rail impressions
  useEffect(() => {
    activeRails.forEach((rail) => {
      rail.items.forEach((item) => {
        const key = `${rail.id}:${item.id}`;
        if (recoImpressionRef.current.has(key)) {
          return;
        }
        recoImpressionRef.current.add(key);
        track("reco_impression", { railName: rail.title, seriesId: item.id });
      });
    });
  }, [activeRails]);

  const handleItemClick = (rail, item) => {
    track("reco_click", {
      railName: rail.title,
      seriesId: item.id,
    });
    router.push(`/series/${item.id}`);
  };

  // 老王添加：友好的空状态处理
  if (activeRails.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-neutral-400">No content available</p>
      </div>
    );
  }

  // 老王添加：如果用户已登录但没有关注任何作品，在rails前显示友好提示
  const showNoFollowingHint = isSignedIn && followedSeriesIds && followedSeriesIds.length === 0 && followingUpdates.length === 0;

  return (
    <div className="space-y-10">
      {activeRails.map((rail) => (
        <Rail
          key={rail.id}
          title={rail.title}
          items={rail.items}
          onItemClick={(item) => handleItemClick(rail, item)}
        />
      ))}
    </div>
  );
}
