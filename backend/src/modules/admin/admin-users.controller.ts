import { Body, Controller, Get, Patch, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { isAdminAuthorized } from "../../common/utils/admin";
import { buildError, ERROR_CODES } from "../../common/utils/errors";
import { PrismaService } from "../../common/prisma/prisma.service";

@Controller("admin/users")
export class AdminUsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    const users = await this.prisma.user.findMany({
      include: { wallet: true },
      orderBy: { createdAt: "desc" },
    });
    return { users };
  }

  @Get("support")
  async tickets(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    const tickets = await this.prisma.supportTicket.findMany({
      orderBy: { createdAt: "desc" },
    });
    return { tickets };
  }

  @Patch("block")
  async block(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req, body)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    const userId = body?.userId;
    if (!userId) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isBlocked: Boolean(body?.blocked) },
    });
    return { user };
  }
}
