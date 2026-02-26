import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";

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

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureDefaults() {
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
}
