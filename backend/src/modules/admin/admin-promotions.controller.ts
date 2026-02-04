import { Body, Controller, Delete, Get, Patch, Post, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { isAdminAuthorized } from "../../common/utils/admin";
import { buildError, ERROR_CODES } from "../../common/utils/errors";
import { PrismaService } from "../../common/prisma/prisma.service";

@Controller("admin/promotions")
export class AdminPromotionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    const promotions = await this.prisma.promotion.findMany({ orderBy: { title: "asc" } });
    return { promotions };
  }

  @Get("defaults")
  async defaults(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    const fallback = await this.prisma.promotionFallback.findUnique({
      where: { key: "default" },
    });
    return { defaults: fallback?.payload || { ctaType: "STORE", ctaTarget: "", ctaLabel: "View offer" } };
  }

  @Patch("defaults")
  async updateDefaults(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req, body)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    const payload = body?.defaults || {};
    const defaults = await this.prisma.promotionFallback.upsert({
      where: { key: "default" },
      update: { payload },
      create: { key: "default", payload },
    });
    return { defaults: defaults.payload };
  }

  @Post()
  async create(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req, body)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    const promo = body?.promotion;
    if (!promo?.id) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
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
  async update(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req, body)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
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
  async remove(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    const promoId = String(req.params.id || "");
    const existing = await this.prisma.promotion.findUnique({ where: { id: promoId } });
    if (!existing) {
      res.status(404);
      return buildError(ERROR_CODES.NOT_FOUND);
    }
    await this.prisma.promotion.delete({ where: { id: promoId } });
    return { ok: true };
  }
}
