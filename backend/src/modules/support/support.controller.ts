import { Body, Controller, Post, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { PrismaService } from "../../common/prisma/prisma.service";
import { getUserIdFromRequest } from "../../common/utils/auth";
import { buildError, ERROR_CODES } from "../../common/utils/errors";
import {
  getMissingSupportTicketOptionalColumn,
  SUPPORT_TICKET_OPTIONAL_COLUMNS,
  type SupportTicketOptionalColumn,
} from "./support-ticket-compat";

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

    const supportedColumns = new Set<SupportTicketOptionalColumn>(SUPPORT_TICKET_OPTIONAL_COLUMNS);

    while (true) {
      try {
        await this.prisma.supportTicket.create({
          data: {
            userId,
            ...(supportedColumns.has("replyEmail") ? { replyEmail } : {}),
            ...(supportedColumns.has("orderId") ? { orderId } : {}),
            ...(supportedColumns.has("topic") ? { topic } : {}),
            subject,
            message,
            status: "open",
          },
        });
        break;
      } catch (error) {
        const missingColumn = getMissingSupportTicketOptionalColumn(error);
        if (!missingColumn || !supportedColumns.has(missingColumn)) {
          throw error;
        }

        if (missingColumn === "replyEmail" && !userId) {
          res.status(503);
          return buildError(ERROR_CODES.INTERNAL, {
            message: "Guest support requests are temporarily unavailable until the support email field is migrated.",
          });
        }

        supportedColumns.delete(missingColumn);
      }
    }

    return { ok: true };
  }
}
