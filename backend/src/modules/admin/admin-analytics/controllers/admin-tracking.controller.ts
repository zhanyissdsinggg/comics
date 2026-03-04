import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";

@Controller("admin/tracking")
@UseGuards(AdminAuthGuard)
export class AdminTrackingController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getConfig() {
    const config = await this.prisma.trackingConfig.findUnique({
      where: { key: "default" },
    });
    return { config: config?.payload ? JSON.parse(config.payload) : { values: {}, updatedAt: null } };
  }

  @Post()
  async save(@Body() body: any) {
    const values = body?.values || {};
    const payload = { values, updatedAt: new Date().toISOString() };
    const config = await this.prisma.trackingConfig.upsert({
      where: { key: "default" },
      update: { payload: JSON.stringify(payload) },
      create: { key: "default", value: "default", payload: JSON.stringify(payload) },
    });
    return { config: JSON.parse(config.payload || "{}") };
  }
}
