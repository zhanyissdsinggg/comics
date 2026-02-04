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
exports.PaymentsController = void 0;
const common_1 = require("@nestjs/common");
const payments_service_1 = require("./payments.service");
const auth_1 = require("../../common/utils/auth");
const errors_1 = require("../../common/utils/errors");
const limits_1 = require("../../common/storage/limits");
const topup_1 = require("../../common/config/topup");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const subscription_1 = require("../../common/utils/subscription");
const stats_service_1 = require("../../common/services/stats.service");
const order_status_1 = require("../../common/utils/order-status");
const crypto_1 = require("crypto");
const ip_1 = require("../../common/utils/ip");
let PaymentsController = class PaymentsController {
    constructor(paymentsService, prisma, statsService) {
        this.paymentsService = paymentsService;
        this.prisma = prisma;
        this.statsService = statsService;
    }
    async logAudit(action, payload, req) {
        try {
            await this.prisma.auditLog.create({
                data: {
                    userId: payload.userId || null,
                    action,
                    targetType: payload.targetType || "payment",
                    targetId: payload.targetId || "",
                    payload,
                    requestId: req.requestId || "",
                },
            });
        }
        catch {
        }
    }
    verifyWebhookSignature(req, body) {
        const secret = process.env.WEBHOOK_SECRET || "";
        if (!secret) {
            return true;
        }
        const signature = String(req.headers["x-webhook-signature"] || "");
        if (!signature) {
            return false;
        }
        const rawBody = req.rawBody || JSON.stringify(body || {});
        const digest = (0, crypto_1.createHmac)("sha256", secret).update(rawBody).digest("hex");
        try {
            return (0, crypto_1.timingSafeEqual)(Buffer.from(signature), Buffer.from(digest));
        }
        catch {
            return false;
        }
    }
    async create(body, req, res) {
        var _a;
        const userId = (0, auth_1.getUserIdFromRequest)(req, false);
        if (!userId) {
            res.status(401);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.UNAUTHENTICATED);
        }
        const idempotencyKey = (body === null || body === void 0 ? void 0 : body.idempotencyKey) || req.headers["idempotency-key"];
        if (idempotencyKey) {
            const cached = await (0, limits_1.getIdempotencyRecord)(this.prisma, userId, String(idempotencyKey));
            if (cached) {
                res.status(cached.status || 200);
                return cached.body;
            }
        }
        const rate = await (0, limits_1.checkRateLimit)(this.prisma, userId, "topup_create", 10, 60);
        if (!rate.ok) {
            res.status(429);
            const body = (0, errors_1.buildError)(errors_1.ERROR_CODES.RATE_LIMITED, { retryAfterSec: rate.retryAfterSec });
            if (idempotencyKey) {
                await (0, limits_1.setIdempotencyRecord)(this.prisma, userId, String(idempotencyKey), {
                    status: 429,
                    body,
                });
            }
            return body;
        }
        const packageId = body === null || body === void 0 ? void 0 : body.packageId;
        const provider = (body === null || body === void 0 ? void 0 : body.provider) || "stripe";
        const created = await this.paymentsService.create(userId, packageId, provider);
        if (!created) {
            res.status(400);
            const body = (0, errors_1.buildError)(errors_1.ERROR_CODES.INVALID_REQUEST);
            if (idempotencyKey) {
                await (0, limits_1.setIdempotencyRecord)(this.prisma, userId, String(idempotencyKey), {
                    status: 400,
                    body,
                });
            }
            return body;
        }
        const responseBody = {
            payment: created.payment,
            order: created.order ? { ...created.order, orderId: created.order.id } : null,
        };
        await this.logAudit("payment_create", { userId, targetType: "order", targetId: ((_a = created.order) === null || _a === void 0 ? void 0 : _a.id) || "", packageId }, req);
        if (idempotencyKey) {
            await (0, limits_1.setIdempotencyRecord)(this.prisma, userId, String(idempotencyKey), {
                status: 200,
                body: responseBody,
            });
        }
        return responseBody;
    }
    async confirm(body, req, res) {
        var _a;
        const userId = (0, auth_1.getUserIdFromRequest)(req, false);
        if (!userId) {
            res.status(401);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.UNAUTHENTICATED);
        }
        const idempotencyKey = (body === null || body === void 0 ? void 0 : body.idempotencyKey) || req.headers["idempotency-key"];
        if (idempotencyKey) {
            const cached = await (0, limits_1.getIdempotencyRecord)(this.prisma, userId, String(idempotencyKey));
            if (cached) {
                res.status(cached.status || 200);
                return cached.body;
            }
        }
        const rate = await (0, limits_1.checkRateLimit)(this.prisma, userId, "topup_confirm", 10, 60);
        if (!rate.ok) {
            res.status(429);
            const body = (0, errors_1.buildError)(errors_1.ERROR_CODES.RATE_LIMITED, { retryAfterSec: rate.retryAfterSec });
            if (idempotencyKey) {
                await (0, limits_1.setIdempotencyRecord)(this.prisma, userId, String(idempotencyKey), {
                    status: 429,
                    body,
                });
            }
            return body;
        }
        const paymentId = body === null || body === void 0 ? void 0 : body.paymentId;
        const result = await this.paymentsService.confirm(userId, paymentId);
        if (!result.ok) {
            res.status(400);
            const body = (0, errors_1.buildError)(result.error || errors_1.ERROR_CODES.INTERNAL);
            await this.logAudit("payment_confirm_failed", { userId, targetType: "payment", targetId: paymentId || "", error: body.error }, req);
            if (idempotencyKey) {
                await (0, limits_1.setIdempotencyRecord)(this.prisma, userId, String(idempotencyKey), {
                    status: 400,
                    body,
                });
            }
            return body;
        }
        const responseBody = {
            ok: true,
            order: result.order ? { ...result.order, orderId: result.order.id } : null,
            wallet: await (0, subscription_1.buildWalletSnapshot)(this.prisma, userId, result.wallet),
        };
        await this.logAudit("payment_confirm", { userId, targetType: "payment", targetId: paymentId || "", orderId: ((_a = result.order) === null || _a === void 0 ? void 0 : _a.id) || "" }, req);
        await this.statsService.recordPaidOrder();
        if (idempotencyKey) {
            await (0, limits_1.setIdempotencyRecord)(this.prisma, userId, String(idempotencyKey), {
                status: 200,
                body: responseBody,
            });
        }
        return responseBody;
    }
    async refund(body, req, res) {
        const userId = (0, auth_1.getUserIdFromRequest)(req, false);
        if (!userId) {
            res.status(401);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.UNAUTHENTICATED);
        }
        const idempotencyKey = (body === null || body === void 0 ? void 0 : body.idempotencyKey) || req.headers["idempotency-key"];
        if (idempotencyKey) {
            const cached = await (0, limits_1.getIdempotencyRecord)(this.prisma, userId, String(idempotencyKey));
            if (cached) {
                res.status(cached.status || 200);
                return cached.body;
            }
        }
        const rate = await (0, limits_1.checkRateLimit)(this.prisma, userId, "refund", 5, 60);
        if (!rate.ok) {
            res.status(429);
            const body = (0, errors_1.buildError)(errors_1.ERROR_CODES.RATE_LIMITED, { retryAfterSec: rate.retryAfterSec });
            if (idempotencyKey) {
                await (0, limits_1.setIdempotencyRecord)(this.prisma, userId, String(idempotencyKey), {
                    status: 429,
                    body,
                });
            }
            return body;
        }
        const orderId = body === null || body === void 0 ? void 0 : body.orderId;
        const result = await this.paymentsService.refund(userId, orderId);
        if (!result.ok) {
            res.status(400);
            const body = (0, errors_1.buildError)(result.error || errors_1.ERROR_CODES.INTERNAL);
            await this.logAudit("payment_refund_failed", { userId, targetType: "order", targetId: orderId || "", error: body.error }, req);
            if (idempotencyKey) {
                await (0, limits_1.setIdempotencyRecord)(this.prisma, userId, String(idempotencyKey), {
                    status: 400,
                    body,
                });
            }
            return body;
        }
        const responseBody = {
            ok: true,
            order: result.order ? { ...result.order, orderId: result.order.id } : null,
            wallet: await (0, subscription_1.buildWalletSnapshot)(this.prisma, userId, result.wallet),
            refundShortfall: result.refundShortfall,
        };
        await this.logAudit("payment_refund", { userId, targetType: "order", targetId: orderId || "" }, req);
        if (idempotencyKey) {
            await (0, limits_1.setIdempotencyRecord)(this.prisma, userId, String(idempotencyKey), {
                status: 200,
                body: responseBody,
            });
        }
        return responseBody;
    }
    async webhook(body, req, res) {
        const eventType = body === null || body === void 0 ? void 0 : body.eventType;
        const orderId = body === null || body === void 0 ? void 0 : body.orderId;
        const userId = (body === null || body === void 0 ? void 0 : body.userId) || (0, auth_1.getUserIdFromRequest)(req, false);
        const eventId = (body === null || body === void 0 ? void 0 : body.eventId) || req.headers["idempotency-key"];
        if (!eventType || !orderId || !userId) {
            res.status(400);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.INVALID_REQUEST);
        }
        const ip = (0, ip_1.getClientIp)(req);
        const rate = await (0, limits_1.checkRateLimitByIp)(this.prisma, ip, "webhook", 120, 60);
        if (!rate.ok) {
            res.status(429);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.RATE_LIMITED, { retryAfterSec: rate.retryAfterSec });
        }
        if (!this.verifyWebhookSignature(req, body)) {
            res.status(401);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.UNAUTHENTICATED, { reason: "INVALID_WEBHOOK_SIGNATURE" });
        }
        if (eventId) {
            const cached = await (0, limits_1.getIdempotencyRecord)(this.prisma, userId, String(eventId));
            if (cached) {
                res.status(cached.status || 200);
                return cached.body;
            }
        }
        if (eventType === "payment_failed" || eventType === "payment_timeout") {
            await this.prisma.order.updateMany({
                where: { id: orderId, userId },
                data: { status: eventType === "payment_timeout" ? order_status_1.ORDER_STATUS.TIMEOUT : order_status_1.ORDER_STATUS.FAILED },
            });
            await this.logAudit("payment_webhook_failed", { userId, targetType: "order", targetId: orderId, eventType }, req);
            if (eventType === "payment_timeout") {
                const payment = await this.prisma.paymentIntent.findFirst({
                    where: { orderId },
                    orderBy: { createdAt: "desc" },
                });
                await this.paymentsService.enqueueRetry(userId, orderId, payment === null || payment === void 0 ? void 0 : payment.id, "TIMEOUT");
            }
            const responseBody = { ok: true };
            if (eventId) {
                await (0, limits_1.setIdempotencyRecord)(this.prisma, userId, String(eventId), {
                    status: 200,
                    body: responseBody,
                });
            }
            return responseBody;
        }
        if (eventType === "payment_refunded") {
            const result = await this.paymentsService.refund(userId, orderId);
            if (!result.ok) {
                res.status(400);
                const responseBody = (0, errors_1.buildError)(result.error || errors_1.ERROR_CODES.INTERNAL);
                if (eventId) {
                    await (0, limits_1.setIdempotencyRecord)(this.prisma, userId, String(eventId), {
                        status: 400,
                        body: responseBody,
                    });
                }
                return responseBody;
            }
            if (eventId) {
                await (0, limits_1.setIdempotencyRecord)(this.prisma, userId, String(eventId), {
                    status: 200,
                    body: result,
                });
            }
            await this.logAudit("payment_webhook_refund", { userId, targetType: "order", targetId: orderId }, req);
            return result;
        }
        if (eventType === "payment_dispute") {
            await this.prisma.order.updateMany({
                where: { id: orderId, userId },
                data: { status: order_status_1.ORDER_STATUS.DISPUTED },
            });
            await this.logAudit("payment_webhook_dispute", { userId, targetType: "order", targetId: orderId }, req);
            const responseBody = { ok: true };
            if (eventId) {
                await (0, limits_1.setIdempotencyRecord)(this.prisma, userId, String(eventId), {
                    status: 200,
                    body: responseBody,
                });
            }
            return responseBody;
        }
        if (eventType === "payment_chargeback") {
            const order = await this.prisma.order.findUnique({ where: { id: orderId } });
            if (!order || order.userId !== userId) {
                res.status(404);
                return (0, errors_1.buildError)(errors_1.ERROR_CODES.INVALID_REQUEST);
            }
            if (order.status === order_status_1.ORDER_STATUS.CHARGEBACK) {
                return { ok: true };
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
                    data: { status: order_status_1.ORDER_STATUS.CHARGEBACK },
                });
                return { nextWallet, nextOrder };
            });
            const responseBody = { ok: true, order: next.nextOrder, wallet: next.nextWallet };
            await this.logAudit("payment_webhook_chargeback", { userId, targetType: "order", targetId: orderId }, req);
            if (eventId) {
                await (0, limits_1.setIdempotencyRecord)(this.prisma, userId, String(eventId), {
                    status: 200,
                    body: responseBody,
                });
            }
            return responseBody;
        }
        res.status(400);
        const responseBody = (0, errors_1.buildError)(errors_1.ERROR_CODES.INVALID_REQUEST);
        if (eventId) {
            await (0, limits_1.setIdempotencyRecord)(this.prisma, userId, String(eventId), {
                status: 400,
                body: responseBody,
            });
        }
        return responseBody;
    }
};
exports.PaymentsController = PaymentsController;
__decorate([
    (0, common_1.Post)("create"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)("confirm"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "confirm", null);
__decorate([
    (0, common_1.Post)("refund"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "refund", null);
__decorate([
    (0, common_1.Post)("webhook"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "webhook", null);
exports.PaymentsController = PaymentsController = __decorate([
    (0, common_1.Controller)("payments"),
    __metadata("design:paramtypes", [payments_service_1.PaymentsService,
        prisma_service_1.PrismaService,
        stats_service_1.StatsService])
], PaymentsController);
