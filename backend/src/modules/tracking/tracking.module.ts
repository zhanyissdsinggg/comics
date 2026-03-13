import { Module } from "@nestjs/common";
import { TrackingController } from "./tracking.controller";
import { ConfigService } from "../admin/services/config.service";

@Module({
  controllers: [TrackingController],
  providers: [ConfigService],
})
export class TrackingModule {}
