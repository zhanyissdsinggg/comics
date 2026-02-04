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
exports.SubscriptionController = void 0;
const common_1 = require("@nestjs/common");
const subscription_service_1 = require("./subscription.service");
const auth_1 = require("../../common/utils/auth");
const errors_1 = require("../../common/utils/errors");
let SubscriptionController = class SubscriptionController {
    constructor(subscriptionService) {
        this.subscriptionService = subscriptionService;
    }
    async subscribe(body, req, res) {
        const userId = (0, auth_1.getUserIdFromRequest)(req, false);
        if (!userId) {
            res.status(401);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.UNAUTHENTICATED);
        }
        const planId = body === null || body === void 0 ? void 0 : body.planId;
        if (!planId) {
            res.status(400);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.INVALID_REQUEST);
        }
        const subscription = await this.subscriptionService.subscribe(userId, planId);
        if (!subscription) {
            res.status(400);
            return (0, errors_1.buildError)("INVALID_PLAN");
        }
        return { subscription };
    }
    async cancel(req, res) {
        const userId = (0, auth_1.getUserIdFromRequest)(req, false);
        if (!userId) {
            res.status(401);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.UNAUTHENTICATED);
        }
        const subscription = await this.subscriptionService.cancel(userId);
        return { subscription };
    }
};
exports.SubscriptionController = SubscriptionController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "subscribe", null);
__decorate([
    (0, common_1.Delete)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "cancel", null);
exports.SubscriptionController = SubscriptionController = __decorate([
    (0, common_1.Controller)("subscription"),
    __metadata("design:paramtypes", [subscription_service_1.SubscriptionService])
], SubscriptionController);
