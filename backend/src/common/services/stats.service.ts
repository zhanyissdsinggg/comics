import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

function getDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function parseDateKey(value?: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function buildDateRange(from?: string | null, to?: string | null) {
  const toDate = parseDateKey(to) || new Date();
  const fromDate =
    parseDateKey(from) ||
    new Date(toDate.getTime() - 13 * 24 * 60 * 60 * 1000);
  const start = new Date(Math.min(fromDate.getTime(), toDate.getTime()));
  const end = new Date(Math.max(fromDate.getTime(), toDate.getTime()));
  const result: string[] = [];
  const cursor = new Date(start.getTime());
  while (cursor <= end) {
    result.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async recordDailyActive(userId: string) {
    if (!userId || userId === "guest") {
      return;
    }
    const dateKey = getDateKey();
    await this.prisma.dailyActive.upsert({
      where: { dateKey_userId: { dateKey, userId } },
      update: {},
      create: { dateKey, userId },
    });
  }

  async recordRegistration(userId: string) {
    const dateKey = getDateKey();
    await this.prisma.dailyStat.upsert({
      where: { dateKey },
      update: { registrations: { increment: 1 } },
      create: { dateKey, registrations: 1, views: 0, paidOrders: 0 },
    });
    await this.recordDailyActive(userId);
  }

  async recordComicView(userId: string | null) {
    const dateKey = getDateKey();
    await this.prisma.dailyStat.upsert({
      where: { dateKey },
      update: { views: { increment: 1 } },
      create: { dateKey, views: 1, registrations: 0, paidOrders: 0 },
    });
    if (userId) {
      await this.recordDailyActive(userId);
    }
  }

  async recordSeriesView(userId: string | null, seriesId: string) {
    if (!seriesId) {
      return;
    }
    const dateKey = getDateKey();
    await this.prisma.seriesViewStat.upsert({
      where: { dateKey_seriesId: { dateKey, seriesId } },
      update: { views: { increment: 1 } },
      create: { dateKey, seriesId, views: 1 },
    });
    await this.prisma.dailyStat.upsert({
      where: { dateKey },
      update: { views: { increment: 1 } },
      create: { dateKey, views: 1, registrations: 0, paidOrders: 0 },
    });
    if (userId) {
      await this.recordDailyActive(userId);
    }
  }

  async recordPaidOrder() {
    const dateKey = getDateKey();
    await this.prisma.dailyStat.upsert({
      where: { dateKey },
      update: { paidOrders: { increment: 1 } },
      create: { dateKey, paidOrders: 1, views: 0, registrations: 0 },
    });
  }

  async getDailyStats(from?: string | null, to?: string | null) {
    const keys = buildDateRange(from, to);
    const stats = await this.prisma.dailyStat.findMany({
      where: { dateKey: { in: keys } },
    });
    const activeCounts = await this.prisma.dailyActive.groupBy({
      by: ["dateKey"],
      _count: { dateKey: true },
      where: { dateKey: { in: keys } },
    });
    const activeMap = new Map(
      activeCounts.map((row) => [row.dateKey, row._count.dateKey])
    );
    const statMap = new Map(stats.map((item) => [item.dateKey, item]));
    return keys.map((dateKey) => {
      const row = statMap.get(dateKey);
      return {
        date: dateKey,
        views: row?.views || 0,
        registrations: row?.registrations || 0,
        dau: activeMap.get(dateKey) || 0,
        paidOrders: row?.paidOrders || 0,
      };
    });
  }

  async getTopSeries(from?: string | null, to?: string | null, type?: string, limit = 10) {
    const keys = buildDateRange(from, to);
    const grouped = await this.prisma.seriesViewStat.groupBy({
      by: ["seriesId"],
      _sum: { views: true },
      where: { dateKey: { in: keys } },
      orderBy: { _sum: { views: "desc" } },
      take: Math.max(1, limit),
    });
    const ids = grouped.map((row) => row.seriesId);
    const series = await this.prisma.series.findMany({
      where: { id: { in: ids } },
    });
    const seriesMap = new Map(series.map((item) => [item.id, item]));
    const list = grouped
      .map((row) => {
        const item = seriesMap.get(row.seriesId);
        if (!item) {
          return null;
        }
        if (type && type !== "all" && item.type !== type) {
          return null;
        }
        return {
          seriesId: row.seriesId,
          title: item.title,
          type: item.type,
          views: row._sum.views || 0,
        };
      })
      .filter(Boolean) as any[];
    return list.slice(0, Math.max(1, limit));
  }

  /**
   * 老王修改：获取Dashboard总体统计数据，支持日期范围筛选
   * @param from 开始日期 (YYYY-MM-DD)
   * @param to 结束日期 (YYYY-MM-DD)
   * 返回总用户数、作品数、订单数、总收入、总浏览量、评论数
   */
  async getDashboardStats(from?: string | null, to?: string | null) {
    // 老王注释：解析日期范围，如果没有提供则使用全部数据
    const fromDate = from ? new Date(`${from}T00:00:00Z`) : null;
    const toDate = to ? new Date(`${to}T23:59:59Z`) : null;

    // 老王注释：构建日期过滤条件
    const dateFilter = fromDate && toDate ? {
      createdAt: {
        gte: fromDate,
        lte: toDate,
      },
    } : {};

    // 并行查询所有统计数据（老王注释：提高性能）
    const [
      totalUsers,
      totalSeries,
      totalOrders,
      totalRevenue,
      totalViews,
      totalComments,
      last30DaysStats,
    ] = await Promise.all([
      // 总用户数（按日期筛选）
      this.prisma.user.count({ where: dateFilter }),
      // 作品数量（老王修复：Series没有createdAt字段，不使用日期过滤）
      this.prisma.series.count(),
      // 订单数量（按日期筛选）
      this.prisma.order.count({
        where: {
          status: "paid",
          ...dateFilter,
        }
      }),
      // 总收入（按日期筛选的已支付订单金额总和）
      this.prisma.order.aggregate({
        _sum: { amount: true },
        where: {
          status: "paid",
          ...dateFilter,
        },
      }),
      // 总浏览量（按日期范围筛选）
      fromDate && toDate
        ? this.prisma.dailyStat.aggregate({
            _sum: { views: true },
            where: {
              dateKey: {
                gte: from,
                lte: to,
              },
            },
          })
        : this.prisma.dailyStat.aggregate({
            _sum: { views: true },
          }),
      // 评论数量（按日期筛选）
      this.prisma.comment.count({ where: dateFilter }),
      // 最近30天的统计数据（用于计算变化趋势）
      this.getDailyStats(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        new Date().toISOString().slice(0, 10)
      ),
    ]);

    // 老王注释：计算最近7天和前7天的对比，得出变化趋势
    const last7Days = last30DaysStats.slice(-7);
    const prev7Days = last30DaysStats.slice(-14, -7);

    const last7DaysRegistrations = last7Days.reduce((sum, day) => sum + day.registrations, 0);
    const prev7DaysRegistrations = prev7Days.reduce((sum, day) => sum + day.registrations, 0);
    const usersChange = prev7DaysRegistrations > 0
      ? ((last7DaysRegistrations - prev7DaysRegistrations) / prev7DaysRegistrations) * 100
      : 0;

    const last7DaysOrders = last7Days.reduce((sum, day) => sum + day.paidOrders, 0);
    const prev7DaysOrders = prev7Days.reduce((sum, day) => sum + day.paidOrders, 0);
    const ordersChange = prev7DaysOrders > 0
      ? ((last7DaysOrders - prev7DaysOrders) / prev7DaysOrders) * 100
      : 0;

    const last7DaysViews = last7Days.reduce((sum, day) => sum + day.views, 0);
    const prev7DaysViews = prev7Days.reduce((sum, day) => sum + day.views, 0);
    const viewsChange = prev7DaysViews > 0
      ? ((last7DaysViews - prev7DaysViews) / prev7DaysViews) * 100
      : 0;

    return {
      users: {
        total: totalUsers,
        change: Number(usersChange.toFixed(1)),
        trend: usersChange >= 0 ? "up" : "down",
      },
      series: {
        total: totalSeries,
        change: 0, // 老王注释：作品数量变化不大，暂时设为0
        trend: "up",
      },
      orders: {
        total: totalOrders,
        change: Number(ordersChange.toFixed(1)),
        trend: ordersChange >= 0 ? "up" : "down",
      },
      revenue: {
        total: totalRevenue._sum.amount || 0,
        change: Number(ordersChange.toFixed(1)), // 老王注释：收入变化和订单变化相关
        trend: ordersChange >= 0 ? "up" : "down",
      },
      views: {
        total: totalViews._sum.views || 0,
        change: Number(viewsChange.toFixed(1)),
        trend: viewsChange >= 0 ? "up" : "down",
      },
      comments: {
        total: totalComments,
        change: 0, // 老王注释：评论数量变化暂时设为0
        trend: "up",
      },
    };
  }
}
