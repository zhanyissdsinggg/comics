import { Body, Controller, Get, Post, Req, Res } from "@nestjs/common";
import { CouponsService } from "./coupons.service";
import { Request, Response } from "express";
import { getUserIdFromRequest } from "../../common/utils/auth";
import { buildError, ERROR_CODES } from "../../common/utils/errors";

@Controller("coupons")
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get()
  async list(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }
    return { coupons: await this.couponsService.list(userId) };
  }

  @Post()
  async claim(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }
    const code = body?.code;
    if (!code) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
    }
    const result = await this.couponsService.claim(userId, code);
    if (!result.ok) {
      res.status(400);
      return buildError("INVALID_COUPON", { message: result.message });
    }
    return { coupons: result.coupons };
  }
}
