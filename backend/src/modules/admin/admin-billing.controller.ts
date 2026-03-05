import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AdminAuthGuard } from "./guards/admin-auth.guard";
import { listTopupPackages } from "../../common/config/topup";
import { getPlanCatalog } from "../../common/config/plans";
import { CreateTopupDto, UpdateTopupDto } from "./dtos/admin-remaining.dto";

@Controller("admin/billing")
@UseGuards(AdminAuthGuard)
export class AdminBillingController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("topups")
  async listTopups() {
    const packages = await listTopupPackages(this.prisma);
    return { packages };
  }

  @Post("topups")
  async createTopup(@Body() body: CreateTopupDto) {
    const id = body?.packageId || body?.id;
    if (!id) {
      throw new Error('Package ID is required');
    }
    const payload = {
      id,
      name: body?.name || `Package ${id}`,
      amount: Number(body?.amount || body?.paidPts || 0),
      paidPts: Number(body?.paidPts || 0),
      bonusPts: Number(body?.bonusPts || 0),
      price: Number(body?.price || 0),
      currency: body?.currency || "USD",
      active: body?.active !== false,
      label: body?.label || "",
      tags: Array.isArray(body?.tags) ? body.tags : [],
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
      throw new Error('Package ID is required');
    }
    const record = await this.prisma.topupPackage.update({
      where: { id },
      data: {
        paidPts: body?.paidPts !== undefined ? Number(body.paidPts) : undefined,
        bonusPts: body?.bonusPts !== undefined ? Number(body.bonusPts) : undefined,
        price: body?.price !== undefined ? Number(body.price) : undefined,
        currency: body?.currency || undefined,
        active: body?.active !== undefined ? Boolean(body.active) : undefined,
        label: body?.label || undefined,
        tags: Array.isArray(body?.tags) ? body.tags : undefined,
      },
    });
    return { package: record };
  }

  @Get("plans")
  async listPlans() {
    const catalog = await getPlanCatalog(this.prisma);
    return { plans: Object.values(catalog) };
  }

  @Post("plans")
  async createPlan(@Body() body: CreateTopupDto) {
    // 老王说：subscriptionPlan模型已删除，此方法已禁用
    throw new Error('This endpoint is no longer available');
  }

  @Patch("plans/:id")
  async updatePlan(@Param("id") id: string, @Body() body: UpdateTopupDto) {
    // 老王说：subscriptionPlan模型已删除，此方法已禁用
    throw new Error('This endpoint is no longer available');
  }
}
