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
exports.StatsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
function getDateKey(date = new Date()) {
    return date.toISOString().slice(0, 10);
}
function parseDateKey(value) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return null;
    }
    const date = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) {
        return null;
    }
    return date;
}
function buildDateRange(from, to) {
    const toDate = parseDateKey(to) || new Date();
    const fromDate = parseDateKey(from) ||
        new Date(toDate.getTime() - 13 * 24 * 60 * 60 * 1000);
    const start = new Date(Math.min(fromDate.getTime(), toDate.getTime()));
    const end = new Date(Math.max(fromDate.getTime(), toDate.getTime()));
    const result = [];
    const cursor = new Date(start.getTime());
    while (cursor <= end) {
        result.push(cursor.toISOString().slice(0, 10));
        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return result;
}
let StatsService = class StatsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async recordDailyActive(userId) {
        if (!userId || userId === "guest") {
            return;
        }
        const dateKey = getDateKey();
        await this.prisma.dailyActive.upsert({
            where: { dateKey_userId: { dateKey, userId } },
            update: {},
            create: { dateKey, userId },
        });
    }
    async recordRegistration(userId) {
        const dateKey = getDateKey();
        await this.prisma.dailyStat.upsert({
            where: { dateKey },
            update: { registrations: { increment: 1 } },
            create: { dateKey, registrations: 1, views: 0, paidOrders: 0 },
        });
        await this.recordDailyActive(userId);
    }
    async recordComicView(userId) {
        const dateKey = getDateKey();
        await this.prisma.dailyStat.upsert({
            where: { dateKey },
            update: { views: { increment: 1 } },
            create: { dateKey, views: 1, registrations: 0, paidOrders: 0 },
        });
        if (userId) {
            await this.recordDailyActive(userId);
        }
    }
    async recordSeriesView(userId, seriesId) {
        if (!seriesId) {
            return;
        }
        const dateKey = getDateKey();
        await this.prisma.seriesViewStat.upsert({
            where: { dateKey_seriesId: { dateKey, seriesId } },
            update: { views: { increment: 1 } },
            create: { dateKey, seriesId, views: 1 },
        });
        await this.prisma.dailyStat.upsert({
            where: { dateKey },
            update: { views: { increment: 1 } },
            create: { dateKey, views: 1, registrations: 0, paidOrders: 0 },
        });
        if (userId) {
            await this.recordDailyActive(userId);
        }
    }
    async recordPaidOrder() {
        const dateKey = getDateKey();
        await this.prisma.dailyStat.upsert({
            where: { dateKey },
            update: { paidOrders: { increment: 1 } },
            create: { dateKey, paidOrders: 1, views: 0, registrations: 0 },
        });
    }
    async getDailyStats(from, to) {
        const keys = buildDateRange(from, to);
        const stats = await this.prisma.dailyStat.findMany({
            where: { dateKey: { in: keys } },
        });
        const activeCounts = await this.prisma.dailyActive.groupBy({
            by: ["dateKey"],
            _count: { dateKey: true },
            where: { dateKey: { in: keys } },
        });
        const activeMap = new Map(activeCounts.map((row) => [row.dateKey, row._count.dateKey]));
        const statMap = new Map(stats.map((item) => [item.dateKey, item]));
        return keys.map((dateKey) => {
            const row = statMap.get(dateKey);
            return {
                date: dateKey,
                views: (row === null || row === void 0 ? void 0 : row.views) || 0,
                registrations: (row === null || row === void 0 ? void 0 : row.registrations) || 0,
                dau: activeMap.get(dateKey) || 0,
                paidOrders: (row === null || row === void 0 ? void 0 : row.paidOrders) || 0,
            };
        });
    }
    async getTopSeries(from, to, type, limit = 10) {
        const keys = buildDateRange(from, to);
        const grouped = await this.prisma.seriesViewStat.groupBy({
            by: ["seriesId"],
            _sum: { views: true },
            where: { dateKey: { in: keys } },
            orderBy: { _sum: { views: "desc" } },
            take: Math.max(1, limit),
        });
        const ids = grouped.map((row) => row.seriesId);
        const series = await this.prisma.series.findMany({
            where: { id: { in: ids } },
        });
        const seriesMap = new Map(series.map((item) => [item.id, item]));
        const list = grouped
            .map((row) => {
            const item = seriesMap.get(row.seriesId);
            if (!item) {
                return null;
            }
            if (type && type !== "all" && item.type !== type) {
                return null;
            }
            return {
                seriesId: row.seriesId,
                title: item.title,
                type: item.type,
                views: row._sum.views || 0,
            };
        })
            .filter(Boolean);
        return list.slice(0, Math.max(1, limit));
    }
};
exports.StatsService = StatsService;
exports.StatsService = StatsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StatsService);
