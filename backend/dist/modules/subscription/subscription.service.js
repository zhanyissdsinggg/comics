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
exports.SubscriptionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const plans_1 = require("../../common/config/plans");
const subscription_1 = require("../../common/utils/subscription");
let SubscriptionService = class SubscriptionService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async subscribe(userId, planId) {
        const plan = await (0, plans_1.getPlanById)(this.prisma, planId);
        if (!plan || plan.active === false) {
            return null;
        }
        const now = new Date();
        const renewAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        await this.prisma.subscription.upsert({
            where: { userId },
            update: { planId, active: true, startedAt: now, renewAt },
            create: { userId, planId, active: true, startedAt: now, renewAt },
        });
        await this.prisma.wallet.upsert({
            where: { userId },
            update: { plan: planId },
            create: { userId, paidPts: 0, bonusPts: 0, plan: planId },
        });
        return (0, subscription_1.getSubscriptionPayload)(this.prisma, userId);
    }
    async cancel(userId) {
        await this.prisma.subscription.updateMany({
            where: { userId },
            data: { active: false },
        });
        await this.prisma.wallet.upsert({
            where: { userId },
            update: { plan: "free" },
            create: { userId, paidPts: 0, bonusPts: 0, plan: "free" },
        });
        return null;
    }
};
exports.SubscriptionService = SubscriptionService;
exports.SubscriptionService = SubscriptionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SubscriptionService);
