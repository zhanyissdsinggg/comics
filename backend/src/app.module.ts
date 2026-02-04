import { Module } from "@nestjs/common";
import { AuthModule } from "./modules/auth/auth.module";
import { SeriesModule } from "./modules/series/series.module";
import { EpisodeModule } from "./modules/episode/episode.module";
import { EntitlementsModule } from "./modules/entitlements/entitlements.module";
import { WalletModule } from "./modules/wallet/wallet.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { CommentsModule } from "./modules/comments/comments.module";
import { RatingsModule } from "./modules/ratings/ratings.module";
import { ProgressModule } from "./modules/progress/progress.module";
import { SearchModule } from "./modules/search/search.module";
import { RankingsModule } from "./modules/rankings/rankings.module";
import { SubscriptionModule } from "./modules/subscription/subscription.module";
import { CouponsModule } from "./modules/coupons/coupons.module";
import { PromotionsModule } from "./modules/promotions/promotions.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { FollowModule } from "./modules/follow/follow.module";
import { RewardsModule } from "./modules/rewards/rewards.module";
import { MissionsModule } from "./modules/missions/missions.module";
import { AdminModule } from "./modules/admin/admin.module";
import { HealthController } from "./health.controller";
import { MetaController } from "./meta.controller";
import { EventsModule } from "./modules/events/events.module";
import { TrackingModule } from "./modules/tracking/tracking.module";
import { PreferencesModule } from "./modules/preferences/preferences.module";
import { SupportModule } from "./modules/support/support.module";
import { ReadingModule } from "./modules/reading/reading.module";
import { BillingModule } from "./modules/billing/billing.module";
import { BrandingModule } from "./modules/branding/branding.module";
import { EmailModule } from "./modules/email/email.module";
import { EmailService } from "./modules/email/email.service";
import { RegionsModule } from "./modules/regions/regions.module";
import { PrismaModule } from "./common/prisma/prisma.module";
import { StatsModule } from "./common/services/stats.module";

@Module({
  controllers: [HealthController, MetaController],
  imports: [
    PrismaModule,
    StatsModule,
    AuthModule,
    SeriesModule,
    EpisodeModule,
    EntitlementsModule,
    WalletModule,
    OrdersModule,
    PaymentsModule,
    NotificationsModule,
    CommentsModule,
    RatingsModule,
    ProgressModule,
    SearchModule,
    RankingsModule,
    SubscriptionModule,
    CouponsModule,
    PromotionsModule,
    FollowModule,
    RewardsModule,
    MissionsModule,
    AdminModule,
    EventsModule,
    TrackingModule,
    PreferencesModule,
    SupportModule,
    ReadingModule,
    BillingModule,
    BrandingModule,
    EmailModule,
    RegionsModule,
  ],
})
export class AppModule {
  constructor(private readonly emailService: EmailService) {
    this.emailService.startRetryLoop();
  }
}
