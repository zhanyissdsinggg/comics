import { Injectable } from '@nestjs/common';
import type { Prisma, UserBehavior, UserMetrics, UserTag } from '@prisma/client';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { ORDER_STATUS } from '../../../../common/utils/order-status';
import type {
  AnalyticsSegmentsFilters,
  UpdateUserMetricsInput,
  UserSegmentKey,
  UserTagInput,
} from '../dtos/admin-analytics.dto';
import { readIntLike, readNumberLike } from '../../utils/param-parsing';

export type ChurnRiskLevel = 'low' | 'medium' | 'high' | 'unknown';
export type UserAnalyticsUser = Prisma.UserGetPayload<{
  include: {
    wallet: true;
    userTags: true;
    userMetrics: true;
    userBehavior: true;
  };
}>;
export type UserSegmentUser = Prisma.UserGetPayload<{
  include: {
    wallet: true;
    userMetrics: true;
    userBehavior: true;
  };
}>;

export interface UserLtvResult {
  totalSpent: number;
  totalOrders: number;
  avgOrderValue: number;
  ltv: number;
  firstOrderDate?: Date;
  lastOrderDate?: Date;
}

export interface UserAnalyticsResult {
  user: UserAnalyticsUser;
  ltv: UserLtvResult;
  churnRisk: ChurnRiskLevel;
}

export interface UserSegmentsResult {
  users: UserSegmentUser[];
  total: number;
  limit: number;
  offset: number;
}

export type UserBehaviorAnalyticsResult = UserBehavior & {
  activityScore: number;
};

export interface AnalyticsStatsResult {
  totalUsers: number;
  activeUsers: number;
  activeRate: string;
  highValueUsers: number;
  atRiskUsers: number;
  totalRevenue: number;
}

function buildUserSegmentWhere(segment: UserSegmentKey | string | undefined): Prisma.UserWhereInput {
  if (segment === 'vip') {
    return {
      userTags: {
        some: {
          tagType: 'vip_level',
        },
      },
    };
  }

  if (segment === 'high-value') {
    return {
      userMetrics: {
        ltv: { gte: 1000 },
      },
    };
  }

  if (segment === 'at-risk') {
    return {
      userMetrics: {
        churnRisk: 'high',
      },
    };
  }

  return {};
}

function buildUserMetricsUpdateData(input: UpdateUserMetricsInput): Prisma.UserMetricsUncheckedUpdateInput {
  const data: Prisma.UserMetricsUncheckedUpdateInput = {};

  if (input.views !== undefined) {
    data.views = readIntLike(input.views, 0);
  }
  if (input.reads !== undefined) {
    data.reads = readIntLike(input.reads, 0);
  }

  const ltv = readNumberLike(input.ltv);
  if (ltv !== undefined) {
    data.ltv = ltv;
  }
  if (input.churnRisk !== undefined) {
    data.churnRisk = input.churnRisk;
  }

  return data;
}

function buildUserMetricsCreateData(
  userId: string,
  input: UpdateUserMetricsInput,
): Prisma.UserMetricsUncheckedCreateInput {
  const data: Prisma.UserMetricsUncheckedCreateInput = {
    userId,
  };

  if (input.views !== undefined) {
    data.views = readIntLike(input.views, 0);
  }
  if (input.reads !== undefined) {
    data.reads = readIntLike(input.reads, 0);
  }

  const ltv = readNumberLike(input.ltv);
  if (ltv !== undefined) {
    data.ltv = ltv;
  }
  if (input.churnRisk !== undefined) {
    data.churnRisk = input.churnRisk;
  }

  return data;
}

@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async calculateUserLTV(userId: string): Promise<UserLtvResult> {
    const orders = await this.prisma.order.findMany({
      where: { userId, status: ORDER_STATUS.PAID },
    });

    const sortedOrders = [...orders].sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
    const totalSpent = orders.reduce((sum, order) => sum + order.amount, 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
    const ltv = totalSpent * 1.5;

    const firstOrder = sortedOrders[0];
    const lastOrder = sortedOrders[sortedOrders.length - 1];

    return {
      totalSpent,
      totalOrders,
      avgOrderValue,
      ltv,
      firstOrderDate: firstOrder?.createdAt,
      lastOrderDate: lastOrder?.createdAt,
    };
  }

  async assessChurnRisk(userId: string): Promise<ChurnRiskLevel> {
    const behavior = await this.prisma.userBehavior.findUnique({
      where: { userId },
    });

    if (!behavior) {
      return 'unknown';
    }

    const lastActiveAt = behavior.lastActiveAt;
    if (!lastActiveAt) {
      return 'high';
    }

    const daysSinceActive = Math.floor((Date.now() - lastActiveAt.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceActive <= 30) {
      return 'low';
    }
    if (daysSinceActive <= 90) {
      return 'medium';
    }
    return 'high';
  }

  async getUserAnalytics(userId: string): Promise<UserAnalyticsResult | null> {
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

  async getUserSegments(filters: AnalyticsSegmentsFilters = {}): Promise<UserSegmentsResult> {
    const limit = readIntLike(filters.limit, 100, 1, 500);
    const offset = readIntLike(filters.offset, 0, 0);
    const where = buildUserSegmentWhere(filters.segment);

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

  async getUserBehaviorAnalytics(userId: string): Promise<UserBehaviorAnalyticsResult | null> {
    const behavior = await this.prisma.userBehavior.findUnique({
      where: { userId },
    });

    if (!behavior) {
      return null;
    }

    const activityScore = Math.min(
      100,
      (
        behavior.readingTime / 60 +
        behavior.seriesViewed * 5 +
        behavior.commentsCount * 10 +
        behavior.ratingsCount * 10 +
        behavior.bookmarksCount * 15
      ) / 10,
    );

    return {
      ...behavior,
      activityScore,
    };
  }

  async updateUserTags(userId: string, tags: UserTagInput[]): Promise<Prisma.BatchPayload> {
    await this.prisma.userTag.deleteMany({
      where: { userId },
    });

    return this.prisma.userTag.createMany({
      data: tags.map((tag) => ({
        userId,
        tag: `${tag.tagType}:${tag.tagValue}`,
        tagType: tag.tagType,
        tagValue: tag.tagValue,
      })),
    });
  }

  async updateUserMetrics(userId: string, input: UpdateUserMetricsInput): Promise<UserMetrics> {
    const existing = await this.prisma.userMetrics.findUnique({
      where: { userId },
    });

    if (existing) {
      return this.prisma.userMetrics.update({
        where: { userId },
        data: buildUserMetricsUpdateData(input),
      });
    }

    return this.prisma.userMetrics.create({
      data: buildUserMetricsCreateData(userId, input),
    });
  }

  async getAnalyticsStats(): Promise<AnalyticsStatsResult> {
    const totalUsers = await this.prisma.user.count();
    const activeUsers = await this.prisma.userBehavior.count({
      where: {
        lastActiveAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
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
      where: { status: ORDER_STATUS.PAID },
      _sum: { amount: true },
    });

    return {
      totalUsers,
      activeUsers,
      activeRate: totalUsers > 0 ? `${((activeUsers / totalUsers) * 100).toFixed(2)}%` : '0.00%',
      highValueUsers,
      atRiskUsers,
      totalRevenue: totalRevenue._sum.amount || 0,
    };
  }
}
