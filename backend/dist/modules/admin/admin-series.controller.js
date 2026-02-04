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
exports.AdminSeriesController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const adm_zip_1 = require("adm-zip");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const admin_1 = require("../../common/utils/admin");
const errors_1 = require("../../common/utils/errors");
function extractNumber(name) {
    const match = name.match(/(\d+)/);
    return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}
function sortByName(a, b) {
    const aNum = extractNumber(a);
    const bNum = extractNumber(b);
    if (aNum !== bNum) {
        return aNum - bNum;
    }
    return a.localeCompare(b, "en", { numeric: true, sensitivity: "base" });
}
function toChapterTitle(filename) {
    return filename.replace(/\.zip$/i, "").trim();
}
let AdminSeriesController = class AdminSeriesController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    toSeriesPayload(input, existing) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7;
        const pricing = (input === null || input === void 0 ? void 0 : input.pricing) || {};
        const ttf = (input === null || input === void 0 ? void 0 : input.ttf) || {};
        const genres = Array.isArray(input === null || input === void 0 ? void 0 : input.genres) ? input.genres : (existing === null || existing === void 0 ? void 0 : existing.genres) || [];
        const badges = Array.isArray(input === null || input === void 0 ? void 0 : input.badges)
            ? input.badges
            : (input === null || input === void 0 ? void 0 : input.badge)
                ? [input.badge]
                : (existing === null || existing === void 0 ? void 0 : existing.badges) || [];
        return {
            id: input.id || (existing === null || existing === void 0 ? void 0 : existing.id),
            title: (_b = (_a = input.title) !== null && _a !== void 0 ? _a : existing === null || existing === void 0 ? void 0 : existing.title) !== null && _b !== void 0 ? _b : "",
            type: (_d = (_c = input.type) !== null && _c !== void 0 ? _c : existing === null || existing === void 0 ? void 0 : existing.type) !== null && _d !== void 0 ? _d : "comic",
            adult: (_f = (_e = input.adult) !== null && _e !== void 0 ? _e : existing === null || existing === void 0 ? void 0 : existing.adult) !== null && _f !== void 0 ? _f : false,
            genres,
            coverTone: (_h = (_g = input.coverTone) !== null && _g !== void 0 ? _g : existing === null || existing === void 0 ? void 0 : existing.coverTone) !== null && _h !== void 0 ? _h : "",
            coverUrl: (_k = (_j = input.coverUrl) !== null && _j !== void 0 ? _j : existing === null || existing === void 0 ? void 0 : existing.coverUrl) !== null && _k !== void 0 ? _k : "",
            badge: (_m = (_l = input.badge) !== null && _l !== void 0 ? _l : existing === null || existing === void 0 ? void 0 : existing.badge) !== null && _m !== void 0 ? _m : "",
            badges,
            status: (_p = (_o = input.status) !== null && _o !== void 0 ? _o : existing === null || existing === void 0 ? void 0 : existing.status) !== null && _p !== void 0 ? _p : "Ongoing",
            rating: (_r = (_q = input.rating) !== null && _q !== void 0 ? _q : existing === null || existing === void 0 ? void 0 : existing.rating) !== null && _r !== void 0 ? _r : 0,
            ratingCount: (_t = (_s = input.ratingCount) !== null && _s !== void 0 ? _s : existing === null || existing === void 0 ? void 0 : existing.ratingCount) !== null && _t !== void 0 ? _t : 0,
            description: (_v = (_u = input.description) !== null && _u !== void 0 ? _u : existing === null || existing === void 0 ? void 0 : existing.description) !== null && _v !== void 0 ? _v : "",
            episodePrice: (_z = (_y = (_x = (_w = input === null || input === void 0 ? void 0 : input.pricing) === null || _w === void 0 ? void 0 : _w.episodePrice) !== null && _x !== void 0 ? _x : input.episodePrice) !== null && _y !== void 0 ? _y : existing === null || existing === void 0 ? void 0 : existing.episodePrice) !== null && _z !== void 0 ? _z : 0,
            ttfEnabled: (_2 = (_1 = (_0 = ttf.enabled) !== null && _0 !== void 0 ? _0 : input.ttfEnabled) !== null && _1 !== void 0 ? _1 : existing === null || existing === void 0 ? void 0 : existing.ttfEnabled) !== null && _2 !== void 0 ? _2 : false,
            ttfIntervalHours: (_5 = (_4 = (_3 = ttf.intervalHours) !== null && _3 !== void 0 ? _3 : input.ttfIntervalHours) !== null && _4 !== void 0 ? _4 : existing === null || existing === void 0 ? void 0 : existing.ttfIntervalHours) !== null && _5 !== void 0 ? _5 : 24,
            latestEpisodeId: (_7 = (_6 = input.latestEpisodeId) !== null && _6 !== void 0 ? _6 : existing === null || existing === void 0 ? void 0 : existing.latestEpisodeId) !== null && _7 !== void 0 ? _7 : "",
        };
    }
    async syncLatest(seriesId) {
        const latest = await this.prisma.episode.findFirst({
            where: { seriesId },
            orderBy: { number: "desc" },
        });
        if (latest) {
            await this.prisma.series.update({
                where: { id: seriesId },
                data: { latestEpisodeId: latest.id },
            });
        }
    }
    async list(req, res) {
        if (!(0, admin_1.isAdminAuthorized)(req)) {
            res.status(403);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.FORBIDDEN);
        }
        const series = await this.prisma.series.findMany({ orderBy: { title: "asc" } });
        return { series };
    }
    async create(body, req, res) {
        if (!(0, admin_1.isAdminAuthorized)(req, body)) {
            res.status(403);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.FORBIDDEN);
        }
        const series = body === null || body === void 0 ? void 0 : body.series;
        if (!(series === null || series === void 0 ? void 0 : series.id)) {
            res.status(400);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.INVALID_REQUEST);
        }
        const payload = this.toSeriesPayload(series);
        const created = await this.prisma.series.create({ data: payload });
        return { series: created };
    }
    async detail(_key, req, res) {
        if (!(0, admin_1.isAdminAuthorized)(req)) {
            res.status(403);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.FORBIDDEN);
        }
        const seriesId = String(req.params.id || "");
        const series = await this.prisma.series.findUnique({ where: { id: seriesId } });
        if (!series) {
            res.status(404);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.NOT_FOUND);
        }
        return { series };
    }
    async update(body, req, res) {
        if (!(0, admin_1.isAdminAuthorized)(req, body)) {
            res.status(403);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.FORBIDDEN);
        }
        const seriesId = String(req.params.id || "");
        const series = (body === null || body === void 0 ? void 0 : body.series) || {};
        const existing = await this.prisma.series.findUnique({ where: { id: seriesId } });
        if (!existing) {
            res.status(404);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.NOT_FOUND);
        }
        const payload = this.toSeriesPayload({ ...series, id: seriesId }, existing);
        const updated = await this.prisma.series.update({
            where: { id: seriesId },
            data: payload,
        });
        return { series: updated };
    }
    async remove(req, res) {
        if (!(0, admin_1.isAdminAuthorized)(req)) {
            res.status(403);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.FORBIDDEN);
        }
        const seriesId = String(req.params.id || "");
        await this.prisma.episode.deleteMany({ where: { seriesId } });
        await this.prisma.series.deleteMany({ where: { id: seriesId } });
        return { ok: true };
    }
    async listEpisodes(req, res) {
        if (!(0, admin_1.isAdminAuthorized)(req)) {
            res.status(403);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.FORBIDDEN);
        }
        const seriesId = String(req.params.id || "");
        const episodes = await this.prisma.episode.findMany({
            where: { seriesId },
            orderBy: { number: "asc" },
        });
        return { episodes };
    }
    async createEpisode(body, req, res) {
        var _a;
        if (!(0, admin_1.isAdminAuthorized)(req, body)) {
            res.status(403);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.FORBIDDEN);
        }
        const seriesId = String(req.params.id || "");
        if (body === null || body === void 0 ? void 0 : body.bulk) {
            const count = Number(body.bulk.count || 0);
            const pricePts = Number(body.bulk.pricePts || 0);
            const existing = await this.prisma.episode.findMany({
                where: { seriesId },
                orderBy: { number: "desc" },
                take: 1,
            });
            const start = ((_a = existing[0]) === null || _a === void 0 ? void 0 : _a.number) || 0;
            const list = Array.from({ length: count }, (_, index) => {
                const number = start + index + 1;
                return {
                    id: `${seriesId}e${number}`,
                    seriesId,
                    number,
                    title: `Episode ${number}`,
                    releasedAt: new Date(),
                    pricePts,
                    ttfEligible: true,
                    previewFreePages: 0,
                };
            });
            await this.prisma.episode.createMany({ data: list });
            await this.syncLatest(seriesId);
            const episodes = await this.prisma.episode.findMany({
                where: { seriesId },
                orderBy: { number: "asc" },
            });
            return { episodes };
        }
        if (!(body === null || body === void 0 ? void 0 : body.episode)) {
            res.status(400);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.INVALID_REQUEST);
        }
        const episode = body.episode;
        const payload = {
            id: episode.id || `${seriesId}e${episode.number || Date.now()}`,
            seriesId,
            number: Number(episode.number || 1),
            title: episode.title || `Episode ${episode.number || 1}`,
            releasedAt: episode.releasedAt ? new Date(episode.releasedAt) : new Date(),
            pricePts: Number(episode.pricePts || 0),
            ttfEligible: Boolean(episode.ttfEligible),
            ttfReadyAt: episode.ttfReadyAt ? new Date(episode.ttfReadyAt) : null,
            previewFreePages: Number(episode.previewFreePages || 0),
            pages: episode.pages || null,
            paragraphs: episode.paragraphs || null,
            text: episode.text || null,
        };
        await this.prisma.episode.upsert({
            where: { id: payload.id },
            update: payload,
            create: payload,
        });
        await this.syncLatest(seriesId);
        const episodes = await this.prisma.episode.findMany({
            where: { seriesId },
            orderBy: { number: "asc" },
        });
        return { episodes };
    }
    async bulkUpdateEpisodes(body, req, res) {
        if (!(0, admin_1.isAdminAuthorized)(req, body)) {
            res.status(403);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.FORBIDDEN);
        }
        const seriesId = String(req.params.id || "");
        const updates = (body === null || body === void 0 ? void 0 : body.updates) || {};
        const ids = Array.isArray(body === null || body === void 0 ? void 0 : body.ids) ? body.ids : [];
        const list = await this.prisma.episode.findMany({
            where: { seriesId },
            orderBy: { number: "asc" },
        });
        const intervalHours = Number((body === null || body === void 0 ? void 0 : body.intervalHours) || 24);
        const updatedList = list.map((episode) => {
            if (ids.length > 0 && !ids.includes(episode.id)) {
                return episode;
            }
            const merged = { ...episode, ...updates };
            if (updates === null || updates === void 0 ? void 0 : updates.generateTtfReadyAt) {
                const base = new Date(episode.releasedAt).getTime();
                merged.ttfReadyAt = new Date(base + intervalHours * 3600 * 1000);
            }
            return merged;
        });
        await Promise.all(updatedList.map((episode) => this.prisma.episode.update({
            where: { id: episode.id },
            data: {
                title: episode.title,
                releasedAt: episode.releasedAt,
                pricePts: episode.pricePts,
                ttfEligible: episode.ttfEligible,
                ttfReadyAt: episode.ttfReadyAt,
                previewFreePages: episode.previewFreePages,
            },
        })));
        const episodes = await this.prisma.episode.findMany({
            where: { seriesId },
            orderBy: { number: "asc" },
        });
        return { episodes };
    }
    async uploadEpisodes(files, body, req, res) {
        var _a;
        if (!(0, admin_1.isAdminAuthorized)(req, body)) {
            res.status(403);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.FORBIDDEN);
        }
        const seriesId = String(req.params.id || "");
        const series = await this.prisma.series.findUnique({ where: { id: seriesId } });
        if (!series) {
            res.status(404);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.NOT_FOUND);
        }
        if (!Array.isArray(files) || files.length === 0) {
            res.status(400);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.INVALID_REQUEST);
        }
        const type = (body === null || body === void 0 ? void 0 : body.type) || series.type || "comic";
        const sortedFiles = [...files].sort((a, b) => sortByName(a.originalname, b.originalname));
        const existing = await this.prisma.episode.findMany({
            where: { seriesId },
            orderBy: { number: "desc" },
            take: 1,
        });
        const maxNumber = ((_a = existing[0]) === null || _a === void 0 ? void 0 : _a.number) || 0;
        const startNumber = Number((body === null || body === void 0 ? void 0 : body.startNumber) || (body === null || body === void 0 ? void 0 : body.episodeNumber) || 0);
        let currentNumber = startNumber > 0 ? startNumber - 1 : maxNumber;
        const created = [];
        for (const file of sortedFiles) {
            currentNumber += 1;
            const chapterTitle = toChapterTitle(file.originalname);
            const zip = new adm_zip_1.default(file.buffer);
            const entries = zip.getEntries().filter((entry) => !entry.isDirectory);
            entries.sort((a, b) => sortByName(a.entryName, b.entryName));
            if (type === "novel") {
                const textParts = entries
                    .filter((entry) => entry.entryName.toLowerCase().endsWith(".txt"))
                    .map((entry) => entry.getData().toString("utf8"));
                const combined = textParts.join("\n");
                const paragraphs = combined
                    .split(/\r?\n/)
                    .map((line) => line.trim())
                    .filter(Boolean);
                const episode = {
                    id: `${seriesId}e${currentNumber}`,
                    number: currentNumber,
                    title: chapterTitle || `Episode ${currentNumber}`,
                    releasedAt: new Date().toISOString(),
                    pricePts: Number((series === null || series === void 0 ? void 0 : series.episodePrice) || 0),
                    ttfEligible: Boolean(series === null || series === void 0 ? void 0 : series.ttfEnabled),
                    previewFreePages: 0,
                    paragraphs,
                };
                await this.prisma.episode.upsert({
                    where: { id: episode.id },
                    update: episode,
                    create: episode,
                });
                created.push(episode);
            }
            else {
                const imageEntries = entries.filter((entry) => /\.(png|jpe?g|webp)$/i.test(entry.entryName));
                const pages = (imageEntries.length ? imageEntries : entries).map((entry, index) => ({
                    url: `https://placehold.co/800x1200?text=${encodeURIComponent(`${chapterTitle || "Episode"}-${index + 1}`)}`,
                    w: 800,
                    h: 1200,
                }));
                const episode = {
                    id: `${seriesId}e${currentNumber}`,
                    number: currentNumber,
                    title: chapterTitle || `Episode ${currentNumber}`,
                    releasedAt: new Date().toISOString(),
                    pricePts: Number((series === null || series === void 0 ? void 0 : series.episodePrice) || 0),
                    ttfEligible: Boolean(series === null || series === void 0 ? void 0 : series.ttfEnabled),
                    previewFreePages: 0,
                    pages,
                };
                await this.prisma.episode.upsert({
                    where: { id: episode.id },
                    update: episode,
                    create: episode,
                });
                created.push(episode);
            }
        }
        await this.syncLatest(seriesId);
        const episodes = await this.prisma.episode.findMany({
            where: { seriesId },
            orderBy: { number: "asc" },
        });
        return { episodes, created: created.length };
    }
    async updateEpisode(body, req, res) {
        if (!(0, admin_1.isAdminAuthorized)(req, body)) {
            res.status(403);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.FORBIDDEN);
        }
        const seriesId = String(req.params.id || "");
        const episodeId = String(req.params.episodeId || "");
        const episode = (body === null || body === void 0 ? void 0 : body.episode) || {};
        const payload = {
            id: episodeId,
            seriesId,
            number: Number(episode.number || 1),
            title: episode.title || `Episode ${episode.number || 1}`,
            releasedAt: episode.releasedAt ? new Date(episode.releasedAt) : new Date(),
            pricePts: Number(episode.pricePts || 0),
            ttfEligible: Boolean(episode.ttfEligible),
            ttfReadyAt: episode.ttfReadyAt ? new Date(episode.ttfReadyAt) : null,
            previewFreePages: Number(episode.previewFreePages || 0),
            pages: episode.pages || null,
            paragraphs: episode.paragraphs || null,
            text: episode.text || null,
        };
        const updated = await this.prisma.episode.update({
            where: { id: episodeId },
            data: payload,
        });
        await this.syncLatest(seriesId);
        return { episode: updated };
    }
    async removeEpisode(req, res) {
        if (!(0, admin_1.isAdminAuthorized)(req)) {
            res.status(403);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.FORBIDDEN);
        }
        const seriesId = String(req.params.id || "");
        const episodeId = String(req.params.episodeId || "");
        await this.prisma.episode.deleteMany({ where: { id: episodeId, seriesId } });
        await this.syncLatest(seriesId);
        const episodes = await this.prisma.episode.findMany({
            where: { seriesId },
            orderBy: { number: "asc" },
        });
        return { episodes };
    }
};
exports.AdminSeriesController = AdminSeriesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminSeriesController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminSeriesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(":id"),
    __param(0, (0, common_1.Query)("key")),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminSeriesController.prototype, "detail", null);
__decorate([
    (0, common_1.Patch)(":id"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminSeriesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(":id"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminSeriesController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)(":id/episodes"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminSeriesController.prototype, "listEpisodes", null);
__decorate([
    (0, common_1.Post)(":id/episodes"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminSeriesController.prototype, "createEpisode", null);
__decorate([
    (0, common_1.Post)(":id/episodes/bulk"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminSeriesController.prototype, "bulkUpdateEpisodes", null);
__decorate([
    (0, common_1.Post)(":id/episodes/upload"),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)("files", 50, {
        storage: (0, multer_1.memoryStorage)(),
        limits: { fileSize: 50 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.UploadedFiles)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminSeriesController.prototype, "uploadEpisodes", null);
__decorate([
    (0, common_1.Patch)(":id/episodes/:episodeId"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminSeriesController.prototype, "updateEpisode", null);
__decorate([
    (0, common_1.Delete)(":id/episodes/:episodeId"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminSeriesController.prototype, "removeEpisode", null);
exports.AdminSeriesController = AdminSeriesController = __decorate([
    (0, common_1.Controller)("admin/series"),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminSeriesController);
