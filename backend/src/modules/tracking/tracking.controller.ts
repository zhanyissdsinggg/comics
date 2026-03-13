import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "../admin/services/config.service";

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
  constructor(private readonly configService: ConfigService) {}

  @Get()
  async getConfig() {
    return {
      config: await this.configService.getConfig("default", DEFAULT_TRACKING_CONFIG),
    };
  }
}
