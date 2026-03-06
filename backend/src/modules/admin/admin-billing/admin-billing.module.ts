import { Module } from "@nestjs/common";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { AdminLogService } from "../../../common/services/admin-log.service";
import { AdminAuthModule } from "../admin-auth/admin-auth.module";
import { AdminBillingController } from "./controllers/admin-billing.controller";
import { AdminOrdersController } from "./controllers/admin-orders.controller";
import { AdminRevenueController } from "./controllers/admin-revenue.controller";

@Module({
  imports: [AdminAuthModule],
  controllers: [AdminBillingController, AdminOrdersController, AdminRevenueController],
  providers: [PrismaService, AdminLogService],
  exports: [PrismaService],
})
export class AdminBillingModule {}
