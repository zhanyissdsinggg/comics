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
exports.WalletController = void 0;
const common_1 = require("@nestjs/common");
const wallet_service_1 = require("./wallet.service");
const auth_1 = require("../../common/utils/auth");
const errors_1 = require("../../common/utils/errors");
const limits_1 = require("../../common/storage/limits");
const subscription_1 = require("../../common/utils/subscription");
const stats_service_1 = require("../../common/services/stats.service");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let WalletController = class WalletController {
    constructor(walletService, statsService, prisma) {
        this.walletService = walletService;
        this.statsService = statsService;
        this.prisma = prisma;
    }
    async getWallet(req, res) {
        const userId = (0, auth_1.getUserIdFromRequest)(req, false);
        if (!userId) {
            res.status(401);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.UNAUTHENTICATED);
        }
        const wallet = await this.walletService.getWallet(userId);
        return { wallet: await (0, subscription_1.buildWalletSnapshot)(this.prisma, userId, wallet) };
    }
    async topup(body, req, res) {
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
        const rate = await (0, limits_1.checkRateLimit)(this.prisma, userId, "wallet_topup", 10, 60);
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
        const packageId = (body === null || body === void 0 ? void 0 : body.packageId) || (body === null || body === void 0 ? void 0 : body.id);
        const result = await this.walletService.topup(userId, packageId);
        if (!result.ok) {
            res.status(result.status || 400);
            const body = (0, errors_1.buildError)(result.error || errors_1.ERROR_CODES.INTERNAL);
            if (idempotencyKey) {
                await (0, limits_1.setIdempotencyRecord)(this.prisma, userId, String(idempotencyKey), {
                    status: result.status || 400,
                    body,
                });
            }
            return body;
        }
        const responseBody = {
            ok: true,
            wallet: await (0, subscription_1.buildWalletSnapshot)(this.prisma, userId, result.wallet),
            order: result.order ? { ...result.order, orderId: result.order.id } : null,
        };
        await this.statsService.recordPaidOrder();
        if (idempotencyKey) {
            await (0, limits_1.setIdempotencyRecord)(this.prisma, userId, String(idempotencyKey), {
                status: 200,
                body: responseBody,
            });
        }
        return responseBody;
    }
};
exports.WalletController = WalletController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "getWallet", null);
__decorate([
    (0, common_1.Post)("topup"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "topup", null);
exports.WalletController = WalletController = __decorate([
    (0, common_1.Controller)("wallet"),
    __metadata("design:paramtypes", [wallet_service_1.WalletService,
        stats_service_1.StatsService,
        prisma_service_1.PrismaService])
], WalletController);
