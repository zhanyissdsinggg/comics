// 老王注释：AI智能推荐服务 - 基于内容的推荐算法
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class RecommendationService {
  constructor(private prisma: PrismaService) {}

  /**
   * 老王注释：基于内容的推荐 - 根据类型和标签相似度推荐
   * @param seriesId 当前作品ID
   * @param limit 推荐数量
   * @param userId 用户ID（可选，用于过滤已读作品）
   */
  async getContentBasedRecommendations(
    seriesId: string,
    limit: number = 10,
    userId?: string,
  ) {
    // 老王注释：获取当前作品信息
    const currentSeries = await this.prisma.series.findUnique({
      where: { id: seriesId },
      select: {
        id: true,
        type: true,
        genres: true,
        adult: true,
      },
    });

    if (!currentSeries) {
      return [];
    }

    // 老王注释：获取用户已读作品（如果提供了userId）
    let readSeriesIds: string[] = [];
    if (userId) {
      const progress = await this.prisma.progress.findMany({
        where: { userId },
        select: { seriesId: true },
      });
      readSeriesIds = progress.map((p) => p.seriesId);
    }

    // 老王注释：查找相似作品
    const similarSeries = await this.prisma.series.findMany({
      where: {
        AND: [
          { id: { not: seriesId } }, // 排除当前作品
          { type: currentSeries.type }, // 相同类型（漫画/小说）
          { adult: currentSeries.adult }, // 相同成人内容标记
          { status: { not: 'draft' } }, // 排除草稿
          ...(readSeriesIds.length > 0
            ? [{ id: { notIn: readSeriesIds } }] // 排除已读作品
            : []),
        ],
      },
      select: {
        id: true,
        title: true,
        description: true,
        coverTone: true,
        type: true,
        genres: true,
        rating: true,
        ratingCount: true,
        status: true,
        badges: true,
        adult: true,
        episodePrice: true,
        ttfEnabled: true,
        _count: {
          select: {
            follows: true,
            episodes: true,
          },
        },
      },
      take: limit * 3, // 老王注释：多取一些，后面根据相似度排序
    });

    // 老王注释：计算相似度分数
    const scoredSeries = similarSeries.map((series) => {
      let score = 0;

      // 老王注释：类型匹配（已经在查询中过滤了，这里给基础分）
      score += 10;

      // 老王注释：类型标签匹配
      const genreMatches = this.countMatches(
        currentSeries.genres || [],
        series.genres || [],
      );
      score += genreMatches * 5;

      // 老王注释：评分加权（高评分作品优先）
      if (series.rating) {
        score += series.rating * 2;
      }

      // 老王注释：热度加权（关注数）
      const followCount = (series as any)._count?.follows || 0;
      score += Math.log10(followCount + 1) * 2;

      return {
        ...series,
        similarityScore: score,
      };
    });

    // 老王注释：按相似度排序并返回前N个
    return scoredSeries
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit);
  }

  /**
   * 老王注释：为用户推荐作品 - 基于用户阅读历史
   * @param userId 用户ID
   * @param limit 推荐数量
   */
  async getPersonalizedRecommendations(userId: string, limit: number = 10) {
    // 老王注释：获取用户阅读历史（最近阅读的作品）
    const recentProgress = await this.prisma.progress.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 5, // 老王注释：取最近5个作品
      select: { seriesId: true },
    });

    if (recentProgress.length === 0) {
      // 老王注释：如果没有阅读历史，返回热门作品
      return this.getPopularSeries(limit);
    }

    // 老王注释：获取用户关注的作品
    const followedSeries = await this.prisma.follow.findMany({
      where: { userId },
      select: { seriesId: true },
    });

    // 老王注释：合并阅读历史和关注作品
    const userInterestSeriesIds = [
      ...new Set([
        ...recentProgress.map((p) => p.seriesId),
        ...followedSeries.map((f) => f.seriesId),
      ]),
    ];

    // 老王注释：为每个感兴趣的作品找相似作品
    const allRecommendations = [];
    for (const seriesId of userInterestSeriesIds.slice(0, 3)) {
      // 老王注释：只取前3个，避免查询太多
      const recommendations = await this.getContentBasedRecommendations(
        seriesId,
        5,
        userId,
      );
      allRecommendations.push(...recommendations);
    }

    // 老王注释：去重并按相似度排序
    const uniqueRecommendations = this.deduplicateSeries(allRecommendations);
    return uniqueRecommendations.slice(0, limit);
  }

  /**
   * 老王注释：获取热门作品（用于新用户或没有阅读历史的用户）
   */
  async getPopularSeries(limit: number = 10) {
    return this.prisma.series.findMany({
      where: {
        status: { not: 'draft' },
      },
      orderBy: [
        { rating: 'desc' },
        { ratingCount: 'desc' },
      ],
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
        coverTone: true,
        type: true,
        genres: true,
        rating: true,
        ratingCount: true,
        status: true,
        badges: true,
        adult: true,
        episodePrice: true,
        ttfEnabled: true,
        _count: {
          select: {
            follows: true,
            episodes: true,
          },
        },
      },
    });
  }

  /**
   * 老王注释：计算两个数组的匹配数量
   */
  private countMatches(arr1: string[], arr2: string[]): number {
    return arr1.filter((item) => arr2.includes(item)).length;
  }

  /**
   * 老王注释：去重作品列表（保留相似度最高的）
   */
  private deduplicateSeries(series: any[]): any[] {
    const seen = new Map();
    for (const item of series) {
      if (
        !seen.has(item.id) ||
        item.similarityScore > seen.get(item.id).similarityScore
      ) {
        seen.set(item.id, item);
      }
    }
    return Array.from(seen.values()).sort(
      (a, b) => b.similarityScore - a.similarityScore,
    );
  }
}
