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
import { PrismaService } from "../../../../common/prisma/prisma.service";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";
import { listTopupPackages } from "../../../../common/config/topup";
import { CreateTopupDto, UpdateTopupDto } from "../dtos/admin-billing.dto";
import { getPlanCatalog } from "../../../../common/config/plans";

@Controller("admin/billing")
@UseGuards(AdminAuthGuard)
export class AdminBillingController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async listForLegacyPage() {
    const packages = await listTopupPackages(this.prisma);
    return {
      data: packages.map((item: any) => ({
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
  async updateTopup(@Param("id") id: string, @Body() body: CreateTopupDto) {
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
  async updatePlan(@Param("id") id: string, @Body() body: CreateTopupDto) {
    // 老王说：subscriptionPlan模型已删除，此方法已禁用
    throw new Error('This endpoint is no longer available');
  }

  @Delete(":id")
  async removeTopup(@Param("id") id: string) {
    if (!id) {
      throw new BadRequestException("缺少packageId参数");
    }
    const existing = await this.prisma.topupPackage.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("充值包不存在");
    }
    try {
      await this.prisma.topupPackage.delete({ where: { id } });
    } catch (error: any) {
      if (error?.code === "P2003") {
        throw new BadRequestException("该充值包已被订单引用，无法删除");
      }
      throw error;
    }
    return { ok: true };
  }
}
