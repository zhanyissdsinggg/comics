import { Body, Controller, Get, Patch, UseGuards, BadRequestException, Req } from "@nestjs/common";
import { Request } from "express";
import { PrismaService } from "../../common/prisma/prisma.service";
import { parsePaginationParams, calculateOffset, buildPaginationResult } from "../../common/utils/pagination";
import { BlockUserDto } from "./dtos/admin-remaining.dto";
import { AdminAuthGuard } from "./guards/admin-auth.guard";

@Controller("admin/users")
@UseGuards(AdminAuthGuard)
export class AdminUsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Req() req: Request) {
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
  async tickets(@Req() req: Request) {
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
  async block(@Body() body: BlockUserDto) {
    const userId = body?.userId;
    if (!userId) {
      throw new BadRequestException("缺少userId参数");
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isBlocked: Boolean(body?.blocked) },
    });
    return { user };
  }
}
