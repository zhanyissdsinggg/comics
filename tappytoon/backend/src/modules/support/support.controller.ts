import { Body, Controller, Post, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { PrismaService } from "../../common/prisma/prisma.service";
import { getUserIdFromRequest } from "../../common/utils/auth";
import { buildError, ERROR_CODES } from "../../common/utils/errors";

@Controller("support")
export class SupportController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async create(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }
    const subject = String(body?.subject || "").trim();
    const message = String(body?.message || "").trim();
    if (!subject || !message) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
    }
    await this.prisma.supportTicket.create({
      data: { userId, subject, message, status: "OPEN" },
    });
    return { ok: true };
  }
}
