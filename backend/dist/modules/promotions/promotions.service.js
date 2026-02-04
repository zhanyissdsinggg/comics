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
exports.PromotionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const DEFAULT_PROMOTIONS = [
    {
        id: "promo_first_purchase",
        title: "First purchase bonus",
        type: "FIRST_PURCHASE",
        active: true,
        bonusMultiplier: 2,
        description: "Double bonus POINTS for your first purchase.",
        segment: "all",
        ctaType: "STORE",
        ctaLabel: "View offer",
    },
    {
        id: "promo_holiday",
        title: "Holiday deal",
        type: "HOLIDAY",
        active: true,
        description: "Limited-time discount for your next unlock.",
        segment: "all",
        ctaType: "STORE",
        ctaLabel: "View offer",
    },
    {
        id: "promo_returning",
        title: "Welcome back",
        type: "RETURNING",
        active: true,
        description: "Claim your welcome back bonus and keep reading.",
        segment: "returning",
        ctaType: "STORE",
        ctaLabel: "View offer",
    },
];
let PromotionsService = class PromotionsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async ensureDefaults() {
        const count = await this.prisma.promotion.count();
        if (count > 0) {
            return;
        }
        await this.prisma.promotion.createMany({
            data: DEFAULT_PROMOTIONS.map((promo) => ({
                id: promo.id,
                title: promo.title,
                description: promo.description,
                type: promo.type,
                segment: promo.segment,
                active: promo.active,
                bonusMultiplier: promo.bonusMultiplier || 0,
                ctaType: promo.ctaType,
                ctaLabel: promo.ctaLabel,
            })),
        });
    }
    async list() {
        await this.ensureDefaults();
        return this.prisma.promotion.findMany({ orderBy: { title: "asc" } });
    }
};
exports.PromotionsService = PromotionsService;
exports.PromotionsService = PromotionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PromotionsService);
