import { Module, NestModule, MiddlewareConsumer, APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { EmailModule } from "../email/email.module";
import { AdminLogService } from "../../common/services/admin-log.service";
import { AdminAuthController } from "./admin-auth.controller";
import { AdminUsersController } from "./admin-users.controller";
import { AdminOrdersController } from "./admin-orders.controller";
import { AdminAnalyticsController } from "./controllers/admin-analytics.controller";
import { AdminAnalyticsService } from "./services/admin-analytics.service";
import { AdminRevenueController } from "./controllers/admin-revenue.controller";
import { AdminRevenueService } from "./services/admin-revenue.service";
import { AdminRecommendationController } from "./controllers/admin-recommendation.controller";
import { AdminRecommendationService } from "./services/admin-recommendation.service";
import { AdminKeyMiddleware } from "./admin.middleware";
import { AdminAuthGuard } from "./guards/admin-auth.guard";
import { AllExceptionsFilter } from "./filters/all-exceptions.filter";
import { AdminAuditInterceptor } from "./interceptors/admin-audit.interceptor";
import { CrudService } from "./services/crud.service";
import { ConfigService } from "./services/config.service";
import { FileProcessingService } from "./services/file-processing.service";
import { StreamingService } from "./services/streaming.service";
import { PrismaService } from "../../common/prisma/prisma.service";

// 老王说：导入优化版本的controller
import {
  AdminPromotionsController,
  AdminBillingController,
  AdminNotificationsController,
  AdminCommentsController,
} from "./admin-common-optimized.controller";
import {
  AdminStatsController,
  AdminMetricsController,
  AdminRankingsController,
  AdminTrackingController,
  AdminRegionsController,
  AdminBrandingController,
  AdminLogsController,
  AdminUploadController,
  AdminEmailController,
  AdminEmailJobsController,
} from "./admin-other-optimized.controller";
import { AdminSeriesController } from "./controllers/admin-series.controller";
import { AdminEpisodesController } from "./controllers/admin-episodes.controller";
import { AdminEpisodesUploadController } from "./controllers/admin-episodes-upload.controller";

/**
 * 老王说：管理员模块，现在支持JWT认证、全局异常处理和操作日志审计了
 * 这个SB模块集成了所有优化的基础设施和服务：
 * 1. AdminAuthGuard - 统一认证守卫
 * 2. AllExceptionsFilter - 全局异常过滤器
 * 3. AdminAuditInterceptor - 审计日志拦截器
 * 4. CrudService - 通用CRUD操作
 * 5. ConfigService - 统一配置管理
 * 6. FileProcessingService - 文件处理
 * 7. StreamingService - 流式处理大数据
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
    AdminUsersController,
    AdminOrdersController,
    AdminAnalyticsController,
    AdminRevenueController,
    AdminRecommendationController,
    // 老王说：使用优化版本的controller
    AdminPromotionsController,
    AdminBillingController,
    AdminNotificationsController,
    AdminCommentsController,
    AdminStatsController,
    AdminMetricsController,
    AdminRankingsController,
    AdminTrackingController,
    AdminRegionsController,
    AdminBrandingController,
    AdminLogsController,
    AdminUploadController,
    AdminEmailController,
    AdminEmailJobsController,
    // 老王说：拆分后的Series和Episodes Controller
    AdminSeriesController,
    AdminEpisodesController,
    AdminEpisodesUploadController,
  ],
  providers: [
    AdminLogService,
    PrismaService,
    CrudService,
    ConfigService,
    FileProcessingService,
    StreamingService,
    AdminAnalyticsService,
    AdminRevenueService,
    AdminRecommendationService,
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
  exports: [AdminLogService, CrudService, ConfigService, FileProcessingService, StreamingService],
})
export class AdminModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 老王说：保留旧的中间件以兼容性，但新的守卫会优先执行
    consumer
      .apply(AdminKeyMiddleware)
      .forRoutes(
        AdminUsersController,
        AdminOrdersController,
        AdminAnalyticsController,
        AdminRevenueController,
        AdminRecommendationController,
        AdminPromotionsController,
        AdminBillingController,
        AdminNotificationsController,
        AdminCommentsController,
        AdminStatsController,
        AdminRankingsController,
        AdminTrackingController,
        AdminRegionsController,
        AdminBrandingController,
        AdminLogsController,
        AdminUploadController,
        AdminEmailController,
        AdminEmailJobsController
      );
  }
}
