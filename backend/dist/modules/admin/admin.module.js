"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModule = void 0;
const common_1 = require("@nestjs/common");
const email_module_1 = require("../email/email.module");
const admin_series_controller_1 = require("./admin-series.controller");
const admin_promotions_controller_1 = require("./admin-promotions.controller");
const admin_orders_controller_1 = require("./admin-orders.controller");
const admin_notifications_controller_1 = require("./admin-notifications.controller");
const admin_comments_controller_1 = require("./admin-comments.controller");
const admin_users_controller_1 = require("./admin-users.controller");
const admin_stats_controller_1 = require("./admin-stats.controller");
const admin_rankings_controller_1 = require("./admin-rankings.controller");
const admin_tracking_controller_1 = require("./admin-tracking.controller");
const admin_billing_controller_1 = require("./admin-billing.controller");
const admin_metrics_controller_1 = require("./admin-metrics.controller");
const admin_branding_controller_1 = require("./admin-branding.controller");
const admin_email_controller_1 = require("./admin-email.controller");
const admin_email_jobs_controller_1 = require("./admin-email-jobs.controller");
const admin_regions_controller_1 = require("./admin-regions.controller");
const admin_middleware_1 = require("./admin.middleware");
let AdminModule = class AdminModule {
    configure(consumer) {
        consumer
            .apply(admin_middleware_1.AdminKeyMiddleware)
            .forRoutes(admin_series_controller_1.AdminSeriesController, admin_promotions_controller_1.AdminPromotionsController, admin_orders_controller_1.AdminOrdersController, admin_notifications_controller_1.AdminNotificationsController, admin_comments_controller_1.AdminCommentsController, admin_users_controller_1.AdminUsersController, admin_stats_controller_1.AdminStatsController, admin_rankings_controller_1.AdminRankingsController, admin_tracking_controller_1.AdminTrackingController, admin_billing_controller_1.AdminBillingController, admin_metrics_controller_1.AdminMetricsController, admin_branding_controller_1.AdminBrandingController, admin_email_controller_1.AdminEmailController, admin_email_jobs_controller_1.AdminEmailJobsController, admin_regions_controller_1.AdminRegionsController);
    }
};
exports.AdminModule = AdminModule;
exports.AdminModule = AdminModule = __decorate([
    (0, common_1.Module)({
        imports: [email_module_1.EmailModule],
        controllers: [
            admin_series_controller_1.AdminSeriesController,
            admin_promotions_controller_1.AdminPromotionsController,
            admin_orders_controller_1.AdminOrdersController,
            admin_notifications_controller_1.AdminNotificationsController,
            admin_comments_controller_1.AdminCommentsController,
            admin_users_controller_1.AdminUsersController,
            admin_stats_controller_1.AdminStatsController,
            admin_rankings_controller_1.AdminRankingsController,
            admin_tracking_controller_1.AdminTrackingController,
            admin_billing_controller_1.AdminBillingController,
            admin_metrics_controller_1.AdminMetricsController,
            admin_branding_controller_1.AdminBrandingController,
            admin_email_controller_1.AdminEmailController,
            admin_email_jobs_controller_1.AdminEmailJobsController,
            admin_regions_controller_1.AdminRegionsController,
        ],
    })
], AdminModule);
