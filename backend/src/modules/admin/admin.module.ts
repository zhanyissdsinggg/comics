import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { EmailModule } from "../email/email.module";
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
import { AdminKeyMiddleware } from "./admin.middleware";

@Module({
  imports: [EmailModule],
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
  ],
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
        AdminRegionsController
      );
  }
}
