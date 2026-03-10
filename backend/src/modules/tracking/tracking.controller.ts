import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { parseStoredJson } from "../../common/utils/stored-json";

type TrackingConfig = {
  values: Record<string, Record<string, string>>;
  updatedAt: string | null;
};

const DEFAULT_TRACKING_CONFIG: TrackingConfig = {
  values: {},
  updatedAt: null,
};

@Controller("tracking")
export class TrackingController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getConfig() {
    const config = await this.prisma.trackingConfig.findUnique({
      where: { key: "default" },
    });

    return {
      config: parseStoredJson(config?.payload, DEFAULT_TRACKING_CONFIG),
    };
  }
}
