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
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const topup_1 = require("../../common/config/topup");
const order_status_1 = require("../../common/utils/order-status");
let PaymentsService = class PaymentsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.retryTimer = null;
    }
    onModuleInit() {
        this.retryTimer = setInterval(() => {
            this.processRetries().catch(() => null);
        }, 20000);
    }
    onModuleDestroy() {
        if (this.retryTimer) {
            clearInterval(this.retryTimer);
            this.retryTimer = null;
        }
    }
    buildNextRetryTime(attempts) {
        const baseMs = 30000;
        const backoff = Math.min(baseMs * Math.pow(2, attempts), 10 * 60 * 1000);
        return new Date(Date.now() + backoff);
    }
    async enqueueRetry(userId, orderId, paymentId, reason = "") {
        const nextAttemptAt = this.buildNextRetryTime(0);
        await this.prisma.paymentRetry.upsert({
            where: { orderId },
            update: {
                userId,
                paymentId: paymentId || undefined,
                status: "PENDING",
                nextAttemptAt,
                lastError: reason || "",
            },
            create: {
                userId,
                orderId,
                paymentId: paymentId || null,
                status: "PENDING",
                nextAttemptAt,
                lastError: reason || "",
            },
        });
    }
    async processRetries() {
        const now = new Date();
        const due = await this.prisma.paymentRetry.findMany({
            where: { status: "PENDING", nextAttemptAt: { lte: now } },
            take: 10,
        });
        if (due.length === 0) {
            return;
        }
        for (const job of due) {
            let paymentId = job.paymentId;
            if (!paymentId) {
                const payment = await this.prisma.paymentIntent.findFirst({
                    where: { orderId: job.orderId },
                    orderBy: { createdAt: "desc" },
                });
                paymentId = payment === null || payment === void 0 ? void 0 : payment.id;
            }
            if (!paymentId) {
                await this.prisma.paymentRetry.update({
                    where: { orderId: job.orderId },
                    data: {
                        attempts: { increment: 1 },
                        lastError: "PAYMENT_NOT_FOUND",
                        nextAttemptAt: this.buildNextRetryTime(job.attempts + 1),
                    },
                });
                continue;
            }
            const result = await this.confirm(job.userId, paymentId);
            if (result.ok) {
                await this.prisma.paymentRetry.update({
                    where: { orderId: job.orderId },
                    data: { status: "SUCCEEDED", lastError: "" },
                });
                continue;
            }
            const attempts = job.attempts + 1;
            const status = attempts >= 3 ? "FAILED" : "PENDING";
            await this.prisma.paymentRetry.update({
                where: { orderId: job.orderId },
                data: {
                    attempts,
                    status,
                    lastError: result.error || "RETRY_FAILED",
                    nextAttemptAt: this.buildNextRetryTime(attempts),
                },
            });
        }
    }
    async create(userId, packageId, provider) {
        const pkg = await (0, topup_1.getTopupPackage)(this.prisma, packageId);
        if (!pkg) {
            return null;
        }
        const order = await this.prisma.order.create({
            data: {
                userId,
                packageId: pkg.packageId,
                amount: pkg.price,
                currency: "USD",
                status: order_status_1.ORDER_STATUS.PENDING,
            },
        });
        const payment = await this.prisma.paymentIntent.create({
            data: {
                userId,
                orderId: order.id,
                provider: provider || "stripe",
                status: order_status_1.PAYMENT_STATUS.AUTHORIZED,
            },
        });
        return {
            order,
            payment: {
                paymentId: payment.id,
                orderId: order.id,
                provider: payment.provider,
                status: payment.status,
                createdAt: payment.createdAt,
            },
        };
    }
    async confirm(userId, paymentId) {
        if (!paymentId) {
            return { ok: false, error: "PAYMENT_NOT_FOUND" };
        }
        const payment = await this.prisma.paymentIntent.findUnique({ where: { id: paymentId } });
        if (!payment || payment.userId !== userId) {
            return { ok: false, error: "PAYMENT_NOT_FOUND" };
        }
        const order = await this.prisma.order.findUnique({ where: { id: payment.orderId } });
        if (!order || order.userId !== userId) {
            return { ok: false, error: "ORDER_NOT_FOUND" };
        }
        if (order.status === order_status_1.ORDER_STATUS.PAID) {
            const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
            return { ok: true, order, wallet };
        }
        const blockedStatuses = [
            order_status_1.ORDER_STATUS.FAILED,
            order_status_1.ORDER_STATUS.TIMEOUT,
            order_status_1.ORDER_STATUS.REFUNDED,
            order_status_1.ORDER_STATUS.DISPUTED,
            order_status_1.ORDER_STATUS.CHARGEBACK,
        ];
        if (blockedStatuses.includes(String(order.status))) {
            return { ok: false, error: "ORDER_NOT_PAYABLE" };
        }
        const pkg = await (0, topup_1.getTopupPackage)(this.prisma, order.packageId);
        if (!pkg) {
            return { ok: false, error: "INVALID_PACKAGE" };
        }
        const result = await this.prisma.$transaction(async (tx) => {
            const wallet = await tx.wallet.upsert({
                where: { userId },
                update: {
                    paidPts: { increment: pkg.paidPts || 0 },
                    bonusPts: { increment: pkg.bonusPts || 0 },
                },
                create: {
                    userId,
                    paidPts: pkg.paidPts || 0,
                    bonusPts: pkg.bonusPts || 0,
                    plan: "free",
                },
            });
            const nextOrder = await tx.order.update({
                where: { id: order.id },
                data: { status: order_status_1.ORDER_STATUS.PAID, paidAt: new Date() },
            });
            await tx.paymentIntent.update({
                where: { id: payment.id },
                data: { status: order_status_1.PAYMENT_STATUS.CAPTURED },
            });
            return { wallet, order: nextOrder };
        });
        return { ok: true, order: result.order, wallet: result.wallet };
    }
    async refund(userId, orderId) {
        if (!orderId) {
            return { ok: false, error: "ORDER_NOT_FOUND" };
        }
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order || order.userId !== userId) {
            return { ok: false, error: "ORDER_NOT_FOUND" };
        }
        if (order.status !== order_status_1.ORDER_STATUS.PAID) {
            return { ok: false, error: "ORDER_NOT_PAID" };
        }
        const pkg = await (0, topup_1.getTopupPackage)(this.prisma, order.packageId);
        if (!pkg) {
            return { ok: false, error: "INVALID_PACKAGE" };
        }
        const result = await this.prisma.$transaction(async (tx) => {
            const wallet = await tx.wallet.findUnique({ where: { userId } });
            const paidPts = Math.max(0, ((wallet === null || wallet === void 0 ? void 0 : wallet.paidPts) || 0) - (pkg.paidPts || 0));
            const bonusPts = Math.max(0, ((wallet === null || wallet === void 0 ? void 0 : wallet.bonusPts) || 0) - (pkg.bonusPts || 0));
            const nextWallet = await tx.wallet.upsert({
                where: { userId },
                update: { paidPts, bonusPts },
                create: { userId, paidPts, bonusPts, plan: "free" },
            });
            const nextOrder = await tx.order.update({
                where: { id: order.id },
                data: { status: order_status_1.ORDER_STATUS.REFUNDED },
            });
            return { wallet: nextWallet, order: nextOrder };
        });
        return { ok: true, order: result.order, wallet: result.wallet, refundShortfall: 0 };
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PaymentsService);
