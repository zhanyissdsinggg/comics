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
exports.SeriesController = void 0;
const common_1 = require("@nestjs/common");
const series_service_1 = require("./series.service");
const adult_gate_1 = require("../../common/utils/adult-gate");
const errors_1 = require("../../common/utils/errors");
const auth_1 = require("../../common/utils/auth");
const subscription_1 = require("../../common/utils/subscription");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let SeriesController = class SeriesController {
    constructor(seriesService, prisma) {
        this.seriesService = seriesService;
        this.prisma = prisma;
    }
    async list(adultParam, req, res) {
        const adult = (0, adult_gate_1.parseBool)(adultParam);
        if (adult === true) {
            const gate = (0, adult_gate_1.checkAdultGate)(req.cookies || {});
            if (!gate.ok) {
                res.status(403);
                return (0, errors_1.buildError)(errors_1.ERROR_CODES.ADULT_GATED, { reason: gate.reason });
            }
        }
        return { series: await this.seriesService.list(adult) };
    }
    async detail(id, req, res) {
        const userId = (0, auth_1.getUserIdFromRequest)(req, true);
        const subscription = userId ? await (0, subscription_1.getSubscriptionPayload)(this.prisma, userId) : null;
        const result = await this.seriesService.detail(id, subscription);
        if (!result) {
            res.status(404);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.NOT_FOUND);
        }
        if (result.series.adult) {
            const gate = (0, adult_gate_1.checkAdultGate)(req.cookies || {});
            if (!gate.ok) {
                res.status(403);
                return (0, errors_1.buildError)(errors_1.ERROR_CODES.ADULT_GATED, { reason: gate.reason });
            }
        }
        return result;
    }
};
exports.SeriesController = SeriesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)("adult")),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], SeriesController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(":id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], SeriesController.prototype, "detail", null);
exports.SeriesController = SeriesController = __decorate([
    (0, common_1.Controller)("series"),
    __metadata("design:paramtypes", [series_service_1.SeriesService,
        prisma_service_1.PrismaService])
], SeriesController);
