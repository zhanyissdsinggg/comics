"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const auth_module_1 = require("./modules/auth/auth.module");
const series_module_1 = require("./modules/series/series.module");
const episode_module_1 = require("./modules/episode/episode.module");
const entitlements_module_1 = require("./modules/entitlements/entitlements.module");
const wallet_module_1 = require("./modules/wallet/wallet.module");
const orders_module_1 = require("./modules/orders/orders.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const comments_module_1 = require("./modules/comments/comments.module");
const ratings_module_1 = require("./modules/ratings/ratings.module");
const progress_module_1 = require("./modules/progress/progress.module");
const search_module_1 = require("./modules/search/search.module");
const rankings_module_1 = require("./modules/rankings/rankings.module");
const subscription_module_1 = require("./modules/subscription/subscription.module");
const coupons_module_1 = require("./modules/coupons/coupons.module");
const promotions_module_1 = require("./modules/promotions/promotions.module");
const payments_module_1 = require("./modules/payments/payments.module");
const follow_module_1 = require("./modules/follow/follow.module");
const rewards_module_1 = require("./modules/rewards/rewards.module");
const missions_module_1 = require("./modules/missions/missions.module");
const admin_module_1 = require("./modules/admin/admin.module");
const health_controller_1 = require("./health.controller");
const meta_controller_1 = require("./meta.controller");
const events_module_1 = require("./modules/events/events.module");
const tracking_module_1 = require("./modules/tracking/tracking.module");
const preferences_module_1 = require("./modules/preferences/preferences.module");
const support_module_1 = require("./modules/support/support.module");
const reading_module_1 = require("./modules/reading/reading.module");
const billing_module_1 = require("./modules/billing/billing.module");
const branding_module_1 = require("./modules/branding/branding.module");
const email_module_1 = require("./modules/email/email.module");
const email_service_1 = require("./modules/email/email.service");
const regions_module_1 = require("./modules/regions/regions.module");
const prisma_module_1 = require("./common/prisma/prisma.module");
const stats_module_1 = require("./common/services/stats.module");
let AppModule = class AppModule {
    constructor(emailService) {
        this.emailService = emailService;
        this.emailService.startRetryLoop();
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        controllers: [health_controller_1.HealthController, meta_controller_1.MetaController],
        imports: [
            prisma_module_1.PrismaModule,
            stats_module_1.StatsModule,
            auth_module_1.AuthModule,
            series_module_1.SeriesModule,
            episode_module_1.EpisodeModule,
            entitlements_module_1.EntitlementsModule,
            wallet_module_1.WalletModule,
            orders_module_1.OrdersModule,
            payments_module_1.PaymentsModule,
            notifications_module_1.NotificationsModule,
            comments_module_1.CommentsModule,
            ratings_module_1.RatingsModule,
            progress_module_1.ProgressModule,
            search_module_1.SearchModule,
            rankings_module_1.RankingsModule,
            subscription_module_1.SubscriptionModule,
            coupons_module_1.CouponsModule,
            promotions_module_1.PromotionsModule,
            follow_module_1.FollowModule,
            rewards_module_1.RewardsModule,
            missions_module_1.MissionsModule,
            admin_module_1.AdminModule,
            events_module_1.EventsModule,
            tracking_module_1.TrackingModule,
            preferences_module_1.PreferencesModule,
            support_module_1.SupportModule,
            reading_module_1.ReadingModule,
            billing_module_1.BillingModule,
            branding_module_1.BrandingModule,
            email_module_1.EmailModule,
            regions_module_1.RegionsModule,
        ],
    }),
    __metadata("design:paramtypes", [email_service_1.EmailService])
], AppModule);
