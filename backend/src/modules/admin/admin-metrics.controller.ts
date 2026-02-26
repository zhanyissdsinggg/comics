import { Controller, Get, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { PrismaService } from "../../common/prisma/prisma.service";
import { ORDER_STATUS } from "../../common/utils/order-status";

@Controller("admin/metrics")
export class AdminMetricsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getMetrics(@Req() _req: Request, @Res({ passthrough: true }) _res: Response) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [paidOrders, failedOrders, pendingOrders, retryPending, dau] = await Promise.all([
      this.prisma.order.count({
        where: { status: ORDER_STATUS.PAID, createdAt: { gte: start } },
      }),
      this.prisma.order.count({
        where: { status: ORDER_STATUS.FAILED, createdAt: { gte: start } },
      }),
      this.prisma.order.count({
        where: { status: ORDER_STATUS.PENDING, createdAt: { gte: start } },
      }),
      this.prisma.paymentRetry.count({ where: { status: "PENDING" } }),
      this.prisma.dailyActive.count({
        where: { dateKey: start.toISOString().slice(0, 10) },
      }),
    ]);

    return {
      date: start.toISOString().slice(0, 10),
      paidOrders,
      failedOrders,
      pendingOrders,
      retryPending,
      dau,
    };
  }
}
