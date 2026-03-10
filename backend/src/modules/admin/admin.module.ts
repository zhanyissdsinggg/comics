import { Module } from "@nestjs/common";
import { AdminAnalyticsModule } from "./admin-analytics/admin-analytics.module";
import { AdminAuthModule } from "./admin-auth/admin-auth.module";
import { AdminBillingModule } from "./admin-billing/admin-billing.module";
import { AdminContentModule } from "./admin-content/admin-content.module";
import { AdminSystemModule } from "./admin-system/admin-system.module";

@Module({
  imports: [
    AdminAuthModule,
    AdminAnalyticsModule,
    AdminContentModule,
    AdminBillingModule,
    AdminSystemModule,
  ],
})
export class AdminModule {}
