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
exports.RewardsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let RewardsService = class RewardsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    getTodayKey() {
        return new Date().toISOString().slice(0, 10);
    }
    async getState(userId) {
        const state = await this.prisma.rewardState.findUnique({ where: { userId } });
        if (state) {
            return state;
        }
        return this.prisma.rewardState.create({
            data: { userId, lastCheckInDate: "", streakCount: 0, makeUpUsedToday: false },
        });
    }
    async checkIn(userId) {
        const state = await this.getState(userId);
        const today = this.getTodayKey();
        if (state.lastCheckInDate === today) {
            return { ok: false, error: "ALREADY_CHECKED_IN", state };
        }
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10);
        const nextStreak = state.lastCheckInDate === yesterday ? state.streakCount + 1 : 1;
        const updated = await this.prisma.rewardState.update({
            where: { userId },
            data: {
                lastCheckInDate: today,
                streakCount: Math.min(nextStreak, 7),
                makeUpUsedToday: false,
            },
        });
        return { ok: true, state: updated };
    }
    async makeUp(userId) {
        const state = await this.getState(userId);
        const today = this.getTodayKey();
        if (state.makeUpUsedToday) {
            return { ok: false, error: "MAKEUP_USED" };
        }
        const updated = await this.prisma.rewardState.update({
            where: { userId },
            data: {
                lastCheckInDate: today,
                streakCount: Math.min(Math.max(state.streakCount, 1) + 1, 7),
                makeUpUsedToday: true,
            },
        });
        return { ok: true, state: updated };
    }
};
exports.RewardsService = RewardsService;
exports.RewardsService = RewardsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RewardsService);
