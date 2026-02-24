import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";

@Controller("tracking")
export class TrackingController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getConfig() {
    const config = await this.prisma.trackingConfig.findUnique({
      where: { key: "default" },
    });
    return { config: config?.payload || { values: {}, updatedAt: null } };
  }
}
