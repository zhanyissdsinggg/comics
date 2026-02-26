import { Body, Controller, Get, Patch, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { isAdminAuthorized } from "../../common/utils/admin";
import { buildError, ERROR_CODES } from "../../common/utils/errors";
import { PrismaService } from "../../common/prisma/prisma.service";
import { parsePaginationParams, calculateOffset, buildPaginationResult } from "../../common/utils/pagination";

@Controller("admin/users")
export class AdminUsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }

    // 添加分页参数
    const { page, pageSize } = parsePaginationParams(req.query);
    const offset = calculateOffset(page, pageSize);

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        include: { wallet: true },
        orderBy: { createdAt: "desc" },
        take: pageSize,
        skip: offset,
      }),
      this.prisma.user.count(),
    ]);

    return buildPaginationResult(users, total, page, pageSize);
  }

  @Get("support")
  async tickets(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }

    // 添加分页参数
    const { page, pageSize } = parsePaginationParams(req.query);
    const offset = calculateOffset(page, pageSize);

    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        orderBy: { createdAt: "desc" },
        take: pageSize,
        skip: offset,
      }),
      this.prisma.supportTicket.count(),
    ]);

    return buildPaginationResult(tickets, total, page, pageSize);
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
