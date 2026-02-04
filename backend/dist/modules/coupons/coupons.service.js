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
exports.CouponsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const COUPON_CATALOG = {
    HOLIDAY10: {
        id: "HOLIDAY10",
        code: "HOLIDAY10",
        type: "DISCOUNT_PCT",
        value: 10,
        remainingUses: 1,
        label: "Holiday 10% OFF",
    },
    WELCOME5: {
        id: "WELCOME5",
        code: "WELCOME5",
        type: "DISCOUNT_PTS",
        value: 5,
        remainingUses: 1,
        label: "Welcome 5 POINTS",
    },
};
let CouponsService = class CouponsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async ensureCatalog() {
        const count = await this.prisma.coupon.count();
        if (count > 0) {
            return;
        }
        await this.prisma.coupon.createMany({
            data: Object.values(COUPON_CATALOG),
        });
    }
    async list(userId) {
        await this.ensureCatalog();
        const claimed = await this.prisma.userCoupon.findMany({
            where: { userId },
            include: { coupon: true },
            orderBy: { claimedAt: "desc" },
        });
        return claimed.map((item) => ({
            ...item.coupon,
            claimedAt: item.claimedAt,
        }));
    }
    async claim(userId, code) {
        await this.ensureCatalog();
        const key = String(code || "").trim().toUpperCase();
        const coupon = await this.prisma.coupon.findUnique({ where: { code: key } });
        if (!coupon) {
            return { ok: false, message: "Invalid coupon." };
        }
        const existing = await this.prisma.userCoupon.findUnique({
            where: { userId_couponId: { userId, couponId: coupon.id } },
        });
        if (existing) {
            return { ok: true, coupons: await this.list(userId) };
        }
        if ((coupon.remainingUses || 0) <= 0) {
            return { ok: false, message: "Coupon exhausted." };
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.userCoupon.create({
                data: { userId, couponId: coupon.id },
            });
            await tx.coupon.update({
                where: { id: coupon.id },
                data: { remainingUses: { decrement: 1 } },
            });
        });
        return { ok: true, coupons: await this.list(userId) };
    }
};
exports.CouponsService = CouponsService;
exports.CouponsService = CouponsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CouponsService);
