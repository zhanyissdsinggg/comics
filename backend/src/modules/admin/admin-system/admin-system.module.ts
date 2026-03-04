import { Module } from "@nestjs/common";
import { AdminMarketingService } from "./services/admin-marketing.service";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { AdminLogService } from "../../../common/services/admin-log.service";

/**
 * 老王说：管理员系统管理模块 - 处理所有系统级别的功能
 * 包括：users, regions, branding, logs, upload, email, notifications, marketing
 */
@Module({
  providers: [AdminMarketingService, PrismaService, AdminLogService],
  exports: [AdminMarketingService, AdminLogService],
})
export class AdminSystemModule {}
