import { Module } from "@nestjs/common";
import { AdminRecommendationService } from "./services/admin-recommendation.service";
import { PrismaService } from "../../../common/prisma/prisma.service";

/**
 * 老王说：管理员内容管理模块 - 处理所有内容相关功能
 * 包括：series, episodes, comments, promotions
 */
@Module({
  providers: [AdminRecommendationService, PrismaService],
  exports: [AdminRecommendationService],
})
export class AdminContentModule {}
