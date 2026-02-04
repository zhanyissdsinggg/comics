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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminStatsController = void 0;
const common_1 = require("@nestjs/common");
const admin_1 = require("../../common/utils/admin");
const errors_1 = require("../../common/utils/errors");
const stats_service_1 = require("../../common/services/stats.service");
let AdminStatsController = class AdminStatsController {
    constructor(statsService) {
        this.statsService = statsService;
    }
    async list(from, to, req, res) {
        if (!(0, admin_1.isAdminAuthorized)(req)) {
            res.status(403);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.FORBIDDEN);
        }
        const stats = await this.statsService.getDailyStats(from, to);
        const summary = stats.reduce((acc, item) => {
            acc.totalViews += item.views;
            acc.totalRegistrations += item.registrations;
            acc.totalDau += item.dau;
            acc.totalPaidOrders += item.paidOrders || 0;
            return acc;
        }, { totalViews: 0, totalRegistrations: 0, totalDau: 0, totalPaidOrders: 0 });
        const avgDau = stats.length > 0 ? Math.round(summary.totalDau / stats.length) : 0;
        return {
            stats,
            summary: {
                totalViews: summary.totalViews,
                totalRegistrations: summary.totalRegistrations,
                avgDau,
                totalPaidOrders: summary.totalPaidOrders,
            },
        };
    }
};
exports.AdminStatsController = AdminStatsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)("from")),
    __param(1, (0, common_1.Query)("to")),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminStatsController.prototype, "list", null);
exports.AdminStatsController = AdminStatsController = __decorate([
    (0, common_1.Controller)("admin/stats"),
    __metadata("design:paramtypes", [stats_service_1.StatsService])
], AdminStatsController);
