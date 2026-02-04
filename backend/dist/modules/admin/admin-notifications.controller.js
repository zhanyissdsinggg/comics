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
exports.AdminNotificationsController = void 0;
const common_1 = require("@nestjs/common");
const admin_1 = require("../../common/utils/admin");
const errors_1 = require("../../common/utils/errors");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let AdminNotificationsController = class AdminNotificationsController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(req, res) {
        if (!(0, admin_1.isAdminAuthorized)(req)) {
            res.status(403);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.FORBIDDEN);
        }
        const notifications = await this.prisma.notification.findMany({
            orderBy: { createdAt: "desc" },
        });
        return { notifications };
    }
    async create(body, req, res) {
        if (!(0, admin_1.isAdminAuthorized)(req, body)) {
            res.status(403);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.FORBIDDEN);
        }
        const payload = (body === null || body === void 0 ? void 0 : body.notification) || body || {};
        if (!payload.title) {
            res.status(400);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.INVALID_REQUEST);
        }
        if (payload.broadcast) {
            const users = await this.prisma.user.findMany({ select: { id: true } });
            await this.prisma.notification.createMany({
                data: users.map((user) => ({
                    id: `N_${user.id}_${Date.now()}`,
                    userId: user.id,
                    type: payload.type || "PROMO",
                    title: payload.title,
                    message: payload.message || "",
                    seriesId: payload.seriesId || null,
                    episodeId: payload.episodeId || null,
                    read: false,
                    createdAt: new Date(),
                })),
            });
            return { ok: true, count: users.length };
        }
        const userId = payload.userId;
        if (!userId) {
            res.status(400);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.INVALID_REQUEST);
        }
        const notification = await this.prisma.notification.create({
            data: {
                id: `N_${userId}_${Date.now()}`,
                userId,
                type: payload.type || "PROMO",
                title: payload.title,
                message: payload.message || "",
                seriesId: payload.seriesId || null,
                episodeId: payload.episodeId || null,
                read: false,
                createdAt: new Date(),
            },
        });
        return { notification };
    }
};
exports.AdminNotificationsController = AdminNotificationsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminNotificationsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminNotificationsController.prototype, "create", null);
exports.AdminNotificationsController = AdminNotificationsController = __decorate([
    (0, common_1.Controller)("admin/notifications"),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminNotificationsController);
