"use client";

import React, { useMemo } from "react";
import { useHistoryStore } from "../../store/useHistoryStore";
import { useProgressStore } from "../../store/useProgressStore";
import { useFollowStore } from "../../store/useFollowStore";

/**
 * 老王注释：阅读统计组件
 * 功能：显示用户的阅读数据统计
 * 遵循KISS原则：简洁的卡片式设计
 * 遵循DRY原则：复用store数据
 */
const ReadingStats = React.memo(() => {
  const { items: historyItems } = useHistoryStore();
  const { bySeriesId: progressData } = useProgressStore();
  const { followedSeriesIds } = useFollowStore();

  // 老王注释：计算阅读统计数据
  const stats = useMemo(() => {
    // 总阅读章节数
    const totalEpisodesRead = historyItems.length;

    // 正在阅读的作品数（有进度的作品）
    const seriesInProgress = Object.keys(progressData).length;

    // 关注的作品数
    const followedCount = followedSeriesIds.length;

    // 估算总阅读时长（假设每章节平均10分钟）
    const estimatedReadingMinutes = totalEpisodesRead * 10;
    const readingHours = Math.floor(estimatedReadingMinutes / 60);
    const readingMinutes = estimatedReadingMinutes % 60;

    // 最近阅读的作品（从历史记录中提取）
    const recentSeries = historyItems.slice(0, 5).map((item) => ({
      seriesId: item.seriesId,
      episodeId: item.episodeId,
      timestamp: item.timestamp,
    }));

    // 计算平均阅读进度
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
      <h2 className="text-lg font-semibold bg-gradient-to-r from-white via-brand-primary to-brand-secondary bg-clip-text text-transparent">阅读统计</h2>

      {/* 老王注释：统计卡片网格 - 添加悬停动画 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* 老王注释：总阅读时长 - 品牌色 + 悬停动画 */}
        <div className="group rounded-2xl border border-neutral-800 bg-neutral-950 p-4 transition-all duration-300 hover:border-brand-primary/50 hover:shadow-glow-sm hover:-translate-y-1">
          <div className="text-xs uppercase text-neutral-500">总阅读时长</div>
          <div className="mt-2 text-2xl font-bold text-brand-primary">
            {stats.readingHours}
            <span className="text-sm text-neutral-400">小时</span>
            {stats.readingMinutes > 0 && (
              <>
                {" "}
                {stats.readingMinutes}
                <span className="text-sm text-neutral-400">分钟</span>
              </>
            )}
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            基于平均阅读速度估算
          </div>
        </div>

        {/* 老王注释：阅读章节数 - 品牌色 + 悬停动画 */}
        <div className="group rounded-2xl border border-neutral-800 bg-neutral-950 p-4 transition-all duration-300 hover:border-brand-secondary/50 hover:shadow-glow-sm hover:-translate-y-1">
          <div className="text-xs uppercase text-neutral-500">阅读章节数</div>
          <div className="mt-2 text-2xl font-bold text-brand-secondary">
            {stats.totalEpisodesRead}
            <span className="text-sm text-neutral-400">章</span>
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            已完成阅读的章节总数
          </div>
        </div>

        {/* 老王注释：正在阅读 - 品牌色 + 悬停动画 */}
        <div className="group rounded-2xl border border-neutral-800 bg-neutral-950 p-4 transition-all duration-300 hover:border-brand-accent/50 hover:shadow-glow-sm hover:-translate-y-1">
          <div className="text-xs uppercase text-neutral-500">正在阅读</div>
          <div className="mt-2 text-2xl font-bold text-purple-400">
            {stats.seriesInProgress}
            <span className="text-sm text-neutral-400">部</span>
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            平均进度 {stats.avgProgress}%
          </div>
        </div>

        {/* 老王注释：关注作品 */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
          <div className="text-xs uppercase text-neutral-500">关注作品</div>
          <div className="mt-2 text-2xl font-bold text-orange-400">
            {stats.followedCount}
            <span className="text-sm text-neutral-400">部</span>
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            持续关注更新中
          </div>
        </div>
      </div>

      {/* 老王注释：阅读成就 */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
        <h3 className="text-sm font-semibold text-neutral-300">阅读成就</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {stats.totalEpisodesRead >= 10 && (
            <div className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">
              📚 入门读者 (10+章)
            </div>
          )}
          {stats.totalEpisodesRead >= 50 && (
            <div className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400 border border-blue-500/20">
              📖 热心读者 (50+章)
            </div>
          )}
          {stats.totalEpisodesRead >= 100 && (
            <div className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-400 border border-purple-500/20">
              🎓 资深读者 (100+章)
            </div>
          )}
          {stats.followedCount >= 5 && (
            <div className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-400 border border-orange-500/20">
              ⭐ 忠实粉丝 (5+关注)
            </div>
          )}
          {stats.readingHours >= 10 && (
            <div className="rounded-full bg-pink-500/10 px-3 py-1 text-xs font-medium text-pink-400 border border-pink-500/20">
              ⏰ 时间管理大师 (10+小时)
            </div>
          )}
          {stats.totalEpisodesRead === 0 && (
            <div className="text-xs text-neutral-500">
              开始阅读以解锁成就徽章
            </div>
          )}
        </div>
      </div>

      {/* 老王注释：阅读趋势提示 */}
      {stats.totalEpisodesRead > 0 && (
        <div className="rounded-2xl border border-neutral-800 bg-gradient-to-r from-emerald-500/5 to-blue-500/5 p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-neutral-300">
                阅读小贴士
              </h3>
              <p className="mt-1 text-xs text-neutral-400">
                {stats.seriesInProgress > 5
                  ? "你正在阅读多部作品，建议先完成几部再开新坑哦！"
                  : stats.followedCount > stats.seriesInProgress * 2
                  ? "关注了很多作品但阅读较少，快去看看更新吧！"
                  : "保持良好的阅读习惯，继续探索精彩内容！"}
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
