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
exports.AdminOrdersController = void 0;
const common_1 = require("@nestjs/common");
const admin_1 = require("../../common/utils/admin");
const errors_1 = require("../../common/utils/errors");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const topup_1 = require("../../common/config/topup");
let AdminOrdersController = class AdminOrdersController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(req, res) {
        if (!(0, admin_1.isAdminAuthorized)(req)) {
            res.status(403);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.FORBIDDEN);
        }
        const orders = await this.prisma.order.findMany({
            orderBy: { createdAt: "desc" },
        });
        return {
            orders: orders.map((order) => ({
                ...order,
                orderId: order.id,
            })),
        };
    }
    async refund(body, req, res) {
        if (!(0, admin_1.isAdminAuthorized)(req, body)) {
            res.status(403);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.FORBIDDEN);
        }
        const userId = body === null || body === void 0 ? void 0 : body.userId;
        const orderId = body === null || body === void 0 ? void 0 : body.orderId;
        if (!userId || !orderId) {
            res.status(400);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.INVALID_REQUEST);
        }
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order || order.userId !== userId) {
            res.status(404);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.NOT_FOUND);
        }
        if (order.status !== "PAID") {
            res.status(400);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.INVALID_REQUEST);
        }
        const pkg = await (0, topup_1.getTopupPackage)(this.prisma, order.packageId);
        const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
        const paidPts = Math.max(0, ((wallet === null || wallet === void 0 ? void 0 : wallet.paidPts) || 0) - ((pkg === null || pkg === void 0 ? void 0 : pkg.paidPts) || 0));
        const bonusPts = Math.max(0, ((wallet === null || wallet === void 0 ? void 0 : wallet.bonusPts) || 0) - ((pkg === null || pkg === void 0 ? void 0 : pkg.bonusPts) || 0));
        const next = await this.prisma.$transaction(async (tx) => {
            const nextWallet = await tx.wallet.upsert({
                where: { userId },
                update: { paidPts, bonusPts },
                create: { userId, paidPts, bonusPts, plan: "free" },
            });
            const nextOrder = await tx.order.update({
                where: { id: orderId },
                data: { status: "REFUNDED" },
            });
            return { nextWallet, nextOrder };
        });
        return {
            ok: true,
            order: { ...next.nextOrder, orderId: next.nextOrder.id },
            wallet: next.nextWallet,
        };
    }
    async adjust(body, req, res) {
        if (!(0, admin_1.isAdminAuthorized)(req, body)) {
            res.status(403);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.FORBIDDEN);
        }
        const userId = body === null || body === void 0 ? void 0 : body.userId;
        if (!userId) {
            res.status(400);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.INVALID_REQUEST);
        }
        const paidDelta = Number((body === null || body === void 0 ? void 0 : body.paidDelta) || 0);
        const bonusDelta = Number((body === null || body === void 0 ? void 0 : body.bonusDelta) || 0);
        const wallet = await this.prisma.wallet.upsert({
            where: { userId },
            update: {
                paidPts: { increment: paidDelta },
                bonusPts: { increment: bonusDelta },
            },
            create: { userId, paidPts: paidDelta, bonusPts: bonusDelta, plan: "free" },
        });
        return { wallet };
    }
};
exports.AdminOrdersController = AdminOrdersController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminOrdersController.prototype, "list", null);
__decorate([
    (0, common_1.Post)("refund"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminOrdersController.prototype, "refund", null);
__decorate([
    (0, common_1.Post)("adjust"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminOrdersController.prototype, "adjust", null);
exports.AdminOrdersController = AdminOrdersController = __decorate([
    (0, common_1.Controller)("admin/orders"),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminOrdersController);
