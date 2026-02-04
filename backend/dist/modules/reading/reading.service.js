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
exports.ReadingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let ReadingService = class ReadingService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getBookmarks(userId) {
        const rows = await this.prisma.bookmark.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });
        return rows.reduce((acc, row) => {
            acc[row.seriesId] = acc[row.seriesId] || [];
            acc[row.seriesId].push({
                id: row.id,
                seriesId: row.seriesId,
                episodeId: row.episodeId,
                percent: row.percent,
                pageIndex: row.pageIndex,
                label: row.label,
                createdAt: row.createdAt,
            });
            return acc;
        }, {});
    }
    async addBookmark(userId, seriesId, entry) {
        await this.prisma.bookmark.create({
            data: {
                userId,
                seriesId,
                episodeId: entry.episodeId,
                percent: entry.percent || 0,
                pageIndex: entry.pageIndex || 0,
                label: entry.label || "Bookmark",
            },
        });
        return this.getBookmarks(userId);
    }
    async removeBookmark(userId, seriesId, bookmarkId) {
        await this.prisma.bookmark.deleteMany({
            where: { id: bookmarkId, userId, seriesId },
        });
        return this.getBookmarks(userId);
    }
    async getHistory(userId) {
        const rows = await this.prisma.readingHistory.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });
        return rows.map((row) => ({
            id: row.id,
            seriesId: row.seriesId,
            episodeId: row.episodeId,
            title: row.title,
            percent: row.percent,
            createdAt: row.createdAt,
        }));
    }
    async addHistory(userId, payload) {
        await this.prisma.readingHistory.create({
            data: {
                userId,
                seriesId: payload.seriesId,
                episodeId: payload.episodeId,
                title: payload.title || "",
                percent: payload.percent || 0,
            },
        });
        return this.getHistory(userId);
    }
};
exports.ReadingService = ReadingService;
exports.ReadingService = ReadingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReadingService);
