import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";

interface DateRange {
  gte?: Date;
  lte?: Date;
}

interface RevenueOrderStat {
  amount: number;
  status: string;
}

interface RevenueChannelOrder {
  amount: number;
  status: string;
  paymentIntents: Array<{ provider: string }>;
}

interface RevenuePromotion {
  id: string;
  title: string;
  active: boolean;
}

@Controller("admin/revenue")
@UseGuards(AdminAuthGuard)
export class AdminRevenueController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("stats")
  async stats(@Query("startDate") startDate?: string, @Query("endDate") endDate?: string) {
    const where = this.buildDateWhere(startDate, endDate);
    const orders: RevenueOrderStat[] = await this.prisma.order.findMany({
      where,
      select: { amount: true, status: true },
    });

    const paidOrders = orders.filter((order: RevenueOrderStat) => this.isPaidStatus(order.status));
    const refundedOrders = orders.filter((order: RevenueOrderStat) =>
      this.isRefundedStatus(order.status)
    );

    const totalRevenue = paidOrders.reduce(
      (sum: number, order: RevenueOrderStat) => sum + Number(order.amount || 0),
      0
    );
    const totalRefunded = refundedOrders.reduce(
      (sum: number, order: RevenueOrderStat) => sum + Number(order.amount || 0),
      0
    );
    const totalOrders = orders.length;
    const avgOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

    return {
      stats: {
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalOrders,
        avgOrderValue: Number(avgOrderValue.toFixed(2)),
        totalRefunded: Number(totalRefunded.toFixed(2)),
        netRevenue: Number((totalRevenue - totalRefunded).toFixed(2)),
      },
    };
  }

  @Get("trend")
  async trend(
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("groupBy") groupBy?: string
  ) {
    const where = this.buildDateWhere(startDate, endDate);
    const orders: Array<{ createdAt: Date; amount: number; status: string }> =
      await this.prisma.order.findMany({
      where,
      select: { createdAt: true, amount: true, status: true },
      orderBy: { createdAt: "asc" },
      });

    const bucketType = groupBy === "week" || groupBy === "month" ? groupBy : "day";
    const buckets = new Map<string, { revenue: number; orders: number }>();

    for (const order of orders) {
      const key = this.getDateBucket(order.createdAt, bucketType);
      const current = buckets.get(key) || { revenue: 0, orders: 0 };
      const revenueIncrement = this.isPaidStatus(order.status) ? Number(order.amount || 0) : 0;
      current.revenue += revenueIncrement;
      current.orders += 1;
      buckets.set(key, current);
    }

    const trend = Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({
        date,
        revenue: Number(value.revenue.toFixed(2)),
        orders: value.orders,
      }));

    return { trend };
  }

  @Get("channels")
  async channels(@Query("startDate") startDate?: string, @Query("endDate") endDate?: string) {
    const where = this.buildDateWhere(startDate, endDate);
    const orders: RevenueChannelOrder[] = await this.prisma.order.findMany({
      where,
      select: {
        amount: true,
        status: true,
        paymentIntents: {
          select: { provider: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    const channelMap = new Map<string, { orders: number; revenue: number }>();

    for (const order of orders) {
      const provider = order.paymentIntents[0]?.provider || "unknown";
      const channel = String(provider).toLowerCase();
      const current = channelMap.get(channel) || { orders: 0, revenue: 0 };
      current.orders += 1;
      if (this.isPaidStatus(order.status)) {
        current.revenue += Number(order.amount || 0);
      }
      channelMap.set(channel, current);
    }

    const channels = Array.from(channelMap.entries())
      .map(([channel, value]) => ({
        channel,
        orders: value.orders,
        revenue: Number(value.revenue.toFixed(2)),
        avgOrderValue: Number((value.orders > 0 ? value.revenue / value.orders : 0).toFixed(2)),
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return { channels };
  }

  @Get("promotions")
  async promotions() {
    const promotions = await this.prisma.promotion.findMany({
      select: {
        id: true,
        title: true,
        active: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      promotions: (promotions as RevenuePromotion[]).map((item: RevenuePromotion) => ({
        promotionId: item.id,
        title: item.title,
        orders: 0,
        revenue: 0,
        roi: 0,
        active: item.active,
      })),
    };
  }

  @Get("user-value-distribution")
  async userValueDistribution() {
    const [usersCount, paidOrders] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.order.findMany({
        where: {
          OR: [{ status: "PAID" }, { status: "COMPLETED" }],
        },
        select: {
          userId: true,
          amount: true,
        },
      }),
    ]) as [number, Array<{ userId: string; amount: number }>];

    const userSpendMap = new Map<string, number>();
    for (const order of paidOrders) {
      const current = userSpendMap.get(order.userId) || 0;
      userSpendMap.set(order.userId, current + Number(order.amount || 0));
    }

    let highValue = 0;
    let mediumValue = 0;
    let lowValue = 0;

    for (const totalSpend of userSpendMap.values()) {
      if (totalSpend >= 100) {
        highValue += 1;
      } else if (totalSpend >= 20) {
        mediumValue += 1;
      } else if (totalSpend > 0) {
        lowValue += 1;
      }
    }

    const noValue = Math.max(0, usersCount - userSpendMap.size);

    return {
      distribution: {
        highValue,
        mediumValue,
        lowValue,
        noValue,
      },
    };
  }

  @Get("order-status-distribution")
  async orderStatusDistribution(
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string
  ) {
    const where = this.buildDateWhere(startDate, endDate);
    const orders: Array<{ status: string }> = await this.prisma.order.findMany({
      where,
      select: { status: true },
    });

    const distribution = {
      pending: 0,
      paid: 0,
      failed: 0,
      refunded: 0,
    };

    for (const order of orders) {
      const normalizedStatus = String(order.status || "").toUpperCase();
      if (normalizedStatus === "PENDING") {
        distribution.pending += 1;
      } else if (normalizedStatus === "PAID" || normalizedStatus === "COMPLETED") {
        distribution.paid += 1;
      } else if (normalizedStatus === "REFUNDED") {
        distribution.refunded += 1;
      } else if (normalizedStatus === "FAILED" || normalizedStatus === "CHARGEBACK") {
        distribution.failed += 1;
      }
    }

    return { distribution };
  }

  private buildDateWhere(startDate?: string, endDate?: string): { createdAt?: DateRange } {
    const range: DateRange = {};
    if (startDate) {
      const parsed = new Date(startDate);
      if (!Number.isNaN(parsed.getTime())) {
        range.gte = parsed;
      }
    }
    if (endDate) {
      const parsed = new Date(endDate);
      if (!Number.isNaN(parsed.getTime())) {
        parsed.setHours(23, 59, 59, 999);
        range.lte = parsed;
      }
    }
    return Object.keys(range).length > 0 ? { createdAt: range } : {};
  }

  private getDateBucket(date: Date, groupBy: "day" | "week" | "month"): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    if (groupBy === "month") {
      return `${year}-${month}`;
    }
    if (groupBy === "week") {
      const target = new Date(date);
      const dayOfWeek = target.getDay() || 7;
      target.setDate(target.getDate() - dayOfWeek + 1);
      const weekYear = target.getFullYear();
      const weekMonth = String(target.getMonth() + 1).padStart(2, "0");
      const weekDay = String(target.getDate()).padStart(2, "0");
      return `${weekYear}-${weekMonth}-${weekDay}`;
    }
    return `${year}-${month}-${day}`;
  }

  private isPaidStatus(status: string): boolean {
    const normalizedStatus = String(status || "").toUpperCase();
    return normalizedStatus === "PAID" || normalizedStatus === "COMPLETED";
  }

  private isRefundedStatus(status: string): boolean {
    const normalizedStatus = String(status || "").toUpperCase();
    return normalizedStatus === "REFUNDED";
  }
}
