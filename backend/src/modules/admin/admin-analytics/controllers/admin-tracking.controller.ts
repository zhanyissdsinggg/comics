import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import { parseStoredJson, stringifyStoredJson } from "../../../../common/utils/stored-json";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";
import { UpdateTrackingDto, TrackingValuesInput } from "../dtos/admin-analytics.dto";

type TrackingConfig = {
  values: TrackingValuesInput;
  updatedAt: string | null;
};

const DEFAULT_TRACKING_CONFIG: TrackingConfig = {
  values: {},
  updatedAt: null,
};

@Controller("admin/tracking")
@UseGuards(AdminAuthGuard)
export class AdminTrackingController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getConfig() {
    const config = await this.prisma.trackingConfig.findUnique({
      where: { key: "default" },
    });

    return { config: parseStoredJson(config?.payload, DEFAULT_TRACKING_CONFIG) };
  }

  @Post()
  async save(@Body() body: UpdateTrackingDto) {
    const values = body.values || body.tracking || {};
    const payload: TrackingConfig = { values, updatedAt: new Date().toISOString() };
    const config = await this.prisma.trackingConfig.upsert({
      where: { key: "default" },
      update: { payload: stringifyStoredJson(payload) },
      create: { key: "default", value: "default", payload: stringifyStoredJson(payload) },
    });

    return { config: parseStoredJson(config.payload, payload) };
  }
}
