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
exports.RewardsController = void 0;
const common_1 = require("@nestjs/common");
const rewards_service_1 = require("./rewards.service");
const auth_1 = require("../../common/utils/auth");
const errors_1 = require("../../common/utils/errors");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const STREAK_REWARDS = [10, 12, 14, 16, 18, 20, 30];
const MAKEUP_COST = 5;
let RewardsController = class RewardsController {
    constructor(rewardsService, prisma) {
        this.rewardsService = rewardsService;
        this.prisma = prisma;
    }
    async getState(req, res) {
        const userId = (0, auth_1.getUserIdFromRequest)(req, false);
        if (!userId) {
            res.status(401);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.UNAUTHENTICATED);
        }
        const state = await this.rewardsService.getState(userId);
        const rewardPts = STREAK_REWARDS[Math.max(0, Math.min(state.streakCount - 1, STREAK_REWARDS.length - 1))] || 0;
        return { ...state, rewardPts };
    }
    async checkIn(req, res) {
        const userId = (0, auth_1.getUserIdFromRequest)(req, false);
        if (!userId) {
            res.status(401);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.UNAUTHENTICATED);
        }
        const result = await this.rewardsService.checkIn(userId);
        if (!result.ok) {
            res.status(400);
            return (0, errors_1.buildError)(result.error || errors_1.ERROR_CODES.INTERNAL, { state: result.state });
        }
        const rewardPts = STREAK_REWARDS[Math.max(0, Math.min(result.state.streakCount - 1, STREAK_REWARDS.length - 1))] || 0;
        const wallet = await this.prisma.wallet.upsert({
            where: { userId },
            update: { bonusPts: { increment: rewardPts } },
            create: { userId, paidPts: 0, bonusPts: rewardPts, plan: "free" },
        });
        return { ok: true, rewardPts, wallet, state: result.state };
    }
    async makeUp(_body, req, res) {
        const userId = (0, auth_1.getUserIdFromRequest)(req, false);
        if (!userId) {
            res.status(401);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.UNAUTHENTICATED);
        }
        const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
        if (((wallet === null || wallet === void 0 ? void 0 : wallet.paidPts) || 0) < MAKEUP_COST) {
            res.status(402);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.INSUFFICIENT_POINTS, {
                shortfallPts: MAKEUP_COST - ((wallet === null || wallet === void 0 ? void 0 : wallet.paidPts) || 0),
            });
        }
        const result = await this.rewardsService.makeUp(userId);
        if (!result.ok) {
            res.status(400);
            return (0, errors_1.buildError)(result.error || errors_1.ERROR_CODES.INTERNAL);
        }
        const nextWallet = await this.prisma.wallet.update({
            where: { userId },
            data: { paidPts: { decrement: MAKEUP_COST } },
        });
        return { ok: true, wallet: nextWallet, state: result.state };
    }
};
exports.RewardsController = RewardsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RewardsController.prototype, "getState", null);
__decorate([
    (0, common_1.Post)("checkin"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RewardsController.prototype, "checkIn", null);
__decorate([
    (0, common_1.Post)("makeup"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], RewardsController.prototype, "makeUp", null);
exports.RewardsController = RewardsController = __decorate([
    (0, common_1.Controller)("rewards"),
    __metadata("design:paramtypes", [rewards_service_1.RewardsService,
        prisma_service_1.PrismaService])
], RewardsController);
