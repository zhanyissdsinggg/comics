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
exports.AdminLogsController = void 0;
const common_1 = require("@nestjs/common");
const admin_1 = require("../../common/utils/admin");
const errors_1 = require("../../common/utils/errors");
const admin_log_service_1 = require("../../common/services/admin-log.service");
let AdminLogsController = class AdminLogsController {
    constructor(adminLogService) {
        this.adminLogService = adminLogService;
    }
    async query(query, req, res) {
        if (!(0, admin_1.isAdminAuthorized)(req)) {
            res.status(403);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.FORBIDDEN);
        }
        const filters = {};
        if (query.action) {
            filters.action = query.action;
        }
        if (query.resource) {
            filters.resource = query.resource;
        }
        if (query.adminId) {
            filters.adminId = query.adminId;
        }
        if (query.startDate) {
            filters.startDate = new Date(query.startDate);
        }
        if (query.endDate) {
            filters.endDate = new Date(query.endDate);
        }
        const page = parseInt(query.page) || 1;
        const pageSize = parseInt(query.pageSize) || 50;
        const result = await this.adminLogService.query(filters, page, pageSize);
        return result;
    }
};
exports.AdminLogsController = AdminLogsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminLogsController.prototype, "query", null);
exports.AdminLogsController = AdminLogsController = __decorate([
    (0, common_1.Controller)("admin/logs"),
    __metadata("design:paramtypes", [admin_log_service_1.AdminLogService])
], AdminLogsController);
