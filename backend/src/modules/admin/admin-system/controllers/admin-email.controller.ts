import { Body, Controller, Get, Post, UseGuards, BadRequestException, Req } from "@nestjs/common";
import { Request } from "express";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import { EmailService } from "../../../email/email.service";
import { encryptString, isEncrypted } from "../../../../common/utils/crypto";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";
import { UpdateEmailConfigDto, TestEmailDto } from "../dtos/admin-system.dto";

@Controller("admin/email")
@UseGuards(AdminAuthGuard)
export class AdminEmailController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService
  ) {}

  @Get()
  async getConfig() {
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
  async save(@Body() body: UpdateEmailConfigDto, @Req() req: Request) {
    const existing = await this.prisma.emailConfig.findUnique({ where: { key: "default" } });
    const current = (existing?.payload || {}) as Record<string, any>;
    const nextResendKeyRaw = String(body?.config?.resendApiKey || "");
    const nextSendgridKeyRaw = String(body?.config?.sendgridApiKey || "");
    const nextSmsWebhookRaw = String(body?.config?.smsWebhookUrl || "");
    const shouldKeepResend = !nextResendKeyRaw || nextResendKeyRaw.includes("????");
    const shouldKeepSendgrid = !nextSendgridKeyRaw || nextSendgridKeyRaw.includes("????");
    const shouldKeepSms = !nextSmsWebhookRaw || nextSmsWebhookRaw.includes("????");
    const payload = {
      provider: String(body?.config?.provider || "console"),
      from: String(body?.config?.from || ""),
      webhookUrl: String(body?.config?.webhookUrl || ""),
      resendApiKey: shouldKeepResend ? current.resendApiKey || "" : encryptString(nextResendKeyRaw),
      sendgridApiKey: shouldKeepSendgrid
        ? current.sendgridApiKey || ""
        : encryptString(nextSendgridKeyRaw),
      smsWebhookUrl: shouldKeepSms ? current.smsWebhookUrl || "" : encryptString(nextSmsWebhookRaw),
      adminNotifyEmail: String(body?.config?.adminNotifyEmail || ""),
      testRecipient: String(body?.config?.testRecipient || ""),
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
      update: { payload: JSON.stringify(payload) },
      create: { key: "default", payload: JSON.stringify(payload), value: "default" },
    });
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: req.userId as string,
          action: "admin_email_config_update",
          resource: "email_config",
          targetType: "email_config",
          targetId: "default",
          payload: JSON.stringify({ provider: payload.provider, from: payload.from }),
        },
      });
    } catch {
      // ignore audit errors
    }
    return { config: config.payload };
  }

  @Post("test")
  async test(@Body() body: TestEmailDto) {
    const to = String(body?.email?.to || "").trim();
    if (!to) {
      throw new BadRequestException("缺少收件人地址");
    }
    const result = await this.emailService.sendEmail(
      to,
      "Test email",
      "<p>This is a test email from Gush Admin.</p>",
      "This is a test email from Gush Admin."
    );
    return { ok: result.ok };
  }
}
