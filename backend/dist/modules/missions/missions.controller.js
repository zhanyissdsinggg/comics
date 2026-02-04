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
exports.MissionsController = void 0;
const common_1 = require("@nestjs/common");
const missions_service_1 = require("./missions.service");
const auth_1 = require("../../common/utils/auth");
const errors_1 = require("../../common/utils/errors");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let MissionsController = class MissionsController {
    constructor(missionsService, prisma) {
        this.missionsService = missionsService;
        this.prisma = prisma;
    }
    async list(req, res) {
        const userId = (0, auth_1.getUserIdFromRequest)(req, false);
        if (!userId) {
            res.status(401);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.UNAUTHENTICATED);
        }
        const state = await this.missionsService.list(userId);
        return { daily: state.daily, weekly: state.weekly };
    }
    async report(body, req, res) {
        const userId = (0, auth_1.getUserIdFromRequest)(req, false);
        if (!userId) {
            res.status(401);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.UNAUTHENTICATED);
        }
        const eventType = body === null || body === void 0 ? void 0 : body.eventType;
        if (!eventType) {
            res.status(400);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.INVALID_REQUEST);
        }
        const state = await this.missionsService.report(userId, eventType);
        return { daily: state.daily, weekly: state.weekly };
    }
    async claim(body, req, res) {
        const userId = (0, auth_1.getUserIdFromRequest)(req, false);
        if (!userId) {
            res.status(401);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.UNAUTHENTICATED);
        }
        const missionId = body === null || body === void 0 ? void 0 : body.missionId;
        if (!missionId) {
            res.status(400);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.INVALID_REQUEST);
        }
        const result = await this.missionsService.claim(userId, missionId);
        if (!result.ok) {
            res.status(400);
            return (0, errors_1.buildError)(result.error || errors_1.ERROR_CODES.INTERNAL);
        }
        const wallet = await this.prisma.wallet.upsert({
            where: { userId },
            update: { bonusPts: { increment: result.reward } },
            create: { userId, paidPts: 0, bonusPts: result.reward, plan: "free" },
        });
        return {
            ok: true,
            reward: result.reward,
            wallet,
            daily: result.state.daily,
            weekly: result.state.weekly,
        };
    }
};
exports.MissionsController = MissionsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MissionsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)("report"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], MissionsController.prototype, "report", null);
__decorate([
    (0, common_1.Post)("claim"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], MissionsController.prototype, "claim", null);
exports.MissionsController = MissionsController = __decorate([
    (0, common_1.Controller)("missions"),
    __metadata("design:paramtypes", [missions_service_1.MissionsService,
        prisma_service_1.PrismaService])
], MissionsController);
