import { Module } from "@nestjs/common";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { AdminLogService } from "../../../common/services/admin-log.service";
import { EmailModule } from "../../email/email.module";
import { AdminAuthModule } from "../admin-auth/admin-auth.module";
import { AdminMarketingService } from "./services/admin-marketing.service";
import { AdminMarketingController } from "../controllers/admin-marketing.controller";
import { AdminUsersController } from "./controllers/admin-users.controller";
import { AdminRegionsController } from "./controllers/admin-regions.controller";
import { AdminBrandingController } from "./controllers/admin-branding.controller";
import { AdminNotificationsController } from "./controllers/admin-notifications.controller";
import { AdminLogsController } from "./controllers/admin-logs.controller";
import { AdminUploadController } from "./controllers/admin-upload.controller";
import { AdminEmailController } from "./controllers/admin-email.controller";
import { AdminEmailJobsController } from "./controllers/admin-email-jobs.controller";
import { AdminSupportController } from "./controllers/admin-support.controller";
import { ConfigService } from "../services/config.service";

@Module({
  imports: [AdminAuthModule, EmailModule],
  controllers: [
    AdminMarketingController,
    AdminUsersController,
    AdminRegionsController,
    AdminBrandingController,
    AdminNotificationsController,
    AdminLogsController,
    AdminUploadController,
    AdminEmailController,
    AdminEmailJobsController,
    AdminSupportController,
  ],
  providers: [AdminMarketingService, PrismaService, AdminLogService, ConfigService],
  exports: [AdminMarketingService, AdminLogService, ConfigService],
})
export class AdminSystemModule {}
