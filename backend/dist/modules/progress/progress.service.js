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
exports.ProgressService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let ProgressService = class ProgressService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getProgress(userId) {
        const rows = await this.prisma.progress.findMany({
            where: { userId },
        });
        return rows.reduce((acc, row) => {
            var _a, _b;
            acc[row.seriesId] = {
                lastEpisodeId: row.lastEpisodeId,
                percent: row.percent,
                updatedAt: ((_b = (_a = row.updatedAt) === null || _a === void 0 ? void 0 : _a.getTime) === null || _b === void 0 ? void 0 : _b.call(_a)) || Date.now(),
            };
            return acc;
        }, {});
    }
    async update(userId, seriesId, payload) {
        const updatedAt = (payload === null || payload === void 0 ? void 0 : payload.updatedAt) ? new Date(payload.updatedAt) : new Date();
        await this.prisma.progress.upsert({
            where: { userId_seriesId: { userId, seriesId } },
            update: {
                lastEpisodeId: payload.lastEpisodeId,
                percent: payload.percent,
                updatedAt,
            },
            create: {
                userId,
                seriesId,
                lastEpisodeId: payload.lastEpisodeId,
                percent: payload.percent,
                updatedAt,
            },
        });
        return this.getProgress(userId);
    }
};
exports.ProgressService = ProgressService;
exports.ProgressService = ProgressService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProgressService);
