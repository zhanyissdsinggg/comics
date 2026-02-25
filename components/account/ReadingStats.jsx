"use client";

import React, { useMemo } from "react";
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

    const recentSeries = historyItems.slice(0, 5).map((item) => ({
      seriesId: item.seriesId,
      episodeId: item.episodeId,
      timestamp: item.timestamp,
    }));

    const progressValues = Object.values(progressData);
    const avgProgress =
      progressValues.length > 0
        ? progressValues.reduce((sum, p) => sum + (p.percent || 0), 0) /
          progressValues.length
        : 0;

    return {
      totalEpisodesRead,
      seriesInProgress,
      followedCount,
      readingHours,
      readingMinutes,
      recentSeries,
      avgProgress: Math.round(avgProgress * 100),
    };
  }, [historyItems, progressData, followedSeriesIds]);

  return (
    <section className="rounded-3xl border border-white/10 bg-neutral-900/50 p-6 space-y-4 backdrop-blur-sm">
      <h2 className="text-lg font-semibold bg-gradient-to-r from-white via-brand-primary to-brand-secondary bg-clip-text text-transparent">Reading Stats</h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="group rounded-2xl border border-neutral-800 bg-neutral-950 p-4 transition-all duration-300 hover:border-brand-primary/50 hover:shadow-glow-sm hover:-translate-y-1">
          <div className="text-xs uppercase text-neutral-500">Total Reading Time</div>
          <div className="mt-2 text-2xl font-bold text-brand-primary">
            {stats.readingHours}
            <span className="text-sm text-neutral-400"> hr</span>
            {stats.readingMinutes > 0 && (
              <>
                {" "}
                {stats.readingMinutes}
                <span className="text-sm text-neutral-400"> min</span>
              </>
            )}
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            Estimated based on avg reading speed
          </div>
        </div>

        <div className="group rounded-2xl border border-neutral-800 bg-neutral-950 p-4 transition-all duration-300 hover:border-brand-secondary/50 hover:shadow-glow-sm hover:-translate-y-1">
          <div className="text-xs uppercase text-neutral-500">Episodes Read</div>
          <div className="mt-2 text-2xl font-bold text-brand-secondary">
            {stats.totalEpisodesRead}
            <span className="text-sm text-neutral-400"> ep{stats.totalEpisodesRead !== 1 ? "s" : ""}</span>
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            Total episodes completed
          </div>
        </div>

        <div className="group rounded-2xl border border-neutral-800 bg-neutral-950 p-4 transition-all duration-300 hover:border-brand-accent/50 hover:shadow-glow-sm hover:-translate-y-1">
          <div className="text-xs uppercase text-neutral-500">Currently Reading</div>
          <div className="mt-2 text-2xl font-bold text-purple-400">
            {stats.seriesInProgress}
            <span className="text-sm text-neutral-400"> series</span>
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            Avg progress {stats.avgProgress}%
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
          <div className="text-xs uppercase text-neutral-500">Following</div>
          <div className="mt-2 text-2xl font-bold text-orange-400">
            {stats.followedCount}
            <span className="text-sm text-neutral-400"> series</span>
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            Tracking updates
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
        <h3 className="text-sm font-semibold text-neutral-300">Achievements</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {stats.totalEpisodesRead >= 10 && (
            <div className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">
              📚 Beginner Reader (10+ eps)
            </div>
          )}
          {stats.totalEpisodesRead >= 50 && (
            <div className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400 border border-blue-500/20">
              📖 Avid Reader (50+ eps)
            </div>
          )}
          {stats.totalEpisodesRead >= 100 && (
            <div className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-400 border border-purple-500/20">
              🎓 Veteran Reader (100+ eps)
            </div>
          )}
          {stats.followedCount >= 5 && (
            <div className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-400 border border-orange-500/20">
              ⭐ Loyal Fan (5+ follows)
            </div>
          )}
          {stats.readingHours >= 10 && (
            <div className="rounded-full bg-pink-500/10 px-3 py-1 text-xs font-medium text-pink-400 border border-pink-500/20">
              ⏰ Bookworm (10+ hours)
            </div>
          )}
          {stats.totalEpisodesRead === 0 && (
            <div className="text-xs text-neutral-500">
              Start reading to unlock achievement badges
            </div>
          )}
        </div>
      </div>

      {stats.totalEpisodesRead > 0 && (
        <div className="rounded-2xl border border-neutral-800 bg-gradient-to-r from-emerald-500/5 to-blue-500/5 p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-neutral-300">
                Reading Tip
              </h3>
              <p className="mt-1 text-xs text-neutral-400">
                {stats.seriesInProgress > 5
                  ? "You're reading many series at once — try finishing a few before starting new ones!"
                  : stats.followedCount > stats.seriesInProgress * 2
                  ? "You're following lots of series but reading fewer — check out the latest updates!"
                  : "Keep up the great reading habit and explore more amazing content!"}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
});

ReadingStats.displayName = "ReadingStats";

export default ReadingStats;
