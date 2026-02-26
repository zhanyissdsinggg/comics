import { Body, Controller, Get, Param, Patch, Post, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { PrismaService } from "../../common/prisma/prisma.service";
import { isAdminAuthorized } from "../../common/utils/admin";
import { buildError, ERROR_CODES } from "../../common/utils/errors";
import { listTopupPackages } from "../../common/config/topup";
import { getPlanCatalog } from "../../common/config/plans";

@Controller("admin/billing")
export class AdminBillingController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("topups")
  async listTopups(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    const packages = await listTopupPackages(this.prisma);
    return { packages };
  }

  @Post("topups")
  async createTopup(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req, body)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    const id = body?.packageId || body?.id;
    if (!id) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
    }
    const payload = {
      id,
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
  async updateTopup(
    @Param("id") id: string,
    @Body() body: any,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    if (!isAdminAuthorized(req, body)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    if (!id) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
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
  async listPlans(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    const catalog = await getPlanCatalog(this.prisma);
    return { plans: Object.values(catalog) };
  }

  @Post("plans")
  async createPlan(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req, body)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    const id = body?.id;
    if (!id) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
    }
    const payload = {
      id,
      discountPct: Number(body?.discountPct || 0),
      dailyFreeUnlocks: Number(body?.dailyFreeUnlocks || 0),
      ttfMultiplier: Number(body?.ttfMultiplier || 0),
      voucherPts: Number(body?.voucherPts || 0),
      price: Number(body?.price || 0),
      currency: body?.currency || "USD",
      active: body?.active !== false,
      label: body?.label || "",
    };
    const record = await this.prisma.subscriptionPlan.upsert({
      where: { id },
      update: payload,
      create: payload,
    });
    return { plan: record };
  }

  @Patch("plans/:id")
  async updatePlan(
    @Param("id") id: string,
    @Body() body: any,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    if (!isAdminAuthorized(req, body)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    if (!id) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
    }
    const record = await this.prisma.subscriptionPlan.update({
      where: { id },
      data: {
        discountPct: body?.discountPct !== undefined ? Number(body.discountPct) : undefined,
        dailyFreeUnlocks:
          body?.dailyFreeUnlocks !== undefined ? Number(body.dailyFreeUnlocks) : undefined,
        ttfMultiplier: body?.ttfMultiplier !== undefined ? Number(body.ttfMultiplier) : undefined,
        voucherPts: body?.voucherPts !== undefined ? Number(body.voucherPts) : undefined,
        price: body?.price !== undefined ? Number(body.price) : undefined,
        currency: body?.currency || undefined,
        active: body?.active !== undefined ? Boolean(body.active) : undefined,
        label: body?.label || undefined,
      },
    });
    return { plan: record };
  }
}
