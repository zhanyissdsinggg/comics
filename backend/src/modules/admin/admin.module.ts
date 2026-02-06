import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { EmailModule } from "../email/email.module";
import { AdminLogService } from "../../common/services/admin-log.service";
import { AdminSeriesController } from "./admin-series.controller";
import { AdminPromotionsController } from "./admin-promotions.controller";
import { AdminOrdersController } from "./admin-orders.controller";
import { AdminNotificationsController } from "./admin-notifications.controller";
import { AdminCommentsController } from "./admin-comments.controller";
import { AdminUsersController } from "./admin-users.controller";
import { AdminStatsController } from "./admin-stats.controller";
import { AdminRankingsController } from "./admin-rankings.controller";
import { AdminTrackingController } from "./admin-tracking.controller";
import { AdminBillingController } from "./admin-billing.controller";
import { AdminMetricsController } from "./admin-metrics.controller";
import { AdminBrandingController } from "./admin-branding.controller";
import { AdminEmailController } from "./admin-email.controller";
import { AdminEmailJobsController } from "./admin-email-jobs.controller";
import { AdminRegionsController } from "./admin-regions.controller";
import { AdminLogsController } from "./admin-logs.controller";
import { AdminKeyMiddleware } from "./admin.middleware";

/**
 * 老王说：管理员模块，现在支持JWT认证和操作日志审计了
 */
@Module({
  imports: [
    EmailModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || "tappytoon-jwt-secret-change-me",
      signOptions: { expiresIn: "1h" }
    })
  ],
  controllers: [
    AdminSeriesController,
    AdminPromotionsController,
    AdminOrdersController,
    AdminNotificationsController,
    AdminCommentsController,
    AdminUsersController,
    AdminStatsController,
    AdminRankingsController,
    AdminTrackingController,
    AdminBillingController,
    AdminMetricsController,
    AdminBrandingController,
    AdminEmailController,
    AdminEmailJobsController,
    AdminRegionsController,
    AdminLogsController,
  ],
  providers: [AdminLogService],
  exports: [AdminLogService],
})
export class AdminModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AdminKeyMiddleware)
      .forRoutes(
        AdminSeriesController,
        AdminPromotionsController,
        AdminOrdersController,
        AdminNotificationsController,
        AdminCommentsController,
        AdminUsersController,
        AdminStatsController,
        AdminRankingsController,
        AdminTrackingController,
        AdminBillingController,
        AdminMetricsController,
        AdminBrandingController,
        AdminEmailController,
        AdminEmailJobsController,
        AdminRegionsController,
        AdminLogsController
      );
  }
}
