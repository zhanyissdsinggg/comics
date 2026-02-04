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
exports.RatingsController = void 0;
const common_1 = require("@nestjs/common");
const ratings_service_1 = require("./ratings.service");
const auth_1 = require("../../common/utils/auth");
const errors_1 = require("../../common/utils/errors");
let RatingsController = class RatingsController {
    constructor(ratingsService) {
        this.ratingsService = ratingsService;
    }
    async setRating(body, req, res) {
        const userId = (0, auth_1.getUserIdFromRequest)(req, false);
        if (!userId) {
            res.status(401);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.UNAUTHENTICATED);
        }
        const seriesId = body === null || body === void 0 ? void 0 : body.seriesId;
        const value = Number((body === null || body === void 0 ? void 0 : body.rating) || 0);
        if (!seriesId || !value) {
            res.status(400);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.INVALID_REQUEST);
        }
        const result = await this.ratingsService.setRating(seriesId, userId, value);
        return { rating: result.rating, count: result.count };
    }
};
exports.RatingsController = RatingsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], RatingsController.prototype, "setRating", null);
exports.RatingsController = RatingsController = __decorate([
    (0, common_1.Controller)("ratings"),
    __metadata("design:paramtypes", [ratings_service_1.RatingsService])
], RatingsController);
