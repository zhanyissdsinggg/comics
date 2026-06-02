"use client";

import React, { useMemo } from "react";
import { Clock3, Library, Sparkles, Trophy } from "lucide-react";
import SurfacePanel from "../common/SurfacePanel";
import {
  storefrontBadgeClass,
  storefrontInsetCardClass,
  storefrontSoftCardClass,
  StorefrontSectionHeading,
} from "../common/StorefrontPagePrimitives";
import { useHistoryStore } from "../../store/useHistoryStore";
import { useProgressStore } from "../../store/useProgressStore";
import { useFollowStore } from "../../store/useFollowStore";

const ReadingStats = React.memo(() => {
  const { items: historyItems } = useHistoryStore();
  const { bySeriesId: progressData } = useProgressStore();
  const { followedSeriesIds } = useFollowStore();

  const stats = useMemo(() => {
    const totalEpisodesRead = historyItems.length;
    const seriesInProgress = Object.keys(progressData).length;
    const followedCount = followedSeriesIds.length;
    const estimatedReadingMinutes = totalEpisodesRead * 10;
    const readingHours = Math.floor(estimatedReadingMinutes / 60);
    const readingMinutes = estimatedReadingMinutes % 60;
    const progressValues = Object.values(progressData);
    const avgProgress =
      progressValues.length > 0
        ? progressValues.reduce(
            (sum, progress) => sum + (progress.percent || 0),
            0,
          ) / progressValues.length
        : 0;

    return {
      totalEpisodesRead,
      seriesInProgress,
      followedCount,
      readingHours,
      readingMinutes,
      avgProgress: Math.round(avgProgress * 100),
    };
  }, [historyItems, progressData, followedSeriesIds]);

  const achievements = useMemo(() => {
    const badges = [];

    if (stats.totalEpisodesRead >= 10) {
      badges.push("10 reads");
    }
    if (stats.totalEpisodesRead >= 50) {
      badges.push("50 reads");
    }
    if (stats.totalEpisodesRead >= 100) {
      badges.push("100 reads");
    }
    if (stats.followedCount >= 5) {
      badges.push("Saved 5+");
    }
    if (stats.readingHours >= 10) {
      badges.push("10+ hours");
    }

    return badges;
  }, [stats.followedCount, stats.readingHours, stats.totalEpisodesRead]);

  const tip = useMemo(() => {
    if (stats.totalEpisodesRead === 0) {
      return "Start reading and this fills in.";
    }
    if (stats.seriesInProgress > 5) {
      return "You have a lot open right now. Finish one and clear some space.";
    }
    if (stats.followedCount > stats.seriesInProgress * 2) {
      return "Your library is stacked. Check new updates.";
    }
    return "You're on a good run. Keep going.";
  }, [stats.followedCount, stats.seriesInProgress, stats.totalEpisodesRead]);

  const statCards = [
    {
      label: "Tonight's pace",
      value: `${stats.readingHours}h${stats.readingMinutes > 0 ? ` ${stats.readingMinutes}m` : ""}`,
      hint: "Estimated from your recent reads.",
      highlighted: true,
      icon: Clock3,
    },
    {
      label: "Reads logged",
      value: `${stats.totalEpisodesRead}`,
      hint:
        stats.totalEpisodesRead === 1
          ? "1 read finished."
          : `${stats.totalEpisodesRead} reads finished.`,
      icon: Sparkles,
    },
    {
      label: "Open series",
      value: `${stats.seriesInProgress}`,
      hint: `Average progress ${stats.avgProgress}%.`,
      icon: Library,
    },
    {
      label: "Saved shelf",
      value: `${stats.followedCount}`,
      hint: "Ready to read.",
      icon: Trophy,
    },
  ];

  return (
    <SurfacePanel
      appearance="dark"
      accent="cyan"
      tone="muted"
      className="space-y-5"
    >
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <StorefrontSectionHeading
          eyebrow="Reading desk"
          title="Your pace, streak, and shelf activity"
          description="A quick view of how much you're reading, what is still open, and how stacked your saved shelf looks tonight."
        />
        <div
          className={`${storefrontSoftCardClass} flex items-start justify-between gap-4 text-white`}
        >
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/60">
              Right now
            </p>
            <h3 className="mt-2 text-lg font-black tracking-[-0.03em] text-white">
              Reading note
            </h3>
            <p className="mt-3 text-sm font-semibold leading-7 text-white/75">
              {tip}
            </p>
          </div>
          <span className={storefrontBadgeClass}>Live</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card, index) => (
          <div
            key={card.label}
            className={[
              `${storefrontInsetCardClass} text-white`,
              card.highlighted || index === 0
                ? "ring-1 ring-cyan-300/35 shadow-[0_22px_46px_rgba(34,211,238,0.16)]"
                : "",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/70">
                {card.label}
              </p>
              <div className="flex h-10 w-10 items-center justify-center rounded-[18px] border border-white/12 bg-[linear-gradient(135deg,rgba(255,79,154,0.16)_0%,rgba(86,215,255,0.14)_100%)] text-white shadow-[0_14px_30px_rgba(8,6,20,0.16)]">
                <card.icon className="size-4" />
              </div>
            </div>
            <p className="mt-3 font-display text-3xl font-black uppercase tracking-[-0.05em] text-white">
              {card.value}
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-white/75">
              {card.hint}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className={`${storefrontInsetCardClass} text-white`}>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/70">
            Milestones
          </p>
          <h3 className="mt-3 text-lg font-black tracking-[-0.03em] text-white">
            Progress markers
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {achievements.length > 0 ? (
              achievements.map((achievement) => (
                <span
                  key={achievement}
                  className={storefrontBadgeClass}
                >
                  {achievement}
                </span>
              ))
            ) : (
              <p className="text-sm font-semibold text-white/70">
                Start reading to unlock these.
              </p>
            )}
          </div>
        </div>

        <div className={`${storefrontSoftCardClass} text-white`}>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/70">
            Focus
          </p>
          <h3 className="mt-3 text-lg font-black tracking-[-0.03em] text-white">
            Next move
          </h3>
          <p className="mt-2 text-sm font-semibold leading-7 text-white/75">
            {stats.seriesInProgress > 0
              ? `You have ${stats.seriesInProgress} active series open. Good time to finish one cleanly before stacking more.`
              : "No active series yet. Open one title and this panel starts tracking momentum."}
          </p>
        </div>
      </div>
    </SurfacePanel>
  );
});

ReadingStats.displayName = "ReadingStats";

export default ReadingStats;
