/**
 * HomeRailsContainer renders personalized discovery rails on the home page.
 */

"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Rail from "./Rail";
import EmptyState from "../common/EmptyState";
import { buildPathWithAttribution } from "../../lib/paymentAttribution";
import { trackEvent } from "../../lib/trackEvent";
import { useHomeRecommendations } from "./HomeRecommendations";
import { useHomeData } from "./HomeDataProvider";
import { useAuthStore } from "../../store/useAuthStore";

function getSeriesId(item) {
  if (item?.seriesId) {
    return item.seriesId;
  }

  return typeof item?.id === "string" ? item.id.split("-")[0] : "";
}

export default function HomeRailsContainer({
  activeGenre = "all",
  onResetGenre = null,
  appearance = "default",
}) {
  const router = useRouter();
  const { activeRails } = useHomeRecommendations();
  const { seriesList } = useHomeData();
  const { isSignedIn } = useAuthStore();
  const recoImpressionRef = useRef(new Set());

  const seriesGenresMap = useMemo(() => {
    const map = new Map();

    seriesList.forEach((series) => {
      if (Array.isArray(series.genres)) {
        map.set(series.id, series.genres);
      }
    });

    return map;
  }, [seriesList]);

  const filteredRails = useMemo(() => {
    if (activeGenre === "all") {
      return activeRails;
    }

    return activeRails
      .map((rail) => {
        const filteredItems = rail.items.filter((item) => {
          const genres = seriesGenresMap.get(getSeriesId(item));

          if (!genres || genres.length === 0) {
            return false;
          }

          return genres.some((genre) => genre.toLowerCase() === activeGenre.toLowerCase());
        });

        return {
          ...rail,
          items: filteredItems,
        };
      })
      .filter((rail) => rail.items.length > 0);
  }, [activeGenre, activeRails, seriesGenresMap]);

  const visibleRails = useMemo(() => {
    const preferredOrder = isSignedIn
      ? [
          "following",
          "continue",
          "trending",
          "completed",
          "ttf",
          "because-you-read",
          "recommended",
          "new",
          "history",
          "adult",
          "starter",
          "ai-recommended",
        ]
      : ["trending", "ttf", "completed", "new", "starter", "adult"];

    const railMap = new Map(filteredRails.map((rail) => [rail.id, rail]));
    const orderedRails = preferredOrder.map((id) => railMap.get(id)).filter(Boolean);
    const extraRails = filteredRails.filter((rail) => !preferredOrder.includes(rail.id));

    return [...orderedRails, ...extraRails].slice(0, 2);
  }, [filteredRails, isSignedIn]);

  useEffect(() => {
    visibleRails.forEach((rail) => {
      rail.items.forEach((item) => {
        const seriesId = getSeriesId(item);
        const key = `${rail.id}:${item.id}`;

        if (!seriesId || recoImpressionRef.current.has(key)) {
          return;
        }

        recoImpressionRef.current.add(key);
        trackEvent("reco_impression", { railName: rail.title, seriesId });
      });
    });
  }, [visibleRails]);

  const handleItemClick = useCallback(
    (rail, item) => {
      const seriesId = getSeriesId(item);
      if (!seriesId) {
        return;
      }

      const targetPath = item.resumeEpisodeId
        ? `/read/${seriesId}/${item.resumeEpisodeId}`
        : `/series/${seriesId}`;

      trackEvent("reco_click", {
        railName: rail.title,
        railId: rail.id,
        seriesId,
      });

      router.push(
        buildPathWithAttribution(targetPath, {
          entryPoint: "HOME_RAIL",
          campaignId: rail.id,
          sourcePath: "/",
          sourceSeriesId: seriesId,
          sourceEpisodeId: item.resumeEpisodeId || undefined,
          returnTo: targetPath,
        }),
      );
    },
    [router],
  );

  if (visibleRails.length === 0) {
    return (
      <EmptyState
        appearance={appearance === "light" ? "light" : "default"}
        icon={activeGenre === "all" ? "inbox" : "search"}
        title={activeGenre === "all" ? "No content available" : `No ${activeGenre} series found`}
        description={
          activeGenre === "all"
            ? "Check back later for new content."
            : "Try browsing all genres or adjust your filters."
        }
        action={
          activeGenre !== "all"
            ? {
                label: "Show All",
                onClick: () => {
                  if (typeof onResetGenre === "function") {
                    onResetGenre();
                    return;
                  }
                  router.push("/");
                },
              }
            : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      {visibleRails.map((rail) => (
        <Rail
          key={rail.id}
          eyebrow={rail.eyebrow}
          title={rail.title}
          railName={rail.id}
          items={rail.items}
          reason={rail.reason}
          href={rail.href}
          ctaLabel={rail.ctaLabel}
          appearance={appearance}
          onItemClick={(item) => handleItemClick(rail, item)}
        />
      ))}
    </div>
  );
}
