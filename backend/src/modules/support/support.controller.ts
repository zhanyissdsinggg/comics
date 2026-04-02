import { Body, Controller, Post, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { PrismaService } from "../../common/prisma/prisma.service";
import { getUserIdFromRequest } from "../../common/utils/auth";
import { buildError, ERROR_CODES } from "../../common/utils/errors";

function readTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

@Controller("support")
export class SupportController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async create(
    @Body() body: Record<string, unknown>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userId = getUserIdFromRequest(req, false);
    const subject = readTrimmedString(body?.subject);
    const message = readTrimmedString(body?.message);
    const topic = readTrimmedString(body?.topic) || null;
    const replyEmail =
      readTrimmedString(body?.replyEmail) || readTrimmedString(body?.email) || null;
    const orderId = readTrimmedString(body?.orderId) || null;

    if (!subject || !message) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
    }

    if (!userId && !replyEmail) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST, {
        message: "Reply email is required for guest support requests.",
      });
    }

    if (replyEmail && !isValidEmail(replyEmail)) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST, {
        message: "Reply email is invalid.",
      });
    }

    await this.prisma.supportTicket.create({
      data: {
        userId,
        replyEmail,
        orderId,
        topic,
        subject,
        message,
        status: "open",
      },
    });

    return { ok: true };
  }
}
