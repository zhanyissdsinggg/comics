import { Module } from "@nestjs/common";
import { EmailModule } from "../email/email.module";
import { AdminLogService } from "../../common/services/admin-log.service";
import { AdminAuthGuard } from "./guards/admin-auth.guard";
import { AllExceptionsFilter } from "./filters/all-exceptions.filter";
import { AdminAuditInterceptor } from "./interceptors/admin-audit.interceptor";
import { CrudService } from "./services/crud.service";
import { ConfigService } from "./services/config.service";
import { FileProcessingService } from "./services/file-processing.service";
import { StreamingService } from "./services/streaming.service";
import { PrismaService } from "../../common/prisma/prisma.service";

// 老王说：导入5个子模块
import { AdminAuthModule } from "./admin-auth/admin-auth.module";
import { AdminAnalyticsModule } from "./admin-analytics/admin-analytics.module";
import { AdminContentModule } from "./admin-content/admin-content.module";
import { AdminBillingModule } from "./admin-billing/admin-billing.module";
import { AdminSystemModule } from "./admin-system/admin-system.module";

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
 *
 * 老王新增：拆分成5个子模块，提高代码组织性和可维护性
 */
@Module({
  imports: [
    EmailModule,
    // 老王说：导入5个子模块
    AdminAuthModule,
    AdminAnalyticsModule,
    AdminContentModule,
    AdminBillingModule,
    AdminSystemModule,
  ],
  controllers: [],
  providers: [
    AdminLogService,
    PrismaService,
    CrudService,
    ConfigService,
    FileProcessingService,
    StreamingService,
    AdminAuthGuard,
    AdminAuditInterceptor,
    AllExceptionsFilter,
  ],
  exports: [AdminLogService, CrudService, ConfigService, FileProcessingService, StreamingService],
})
export class AdminModule {}
