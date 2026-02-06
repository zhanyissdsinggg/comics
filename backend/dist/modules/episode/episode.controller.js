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
exports.EpisodeController = void 0;
const common_1 = require("@nestjs/common");
const episode_service_1 = require("./episode.service");
const adult_gate_1 = require("../../common/utils/adult-gate");
const errors_1 = require("../../common/utils/errors");
const auth_1 = require("../../common/utils/auth");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const stats_service_1 = require("../../common/services/stats.service");
let EpisodeController = class EpisodeController {
    constructor(episodeService, prisma, statsService) {
        this.episodeService = episodeService;
        this.prisma = prisma;
        this.statsService = statsService;
    }
    async getEpisode(seriesId, episodeId, req, res) {
        var _a;
        const series = await this.prisma.series.findUnique({ where: { id: seriesId } });
        if (!series) {
            res.status(404);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.NOT_FOUND);
        }
        if (series === null || series === void 0 ? void 0 : series.adult) {
            const gate = (0, adult_gate_1.checkAdultGate)(req.cookies || {});
            if (!gate.ok) {
                res.status(403);
                return (0, errors_1.buildError)(errors_1.ERROR_CODES.ADULT_GATED, { reason: gate.reason });
            }
        }
        const userId = (0, auth_1.getUserIdFromRequest)(req, false);
        let hasAccess = false;
        if (userId) {
            const entitlement = await this.prisma.entitlement.findUnique({
                where: {
                    userId_episodeId: {
                        userId,
                        episodeId,
                    },
                },
            });
            hasAccess = !!entitlement;
        }
        const payload = await this.episodeService.getEpisode(seriesId, episodeId);
        if (!payload) {
            res.status(404);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.NOT_FOUND);
        }
        if (!hasAccess && ((_a = payload.episode) === null || _a === void 0 ? void 0 : _a.pages) && Array.isArray(payload.episode.pages)) {
            const previewCount = 3;
            payload.episode.pages = payload.episode.pages.slice(0, previewCount);
            payload.episode.isPreview = true;
            payload.episode.previewCount = previewCount;
        }
        await this.statsService.recordSeriesView(userId, seriesId);
        if ((series === null || series === void 0 ? void 0 : series.type) === "comic") {
            await this.statsService.recordComicView(userId);
        }
        return payload;
    }
};
exports.EpisodeController = EpisodeController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)("seriesId")),
    __param(1, (0, common_1.Query)("episodeId")),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], EpisodeController.prototype, "getEpisode", null);
exports.EpisodeController = EpisodeController = __decorate([
    (0, common_1.Controller)("episode"),
    __metadata("design:paramtypes", [episode_service_1.EpisodeService,
        prisma_service_1.PrismaService,
        stats_service_1.StatsService])
], EpisodeController);
