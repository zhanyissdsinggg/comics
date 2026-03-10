import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { getPlanCatalog } from "../../../../common/config/plans";
import { listTopupPackages } from "../../../../common/config/topup";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";
import { CreateTopupDto, UpdateTopupDto } from "../dtos/admin-billing.dto";

function getErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return null;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

@Controller("admin/billing")
@UseGuards(AdminAuthGuard)
export class AdminBillingController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async listForLegacyPage() {
    const packages = await listTopupPackages(this.prisma);
    return {
      data: packages.map((item) => ({
        ...item,
        points: Number(item.paidPts || 0) + Number(item.bonusPts || 0),
      })),
    };
  }

  @Get("topups")
  async listTopups() {
    const packages = await listTopupPackages(this.prisma);
    return { packages };
  }

  @Post("topups")
  async createTopup(@Body() body: CreateTopupDto) {
    const id = body.packageId || body.id;
    if (!id) {
      throw new BadRequestException("Package ID is required.");
    }

    const payload = {
      id,
      name: body.name || `Package ${id}`,
      amount: Number(body.amount || body.paidPts || 0),
      paidPts: Number(body.paidPts || 0),
      bonusPts: Number(body.bonusPts || 0),
      price: Number(body.price || 0),
      currency: body.currency || "USD",
      active: body.active !== false,
      label: body.label || "",
      tags: Array.isArray(body.tags) ? body.tags : [],
    };

    const record = await this.prisma.topupPackage.upsert({
      where: { id },
      update: payload,
      create: payload,
    });

    return { package: record };
  }

  @Patch("topups/:id")
  async updateTopup(@Param("id") id: string, @Body() body: UpdateTopupDto) {
    if (!id) {
      throw new BadRequestException("Package ID is required.");
    }

    const record = await this.prisma.topupPackage.update({
      where: { id },
      data: {
        paidPts: body.paidPts !== undefined ? Number(body.paidPts) : undefined,
        bonusPts: body.bonusPts !== undefined ? Number(body.bonusPts) : undefined,
        price: body.price !== undefined ? Number(body.price) : undefined,
        currency: body.currency || undefined,
        active: body.active !== undefined ? Boolean(body.active) : undefined,
        label: body.label || undefined,
        tags: Array.isArray(body.tags) ? body.tags : undefined,
      },
    });

    return { package: record };
  }

  @Delete(":id")
  async removeTopup(@Param("id") id: string) {
    if (!id) {
      throw new BadRequestException("Package ID is required.");
    }

    const existing = await this.prisma.topupPackage.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Top-up package not found.");
    }

    try {
      await this.prisma.topupPackage.delete({ where: { id } });
    } catch (error: unknown) {
      if (getErrorCode(error) === "P2003") {
        throw new BadRequestException(
          "This top-up package is referenced by existing orders and cannot be deleted.",
        );
      }
      throw error;
    }

    return { ok: true };
  }

  @Get("plans")
  async listPlans() {
    const catalog = await getPlanCatalog(this.prisma);
    return { plans: Object.values(catalog) };
  }

  @Post("plans")
  async createPlan(@Body() _body: CreateTopupDto) {
    throw new BadRequestException("This endpoint is no longer available");
  }

  @Patch("plans/:id")
  async updatePlan(@Param("id") _id: string, @Body() _body: CreateTopupDto) {
    throw new BadRequestException("This endpoint is no longer available");
  }
}

