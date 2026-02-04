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
exports.AdminRankingsController = void 0;
const common_1 = require("@nestjs/common");
const admin_1 = require("../../common/utils/admin");
const errors_1 = require("../../common/utils/errors");
const stats_service_1 = require("../../common/services/stats.service");
function getRange(range) {
    const today = new Date();
    const end = today.toISOString().slice(0, 10);
    if (range === "week") {
        const start = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10);
        return { from: start, to: end };
    }
    if (range === "month") {
        const start = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10);
        return { from: start, to: end };
    }
    return { from: end, to: end };
}
let AdminRankingsController = class AdminRankingsController {
    constructor(statsService) {
        this.statsService = statsService;
    }
    async list(range, type, limit, req, res) {
        if (!(0, admin_1.isAdminAuthorized)(req)) {
            res.status(403);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.FORBIDDEN);
        }
        const { from, to } = getRange(range);
        const size = Number(limit || 10);
        const list = await this.statsService.getTopSeries(from, to, type || "all", size);
        return { range: range || "day", from, to, list };
    }
};
exports.AdminRankingsController = AdminRankingsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)("range")),
    __param(1, (0, common_1.Query)("type")),
    __param(2, (0, common_1.Query)("limit")),
    __param(3, (0, common_1.Req)()),
    __param(4, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminRankingsController.prototype, "list", null);
exports.AdminRankingsController = AdminRankingsController = __decorate([
    (0, common_1.Controller)("admin/rankings"),
    __metadata("design:paramtypes", [stats_service_1.StatsService])
], AdminRankingsController);
