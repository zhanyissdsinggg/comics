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
exports.FollowService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let FollowService = class FollowService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(userId) {
        const rows = await this.prisma.follow.findMany({
            where: { userId },
            select: { seriesId: true },
        });
        return rows.map((row) => row.seriesId);
    }
    async update(userId, seriesId, action) {
        if (action === "UNFOLLOW") {
            await this.prisma.follow.deleteMany({ where: { userId, seriesId } });
            return this.list(userId);
        }
        await this.prisma.follow.upsert({
            where: { userId_seriesId: { userId, seriesId } },
            update: {},
            create: { userId, seriesId },
        });
        return this.list(userId);
    }
};
exports.FollowService = FollowService;
exports.FollowService = FollowService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FollowService);
