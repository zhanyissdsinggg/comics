import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "./common/prisma/prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  check() {
    return { ok: true, time: new Date().toISOString() };
  }

  @Get("detail")
  async detail() {
    let dbOk = true;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbOk = false;
    }
    const retryPending = await this.prisma.paymentRetry.count({
      where: { status: "PENDING" },
    });
    const pendingOrders = await this.prisma.order.count({
      where: { status: "PENDING" },
    });
    return {
      ok: dbOk,
      time: new Date().toISOString(),
      dbOk,
      pendingOrders,
      retryPending,
    };
  }
}
