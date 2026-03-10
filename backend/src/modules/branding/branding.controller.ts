import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "../admin/services/config.service";
import {
  BRANDING_CONFIG_KEY,
  DEFAULT_BRANDING_CONFIG,
  normalizeBrandingConfig,
} from "./branding.config";

@Controller("branding")
export class BrandingController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  async getBranding() {
    const stored = await this.configService.getConfig(BRANDING_CONFIG_KEY, DEFAULT_BRANDING_CONFIG);
    return {
      branding: normalizeBrandingConfig(stored),
    };
  }
}
