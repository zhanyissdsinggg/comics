import { Module } from "@nestjs/common";
import { BrandingController } from "./branding.controller";
import { ConfigService } from "../admin/services/config.service";

@Module({
  controllers: [BrandingController],
  providers: [ConfigService],
})
export class BrandingModule {}
