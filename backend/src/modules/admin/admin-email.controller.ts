import { Body, Controller, Get, Post, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { isAdminAuthorized } from "../../common/utils/admin";
import { buildError, ERROR_CODES } from "../../common/utils/errors";
import { PrismaService } from "../../common/prisma/prisma.service";
import { EmailService } from "../email/email.service";
import { encryptString, isEncrypted } from "../../common/utils/crypto";

@Controller("admin/email")
export class AdminEmailController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService
  ) {}

  @Get()
  async getConfig(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    const config = await this.prisma.emailConfig.findUnique({ where: { key: "default" } });
    const payload = (config?.payload || {}) as Record<string, any>;
    const safePayload = {
      ...payload,
      resendApiKey: payload.resendApiKey ? "????????" : "",
      sendgridApiKey: payload.sendgridApiKey ? "????????" : "",
      smsWebhookUrl: payload.smsWebhookUrl ? "????????" : "",
    };
    return { config: safePayload };
  }

  @Post()
  async save(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req, body)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    const existing = await this.prisma.emailConfig.findUnique({ where: { key: "default" } });
    const current = (existing?.payload || {}) as Record<string, any>;
    const nextResendKeyRaw = String(body?.resendApiKey || "");
    const nextSendgridKeyRaw = String(body?.sendgridApiKey || "");
    const nextSmsWebhookRaw = String(body?.smsWebhookUrl || "");
    const shouldKeepResend = !nextResendKeyRaw || nextResendKeyRaw.includes("????");
    const shouldKeepSendgrid = !nextSendgridKeyRaw || nextSendgridKeyRaw.includes("????");
    const shouldKeepSms = !nextSmsWebhookRaw || nextSmsWebhookRaw.includes("????");
    const payload = {
      provider: String(body?.provider || "console"),
      from: String(body?.from || ""),
      webhookUrl: String(body?.webhookUrl || ""),
      resendApiKey: shouldKeepResend ? current.resendApiKey || "" : encryptString(nextResendKeyRaw),
      sendgridApiKey: shouldKeepSendgrid
        ? current.sendgridApiKey || ""
        : encryptString(nextSendgridKeyRaw),
      smsWebhookUrl: shouldKeepSms ? current.smsWebhookUrl || "" : encryptString(nextSmsWebhookRaw),
      adminNotifyEmail: String(body?.adminNotifyEmail || ""),
      testRecipient: String(body?.testRecipient || ""),
      updatedAt: new Date().toISOString(),
    };
    if (payload.resendApiKey && !shouldKeepResend && !isEncrypted(payload.resendApiKey)) {
      payload.resendApiKey = encryptString(payload.resendApiKey);
    }
    if (payload.sendgridApiKey && !shouldKeepSendgrid && !isEncrypted(payload.sendgridApiKey)) {
      payload.sendgridApiKey = encryptString(payload.sendgridApiKey);
    }
    if (payload.smsWebhookUrl && !shouldKeepSms && !isEncrypted(payload.smsWebhookUrl)) {
      payload.smsWebhookUrl = encryptString(payload.smsWebhookUrl);
    }
    const config = await this.prisma.emailConfig.upsert({
      where: { key: "default" },
      update: { payload },
      create: { key: "default", payload },
    });
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: req.userId || null,
          action: "admin_email_config_update",
          targetType: "email_config",
          targetId: "default",
          payload: { provider: payload.provider, from: payload.from },
          requestId: req.requestId || "",
        },
      });
    } catch {
      // ignore audit errors
    }
    return { config: config.payload };
  }

  @Post("test")
  async test(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req, body)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    const to = String(body?.to || "").trim();
    if (!to) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
    }
    const result = await this.emailService.sendEmail(
      to,
      "Test email",
      "<p>This is a test email from Tappytoon Admin.</p>",
      "This is a test email from Tappytoon Admin."
    );
    return { ok: result.ok };
  }
}
