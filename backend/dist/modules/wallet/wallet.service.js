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
exports.WalletService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const topup_1 = require("../../common/config/topup");
const order_status_1 = require("../../common/utils/order-status");
let WalletService = class WalletService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getWallet(userId) {
        const existing = await this.prisma.wallet.findUnique({ where: { userId } });
        if (existing) {
            return existing;
        }
        return this.prisma.wallet.create({
            data: { userId, paidPts: 0, bonusPts: 0, plan: "free" },
        });
    }
    async topup(userId, packageId) {
        const pkg = await (0, topup_1.getTopupPackage)(this.prisma, packageId);
        if (!pkg) {
            return { ok: false, status: 400, error: "INVALID_PACKAGE" };
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
            const order = await tx.order.create({
                data: {
                    userId,
                    packageId: pkg.packageId,
                    amount: pkg.price,
                    currency: "USD",
                    status: order_status_1.ORDER_STATUS.PAID,
                    paidAt: new Date(),
                },
            });
            return { wallet, order };
        });
        return { ok: true, wallet: result.wallet, order: result.order };
    }
};
exports.WalletService = WalletService;
exports.WalletService = WalletService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WalletService);
