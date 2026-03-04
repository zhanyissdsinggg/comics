import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma/prisma.service';

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
    const { limit = 100, offset = 0 } = filters;

    const where: any = {};

    const slots = await this.prisma.recommendationSlot.findMany({
      where,
      orderBy: { createdAt: 'asc' },
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
        slot: data.slot || data.name || `slot-${Date.now()}`,
        seriesIds: Array.isArray(data.seriesIds) ? data.seriesIds : [],
      },
    });
  }

  /**
   * 更新推荐位
   */
  async updateRecommendationSlot(id: string, data: any) {
    const updateData: any = {};
    if (data.slot) updateData.slot = data.slot;
    if (Array.isArray(data.seriesIds)) updateData.seriesIds = data.seriesIds;
    return this.prisma.recommendationSlot.update({
      where: { id },
      data: updateData,
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
    const { limit = 100, offset = 0 } = filters;

    const where: any = {};

    const configs = await this.prisma.rankingConfig.findMany({
      where,
      orderBy: { createdAt: 'asc' },
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
        ranking: data.ranking || data.name || `ranking-${Date.now()}`,
        config: data.config ? JSON.stringify(data.config) : JSON.stringify({
          rankingType: data.rankingType || 'views',
          timeRange: data.timeRange || 'day',
          seriesType: data.seriesType || 'all',
          adult: data.adult || false,
          maxItems: data.maxItems || 20,
        }),
      },
    });
  }

  /**
   * 更新排行榜配置
   */
  async updateRankingConfig(id: string, data: any) {
    const updateData: any = {};
    if (data.ranking) updateData.ranking = data.ranking;
    if (data.config) updateData.config = typeof data.config === 'string' ? data.config : JSON.stringify(data.config);
    return this.prisma.rankingConfig.update({
      where: { id },
      data: updateData,
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
    const { slot, seriesId, startDate, endDate, limit = 100, offset = 0 } = filters;

    const where: any = {};
    if (slot) {
      where.slot = slot;
    }
    if (seriesId) {
      where.seriesId = seriesId;
    }

    const analytics = await this.prisma.recommendationAnalytics.findMany({
      where,
      orderBy: { date: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await this.prisma.recommendationAnalytics.count({ where });

    return { analytics, total };
  }

  /**
   * 保存推荐效果分析数据
   */
  async saveRecommendationAnalytics(slot: string, seriesId: string, date: Date, data: any) {
    return this.prisma.recommendationAnalytics.create({
      data: {
        slot,
        seriesId,
        date: date || new Date(),
        clicks: data.clicks || 0,
        views: data.views || 0,
        impressions: data.impressions || 0,
        conversions: data.conversions || 0,
      },
    });
  }

  /**
   * 获取推荐位的效果统计
   */
  async getSlotPerformance(slot: string, filters: any = {}) {
    const where: any = { slot };

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
  async getRankingPerformance(ranking: string, filters: any = {}) {
    const analytics = await this.prisma.recommendationAnalytics.findMany({
      where: {},
    });

    const totalImpressions = analytics.reduce((sum, item) => sum + item.impressions, 0);
    const totalClicks = analytics.reduce((sum, item) => sum + item.clicks, 0);
    const totalConversions = analytics.reduce((sum, item) => sum + item.conversions, 0);

    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const avgConversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    return {
      ranking,
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
    const { rankingType = 'views', seriesType = 'all', adult = false, limit = 20 } = filters;

    let orderBy: any = { rating: 'desc' };

    if (rankingType === 'rating') {
      orderBy = { rating: 'desc' };
    } else if (rankingType === 'trending') {
      orderBy = { updatedAt: 'desc' };
    } else {
      orderBy = { ratingCount: 'desc' };
    }

    const where: any = {};
    if (!adult) {
      where.adult = false;
    }
    if (seriesType !== 'all') {
      where.type = seriesType;
    }

    const series = await this.prisma.series.findMany({
      where,
      orderBy,
      take: limit,
    });

    return series;
  }
}
