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
exports.SearchService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let SearchService = class SearchService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    getTodayKey() {
        return new Date().toISOString().slice(0, 10);
    }
    buildDateRange(days) {
        const result = [];
        const today = new Date();
        for (let i = 0; i < days; i += 1) {
            const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
            result.push(date.toISOString().slice(0, 10));
        }
        return result;
    }
    buildSuggestions(query, list, limit = 8) {
        const q = String(query || "").trim().toLowerCase();
        if (!q) {
            return [];
        }
        const hits = [];
        (list || []).forEach((series) => {
            if (series.title && String(series.title).toLowerCase().includes(q)) {
                hits.push(series.title);
            }
            (series.genres || []).forEach((genre) => {
                if (String(genre).toLowerCase().includes(q)) {
                    hits.push(genre);
                }
            });
        });
        const unique = Array.from(new Set(hits));
        return unique.slice(0, limit);
    }
    async search(query, adult) {
        const list = await this.prisma.series.findMany({
            where: adult ? {} : { adult: false },
        });
        const normalized = (query || "").toLowerCase();
        const filtered = list.filter((series) => {
            if (!adult && series.adult) {
                return false;
            }
            if (!normalized) {
                return true;
            }
            const title = String(series.title || "").toLowerCase();
            const genres = (series.genres || []).join(" ").toLowerCase();
            return title.includes(normalized) || genres.includes(normalized);
        });
        return filtered;
    }
    async keywords(adult) {
        const list = await this.prisma.series.findMany({
            where: adult ? {} : { adult: false },
        });
        const genres = new Map();
        list.forEach((series) => {
            (series.genres || []).forEach((genre) => {
                genres.set(genre, (genres.get(genre) || 0) + 1);
            });
        });
        const topGenres = Array.from(genres.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([genre]) => genre);
        const topTitles = list.slice(0, 4).map((series) => series.title);
        return Array.from(new Set([...topGenres, ...topTitles]));
    }
    async suggest(query, adult) {
        const list = await this.prisma.series.findMany({
            where: adult ? {} : { adult: false },
        });
        return this.buildSuggestions(query, list, 8);
    }
    async hot(adult, windowParam) {
        const windowKey = ["week", "month"].includes(windowParam || "")
            ? windowParam
            : "day";
        const days = windowKey === "month" ? 30 : windowKey === "week" ? 7 : 1;
        const dateKeys = this.buildDateRange(days);
        const rows = await this.prisma.searchLog.findMany({
            where: { dateKey: { in: dateKeys } },
            orderBy: { count: "desc" },
            take: 50,
        });
        const counts = new Map();
        rows.forEach((row) => {
            counts.set(row.keyword, (counts.get(row.keyword) || 0) + row.count);
        });
        const hot = Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([keyword]) => keyword);
        const list = await this.prisma.series.findMany({
            where: adult ? {} : { adult: false },
            take: 8,
        });
        const fallback = list.slice(0, 4).map((series) => series.title);
        return Array.from(new Set([...hot, ...fallback])).slice(0, 10);
    }
    async log(_userId, query) {
        const keyword = String(query || "").trim();
        if (!keyword) {
            return;
        }
        const today = this.getTodayKey();
        await this.prisma.searchLog.upsert({
            where: { dateKey_keyword: { dateKey: today, keyword } },
            update: { count: { increment: 1 } },
            create: { dateKey: today, keyword, count: 1 },
        });
    }
};
exports.SearchService = SearchService;
exports.SearchService = SearchService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SearchService);
