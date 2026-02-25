import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * 老王说：收入分析服务
 * 这个SB服务处理所有收入分析相关的业务逻辑
 * 包括收入趋势、渠道分析、促销效果等
 */
@Injectable()
export class AdminRevenueService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取收入统计数据
   */
  async getRevenueStats(filters: any = {}) {
    const { startDate, endDate } = filters;

    // 查询订单数据
    const orders = await this.prisma.order.findMany({
      where: {
        status: 'paid',
        ...(startDate && endDate && {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
      },
      include: { user: true },
    });

    const totalRevenue = orders.reduce((sum, order) => sum + order.amount, 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // 查询退款数据
    const refunds = await this.prisma.order.findMany({
      where: {
        status: 'refunded',
        ...(startDate && endDate && {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
      },
    });

    const totalRefunded = refunds.reduce((sum, order) => sum + order.amount, 0);

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      totalRefunded,
      netRevenue: totalRevenue - totalRefunded,
    };
  }

  /**
   * 获取收入趋势数据（按日期）
   */
  async getRevenueTrend(filters: any = {}) {
    const { startDate, endDate, groupBy = 'day' } = filters;

    const orders = await this.prisma.order.findMany({
      where: {
        status: 'paid',
        ...(startDate && endDate && {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
      },
    });

    // 按日期分组
    const grouped: Record<string, any> = {};

    orders.forEach((order) => {
      const date = new Date(order.createdAt);
      let key: string;

      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else if (groupBy === 'month') {
        key = date.toISOString().slice(0, 7);
      } else {
        key = date.toISOString().split('T')[0];
      }

      if (!grouped[key]) {
        grouped[key] = { date: key, revenue: 0, orders: 0 };
      }

      grouped[key].revenue += order.amount;
      grouped[key].orders += 1;
    });

    return Object.values(grouped).sort((a: any, b: any) =>
      a.date.localeCompare(b.date)
    );
  }

  /**
   * 获取渠道分析数据
   */
  async getChannelAnalytics(filters: any = {}) {
    const { startDate, endDate } = filters;

    const orders = await this.prisma.order.findMany({
      where: {
        status: 'paid',
        ...(startDate && endDate && {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
      },
    });

    // 按packageId分组（代表不同的套餐/渠道）
    const channels: Record<string, any> = {};

    orders.forEach((order) => {
      const channel = order.packageId || 'unknown';

      if (!channels[channel]) {
        channels[channel] = {
          channel,
          orders: 0,
          revenue: 0,
          avgOrderValue: 0,
        };
      }

      channels[channel].orders += 1;
      channels[channel].revenue += order.amount;
    });

    // 计算平均订单金额
    Object.keys(channels).forEach((key) => {
      channels[key].avgOrderValue =
        channels[key].orders > 0
          ? channels[key].revenue / channels[key].orders
          : 0;
    });

    return Object.values(channels).sort(
      (a: any, b: any) => b.revenue - a.revenue
    );
  }

  /**
   * 获取促销效果分析
   */
  async getPromotionAnalytics(filters: any = {}) {
    const { promotionId, startDate, endDate } = filters;

    // 查询促销相关的订单
    const promotions = await this.prisma.promotion.findMany({
      where: promotionId ? { id: promotionId } : {},
    });

    const results = [];

    for (const promotion of promotions) {
      // 简单的促销效果计算：查询该促销时间范围内的订单
      const orders = await this.prisma.order.findMany({
        where: {
          status: 'paid',
          createdAt: {
            gte: promotion.startAt || new Date(0),
            lte: promotion.endAt || new Date(),
          },
        },
      });

      const totalRevenue = orders.reduce((sum, order) => sum + order.amount, 0);
      const totalOrders = orders.length;

      // 简单的ROI计算（实际应该根据促销成本计算）
      const roi = totalOrders > 0 ? (totalRevenue / (totalOrders * 10)) * 100 : 0;

      results.push({
        promotionId: promotion.id,
        title: promotion.title,
        orders: totalOrders,
        revenue: totalRevenue,
        avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        roi: roi.toFixed(2),
        active: promotion.active,
      });
    }

    return results;
  }

  /**
   * 获取用户价值分布
   */
  async getUserValueDistribution() {
    const users = await this.prisma.user.findMany({
      include: { userMetrics: true },
    });

    const distribution = {
      highValue: 0, // LTV >= 1000
      mediumValue: 0, // LTV 100-1000
      lowValue: 0, // LTV < 100
      noValue: 0, // 无消费
    };

    users.forEach((user) => {
      const ltv = user.userMetrics?.ltv || 0;

      if (ltv >= 1000) {
        distribution.highValue += 1;
      } else if (ltv >= 100) {
        distribution.mediumValue += 1;
      } else if (ltv > 0) {
        distribution.lowValue += 1;
      } else {
        distribution.noValue += 1;
      }
    });

    return distribution;
  }

  /**
   * 获取订单状态分布
   */
  async getOrderStatusDistribution(filters: any = {}) {
    const { startDate, endDate } = filters;

    const where: any = {};
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const statuses = ['pending', 'paid', 'failed', 'refunded'];
    const distribution: Record<string, number> = {};

    for (const status of statuses) {
      const count = await this.prisma.order.count({
        where: { ...where, status },
      });
      distribution[status] = count;
    }

    return distribution;
  }

  /**
   * 获取套餐销售排行
   */
  async getPackageRankings(filters: any = {}) {
    const { limit = 10, startDate, endDate } = filters;

    const orders = await this.prisma.order.findMany({
      where: {
        status: 'paid',
        ...(startDate && endDate && {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
      },
    });

    // 按packageId分组
    const packages: Record<string, any> = {};

    orders.forEach((order) => {
      const packageId = order.packageId || 'unknown';

      if (!packages[packageId]) {
        packages[packageId] = {
          packageId,
          orders: 0,
          revenue: 0,
        };
      }

      packages[packageId].orders += 1;
      packages[packageId].revenue += order.amount;
    });

    return Object.values(packages)
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  /**
   * 保存收入指标到数据库
   */
  async saveRevenueMetrics(dateKey: string, metrics: any) {
    const existing = await this.prisma.revenueMetrics.findUnique({
      where: { dateKey },
    });

    if (existing) {
      return this.prisma.revenueMetrics.update({
        where: { dateKey },
        data: metrics,
      });
    } else {
      return this.prisma.revenueMetrics.create({
        data: {
          dateKey,
          ...metrics,
        },
      });
    }
  }

  /**
   * 保存渠道分析数据
   */
  async saveChannelAnalytics(dateKey: string, channel: string, packageId: string, data: any) {
    const unique = `${dateKey}-${channel}-${packageId}`;

    const existing = await this.prisma.channelAnalytics.findUnique({
      where: {
        dateKey_channel_packageId: {
          dateKey,
          channel,
          packageId,
        },
      },
    });

    if (existing) {
      return this.prisma.channelAnalytics.update({
        where: {
          dateKey_channel_packageId: {
            dateKey,
            channel,
            packageId,
          },
        },
        data,
      });
    } else {
      return this.prisma.channelAnalytics.create({
        data: {
          dateKey,
          channel,
          packageId,
          ...data,
        },
      });
    }
  }

  /**
   * 保存促销效果分析数据
   */
  async savePromotionAnalytics(promotionId: string, dateKey: string, data: any) {
    const existing = await this.prisma.promotionAnalytics.findUnique({
      where: {
        promotionId_dateKey: {
          promotionId,
          dateKey,
        },
      },
    });

    if (existing) {
      return this.prisma.promotionAnalytics.update({
        where: {
          promotionId_dateKey: {
            promotionId,
            dateKey,
          },
        },
        data,
      });
    } else {
      return this.prisma.promotionAnalytics.create({
        data: {
          promotionId,
          dateKey,
          ...data,
        },
      });
    }
  }
}
