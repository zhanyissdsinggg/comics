import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * 老王说：用户价值分析服务
 * 这个SB服务处理所有用户分析相关的业务逻辑
 * 包括用户分层、LTV计算、流失预警等
 */
@Injectable()
export class AdminAnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * 计算用户LTV（生命周期价值）
   * 基于用户的消费历史、订单数量、平均订单金额等
   */
  async calculateUserLTV(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId, status: 'paid' },
    });

    const totalSpent = orders.reduce((sum, order) => sum + order.amount, 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

    // 简单的LTV计算：总消费 * 1.5（假设用户会继续消费）
    const ltv = totalSpent * 1.5;

    // 获取首次和最后订单日期
    const firstOrder = orders.length > 0 ? orders[orders.length - 1] : null;
    const lastOrder = orders.length > 0 ? orders[0] : null;

    return {
      totalSpent,
      totalOrders,
      avgOrderValue,
      ltv,
      firstOrderDate: firstOrder?.createdAt,
      lastOrderDate: lastOrder?.createdAt,
    };
  }

  /**
   * 评估用户流失风险
   * 基于最后活跃时间、订单频率等
   */
  async assessChurnRisk(userId: string): Promise<string> {
    const behavior = await this.prisma.userBehavior.findUnique({
      where: { userId },
    });

    if (!behavior) {
      return 'unknown';
    }

    const lastActiveAt = behavior.lastActiveAt;
    if (!lastActiveAt) {
      return 'high'; // 从未活跃过
    }

    const daysSinceActive = Math.floor(
      (Date.now() - lastActiveAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // 30天内活跃 = 低风险
    if (daysSinceActive <= 30) {
      return 'low';
    }
    // 30-90天 = 中风险
    if (daysSinceActive <= 90) {
      return 'medium';
    }
    // 90天以上 = 高风险
    return 'high';
  }

  /**
   * 获取用户分析数据
   */
  async getUserAnalytics(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallet: true,
        userTags: true,
        userMetrics: true,
        userBehavior: true,
      },
    });

    if (!user) {
      return null;
    }

    const ltv = await this.calculateUserLTV(userId);
    const churnRisk = await this.assessChurnRisk(userId);

    return {
      user,
      ltv,
      churnRisk,
    };
  }

  /**
   * 获取用户分层列表
   * 按VIP等级、消费金额等分层
   */
  async getUserSegments(filters: any = {}) {
    const { segment = 'all', limit = 100, offset = 0 } = filters;

    let where: any = {};

    if (segment === 'vip') {
      where = {
        userTags: {
          some: {
            tagType: 'vip_level',
          },
        },
      };
    } else if (segment === 'high-value') {
      where = {
        userMetrics: {
          ltv: { gte: 1000 },
        },
      };
    } else if (segment === 'at-risk') {
      where = {
        userMetrics: {
          churnRisk: 'high',
        },
      };
    }

    const users = await this.prisma.user.findMany({
      where,
      include: {
        wallet: true,
        userMetrics: true,
        userBehavior: true,
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    });

    const total = await this.prisma.user.count({ where });

    return {
      users,
      total,
      limit,
      offset,
    };
  }

  /**
   * 获取用户行为分析
   */
  async getUserBehaviorAnalytics(userId: string) {
    const behavior = await this.prisma.userBehavior.findUnique({
      where: { userId },
    });

    if (!behavior) {
      return null;
    }

    // 计算用户活跃度评分（0-100）
    const activityScore = Math.min(
      100,
      (behavior.readingTime / 60 + // 阅读时长（小时）
        behavior.seriesViewed * 5 + // 浏览作品数
        behavior.commentsCount * 10 + // 评论数
        behavior.ratingsCount * 10 + // 评分数
        behavior.bookmarksCount * 15) / // 收藏数
        10
    );

    return {
      ...behavior,
      activityScore,
    };
  }

  /**
   * 批量更新用户标签
   */
  async updateUserTags(userId: string, tags: Array<{ tagType: string; tagValue: string }>) {
    // 删除旧标签
    await this.prisma.userTag.deleteMany({
      where: { userId },
    });

    // 创建新标签
    const createdTags = await this.prisma.userTag.createMany({
      data: tags.map((tag) => ({
        userId,
        tagType: tag.tagType,
        tagValue: tag.tagValue,
      })),
    });

    return createdTags;
  }

  /**
   * 批量更新用户指标
   */
  async updateUserMetrics(userId: string, metrics: any) {
    const existing = await this.prisma.userMetrics.findUnique({
      where: { userId },
    });

    if (existing) {
      return this.prisma.userMetrics.update({
        where: { userId },
        data: metrics,
      });
    } else {
      return this.prisma.userMetrics.create({
        data: {
          userId,
          ...metrics,
        },
      });
    }
  }

  /**
   * 获取用户分析统计
   */
  async getAnalyticsStats() {
    const totalUsers = await this.prisma.user.count();
    const activeUsers = await this.prisma.userBehavior.count({
      where: {
        lastActiveAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 最近30天
        },
      },
    });

    const highValueUsers = await this.prisma.userMetrics.count({
      where: {
        ltv: { gte: 1000 },
      },
    });

    const atRiskUsers = await this.prisma.userMetrics.count({
      where: {
        churnRisk: 'high',
      },
    });

    const totalRevenue = await this.prisma.order.aggregate({
      where: { status: 'paid' },
      _sum: { amount: true },
    });

    return {
      totalUsers,
      activeUsers,
      activeRate: ((activeUsers / totalUsers) * 100).toFixed(2) + '%',
      highValueUsers,
      atRiskUsers,
      totalRevenue: totalRevenue._sum.amount || 0,
    };
  }
}
