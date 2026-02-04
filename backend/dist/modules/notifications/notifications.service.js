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
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const subscription_1 = require("../../common/utils/subscription");
let NotificationsService = class NotificationsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    applyTtfAcceleration(episode, series, subscription) {
        var _a;
        if (!(episode === null || episode === void 0 ? void 0 : episode.ttfEligible)) {
            return null;
        }
        const readyAtMs = episode.ttfReadyAt ? new Date(episode.ttfReadyAt).getTime() : NaN;
        if (!episode.releasedAt) {
            return Number.isNaN(readyAtMs) ? null : readyAtMs;
        }
        const multiplier = (_a = subscription === null || subscription === void 0 ? void 0 : subscription.perks) === null || _a === void 0 ? void 0 : _a.ttfMultiplier;
        if (!multiplier || multiplier >= 1) {
            return Number.isNaN(readyAtMs) ? null : readyAtMs;
        }
        const releasedAtMs = new Date(episode.releasedAt).getTime();
        if (Number.isNaN(releasedAtMs)) {
            return Number.isNaN(readyAtMs) ? null : readyAtMs;
        }
        const intervalHours = (series === null || series === void 0 ? void 0 : series.ttfIntervalHours) || 24;
        const baseReadyAtMs = releasedAtMs + intervalHours * 60 * 60 * 1000;
        const acceleratedReadyAtMs = releasedAtMs + intervalHours * multiplier * 60 * 60 * 1000;
        const fallbackReadyAtMs = Number.isNaN(readyAtMs) ? baseReadyAtMs : readyAtMs;
        return Math.min(fallbackReadyAtMs, acceleratedReadyAtMs);
    }
    buildPayload(payload) {
        return {
            id: payload.id,
            userId: payload.userId,
            type: payload.type,
            title: payload.title,
            message: payload.message,
            seriesId: payload.seriesId || null,
            episodeId: payload.episodeId || null,
            read: false,
            createdAt: payload.createdAt ? new Date(payload.createdAt) : new Date(),
        };
    }
    async list(userId) {
        const followed = await this.prisma.follow.findMany({
            where: { userId },
            select: { seriesId: true },
        });
        const nextPayloads = [];
        const seriesIds = followed.map((row) => row.seriesId);
        const seriesList = seriesIds.length
            ? await this.prisma.series.findMany({
                where: { id: { in: seriesIds } },
                select: {
                    id: true,
                    title: true,
                    ttfEnabled: true,
                    ttfIntervalHours: true,
                },
            })
            : [];
        const subscription = await (0, subscription_1.getSubscriptionPayload)(this.prisma, userId);
        for (const series of seriesList) {
            const latestEpisode = await this.prisma.episode.findFirst({
                where: { seriesId: series.id },
                orderBy: { number: "desc" },
            });
            if (!latestEpisode) {
                continue;
            }
            const id = `NEW_EPISODE_${series.id}_${latestEpisode.id}`;
            nextPayloads.push({
                id,
                userId,
                type: "NEW_EPISODE",
                title: `${series.title} updated`,
                message: `${latestEpisode.title} is now available.`,
                seriesId: series.id,
                episodeId: latestEpisode.id,
                createdAt: latestEpisode.releasedAt,
            });
            if (latestEpisode.ttfEligible) {
                const readyAtMs = this.applyTtfAcceleration(latestEpisode, series, subscription);
                if (readyAtMs && readyAtMs <= Date.now()) {
                    const ttfId = `TTF_READY_${series.id}_${latestEpisode.id}`;
                    nextPayloads.push({
                        id: ttfId,
                        userId,
                        type: "TTF_READY",
                        title: `${series.title} free claim`,
                        message: `${latestEpisode.title} is ready to claim.`,
                        seriesId: series.id,
                        episodeId: latestEpisode.id,
                        createdAt: new Date(readyAtMs).toISOString(),
                    });
                }
            }
        }
        const promotions = await this.prisma.promotion.findMany({ where: { active: true } });
        promotions.forEach((promo) => {
            const id = `PROMO_${promo.id}`;
            nextPayloads.push({
                id,
                userId,
                type: "PROMO",
                title: promo.title,
                message: promo.description,
                createdAt: new Date().toISOString(),
            });
        });
        if (nextPayloads.length > 0) {
            await Promise.all(nextPayloads.map((payload) => this.prisma.notification.upsert({
                where: { id: payload.id },
                update: {},
                create: this.buildPayload(payload),
            })));
        }
        return this.prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });
    }
    async markRead(userId, notificationIds) {
        await this.prisma.notification.updateMany({
            where: { userId, id: { in: notificationIds } },
            data: { read: true },
        });
        return this.prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationsService);
