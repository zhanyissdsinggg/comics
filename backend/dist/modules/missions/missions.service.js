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
exports.MissionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const DEFAULT_STATE = {
    daily: [
        {
            id: "daily_read",
            title: "Read 1 episode",
            desc: "Read any episode",
            progress: 0,
            target: 1,
            reward: 5,
            claimed: false,
        },
        {
            id: "daily_follow",
            title: "Follow 1 series",
            desc: "Follow any series",
            progress: 0,
            target: 1,
            reward: 5,
            claimed: false,
        },
        {
            id: "daily_share",
            title: "Share 1 series",
            desc: "Share any series",
            progress: 0,
            target: 1,
            reward: 5,
            claimed: false,
        },
    ],
    weekly: [
        {
            id: "weekly_read",
            title: "Read 10 episodes",
            desc: "Read 10 episodes",
            progress: 0,
            target: 10,
            reward: 30,
            claimed: false,
        },
        {
            id: "weekly_unlock",
            title: "Unlock 3 episodes",
            desc: "Unlock 3 episodes",
            progress: 0,
            target: 3,
            reward: 20,
            claimed: false,
        },
    ],
};
let MissionsService = class MissionsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    cloneDefault() {
        return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
    async list(userId) {
        const state = await this.prisma.missionState.findUnique({ where: { userId } });
        if (state) {
            return state.payload;
        }
        const payload = this.cloneDefault();
        await this.prisma.missionState.create({
            data: { userId, payload },
        });
        return payload;
    }
    async report(userId, eventType) {
        const payload = await this.list(userId);
        if (eventType === "READ_EPISODE") {
            payload.daily[0].progress = Math.min(payload.daily[0].target, payload.daily[0].progress + 1);
            payload.weekly[0].progress = Math.min(payload.weekly[0].target, payload.weekly[0].progress + 1);
        }
        if (eventType === "FOLLOW_SERIES") {
            payload.daily[1].progress = Math.min(payload.daily[1].target, payload.daily[1].progress + 1);
        }
        if (eventType === "SHARE_SERIES") {
            payload.daily[2].progress = Math.min(payload.daily[2].target, payload.daily[2].progress + 1);
        }
        if (eventType === "UNLOCK_EPISODE") {
            payload.weekly[1].progress = Math.min(payload.weekly[1].target, payload.weekly[1].progress + 1);
        }
        await this.prisma.missionState.upsert({
            where: { userId },
            update: { payload },
            create: { userId, payload },
        });
        return payload;
    }
    async claim(userId, missionId) {
        const payload = await this.list(userId);
        const all = [...payload.daily, ...payload.weekly];
        const target = all.find((item) => item.id === missionId);
        if (!target) {
            return { ok: false, error: "MISSION_NOT_FOUND" };
        }
        if (target.claimed || target.progress < target.target) {
            return { ok: false, error: "MISSION_NOT_READY" };
        }
        target.claimed = true;
        await this.prisma.missionState.upsert({
            where: { userId },
            update: { payload },
            create: { userId, payload },
        });
        return { ok: true, reward: target.reward, state: payload };
    }
};
exports.MissionsService = MissionsService;
exports.MissionsService = MissionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MissionsService);
