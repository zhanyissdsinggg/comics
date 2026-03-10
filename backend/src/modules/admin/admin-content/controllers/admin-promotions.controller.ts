import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import { parseStoredJson, stringifyStoredJson } from "../../../../common/utils/stored-json";
import { AdminAudit } from "../../decorators/admin-audit.decorator";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";
import { CreatePromotionDto, UpdatePromotionDto } from "../dtos/admin-content.dto";

type PromotionInput = Record<string, unknown>;

type PromotionDefaults = {
  ctaType: string;
  ctaTarget: string;
  ctaLabel: string;
};

const DEFAULT_PROMOTION_DEFAULTS: PromotionDefaults = {
  ctaType: "STORE",
  ctaTarget: "",
  ctaLabel: "View offer",
};

function asRecord(value: unknown): PromotionInput {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as PromotionInput)
    : {};
}

function readString(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    return value;
  }
  if (value === undefined || value === null) {
    return fallback;
  }
  return String(value);
}

function readNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) {
      return true;
    }
    if (["0", "false", "no", "off"].includes(normalized)) {
      return false;
    }
  }
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  throw new BadRequestException("Promotion boolean fields must be true/false.");
}

function readDate(value: unknown): Date | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const date = new Date(readString(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function readOptionalDate(value: unknown): Date | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  return readDate(value);
}

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
    return {
      defaults: parseStoredJson(fallback?.payload, DEFAULT_PROMOTION_DEFAULTS),
    };
  }

  @Patch("defaults")
  @AdminAudit("update", "promotion_defaults")
  async updateDefaults(@Body() body: UpdatePromotionDto) {
    const payload = asRecord(body?.defaults);
    const serialized = stringifyStoredJson(payload);
    const defaults = await this.prisma.promotionFallback.upsert({
      where: { key: "default" },
      update: { payload: serialized },
      create: { key: "default", payload: serialized },
    });
    return { defaults: parseStoredJson(defaults.payload, DEFAULT_PROMOTION_DEFAULTS) };
  }

  @Post()
  @AdminAudit("create", "promotion")
  async create(@Body() body: CreatePromotionDto) {
    const promo = asRecord(body?.promotion);
    const promoId = readString(promo.id).trim();
    if (!promoId) {
      throw new BadRequestException("promotion.id is required.");
    }

    const payload = {
      id: promoId,
      title: readString(promo.title, "Untitled Promotion"),
      description: readString(promo.description),
      type: readString(promo.type, "GENERIC"),
      segment: readString(promo.segment, "ALL"),
      active: readBoolean(promo.active, false),
      startAt: readDate(promo.startAt),
      endAt: readDate(promo.endAt),
      bonusMultiplier: readNumber(promo.bonusMultiplier, 0),
      returningAfterDays: readNumber(promo.returningAfterDays, 7),
      autoGrant: readBoolean(promo.autoGrant, false),
      ctaType: readString(promo.ctaType, "STORE"),
      ctaTarget: readString(promo.ctaTarget),
      ctaLabel: readString(promo.ctaLabel),
    };

    const created = await this.prisma.promotion.create({ data: payload });
    return { promotion: created };
  }

  @Patch(":id")
  @AdminAudit("update", "promotion")
  async update(@Body() body: UpdatePromotionDto, @Req() req: Request) {
    const promoId = String(req.params.id || "");
    const promo = asRecord(body?.promotion);
    const payload = {
      title: promo.title !== undefined ? readString(promo.title) : undefined,
      description: promo.description !== undefined ? readString(promo.description) : undefined,
      type: promo.type !== undefined ? readString(promo.type) : undefined,
      segment: promo.segment !== undefined ? readString(promo.segment) : undefined,
      active: promo.active !== undefined ? readBoolean(promo.active) : undefined,
      startAt: readOptionalDate(promo.startAt),
      endAt: readOptionalDate(promo.endAt),
      bonusMultiplier:
        promo.bonusMultiplier !== undefined ? readNumber(promo.bonusMultiplier, 0) : undefined,
      returningAfterDays:
        promo.returningAfterDays !== undefined ? readNumber(promo.returningAfterDays, 7) : undefined,
      autoGrant: promo.autoGrant !== undefined ? readBoolean(promo.autoGrant) : undefined,
      ctaType: promo.ctaType !== undefined ? readString(promo.ctaType) : undefined,
      ctaTarget: promo.ctaTarget !== undefined ? readString(promo.ctaTarget) : undefined,
      ctaLabel: promo.ctaLabel !== undefined ? readString(promo.ctaLabel) : undefined,
    };

    const updated = await this.prisma.promotion.update({
      where: { id: promoId },
      data: payload,
    });
    return { promotion: updated };
  }

  @Delete(":id")
  @AdminAudit("delete", "promotion")
  async remove(@Req() req: Request) {
    const promoId = String(req.params.id || "");
    const existing = await this.prisma.promotion.findUnique({ where: { id: promoId } });
    if (!existing) {
      throw new NotFoundException("Promotion not found.");
    }
    await this.prisma.promotion.delete({ where: { id: promoId } });
    return { ok: true };
  }
}
