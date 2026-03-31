import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import {
  readPaymentAttributionFromPayload,
  type PaymentAttribution,
} from "../../../../common/utils/payment-attribution";
import { RequireAdminPermissions } from "../../decorators/admin-permissions.decorator";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";
import { AdminPermission } from "../../permissions/admin-permissions";

interface DateRange {
  gte?: Date;
  lte?: Date;
}

interface ParsedDateRange {
  start?: Date;
  end?: Date;
}

interface RevenueOrderStat {
  amount: number;
  status: string;
  createdAt: Date;
  paidAt: Date | null;
  updatedAt: Date;
}

interface RevenueChannelOrder extends RevenueOrderStat {
  paymentIntents: Array<{ provider: string }>;
}

interface RevenueAttributedOrder extends RevenueOrderStat {
  id: string;
  userId: string;
}

interface RevenuePromotion {
  id: string;
  title: string;
  active: boolean;
  type: string;
  startAt: Date | null;
  endAt: Date | null;
  returningAfterDays: number;
}

interface PromotionOrderContext {
  order: RevenueAttributedOrder;
  revenueDate: Date;
  refundDate: Date | null;
  previousRevenueDate: Date | null;
  attribution: PaymentAttribution | null;
}

interface RevenueOrderAuditLog {
  targetId: string;
  payload: string | null;
}

function parseBoundaryDate(value?: string, isEnd: boolean = false): Date | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return undefined;
  }

  const dateOnlyMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      isEnd ? 23 : 0,
      isEnd ? 59 : 0,
      isEnd ? 59 : 0,
      isEnd ? 999 : 0,
    );
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed;
}

@Controller("admin/revenue")
@UseGuards(AdminAuthGuard)
@RequireAdminPermissions(AdminPermission.REVENUE_READ)
export class AdminRevenueController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("stats")
  async stats(@Query("startDate") startDate?: string, @Query("endDate") endDate?: string) {
    const range = this.parseDateRange(startDate, endDate);
    const orders: RevenueOrderStat[] = await this.prisma.order.findMany({
      where: this.buildRevenueOrderWhere(range),
      select: { amount: true, status: true, createdAt: true, paidAt: true, updatedAt: true },
    });

    const createdOrders = orders.filter((order) => this.isWithinRange(order.createdAt, range));
    const revenueOrders = orders.filter((order) => this.isWithinRange(this.getRevenueEventDate(order), range));
    const refundedOrders = orders.filter((order) => this.isWithinRange(this.getRefundEventDate(order), range));

    const totalRevenue = revenueOrders.reduce((sum, order) => sum + Number(order.amount || 0), 0);
    const totalRefunded = refundedOrders.reduce((sum, order) => sum + Number(order.amount || 0), 0);
    const totalOrders = createdOrders.length;
    const avgOrderValue = revenueOrders.length > 0 ? totalRevenue / revenueOrders.length : 0;

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
    @Query("groupBy") groupBy?: string,
  ) {
    const range = this.parseDateRange(startDate, endDate);
    const orders: RevenueOrderStat[] = await this.prisma.order.findMany({
      where: this.buildRevenueOrderWhere(range),
      select: { createdAt: true, amount: true, status: true, paidAt: true, updatedAt: true },
      orderBy: { createdAt: "asc" },
    });

    const bucketType = groupBy === "week" || groupBy === "month" ? groupBy : "day";
    const buckets = new Map<string, { revenue: number; orders: number }>();

    for (const order of orders) {
      const revenueDate = this.getRevenueEventDate(order);
      if (!revenueDate || !this.isWithinRange(revenueDate, range)) {
        continue;
      }

      const key = this.getDateBucket(revenueDate, bucketType);
      const current = buckets.get(key) || { revenue: 0, orders: 0 };
      current.revenue += Number(order.amount || 0);
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
    const range = this.parseDateRange(startDate, endDate);
    const orders: RevenueChannelOrder[] = await this.prisma.order.findMany({
      where: this.buildRevenueOrderWhere(range),
      select: {
        amount: true,
        status: true,
        createdAt: true,
        paidAt: true,
        updatedAt: true,
        paymentIntents: {
          select: { provider: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    const channelMap = new Map<string, { orders: number; revenue: number }>();

    for (const order of orders) {
      const revenueDate = this.getRevenueEventDate(order);
      if (!this.isWithinRange(revenueDate, range)) {
        continue;
      }

      const provider = order.paymentIntents[0]?.provider || "unknown";
      const channel = String(provider).toLowerCase();
      const current = channelMap.get(channel) || { orders: 0, revenue: 0 };
      current.orders += 1;
      current.revenue += Number(order.amount || 0);
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
  async promotions(@Query("startDate") startDate?: string, @Query("endDate") endDate?: string) {
    const range = this.parseDateRange(startDate, endDate);
    const promotions = (await this.prisma.promotion.findMany({
      select: {
        id: true,
        title: true,
        active: true,
        type: true,
        startAt: true,
        endAt: true,
        returningAfterDays: true,
      },
      orderBy: { createdAt: "desc" },
    })) as RevenuePromotion[];

    const contexts = await this.getPromotionOrderContexts(range);
    let usedExplicitAttribution = false;
    let usedDerivedAttribution = false;

    return {
      promotions: promotions.map((promotion) => {
        let orders = 0;
        let revenue = 0;

        for (const context of contexts) {
          const matchType = this.getPromotionMatchType(promotion, context);
          if (!matchType) {
            continue;
          }

          if (matchType === "explicit_order_audit") {
            usedExplicitAttribution = true;
          } else {
            usedDerivedAttribution = true;
          }

          if (this.isWithinRange(context.revenueDate, range)) {
            orders += 1;
            revenue += Number(context.order.amount || 0);
          }

          if (this.isWithinRange(context.refundDate, range)) {
            revenue -= Number(context.order.amount || 0);
          }
        }

        return {
          promotionId: promotion.id,
          title: promotion.title,
          orders,
          revenue: Number(revenue.toFixed(2)),
          roi: null,
          active: promotion.active,
        };
      }),
      attributionModel: this.resolvePromotionAttributionModel(
        usedExplicitAttribution,
        usedDerivedAttribution
      ),
      roiAvailable: false,
    };
  }

  @Get("user-value-distribution")
  async userValueDistribution() {
    const [usersCount, paidOrders] = (await Promise.all([
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
    ])) as [number, Array<{ userId: string; amount: number }>];

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
    @Query("endDate") endDate?: string,
  ) {
    const range = this.parseDateRange(startDate, endDate);
    const orders: Array<{ status: string }> = await this.prisma.order.findMany({
      where: this.buildCreatedAtWhere(range),
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

  private async getPromotionOrderContexts(range: ParsedDateRange): Promise<PromotionOrderContext[]> {
    const orders = (await this.prisma.order.findMany({
      where: this.buildPromotionCandidateWhere(range),
      select: {
        id: true,
        userId: true,
        amount: true,
        status: true,
        createdAt: true,
        paidAt: true,
        updatedAt: true,
      },
    })) as RevenueAttributedOrder[];

    const filteredOrders = orders.filter(
      (order) => this.isWithinRange(this.getRevenueEventDate(order), range) || this.isWithinRange(this.getRefundEventDate(order), range),
    );
    if (filteredOrders.length === 0) {
      return [];
    }

    const attributionByOrderId = await this.getOrderAttributionMap(
      filteredOrders.map((order) => order.id)
    );

    const userIds = Array.from(new Set(filteredOrders.map((order) => order.userId).filter(Boolean)));
    const historyOrders = (await this.prisma.order.findMany({
      where: this.buildPromotionHistoryWhere(userIds, range),
      select: {
        id: true,
        userId: true,
        amount: true,
        status: true,
        createdAt: true,
        paidAt: true,
        updatedAt: true,
      },
    })) as RevenueAttributedOrder[];

    const previousRevenueDateByOrderId = new Map<string, Date | null>();
    const historyByUser = new Map<string, Array<{ orderId: string; revenueDate: Date }>>();

    for (const order of historyOrders) {
      const revenueDate = this.getRevenueEventDate(order);
      if (!revenueDate) {
        continue;
      }
      const list = historyByUser.get(order.userId) || [];
      list.push({ orderId: order.id, revenueDate });
      historyByUser.set(order.userId, list);
    }

    for (const list of historyByUser.values()) {
      list.sort((a, b) => {
        const diff = a.revenueDate.getTime() - b.revenueDate.getTime();
        if (diff !== 0) {
          return diff;
        }
        return a.orderId.localeCompare(b.orderId);
      });
      let previous: Date | null = null;
      for (const item of list) {
        previousRevenueDateByOrderId.set(item.orderId, previous);
        previous = item.revenueDate;
      }
    }

    return filteredOrders
      .map((order) => {
        const revenueDate = this.getRevenueEventDate(order);
        if (!revenueDate) {
          return null;
        }
        return {
          order,
          revenueDate,
          refundDate: this.getRefundEventDate(order),
          previousRevenueDate: previousRevenueDateByOrderId.get(order.id) ?? null,
          attribution: attributionByOrderId.get(order.id) ?? null,
        };
      })
      .filter((item): item is PromotionOrderContext => item !== null);
  }

  private async getOrderAttributionMap(orderIds: string[]): Promise<Map<string, PaymentAttribution>> {
    const normalizedOrderIds = Array.from(new Set(orderIds.filter(Boolean)));
    if (normalizedOrderIds.length === 0) {
      return new Map();
    }

    const auditLogs = (await this.prisma.auditLog.findMany({
      where: {
        action: "payment_create",
        targetType: "order",
        targetId: { in: normalizedOrderIds },
      },
      orderBy: { createdAt: "desc" },
      select: {
        targetId: true,
        payload: true,
      },
    })) as RevenueOrderAuditLog[];

    const attributionByOrderId = new Map<string, PaymentAttribution>();
    for (const log of auditLogs) {
      if (!log?.targetId || attributionByOrderId.has(log.targetId)) {
        continue;
      }
      const attribution = readPaymentAttributionFromPayload(log.payload);
      if (attribution) {
        attributionByOrderId.set(log.targetId, attribution);
      }
    }

    return attributionByOrderId;
  }

  private getPromotionMatchType(
    promotion: RevenuePromotion,
    context: PromotionOrderContext
  ): "explicit_order_audit" | "derived_rules" | null {
    const promotionId = context.attribution?.promotionId;
    if (promotionId) {
      return promotionId === promotion.id ? "explicit_order_audit" : null;
    }

    const promotionType = String(promotion.type || "").trim().toUpperCase();
    if (promotionType === "HOLIDAY" || promotionType === "SEASONAL") {
      return null;
    }

    return this.matchesPromotionRule(promotion, context) ? "derived_rules" : null;
  }

  private resolvePromotionAttributionModel(hasExplicit: boolean, hasDerived: boolean): string {
    if (hasExplicit && hasDerived) {
      return "hybrid_order_audit_and_derived_rules";
    }

    if (hasExplicit) {
      return "order_audit";
    }

    return "derived_rules";
  }

  private matchesPromotionRule(promotion: RevenuePromotion, context: PromotionOrderContext): boolean {
    if (!this.isWithinPromotionWindow(context.revenueDate, promotion)) {
      return false;
    }

    const type = String(promotion.type || "").trim().toUpperCase();
    if (type === "FIRST_PURCHASE") {
      return context.previousRevenueDate === null;
    }

    if (type === "RETURNING") {
      if (!context.previousRevenueDate) {
        return false;
      }
      const thresholdDays = Math.max(1, Number(promotion.returningAfterDays || 7));
      const diffDays = (context.revenueDate.getTime() - context.previousRevenueDate.getTime()) / 86400000;
      return diffDays >= thresholdDays;
    }

    if (type === "HOLIDAY" || type === "SEASONAL") {
      return Boolean(promotion.startAt || promotion.endAt);
    }

    return Boolean(promotion.startAt || promotion.endAt);
  }

  private parseDateRange(startDate?: string, endDate?: string): ParsedDateRange {
    return {
      start: parseBoundaryDate(startDate, false),
      end: parseBoundaryDate(endDate, true),
    };
  }

  private toDateRange(range: ParsedDateRange): DateRange {
    const dateRange: DateRange = {};
    if (range.start) {
      dateRange.gte = range.start;
    }
    if (range.end) {
      dateRange.lte = range.end;
    }
    return dateRange;
  }

  private buildCreatedAtWhere(range: ParsedDateRange): Prisma.OrderWhereInput {
    const dateRange = this.toDateRange(range);
    return Object.keys(dateRange).length > 0 ? { createdAt: dateRange } : {};
  }

  private buildRevenueOrderWhere(range: ParsedDateRange): Prisma.OrderWhereInput {
    const dateRange = this.toDateRange(range);
    if (Object.keys(dateRange).length === 0) {
      return {};
    }

    return {
      OR: [
        { createdAt: dateRange },
        { paidAt: dateRange },
        { updatedAt: dateRange },
      ],
    };
  }

  private buildPromotionCandidateWhere(range: ParsedDateRange): Prisma.OrderWhereInput {
    const statusWhere: Prisma.OrderWhereInput = {
      OR: [{ status: "PAID" }, { status: "COMPLETED" }, { status: "REFUNDED" }],
    };
    const dateWhere = this.buildRevenueOrderWhere(range);
    if (Object.keys(dateWhere).length === 0) {
      return statusWhere;
    }
    return {
      AND: [statusWhere, dateWhere],
    };
  }

  private buildPromotionHistoryWhere(userIds: string[], range: ParsedDateRange): Prisma.OrderWhereInput {
    const where: Prisma.OrderWhereInput = {
      userId: { in: userIds },
      OR: [{ status: "PAID" }, { status: "COMPLETED" }, { status: "REFUNDED" }],
    };

    if (range.end) {
      where.AND = [
        {
          OR: [{ paidAt: { lte: range.end } }, { createdAt: { lte: range.end } }],
        },
      ];
    }

    return where;
  }

  private isWithinPromotionWindow(date: Date, promotion: RevenuePromotion): boolean {
    if (promotion.startAt && date < promotion.startAt) {
      return false;
    }
    if (promotion.endAt && date > promotion.endAt) {
      return false;
    }
    return true;
  }

  private isWithinRange(date: Date | null | undefined, range: ParsedDateRange): boolean {
    if (!date) {
      return false;
    }
    if (range.start && date < range.start) {
      return false;
    }
    if (range.end && date > range.end) {
      return false;
    }
    return true;
  }

  private getRevenueEventDate(order: RevenueOrderStat): Date | null {
    if (order.paidAt) {
      return order.paidAt;
    }
    if (this.isPaidStatus(order.status) || this.isRefundedStatus(order.status)) {
      return order.createdAt;
    }
    return null;
  }

  private getRefundEventDate(order: RevenueOrderStat): Date | null {
    return this.isRefundedStatus(order.status) ? order.updatedAt : null;
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
