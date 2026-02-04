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
exports.AdminPromotionsController = void 0;
const common_1 = require("@nestjs/common");
const admin_1 = require("../../common/utils/admin");
const errors_1 = require("../../common/utils/errors");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let AdminPromotionsController = class AdminPromotionsController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(req, res) {
        if (!(0, admin_1.isAdminAuthorized)(req)) {
            res.status(403);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.FORBIDDEN);
        }
        const promotions = await this.prisma.promotion.findMany({ orderBy: { title: "asc" } });
        return { promotions };
    }
    async defaults(req, res) {
        if (!(0, admin_1.isAdminAuthorized)(req)) {
            res.status(403);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.FORBIDDEN);
        }
        const fallback = await this.prisma.promotionFallback.findUnique({
            where: { key: "default" },
        });
        return { defaults: (fallback === null || fallback === void 0 ? void 0 : fallback.payload) || { ctaType: "STORE", ctaTarget: "", ctaLabel: "View offer" } };
    }
    async updateDefaults(body, req, res) {
        if (!(0, admin_1.isAdminAuthorized)(req, body)) {
            res.status(403);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.FORBIDDEN);
        }
        const payload = (body === null || body === void 0 ? void 0 : body.defaults) || {};
        const defaults = await this.prisma.promotionFallback.upsert({
            where: { key: "default" },
            update: { payload },
            create: { key: "default", payload },
        });
        return { defaults: defaults.payload };
    }
    async create(body, req, res) {
        if (!(0, admin_1.isAdminAuthorized)(req, body)) {
            res.status(403);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.FORBIDDEN);
        }
        const promo = body === null || body === void 0 ? void 0 : body.promotion;
        if (!(promo === null || promo === void 0 ? void 0 : promo.id)) {
            res.status(400);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.INVALID_REQUEST);
        }
        const payload = {
            id: String(promo.id),
            title: String(promo.title || "Untitled Promotion"),
            description: String(promo.description || ""),
            type: String(promo.type || "GENERIC"),
            segment: String(promo.segment || "ALL"),
            active: Boolean(promo.active),
            startAt: promo.startAt ? new Date(promo.startAt) : null,
            endAt: promo.endAt ? new Date(promo.endAt) : null,
            bonusMultiplier: Number(promo.bonusMultiplier || 0),
            returningAfterDays: Number(promo.returningAfterDays || 7),
            autoGrant: Boolean(promo.autoGrant),
            ctaType: String(promo.ctaType || "STORE"),
            ctaTarget: String(promo.ctaTarget || ""),
            ctaLabel: String(promo.ctaLabel || ""),
        };
        const created = await this.prisma.promotion.create({ data: payload });
        return { promotion: created };
    }
    async update(body, req, res) {
        if (!(0, admin_1.isAdminAuthorized)(req, body)) {
            res.status(403);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.FORBIDDEN);
        }
        const promoId = String(req.params.id || "");
        const promo = (body === null || body === void 0 ? void 0 : body.promotion) || {};
        const payload = {
            title: promo.title !== undefined ? String(promo.title || "") : undefined,
            description: promo.description !== undefined ? String(promo.description || "") : undefined,
            type: promo.type !== undefined ? String(promo.type || "") : undefined,
            segment: promo.segment !== undefined ? String(promo.segment || "") : undefined,
            active: promo.active !== undefined ? Boolean(promo.active) : undefined,
            startAt: promo.startAt !== undefined ? (promo.startAt ? new Date(promo.startAt) : null) : undefined,
            endAt: promo.endAt !== undefined ? (promo.endAt ? new Date(promo.endAt) : null) : undefined,
            bonusMultiplier: promo.bonusMultiplier !== undefined ? Number(promo.bonusMultiplier || 0) : undefined,
            returningAfterDays: promo.returningAfterDays !== undefined ? Number(promo.returningAfterDays || 7) : undefined,
            autoGrant: promo.autoGrant !== undefined ? Boolean(promo.autoGrant) : undefined,
            ctaType: promo.ctaType !== undefined ? String(promo.ctaType || "") : undefined,
            ctaTarget: promo.ctaTarget !== undefined ? String(promo.ctaTarget || "") : undefined,
            ctaLabel: promo.ctaLabel !== undefined ? String(promo.ctaLabel || "") : undefined,
        };
        const updated = await this.prisma.promotion.update({
            where: { id: promoId },
            data: payload,
        });
        return { promotion: updated };
    }
    async remove(req, res) {
        if (!(0, admin_1.isAdminAuthorized)(req)) {
            res.status(403);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.FORBIDDEN);
        }
        const promoId = String(req.params.id || "");
        const existing = await this.prisma.promotion.findUnique({ where: { id: promoId } });
        if (!existing) {
            res.status(404);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.NOT_FOUND);
        }
        await this.prisma.promotion.delete({ where: { id: promoId } });
        return { ok: true };
    }
};
exports.AdminPromotionsController = AdminPromotionsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminPromotionsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)("defaults"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminPromotionsController.prototype, "defaults", null);
__decorate([
    (0, common_1.Patch)("defaults"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminPromotionsController.prototype, "updateDefaults", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminPromotionsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(":id"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminPromotionsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(":id"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminPromotionsController.prototype, "remove", null);
exports.AdminPromotionsController = AdminPromotionsController = __decorate([
    (0, common_1.Controller)("admin/promotions"),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminPromotionsController);
