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
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const order_status_1 = require("../../common/utils/order-status");
let OrdersService = class OrdersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(userId) {
        return this.prisma.order.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });
    }
    async reconcile(userId) {
        const cutoff = new Date(Date.now() - 15 * 60 * 1000);
        const pending = await this.prisma.order.findMany({
            where: { userId, status: order_status_1.ORDER_STATUS.PENDING, createdAt: { lt: cutoff } },
        });
        if (pending.length === 0) {
            return { updated: 0, orders: await this.list(userId) };
        }
        await this.prisma.order.updateMany({
            where: { userId, status: order_status_1.ORDER_STATUS.PENDING, createdAt: { lt: cutoff } },
            data: { status: order_status_1.ORDER_STATUS.TIMEOUT },
        });
        for (const order of pending) {
            await this.prisma.auditLog.create({
                data: {
                    userId,
                    action: "order_timeout",
                    targetType: "order",
                    targetId: order.id,
                    payload: { reason: "RECONCILE_TIMEOUT" },
                },
            });
            const payment = await this.prisma.paymentIntent.findFirst({
                where: { orderId: order.id },
                orderBy: { createdAt: "desc" },
            });
            const nextAttemptAt = new Date(Date.now() + 30000);
            await this.prisma.paymentRetry.upsert({
                where: { orderId: order.id },
                update: {
                    userId,
                    paymentId: (payment === null || payment === void 0 ? void 0 : payment.id) || null,
                    status: "PENDING",
                    nextAttemptAt,
                    lastError: "TIMEOUT",
                },
                create: {
                    userId,
                    orderId: order.id,
                    paymentId: (payment === null || payment === void 0 ? void 0 : payment.id) || null,
                    status: "PENDING",
                    nextAttemptAt,
                    lastError: "TIMEOUT",
                },
            });
        }
        return { updated: pending.length, orders: await this.list(userId) };
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OrdersService);
