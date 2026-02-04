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
exports.AdminBillingController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const admin_1 = require("../../common/utils/admin");
const errors_1 = require("../../common/utils/errors");
const topup_1 = require("../../common/config/topup");
const plans_1 = require("../../common/config/plans");
let AdminBillingController = class AdminBillingController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listTopups(req, res) {
        if (!(0, admin_1.isAdminAuthorized)(req)) {
            res.status(403);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.FORBIDDEN);
        }
        const packages = await (0, topup_1.listTopupPackages)(this.prisma);
        return { packages };
    }
    async createTopup(body, req, res) {
        if (!(0, admin_1.isAdminAuthorized)(req, body)) {
            res.status(403);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.FORBIDDEN);
        }
        const id = (body === null || body === void 0 ? void 0 : body.packageId) || (body === null || body === void 0 ? void 0 : body.id);
        if (!id) {
            res.status(400);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.INVALID_REQUEST);
        }
        const payload = {
            id,
            paidPts: Number((body === null || body === void 0 ? void 0 : body.paidPts) || 0),
            bonusPts: Number((body === null || body === void 0 ? void 0 : body.bonusPts) || 0),
            price: Number((body === null || body === void 0 ? void 0 : body.price) || 0),
            currency: (body === null || body === void 0 ? void 0 : body.currency) || "USD",
            active: (body === null || body === void 0 ? void 0 : body.active) !== false,
            label: (body === null || body === void 0 ? void 0 : body.label) || "",
            tags: Array.isArray(body === null || body === void 0 ? void 0 : body.tags) ? body.tags : [],
        };
        const record = await this.prisma.topupPackage.upsert({
            where: { id },
            update: payload,
            create: payload,
        });
        return { package: record };
    }
    async updateTopup(id, body, req, res) {
        if (!(0, admin_1.isAdminAuthorized)(req, body)) {
            res.status(403);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.FORBIDDEN);
        }
        if (!id) {
            res.status(400);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.INVALID_REQUEST);
        }
        const record = await this.prisma.topupPackage.update({
            where: { id },
            data: {
                paidPts: (body === null || body === void 0 ? void 0 : body.paidPts) !== undefined ? Number(body.paidPts) : undefined,
                bonusPts: (body === null || body === void 0 ? void 0 : body.bonusPts) !== undefined ? Number(body.bonusPts) : undefined,
                price: (body === null || body === void 0 ? void 0 : body.price) !== undefined ? Number(body.price) : undefined,
                currency: (body === null || body === void 0 ? void 0 : body.currency) || undefined,
                active: (body === null || body === void 0 ? void 0 : body.active) !== undefined ? Boolean(body.active) : undefined,
                label: (body === null || body === void 0 ? void 0 : body.label) || undefined,
                tags: Array.isArray(body === null || body === void 0 ? void 0 : body.tags) ? body.tags : undefined,
            },
        });
        return { package: record };
    }
    async listPlans(req, res) {
        if (!(0, admin_1.isAdminAuthorized)(req)) {
            res.status(403);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.FORBIDDEN);
        }
        const catalog = await (0, plans_1.getPlanCatalog)(this.prisma);
        return { plans: Object.values(catalog) };
    }
    async createPlan(body, req, res) {
        if (!(0, admin_1.isAdminAuthorized)(req, body)) {
            res.status(403);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.FORBIDDEN);
        }
        const id = body === null || body === void 0 ? void 0 : body.id;
        if (!id) {
            res.status(400);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.INVALID_REQUEST);
        }
        const payload = {
            id,
            discountPct: Number((body === null || body === void 0 ? void 0 : body.discountPct) || 0),
            dailyFreeUnlocks: Number((body === null || body === void 0 ? void 0 : body.dailyFreeUnlocks) || 0),
            ttfMultiplier: Number((body === null || body === void 0 ? void 0 : body.ttfMultiplier) || 0),
            voucherPts: Number((body === null || body === void 0 ? void 0 : body.voucherPts) || 0),
            price: Number((body === null || body === void 0 ? void 0 : body.price) || 0),
            currency: (body === null || body === void 0 ? void 0 : body.currency) || "USD",
            active: (body === null || body === void 0 ? void 0 : body.active) !== false,
            label: (body === null || body === void 0 ? void 0 : body.label) || "",
        };
        const record = await this.prisma.subscriptionPlan.upsert({
            where: { id },
            update: payload,
            create: payload,
        });
        return { plan: record };
    }
    async updatePlan(id, body, req, res) {
        if (!(0, admin_1.isAdminAuthorized)(req, body)) {
            res.status(403);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.FORBIDDEN);
        }
        if (!id) {
            res.status(400);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.INVALID_REQUEST);
        }
        const record = await this.prisma.subscriptionPlan.update({
            where: { id },
            data: {
                discountPct: (body === null || body === void 0 ? void 0 : body.discountPct) !== undefined ? Number(body.discountPct) : undefined,
                dailyFreeUnlocks: (body === null || body === void 0 ? void 0 : body.dailyFreeUnlocks) !== undefined ? Number(body.dailyFreeUnlocks) : undefined,
                ttfMultiplier: (body === null || body === void 0 ? void 0 : body.ttfMultiplier) !== undefined ? Number(body.ttfMultiplier) : undefined,
                voucherPts: (body === null || body === void 0 ? void 0 : body.voucherPts) !== undefined ? Number(body.voucherPts) : undefined,
                price: (body === null || body === void 0 ? void 0 : body.price) !== undefined ? Number(body.price) : undefined,
                currency: (body === null || body === void 0 ? void 0 : body.currency) || undefined,
                active: (body === null || body === void 0 ? void 0 : body.active) !== undefined ? Boolean(body.active) : undefined,
                label: (body === null || body === void 0 ? void 0 : body.label) || undefined,
            },
        });
        return { plan: record };
    }
};
exports.AdminBillingController = AdminBillingController;
__decorate([
    (0, common_1.Get)("topups"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminBillingController.prototype, "listTopups", null);
__decorate([
    (0, common_1.Post)("topups"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminBillingController.prototype, "createTopup", null);
__decorate([
    (0, common_1.Patch)("topups/:id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminBillingController.prototype, "updateTopup", null);
__decorate([
    (0, common_1.Get)("plans"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminBillingController.prototype, "listPlans", null);
__decorate([
    (0, common_1.Post)("plans"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminBillingController.prototype, "createPlan", null);
__decorate([
    (0, common_1.Patch)("plans/:id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminBillingController.prototype, "updatePlan", null);
exports.AdminBillingController = AdminBillingController = __decorate([
    (0, common_1.Controller)("admin/billing"),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminBillingController);
