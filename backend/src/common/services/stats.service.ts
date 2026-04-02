import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  buildAdminVisibleCommentWhere,
  buildAdminVisibleOrderWhere,
  buildAdminVisibleUserWhere,
} from "../utils/admin-visible-data";

const DAY_MS = 24 * 60 * 60 * 1000;

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
  const fromDate = parseDateKey(from) || new Date(toDate.getTime() - 13 * DAY_MS);
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

function buildCreatedAtRange(fromDate?: Date | null, toDate?: Date | null) {
  if (!fromDate || !toDate) {
    return {};
  }

  return {
    createdAt: {
      gte: fromDate,
      lte: toDate,
    },
  };
}

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async recordDailyActive(userId: string) {
    if (!userId || userId === "guest") {
      return;
    }

    const dateKey = getDateKey();
    const date = new Date();
    await this.prisma.dailyActive.upsert({
      where: { dateKey_userId: { dateKey, userId } },
      update: {},
      create: { dateKey, userId, date },
    });
  }

  async recordRegistration(userId: string) {
    const dateKey = getDateKey();
    const date = new Date();
    await this.prisma.dailyStat.upsert({
      where: { dateKey },
      update: { registrations: { increment: 1 } },
      create: { dateKey, date, registrations: 1, views: 0, paidOrders: 0 },
    });
    await this.recordDailyActive(userId);
  }

  async recordComicView(userId: string | null) {
    const dateKey = getDateKey();
    const date = new Date();
    await this.prisma.dailyStat.upsert({
      where: { dateKey },
      update: { views: { increment: 1 } },
      create: { dateKey, date, views: 1, registrations: 0, paidOrders: 0 },
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
    const date = new Date();
    await this.prisma.seriesViewStat.upsert({
      where: { dateKey_seriesId: { dateKey, seriesId } },
      update: { views: { increment: 1 } },
      create: { dateKey, seriesId, date, views: 1 },
    });
    await this.prisma.dailyStat.upsert({
      where: { dateKey },
      update: { views: { increment: 1 } },
      create: { dateKey, date, views: 1, registrations: 0, paidOrders: 0 },
    });

    if (userId) {
      await this.recordDailyActive(userId);
    }
  }

  async recordPaidOrder() {
    const dateKey = getDateKey();
    const date = new Date();
    await this.prisma.dailyStat.upsert({
      where: { dateKey },
      update: { paidOrders: { increment: 1 } },
      create: { dateKey, date, paidOrders: 1, views: 0, registrations: 0 },
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
    const activeMap = new Map(activeCounts.map((row) => [row.dateKey, row._count.dateKey]));
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
      .filter(Boolean) as Array<{
      seriesId: string;
      title: string;
      type: string;
      views: number;
    }>;

    return list.slice(0, Math.max(1, limit));
  }

  async getDashboardStats(from?: string | null, to?: string | null) {
    const fromDate = from ? new Date(`${from}T00:00:00Z`) : null;
    const toDate = to ? new Date(`${to}T23:59:59Z`) : null;
    const dateFilter = buildCreatedAtRange(fromDate, toDate);

    const now = new Date();
    const last7Start = new Date(now.getTime() - 7 * DAY_MS);
    const prev7Start = new Date(now.getTime() - 14 * DAY_MS);
    const currentWindow = buildCreatedAtRange(last7Start, now);
    const previousWindow = {
      createdAt: {
        gte: prev7Start,
        lt: last7Start,
      },
    };

    const [
      totalUsers,
      totalSeries,
      totalOrders,
      totalRevenue,
      totalViews,
      totalComments,
      last7Users,
      prev7Users,
      last7Orders,
      prev7Orders,
      last7Comments,
      prev7Comments,
      last30DaysStats,
    ] = await Promise.all([
      this.prisma.user.count({
        where: buildAdminVisibleUserWhere(dateFilter),
      }),
      this.prisma.series.count(),
      this.prisma.order.count({
        where: buildAdminVisibleOrderWhere({
          status: "paid",
          ...dateFilter,
        }),
      }),
      this.prisma.order.aggregate({
        _sum: { amount: true },
        where: buildAdminVisibleOrderWhere({
          status: "paid",
          ...dateFilter,
        }),
      }),
      fromDate && toDate
        ? this.prisma.dailyStat.aggregate({
            _sum: { views: true },
            where: {
              dateKey: {
                gte: fromDate.toISOString().slice(0, 10),
                lte: toDate.toISOString().slice(0, 10),
              },
            },
          })
        : this.prisma.dailyStat.aggregate({
            _sum: { views: true },
          }),
      this.prisma.comment.count({
        where: buildAdminVisibleCommentWhere(dateFilter),
      }),
      this.prisma.user.count({
        where: buildAdminVisibleUserWhere(currentWindow),
      }),
      this.prisma.user.count({
        where: buildAdminVisibleUserWhere(previousWindow),
      }),
      this.prisma.order.count({
        where: buildAdminVisibleOrderWhere({
          status: "paid",
          ...currentWindow,
        }),
      }),
      this.prisma.order.count({
        where: buildAdminVisibleOrderWhere({
          status: "paid",
          ...previousWindow,
        }),
      }),
      this.prisma.comment.count({
        where: buildAdminVisibleCommentWhere(currentWindow),
      }),
      this.prisma.comment.count({
        where: buildAdminVisibleCommentWhere(previousWindow),
      }),
      this.getDailyStats(
        new Date(Date.now() - 30 * DAY_MS).toISOString().slice(0, 10),
        now.toISOString().slice(0, 10),
      ),
    ]);

    const last7Days = last30DaysStats.slice(-7);
    const prev7Days = last30DaysStats.slice(-14, -7);
    const usersChange = prev7Users > 0 ? ((last7Users - prev7Users) / prev7Users) * 100 : 0;
    const ordersChange = prev7Orders > 0 ? ((last7Orders - prev7Orders) / prev7Orders) * 100 : 0;
    const last7DaysViews = last7Days.reduce((sum, day) => sum + day.views, 0);
    const prev7DaysViews = prev7Days.reduce((sum, day) => sum + day.views, 0);
    const viewsChange = prev7DaysViews > 0
      ? ((last7DaysViews - prev7DaysViews) / prev7DaysViews) * 100
      : 0;
    const commentsChange = prev7Comments > 0
      ? ((last7Comments - prev7Comments) / prev7Comments) * 100
      : 0;

    return {
      users: {
        total: totalUsers,
        change: Number(usersChange.toFixed(1)),
        trend: usersChange >= 0 ? "up" : "down",
      },
      series: {
        total: totalSeries,
        change: 0,
        trend: "up",
      },
      orders: {
        total: totalOrders,
        change: Number(ordersChange.toFixed(1)),
        trend: ordersChange >= 0 ? "up" : "down",
      },
      revenue: {
        total: totalRevenue._sum.amount || 0,
        change: Number(ordersChange.toFixed(1)),
        trend: ordersChange >= 0 ? "up" : "down",
      },
      views: {
        total: totalViews._sum.views || 0,
        change: Number(viewsChange.toFixed(1)),
        trend: viewsChange >= 0 ? "up" : "down",
      },
      comments: {
        total: totalComments,
        change: Number(commentsChange.toFixed(1)),
        trend: commentsChange >= 0 ? "up" : "down",
      },
    };
  }
}
