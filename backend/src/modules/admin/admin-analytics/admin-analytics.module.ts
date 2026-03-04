import { Module } from "@nestjs/common";
import { AdminAnalyticsService } from "./services/admin-analytics.service";
import { PrismaService } from "../../../common/prisma/prisma.service";

/**
 * 老王说：管理员数据分析模块 - 处理所有数据统计和分析功能
 * 包括：analytics, stats, metrics, rankings, tracking
 */
@Module({
  providers: [AdminAnalyticsService, PrismaService],
  exports: [AdminAnalyticsService],
})
export class AdminAnalyticsModule {}
