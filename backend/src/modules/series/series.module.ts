import { Module } from "@nestjs/common";
import { SeriesController } from "./series.controller";
import { SeriesService } from "./series.service";
import { CacheService } from "../../common/cache/cache.service";

@Module({
  controllers: [SeriesController],
  providers: [SeriesService, CacheService],
})
export class SeriesModule {}
