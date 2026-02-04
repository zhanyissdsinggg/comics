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
exports.EntitlementsController = void 0;
const common_1 = require("@nestjs/common");
const entitlements_service_1 = require("./entitlements.service");
const auth_1 = require("../../common/utils/auth");
const errors_1 = require("../../common/utils/errors");
const limits_1 = require("../../common/storage/limits");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let EntitlementsController = class EntitlementsController {
    constructor(entitlementsService, prisma) {
        this.entitlementsService = entitlementsService;
        this.prisma = prisma;
    }
    async getEntitlement(seriesId, req, res) {
        const userId = (0, auth_1.getUserIdFromRequest)(req, false);
        if (!userId) {
            res.status(401);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.UNAUTHENTICATED);
        }
        if (!seriesId) {
            res.status(400);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.INVALID_REQUEST);
        }
        const entitlement = await this.entitlementsService.getEntitlement(userId, seriesId);
        return { entitlement };
    }
    async unlock(body, req, res) {
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
        const rate = await (0, limits_1.checkRateLimit)(this.prisma, userId, "unlock", 30, 60);
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
        const seriesId = body === null || body === void 0 ? void 0 : body.seriesId;
        const episodeId = body === null || body === void 0 ? void 0 : body.episodeId;
        const method = (body === null || body === void 0 ? void 0 : body.method) || "WALLET";
        const offerId = (body === null || body === void 0 ? void 0 : body.offerId) || "";
        const episodeIds = Array.isArray(body === null || body === void 0 ? void 0 : body.episodeIds) ? body.episodeIds : [];
        if (!seriesId || (!episodeId && method !== "PACK")) {
            res.status(400);
            const responseBody = (0, errors_1.buildError)(errors_1.ERROR_CODES.INVALID_REQUEST);
            if (idempotencyKey) {
                await (0, limits_1.setIdempotencyRecord)(this.prisma, userId, String(idempotencyKey), {
                    status: 400,
                    body: responseBody,
                });
            }
            return responseBody;
        }
        if (method === "TTF") {
            const result = await this.entitlementsService.unlockWithTtf(userId, seriesId, episodeId);
            if (!result.ok) {
                res.status(result.status || 400);
                const shortfallPts = "shortfallPts" in result ? result.shortfallPts : undefined;
                const responseBody = (0, errors_1.buildError)(result.error || errors_1.ERROR_CODES.INTERNAL, { shortfallPts });
                if (idempotencyKey) {
                    await (0, limits_1.setIdempotencyRecord)(this.prisma, userId, String(idempotencyKey), {
                        status: result.status || 400,
                        body: responseBody,
                    });
                }
                return responseBody;
            }
            const responseBody = { ok: true, entitlement: result.entitlement, wallet: result.wallet };
            if (idempotencyKey) {
                await (0, limits_1.setIdempotencyRecord)(this.prisma, userId, String(idempotencyKey), {
                    status: 200,
                    body: responseBody,
                });
            }
            return responseBody;
        }
        if (method === "PACK") {
            const result = await this.entitlementsService.unlockPack(userId, seriesId, episodeIds, offerId);
            if (!result.ok) {
                res.status(result.status || 400);
                const shortfallPts = "shortfallPts" in result ? result.shortfallPts : undefined;
                const responseBody = (0, errors_1.buildError)(result.error || errors_1.ERROR_CODES.INTERNAL, { shortfallPts });
                if (idempotencyKey) {
                    await (0, limits_1.setIdempotencyRecord)(this.prisma, userId, String(idempotencyKey), {
                        status: result.status || 400,
                        body: responseBody,
                    });
                }
                return responseBody;
            }
            const responseBody = { ok: true, entitlement: result.entitlement, wallet: result.wallet };
            if (idempotencyKey) {
                await (0, limits_1.setIdempotencyRecord)(this.prisma, userId, String(idempotencyKey), {
                    status: 200,
                    body: responseBody,
                });
            }
            return responseBody;
        }
        const result = await this.entitlementsService.unlockWithWallet(userId, seriesId, episodeId);
        if (!result.ok) {
            res.status(result.status || 400);
            const shortfallPts = "shortfallPts" in result ? result.shortfallPts : undefined;
            const responseBody = (0, errors_1.buildError)(result.error || errors_1.ERROR_CODES.INTERNAL, { shortfallPts });
            if (idempotencyKey) {
                await (0, limits_1.setIdempotencyRecord)(this.prisma, userId, String(idempotencyKey), {
                    status: result.status || 400,
                    body: responseBody,
                });
            }
            return responseBody;
        }
        const responseBody = { ok: true, entitlement: result.entitlement, wallet: result.wallet };
        if (idempotencyKey) {
            await (0, limits_1.setIdempotencyRecord)(this.prisma, userId, String(idempotencyKey), {
                status: 200,
                body: responseBody,
            });
        }
        return responseBody;
    }
};
exports.EntitlementsController = EntitlementsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)("seriesId")),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], EntitlementsController.prototype, "getEntitlement", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], EntitlementsController.prototype, "unlock", null);
exports.EntitlementsController = EntitlementsController = __decorate([
    (0, common_1.Controller)("entitlements"),
    __metadata("design:paramtypes", [entitlements_service_1.EntitlementsService,
        prisma_service_1.PrismaService])
], EntitlementsController);
