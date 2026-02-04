import { Controller, Get, Post, Req, Res } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { Request, Response } from "express";
import { getUserIdFromRequest } from "../../common/utils/auth";
import { buildError, ERROR_CODES } from "../../common/utils/errors";

@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async list(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }
    const orders = await this.ordersService.list(userId);
    return {
      orders: orders.map((order: any) => ({
        ...order,
        orderId: order.id,
      })),
    };
  }

  @Post("reconcile")
  async reconcile(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }
    const result = await this.ordersService.reconcile(userId);
    return {
      updated: result.updated,
      orders: result.orders.map((order: any) => ({
        ...order,
        orderId: order.id,
      })),
    };
  }
}
