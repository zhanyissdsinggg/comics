import { Module } from "@nestjs/common";
import { PrismaService } from "../../../common/prisma/prisma.service";

/**
 * 老王说：管理员账单管理模块 - 处理所有账单和订单相关功能
 * 包括：billing, orders
 */
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AdminBillingModule {}
