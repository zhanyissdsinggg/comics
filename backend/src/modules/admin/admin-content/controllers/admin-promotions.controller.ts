import { Body, Controller, Delete, Get, Patch, Post, UseGuards, BadRequestException, NotFoundException, Req } from "@nestjs/common";
import { Request } from "express";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";
import { UpdatePromotionDto, CreatePromotionDto } from "../dtos/admin-content.dto";

@Controller("admin/promotions")
@UseGuards(AdminAuthGuard)
export class AdminPromotionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    const promotions = await this.prisma.promotion.findMany({ orderBy: { title: "asc" } });
    return { promotions };
  }

  @Get("defaults")
  async defaults() {
    const fallback = await this.prisma.promotionFallback.findUnique({
      where: { key: "default" },
    });
    return { defaults: fallback?.payload || { ctaType: "STORE", ctaTarget: "", ctaLabel: "View offer" } };
  }

  @Patch("defaults")
  async updateDefaults(@Body() body: UpdatePromotionDto) {
    const payload = body?.defaults || {};
    const defaults = await this.prisma.promotionFallback.upsert({
      where: { key: "default" },
      update: { payload },
      create: { key: "default", payload },
    });
    return { defaults: defaults.payload };
  }

  @Post()
  async create(@Body() body: CreatePromotionDto) {
    const promo = body?.promotion;
    if (!promo?.id) {
      throw new BadRequestException("缺少promotion.id参数");
    }
    const payload = {
      id: String(promo.id),
      title: String(promo.title || "Untitled Promotion"),
      description: String(promo.description || ""),
      type: String(promo.type || "GENERIC"),
      segment: String(promo.segment || "ALL"),
      active: Boolean(promo.active),
      startAt: promo.startAt ? new Date(promo.startAt) : null,
      endAt: promo.endAt ? new Date(promo.endAt) : null,
      bonusMultiplier: Number(promo.bonusMultiplier || 0),
      returningAfterDays: Number(promo.returningAfterDays || 7),
      autoGrant: Boolean(promo.autoGrant),
      ctaType: String(promo.ctaType || "STORE"),
      ctaTarget: String(promo.ctaTarget || ""),
      ctaLabel: String(promo.ctaLabel || ""),
    };
    const created = await this.prisma.promotion.create({ data: payload });
    return { promotion: created };
  }

  @Patch(":id")
  async update(@Body() body: UpdatePromotionDto, @Req() req: Request) {
    const promoId = String(req.params.id || "");
    const promo = body?.promotion || {};
    const payload = {
      title: promo.title !== undefined ? String(promo.title || "") : undefined,
      description: promo.description !== undefined ? String(promo.description || "") : undefined,
      type: promo.type !== undefined ? String(promo.type || "") : undefined,
      segment: promo.segment !== undefined ? String(promo.segment || "") : undefined,
      active: promo.active !== undefined ? Boolean(promo.active) : undefined,
      startAt: promo.startAt !== undefined ? (promo.startAt ? new Date(promo.startAt) : null) : undefined,
      endAt: promo.endAt !== undefined ? (promo.endAt ? new Date(promo.endAt) : null) : undefined,
      bonusMultiplier: promo.bonusMultiplier !== undefined ? Number(promo.bonusMultiplier || 0) : undefined,
      returningAfterDays:
        promo.returningAfterDays !== undefined ? Number(promo.returningAfterDays || 7) : undefined,
      autoGrant: promo.autoGrant !== undefined ? Boolean(promo.autoGrant) : undefined,
      ctaType: promo.ctaType !== undefined ? String(promo.ctaType || "") : undefined,
      ctaTarget: promo.ctaTarget !== undefined ? String(promo.ctaTarget || "") : undefined,
      ctaLabel: promo.ctaLabel !== undefined ? String(promo.ctaLabel || "") : undefined,
    };
    const updated = await this.prisma.promotion.update({
      where: { id: promoId },
      data: payload,
    });
    return { promotion: updated };
  }

  @Delete(":id")
  async remove(@Req() req: Request) {
    const promoId = String(req.params.id || "");
    const existing = await this.prisma.promotion.findUnique({ where: { id: promoId } });
    if (!existing) {
      throw new NotFoundException("促销活动不存在");
    }
    await this.prisma.promotion.delete({ where: { id: promoId } });
    return { ok: true };
  }
}
