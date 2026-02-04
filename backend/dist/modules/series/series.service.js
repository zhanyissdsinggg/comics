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
exports.SeriesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let SeriesService = class SeriesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    toSeriesView(series) {
        return {
            id: series.id,
            title: series.title,
            type: series.type,
            adult: series.adult,
            coverTone: series.coverTone || "",
            coverUrl: series.coverUrl || "",
            badge: series.badge || "",
            badges: Array.isArray(series.badges) && series.badges.length
                ? series.badges
                : series.badge
                    ? [series.badge]
                    : [],
            latest: series.latestEpisodeId ? `Ep ${series.latestEpisodeId}` : "",
            latestEpisodeId: series.latestEpisodeId || "",
            genres: Array.isArray(series.genres) ? series.genres : [],
            status: series.status || "Ongoing",
            rating: series.rating || 0,
            ratingCount: series.ratingCount || 0,
            description: series.description || "",
            pricing: {
                currency: "POINTS",
                episodePrice: series.episodePrice || 0,
                discount: 0,
            },
            ttf: {
                enabled: Boolean(series.ttfEnabled),
                intervalHours: series.ttfIntervalHours || 24,
            },
        };
    }
    applyTtfAcceleration(episode, series, subscription) {
        var _a;
        if (!episode.ttfEligible || !episode.ttfReadyAt) {
            return episode;
        }
        const multiplier = (_a = subscription === null || subscription === void 0 ? void 0 : subscription.perks) === null || _a === void 0 ? void 0 : _a.ttfMultiplier;
        if (!multiplier || multiplier >= 1) {
            return episode;
        }
        const releasedAtMs = new Date(episode.releasedAt).getTime();
        if (Number.isNaN(releasedAtMs)) {
            return episode;
        }
        const intervalHours = (series === null || series === void 0 ? void 0 : series.ttfIntervalHours) || 24;
        const baseReadyAtMs = releasedAtMs + intervalHours * 60 * 60 * 1000;
        const acceleratedReadyAtMs = releasedAtMs + intervalHours * multiplier * 60 * 60 * 1000;
        const originalReadyAtMs = new Date(episode.ttfReadyAt).getTime();
        const targetReadyAtMs = Number.isNaN(originalReadyAtMs)
            ? Math.min(baseReadyAtMs, acceleratedReadyAtMs)
            : Math.min(originalReadyAtMs, acceleratedReadyAtMs);
        return {
            ...episode,
            ttfReadyAt: new Date(targetReadyAtMs),
        };
    }
    async list(adult) {
        const where = adult === null ? {} : { adult };
        const list = await this.prisma.series.findMany({
            where,
            orderBy: { title: "asc" },
        });
        return list.map((item) => this.toSeriesView(item));
    }
    async detail(seriesId, subscription) {
        const series = await this.prisma.series.findUnique({
            where: { id: seriesId },
        });
        if (!series) {
            return null;
        }
        const episodes = await this.prisma.episode.findMany({
            where: { seriesId },
            orderBy: { number: "asc" },
        });
        const mappedEpisodes = episodes.map((ep) => ({
            id: ep.id,
            seriesId: ep.seriesId,
            number: ep.number,
            title: ep.title,
            releasedAt: ep.releasedAt,
            pricePts: ep.pricePts,
            ttfEligible: ep.ttfEligible,
            ttfReadyAt: ep.ttfReadyAt,
            previewFreePages: ep.previewFreePages,
        }));
        const accelerated = subscription
            ? mappedEpisodes.map((ep) => this.applyTtfAcceleration(ep, series, subscription))
            : mappedEpisodes;
        return { series: this.toSeriesView(series), episodes: accelerated };
    }
};
exports.SeriesService = SeriesService;
exports.SeriesService = SeriesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SeriesService);
