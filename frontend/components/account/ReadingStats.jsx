"use client";

import React, { useMemo } from "react";
import SurfacePanel from "../common/SurfacePanel";
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
      badges.push("10 episodes");
    }
    if (stats.totalEpisodesRead >= 50) {
      badges.push("50 episodes");
    }
    if (stats.totalEpisodesRead >= 100) {
      badges.push("100 episodes");
    }
    if (stats.followedCount >= 5) {
      badges.push("Following 5+");
    }
    if (stats.readingHours >= 10) {
      badges.push("10+ hours");
    }

    return badges;
  }, [stats.followedCount, stats.readingHours, stats.totalEpisodesRead]);

  const tip = useMemo(() => {
    if (stats.totalEpisodesRead === 0) {
      return "Start a series and your reading history will build itself here.";
    }
    if (stats.seriesInProgress > 5) {
      return "You have a lot in progress right now. Finishing one or two series will make your shelf feel cleaner.";
    }
    if (stats.followedCount > stats.seriesInProgress * 2) {
      return "You are following more series than you are actively reading. It may be time to check the latest updates.";
    }
    return "Your reading pace looks healthy. Keep the next chapter easy to reach.";
  }, [stats.followedCount, stats.seriesInProgress, stats.totalEpisodesRead]);

  const statCards = [
    {
      label: "Time read",
      value: `${stats.readingHours}h${stats.readingMinutes > 0 ? ` ${stats.readingMinutes}m` : ""}`,
      hint: "Estimated from recent episode history.",
      highlighted: true,
    },
    {
      label: "Episodes",
      value: `${stats.totalEpisodesRead}`,
      hint: `${stats.totalEpisodesRead === 1 ? "Episode" : "Episodes"} completed so far.`,
    },
    {
      label: "Active series",
      value: `${stats.seriesInProgress}`,
      hint: `Average progress ${stats.avgProgress}%.`,
    },
    {
      label: "Following",
      value: `${stats.followedCount}`,
      hint: "Series waiting for updates on your shelf.",
    },
  ];

  return (
    <SurfacePanel appearance="light" accent="blue" className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
            Reading stats
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
            A quick look at your reading rhythm.
          </h2>
        </div>
        <p className="text-sm text-slate-500">
          Built from your reading history, progress, and follows.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card, index) => (
          <div
            key={card.label}
            className={`rounded-[24px] border px-4 py-4 ${
              card.highlighted || index === 0
                ? "border-[rgba(0,113,227,0.14)] bg-[rgba(0,113,227,0.08)]"
                : "border-black/8 bg-[#f8f9fc]"
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              {card.label}
            </p>
            <p className="mt-3 font-display text-3xl font-semibold tracking-tight text-slate-950">
              {card.value}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{card.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[24px] border border-black/8 bg-[#f8f9fc] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Milestones
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {achievements.length > 0 ? (
              achievements.map((achievement) => (
                <span
                  key={achievement}
                  className="rounded-full border border-black/8 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                >
                  {achievement}
                </span>
              ))
            ) : (
              <p className="text-sm text-slate-500">
                Start reading to unlock milestone badges here.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-[24px] border border-[rgba(0,113,227,0.14)] bg-[rgba(0,113,227,0.08)] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            What stands out
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-700">{tip}</p>
        </div>
      </div>
    </SurfacePanel>
  );
});

ReadingStats.displayName = "ReadingStats";

export default ReadingStats;
