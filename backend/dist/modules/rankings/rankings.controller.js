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
exports.RankingsController = void 0;
const common_1 = require("@nestjs/common");
const rankings_service_1 = require("./rankings.service");
const adult_gate_1 = require("../../common/utils/adult-gate");
const errors_1 = require("../../common/utils/errors");
let RankingsController = class RankingsController {
    constructor(rankingsService) {
        this.rankingsService = rankingsService;
    }
    async list(type, adultParam, req, res) {
        const adult = (0, adult_gate_1.parseBool)(adultParam);
        if (adult === true) {
            const gate = (0, adult_gate_1.checkAdultGate)(req.cookies || {});
            if (!gate.ok) {
                res.status(403);
                return (0, errors_1.buildError)(errors_1.ERROR_CODES.ADULT_GATED, { reason: gate.reason });
            }
        }
        const rankings = await this.rankingsService.list(type || "popular", adult === true);
        return { rankings };
    }
};
exports.RankingsController = RankingsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)("type")),
    __param(1, (0, common_1.Query)("adult")),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], RankingsController.prototype, "list", null);
exports.RankingsController = RankingsController = __decorate([
    (0, common_1.Controller)("rankings"),
    __metadata("design:paramtypes", [rankings_service_1.RankingsService])
], RankingsController);
