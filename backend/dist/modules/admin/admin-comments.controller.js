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
exports.AdminCommentsController = void 0;
const common_1 = require("@nestjs/common");
const admin_1 = require("../../common/utils/admin");
const errors_1 = require("../../common/utils/errors");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let AdminCommentsController = class AdminCommentsController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(req, res) {
        if (!(0, admin_1.isAdminAuthorized)(req)) {
            res.status(403);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.FORBIDDEN);
        }
        const comments = await this.prisma.comment.findMany({
            orderBy: { createdAt: "desc" },
            include: { user: { select: { email: true } } },
        });
        return {
            comments: comments.map((item) => {
                var _a;
                return ({
                    id: item.id,
                    seriesId: item.seriesId,
                    userId: item.userId,
                    author: ((_a = item.user) === null || _a === void 0 ? void 0 : _a.email) || "Guest",
                    text: item.text,
                    hidden: item.hidden,
                    createdAt: item.createdAt,
                });
            }),
        };
    }
    async hide(body, req, res) {
        if (!(0, admin_1.isAdminAuthorized)(req, body)) {
            res.status(403);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.FORBIDDEN);
        }
        const seriesId = body === null || body === void 0 ? void 0 : body.seriesId;
        const commentId = body === null || body === void 0 ? void 0 : body.commentId;
        const hidden = Boolean(body === null || body === void 0 ? void 0 : body.hidden);
        if (!seriesId || !commentId) {
            res.status(400);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.INVALID_REQUEST);
        }
        const comment = await this.prisma.comment.update({
            where: { id: commentId },
            data: { hidden },
        });
        return { comment };
    }
    async recalc(body, req, res) {
        if (!(0, admin_1.isAdminAuthorized)(req, body)) {
            res.status(403);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.FORBIDDEN);
        }
        const seriesId = body === null || body === void 0 ? void 0 : body.seriesId;
        if (!seriesId) {
            res.status(400);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.INVALID_REQUEST);
        }
        const stats = await this.prisma.rating.aggregate({
            where: { seriesId },
            _avg: { rating: true },
            _count: { rating: true },
        });
        const rating = Number(stats._avg.rating || 0);
        const count = Number(stats._count.rating || 0);
        await this.prisma.series.update({
            where: { id: seriesId },
            data: { rating, ratingCount: count },
        });
        return { rating: Number(rating.toFixed(2)), count };
    }
};
exports.AdminCommentsController = AdminCommentsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminCommentsController.prototype, "list", null);
__decorate([
    (0, common_1.Patch)("hide"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminCommentsController.prototype, "hide", null);
__decorate([
    (0, common_1.Patch)("recalc-rating"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminCommentsController.prototype, "recalc", null);
exports.AdminCommentsController = AdminCommentsController = __decorate([
    (0, common_1.Controller)("admin/comments"),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminCommentsController);
