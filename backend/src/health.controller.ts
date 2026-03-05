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

  @Get("live")
  live() {
    return {
      ok: true,
      uptimeSec: Math.round(process.uptime()),
      time: new Date().toISOString(),
    };
  }

  @Get("ready")
  async ready() {
    let dbOk = true;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbOk = false;
    }

    const memory = process.memoryUsage();
    return {
      ok: dbOk,
      dbOk,
      uptimeSec: Math.round(process.uptime()),
      memoryMB: {
        rss: Math.round(memory.rss / 1024 / 1024),
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
      },
      time: new Date().toISOString(),
    };
  }
}
