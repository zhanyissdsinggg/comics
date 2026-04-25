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
      return "Start a series and your reading history will build here.";
    }
    if (stats.seriesInProgress > 5) {
      return "You have a lot in progress. Finishing one or two will clear your shelf.";
    }
    if (stats.followedCount > stats.seriesInProgress * 2) {
      return "You are following more series than you are reading. Check the latest updates.";
    }
    return "Your reading pace looks healthy. Keep the next chapter close.";
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
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/55">
            Reading stats
          </p>
          <h2 className="mt-2 font-display text-2xl font-black uppercase tracking-[-0.05em] text-black">
            Reading rhythm.
          </h2>
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.08em] text-black/55">
          History, progress, and follows.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card, index) => (
          <div
            key={card.label}
            className={`rounded-[24px] border px-4 py-4 shadow-[0_16px_34px_rgba(15,23,42,0.08)] ${
              card.highlighted || index === 0
                ? "border-black/10 bg-[#f6f7f9]"
                : "border-black/10 bg-white"
            }`}
          >
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-black/55">
              {card.label}
            </p>
            <p className="mt-3 font-display text-3xl font-black uppercase tracking-[-0.05em] text-black">
              {card.value}
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-black/72">
              {card.hint}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[24px] border border-black/10 bg-[#f6f7f9] p-4 shadow-[0_16px_34px_rgba(15,23,42,0.08)]">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-black/55">
            Milestones
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {achievements.length > 0 ? (
              achievements.map((achievement) => (
                <span
                  key={achievement}
                  className="rounded-full border border-black/10 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-black shadow-[0_8px_18px_rgba(15,23,42,0.06)]"
                >
                  {achievement}
                </span>
              ))
            ) : (
              <p className="text-sm font-semibold text-black/58">
                Start reading to unlock milestones.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-[24px] border border-black/10 bg-white p-4 shadow-[0_16px_34px_rgba(15,23,42,0.08)]">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-black/55">
            Reading note
          </p>
          <h3 className="mt-3 text-base font-black tracking-[-0.02em] text-black">
            Keep your next read closer than the settings.
          </h3>
          <p className="mt-2 text-sm font-semibold leading-7 text-black/72">
            {tip}
          </p>
        </div>
      </div>
    </SurfacePanel>
  );
});

ReadingStats.displayName = "ReadingStats";

export default ReadingStats;
