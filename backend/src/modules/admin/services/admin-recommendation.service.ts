import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * 老王说：推荐和排行榜管理服务
 * 这个SB服务处理所有推荐位和排行榜相关的业务逻辑
 * 包括推荐位配置、排行榜规则、效果分析等
 */
@Injectable()
export class AdminRecommendationService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取所有推荐位
   */
  async getRecommendationSlots(filters: any = {}) {
    const { active, limit = 100, offset = 0 } = filters;

    const where: any = {};
    if (active !== undefined) {
      where.active = active;
    }

    const slots = await this.prisma.recommendationSlot.findMany({
      where,
      orderBy: { position: 'asc' },
      take: limit,
      skip: offset,
    });

    const total = await this.prisma.recommendationSlot.count({ where });

    return { slots, total };
  }

  /**
   * 创建推荐位
   */
  async createRecommendationSlot(data: any) {
    return this.prisma.recommendationSlot.create({
      data: {
        name: data.name,
        slotType: data.slotType,
        position: data.position,
        active: data.active ?? true,
        maxItems: data.maxItems ?? 10,
        refreshInterval: data.refreshInterval ?? 3600,
        algorithm: data.algorithm ?? 'trending',
        targetAudience: data.targetAudience ?? 'all',
      },
    });
  }

  /**
   * 更新推荐位
   */
  async updateRecommendationSlot(id: string, data: any) {
    return this.prisma.recommendationSlot.update({
      where: { id },
      data,
    });
  }

  /**
   * 删除推荐位
   */
  async deleteRecommendationSlot(id: string) {
    return this.prisma.recommendationSlot.delete({
      where: { id },
    });
  }

  /**
   * 获取所有排行榜配置
   */
  async getRankingConfigs(filters: any = {}) {
    const { active, rankingType, limit = 100, offset = 0 } = filters;

    const where: any = {};
    if (active !== undefined) {
      where.active = active;
    }
    if (rankingType) {
      where.rankingType = rankingType;
    }

    const configs = await this.prisma.rankingConfig.findMany({
      where,
      orderBy: { position: 'asc' },
      take: limit,
      skip: offset,
    });

    const total = await this.prisma.rankingConfig.count({ where });

    return { configs, total };
  }

  /**
   * 创建排行榜配置
   */
  async createRankingConfig(data: any) {
    return this.prisma.rankingConfig.create({
      data: {
        name: data.name,
        rankingType: data.rankingType,
        timeRange: data.timeRange,
        seriesType: data.seriesType ?? 'all',
        adult: data.adult ?? false,
        active: data.active ?? true,
        position: data.position,
        maxItems: data.maxItems ?? 20,
        refreshInterval: data.refreshInterval ?? 3600,
      },
    });
  }

  /**
   * 更新排行榜配置
   */
  async updateRankingConfig(id: string, data: any) {
    return this.prisma.rankingConfig.update({
      where: { id },
      data,
    });
  }

  /**
   * 删除排行榜配置
   */
  async deleteRankingConfig(id: string) {
    return this.prisma.rankingConfig.delete({
      where: { id },
    });
  }

  /**
   * 获取推荐效果分析数据
   */
  async getRecommendationAnalytics(filters: any = {}) {
    const { slotId, seriesId, startDate, endDate, limit = 100, offset = 0 } = filters;

    const where: any = {};
    if (slotId) {
      where.slotId = slotId;
    }
    if (seriesId) {
      where.seriesId = seriesId;
    }
    if (startDate && endDate) {
      where.dateKey = {
        gte: startDate,
        lte: endDate,
      };
    }

    const analytics = await this.prisma.recommendationAnalytics.findMany({
      where,
      orderBy: { dateKey: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await this.prisma.recommendationAnalytics.count({ where });

    return { analytics, total };
  }

  /**
   * 保存推荐效果分析数据
   */
  async saveRecommendationAnalytics(slotId: string, seriesId: string, dateKey: string, data: any) {
    const existing = await this.prisma.recommendationAnalytics.findUnique({
      where: {
        slotId_seriesId_dateKey: {
          slotId,
          seriesId,
          dateKey,
        },
      },
    });

    if (existing) {
      return this.prisma.recommendationAnalytics.update({
        where: {
          slotId_seriesId_dateKey: {
            slotId,
            seriesId,
            dateKey,
          },
        },
        data,
      });
    } else {
      return this.prisma.recommendationAnalytics.create({
        data: {
          slotId,
          seriesId,
          dateKey,
          ...data,
        },
      });
    }
  }

  /**
   * 获取推荐位的效果统计
   */
  async getSlotPerformance(slotId: string, filters: any = {}) {
    const { startDate, endDate } = filters;

    const where: any = { slotId };
    if (startDate && endDate) {
      where.dateKey = {
        gte: startDate,
        lte: endDate,
      };
    }

    const analytics = await this.prisma.recommendationAnalytics.findMany({
      where,
    });

    const totalImpressions = analytics.reduce((sum, item) => sum + item.impressions, 0);
    const totalClicks = analytics.reduce((sum, item) => sum + item.clicks, 0);
    const totalConversions = analytics.reduce((sum, item) => sum + item.conversions, 0);

    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const avgConversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    return {
      totalImpressions,
      totalClicks,
      totalConversions,
      avgCtr: avgCtr.toFixed(2),
      avgConversionRate: avgConversionRate.toFixed(2),
    };
  }

  /**
   * 获取排行榜的效果统计
   */
  async getRankingPerformance(rankingType: string, filters: any = {}) {
    const { startDate, endDate } = filters;

    // 获取该排行榜类型下的所有推荐位
    const slots = await this.prisma.recommendationSlot.findMany({
      where: {
        algorithm: rankingType,
      },
    });

    const slotIds = slots.map((slot) => slot.id);

    const where: any = {
      slotId: { in: slotIds },
    };
    if (startDate && endDate) {
      where.dateKey = {
        gte: startDate,
        lte: endDate,
      };
    }

    const analytics = await this.prisma.recommendationAnalytics.findMany({
      where,
    });

    const totalImpressions = analytics.reduce((sum, item) => sum + item.impressions, 0);
    const totalClicks = analytics.reduce((sum, item) => sum + item.clicks, 0);
    const totalConversions = analytics.reduce((sum, item) => sum + item.conversions, 0);

    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const avgConversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    return {
      rankingType,
      totalImpressions,
      totalClicks,
      totalConversions,
      avgCtr: avgCtr.toFixed(2),
      avgConversionRate: avgConversionRate.toFixed(2),
    };
  }

  /**
   * 获取热门作品（用于排行榜）
   */
  async getPopularSeries(filters: any = {}) {
    const { rankingType = 'views', timeRange = 'day', seriesType = 'all', adult = false, limit = 20 } = filters;

    let orderBy: any = {};

    if (rankingType === 'views') {
      // 按浏览数排序
      orderBy = { _count: { entitlements: 'desc' } };
    } else if (rankingType === 'rating') {
      // 按评分排序
      orderBy = { rating: 'desc' };
    } else if (rankingType === 'follows') {
      // 按关注数排序
      orderBy = { _count: { follows: 'desc' } };
    } else if (rankingType === 'trending') {
      // 按最近活跃排序
      orderBy = { latestEpisodeId: 'desc' };
    }

    const where: any = { adult };
    if (seriesType !== 'all') {
      where.type = seriesType;
    }

    const series = await this.prisma.series.findMany({
      where,
      include: {
        _count: {
          select: {
            entitlements: true,
            follows: true,
            comments: true,
            ratings: true,
          },
        },
      },
      orderBy,
      take: limit,
    });

    return series;
  }
}
