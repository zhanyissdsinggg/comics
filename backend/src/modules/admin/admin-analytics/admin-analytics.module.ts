import { Module } from "@nestjs/common";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { StatsService } from "../../../common/services/stats.service";
import { AdminAuthModule } from "../admin-auth/admin-auth.module";
import { AdminAnalyticsService } from "./services/admin-analytics.service";
import { AdminAnalyticsController } from "../controllers/admin-analytics.controller";
import { AdminStatsController } from "./controllers/admin-stats.controller";
import { AdminMetricsController } from "./controllers/admin-metrics.controller";
import { AdminRankingsController } from "./controllers/admin-rankings.controller";
import { AdminTrackingController } from "./controllers/admin-tracking.controller";

@Module({
  imports: [AdminAuthModule],
  controllers: [
    AdminAnalyticsController,
    AdminStatsController,
    AdminMetricsController,
    AdminRankingsController,
    AdminTrackingController,
  ],
  providers: [AdminAnalyticsService, StatsService, PrismaService],
  exports: [AdminAnalyticsService],
})
export class AdminAnalyticsModule {}
