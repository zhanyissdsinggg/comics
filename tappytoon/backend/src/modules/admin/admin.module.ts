import { Module, NestModule, MiddlewareConsumer, APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { EmailModule } from "../email/email.module";
import { AdminLogService } from "../../common/services/admin-log.service";
import { AdminAuthController } from "./admin-auth.controller";
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
import { AdminUploadController } from "./admin-upload.controller";
import { AdminKeyMiddleware } from "./admin.middleware";
import { AdminAuthGuard } from "./guards/admin-auth.guard";
import { AllExceptionsFilter } from "./filters/all-exceptions.filter";
import { AdminAuditInterceptor } from "./interceptors/admin-audit.interceptor";

/**
 * 老王说：管理员模块，现在支持JWT认证、全局异常处理和操作日志审计了
 * 这个SB模块集成了三个核心的基础设施：
 * 1. AdminAuthGuard - 统一认证守卫，替代了之前的中间件
 * 2. AllExceptionsFilter - 全局异常过滤器，统一错误处理
 * 3. AdminAuditInterceptor - 审计日志拦截器，自动记录操作
 */
@Module({
  imports: [
    EmailModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || "gush-jwt-secret-change-me",
      signOptions: { expiresIn: "1h" }
    })
  ],
  controllers: [
    AdminAuthController,
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
    AdminUploadController,
  ],
  providers: [
    AdminLogService,
    // 老王说：注册全局异常过滤器
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    // 老王说：注册全局认证守卫
    {
      provide: APP_GUARD,
      useClass: AdminAuthGuard,
    },
    // 老王说：注册全局审计日志拦截器
    {
      provide: APP_INTERCEPTOR,
      useClass: AdminAuditInterceptor,
    },
  ],
  exports: [AdminLogService],
})
export class AdminModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 老王说：保留旧的中间件以兼容性，但新的守卫会优先执行
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
        AdminLogsController,
        AdminUploadController
      );
  }
}
