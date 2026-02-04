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
exports.AdminTrackingController = void 0;
const common_1 = require("@nestjs/common");
const admin_1 = require("../../common/utils/admin");
const errors_1 = require("../../common/utils/errors");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let AdminTrackingController = class AdminTrackingController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getConfig(req, res) {
        if (!(0, admin_1.isAdminAuthorized)(req)) {
            res.status(403);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.FORBIDDEN);
        }
        const config = await this.prisma.trackingConfig.findUnique({
            where: { key: "default" },
        });
        return { config: (config === null || config === void 0 ? void 0 : config.payload) || { values: {}, updatedAt: null } };
    }
    async save(body, req, res) {
        if (!(0, admin_1.isAdminAuthorized)(req, body)) {
            res.status(403);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.FORBIDDEN);
        }
        const values = (body === null || body === void 0 ? void 0 : body.values) || {};
        const payload = { values, updatedAt: new Date().toISOString() };
        const config = await this.prisma.trackingConfig.upsert({
            where: { key: "default" },
            update: { payload },
            create: { key: "default", payload },
        });
        return { config: config.payload };
    }
};
exports.AdminTrackingController = AdminTrackingController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminTrackingController.prototype, "getConfig", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminTrackingController.prototype, "save", null);
exports.AdminTrackingController = AdminTrackingController = __decorate([
    (0, common_1.Controller)("admin/tracking"),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminTrackingController);
