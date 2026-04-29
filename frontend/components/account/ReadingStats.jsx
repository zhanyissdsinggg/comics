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
      badges.push("10 chapters");
    }
    if (stats.totalEpisodesRead >= 50) {
      badges.push("50 chapters");
    }
    if (stats.totalEpisodesRead >= 100) {
      badges.push("100 chapters");
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
      label: "Time read",
      value: `${stats.readingHours}h${stats.readingMinutes > 0 ? ` ${stats.readingMinutes}m` : ""}`,
      hint: "Based on recent chapters.",
      highlighted: true,
    },
    {
      label: "Chapters",
      value: `${stats.totalEpisodesRead}`,
      hint: `${stats.totalEpisodesRead === 1 ? "Chapter" : "Chapters"} finished.`,
    },
    {
      label: "Active series",
      value: `${stats.seriesInProgress}`,
      hint: `Average progress ${stats.avgProgress}%.`,
    },
    {
      label: "Following",
      value: `${stats.followedCount}`,
      hint: "Saved for later.",
    },
  ];

  return (
    <SurfacePanel appearance="dark" accent="cyan" tone="muted" className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/70">
            Reading
          </p>
          <h2 className="mt-2 font-display text-2xl font-black uppercase tracking-[-0.05em] text-white">
            Reading
          </h2>
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.08em] text-white/65">
          Progress
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card, index) => (
          <div
            key={card.label}
            className={[
              "rounded-[22px] border-2 border-black bg-[#0b0b0b] px-4 py-4 text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
              card.highlighted || index === 0
                ? "outline outline-2 outline-offset-2 outline-[#00E5FF]"
                : "",
            ].join(" ")}
          >
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/70">
              {card.label}
            </p>
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
        <div className="rounded-[22px] border-2 border-black bg-[#0b0b0b] p-4 text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/70">
            Milestones
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {achievements.length > 0 ? (
              achievements.map((achievement) => (
                <span
                  key={achievement}
                  className="rounded-full border-2 border-black bg-[#FFE500] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
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

        <div className="rounded-[22px] border-2 border-black bg-[#0b0b0b] p-4 text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/70">
            Right now
          </p>
          <h3 className="mt-3 text-base font-black tracking-[-0.02em] text-white">
            Note
          </h3>
          <p className="mt-2 text-sm font-semibold leading-7 text-white/75">
            {tip}
          </p>
        </div>
      </div>
    </SurfacePanel>
  );
});

ReadingStats.displayName = "ReadingStats";

export default ReadingStats;
