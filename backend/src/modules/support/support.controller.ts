import { Body, Controller, Post, Req, Res } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Request, Response } from "express";
import { logger } from "../../common/logger/winston.init";
import { PrismaService } from "../../common/prisma/prisma.service";
import { getUserIdFromRequest } from "../../common/utils/auth";
import { buildError, ERROR_CODES } from "../../common/utils/errors";

function readTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

type SupportCreateInput = {
  userId: string | null;
  replyEmail: string | null;
  orderId: string | null;
  topic: string | null;
  subject: string;
  message: string;
};

@Controller("support")
export class SupportController {
  constructor(private readonly prisma: PrismaService) {}

  private isPrismaKnownError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
    return error instanceof Prisma.PrismaClientKnownRequestError;
  }

  private isUserIdConstraintError(error: unknown): boolean {
    if (!this.isPrismaKnownError(error)) {
      return false;
    }
    if (error.code === "P2003") {
      return true;
    }
    if (error.code === "P2011" && String((error.meta as { constraint?: string } | undefined)?.constraint || "").toLowerCase().includes("userid")) {
      return true;
    }
    return false;
  }

  private isSchemaColumnCompatibilityError(error: unknown): boolean {
    if (!this.isPrismaKnownError(error)) {
      return false;
    }
    return error.code === "P2021" || error.code === "P2022";
  }

  private async ensureSupportGuestUserId(replyEmail: string): Promise<string> {
    const existing = await this.prisma.user.findUnique({
      where: { email: replyEmail },
      select: { id: true },
    });
    if (existing?.id) {
      return existing.id;
    }

    const created = await this.prisma.user.create({
      data: {
        email: replyEmail,
        name: "Support Guest",
      },
      select: { id: true },
    });
    return created.id;
  }

  private async createSupportTicketWithCompat(input: SupportCreateInput): Promise<void> {
    try {
      await this.prisma.supportTicket.create({
        data: {
          userId: input.userId,
          replyEmail: input.replyEmail,
          orderId: input.orderId,
          topic: input.topic,
          subject: input.subject,
          message: input.message,
          status: "open",
        },
      });
      return;
    } catch (error) {
      if (
        this.isUserIdConstraintError(error) &&
        !input.userId &&
        input.replyEmail
      ) {
        const guestUserId = await this.ensureSupportGuestUserId(input.replyEmail);
        await this.prisma.supportTicket.create({
          data: {
            userId: guestUserId,
            replyEmail: input.replyEmail,
            orderId: input.orderId,
            topic: input.topic,
            subject: input.subject,
            message: input.message,
            status: "open",
          },
        });
        logger.warn("[support] created ticket via guest-user compatibility fallback");
        return;
      }

      if (this.isSchemaColumnCompatibilityError(error)) {
        await this.prisma.supportTicket.create({
          data: {
            userId: input.userId,
            subject: input.subject,
            message: input.message,
            status: "open",
          },
        });
        logger.warn("[support] created ticket via schema-compatibility fallback");
        return;
      }

      throw error;
    }
  }

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

    await this.createSupportTicketWithCompat({
      userId,
      replyEmail,
      orderId,
      topic,
      subject,
      message,
    });

    return { ok: true };
  }
}
