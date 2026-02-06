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
exports.AdminLogService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AdminLogService = class AdminLogService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async log(action, resource, resourceId, details, req) {
        var _a;
        try {
            const adminId = ((_a = req === null || req === void 0 ? void 0 : req.user) === null || _a === void 0 ? void 0 : _a.userId) || "admin";
            const ip = this.getClientIp(req);
            const userAgent = (req === null || req === void 0 ? void 0 : req.headers["user-agent"]) || null;
            await this.prisma.adminLog.create({
                data: {
                    action,
                    resource,
                    resourceId,
                    adminId,
                    details,
                    ip,
                    userAgent,
                },
            });
        }
        catch (error) {
            console.error("记录管理员操作日志失败:", error);
        }
    }
    getClientIp(req) {
        var _a;
        if (!req)
            return null;
        const forwarded = req.headers["x-forwarded-for"];
        if (typeof forwarded === "string") {
            return forwarded.split(",")[0].trim();
        }
        const realIp = req.headers["x-real-ip"];
        if (typeof realIp === "string") {
            return realIp;
        }
        return ((_a = req.socket) === null || _a === void 0 ? void 0 : _a.remoteAddress) || null;
    }
    async query(filters, page = 1, pageSize = 50) {
        const where = {};
        if (filters.action) {
            where.action = filters.action;
        }
        if (filters.resource) {
            where.resource = filters.resource;
        }
        if (filters.adminId) {
            where.adminId = filters.adminId;
        }
        if (filters.startDate || filters.endDate) {
            where.createdAt = {};
            if (filters.startDate) {
                where.createdAt.gte = filters.startDate;
            }
            if (filters.endDate) {
                where.createdAt.lte = filters.endDate;
            }
        }
        const [logs, total] = await Promise.all([
            this.prisma.adminLog.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            this.prisma.adminLog.count({ where }),
        ]);
        return {
            logs,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        };
    }
};
exports.AdminLogService = AdminLogService;
exports.AdminLogService = AdminLogService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminLogService);
