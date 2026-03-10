import { Body, Controller, Get, Post, Req, UseGuards, BadRequestException } from "@nestjs/common";
import { Request } from "express";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import { parseStoredJson, stringifyStoredJson } from "../../../../common/utils/stored-json";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";
import {
  TestEmailDto,
  TestEmailPayloadInput,
  UpdateEmailConfigDto,
} from "../dtos/admin-system.dto";
import { EmailService } from "../../../email/email.service";
import {
  DEFAULT_EMAIL_CONFIG,
  EmailConfigInput,
  maskEmailConfigSecrets,
  normalizeEmailConfig,
  isMaskedSecret,
} from "../../../email/email-config";
import { encryptString, isEncrypted } from "../../../../common/utils/crypto";

type EmailConfigRequestBody = UpdateEmailConfigDto & EmailConfigInput;
type TestEmailRequestBody = TestEmailDto & TestEmailPayloadInput;

function extractEmailConfigInput(body: EmailConfigRequestBody): EmailConfigInput {
  return body?.config || body;
}

function extractTestEmailInput(body: TestEmailRequestBody): TestEmailPayloadInput {
  return body?.email || body;
}

@Controller("admin/email")
@UseGuards(AdminAuthGuard)
export class AdminEmailController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  @Get()
  async getConfig() {
    const config = await this.prisma.emailConfig.findUnique({ where: { key: "default" } });
    const payload = normalizeEmailConfig(
      parseStoredJson(config?.payload, DEFAULT_EMAIL_CONFIG),
    );

    return { config: maskEmailConfigSecrets(payload) };
  }

  @Post()
  async save(@Body() body: EmailConfigRequestBody, @Req() req: Request) {
    const existing = await this.prisma.emailConfig.findUnique({ where: { key: "default" } });
    const current = normalizeEmailConfig(
      parseStoredJson(existing?.payload, DEFAULT_EMAIL_CONFIG),
    );
    const input = extractEmailConfigInput(body);

    const nextResendKeyRaw = String(input.resendApiKey || "").trim();
    const nextSendgridKeyRaw = String(input.sendgridApiKey || "").trim();
    const nextSmsWebhookRaw = String(input.smsWebhookUrl || "").trim();
    const shouldKeepResend = !nextResendKeyRaw || isMaskedSecret(nextResendKeyRaw);
    const shouldKeepSendgrid = !nextSendgridKeyRaw || isMaskedSecret(nextSendgridKeyRaw);
    const shouldKeepSms = !nextSmsWebhookRaw || isMaskedSecret(nextSmsWebhookRaw);

    const payload = {
      ...current,
      provider: String(input.provider || current.provider || "console"),
      from: String(input.from || "").trim(),
      webhookUrl: String(input.webhookUrl || "").trim(),
      resendApiKey: shouldKeepResend ? current.resendApiKey : encryptString(nextResendKeyRaw),
      sendgridApiKey: shouldKeepSendgrid
        ? current.sendgridApiKey
        : encryptString(nextSendgridKeyRaw),
      smsWebhookUrl: shouldKeepSms ? current.smsWebhookUrl : encryptString(nextSmsWebhookRaw),
      adminNotifyEmail: String(input.adminNotifyEmail || "").trim(),
      testRecipient: String(input.testRecipient || "").trim(),
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

    await this.prisma.emailConfig.upsert({
      where: { key: "default" },
      update: { payload: stringifyStoredJson(payload) },
      create: { key: "default", payload: stringifyStoredJson(payload), value: "default" },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          userId: req.userId || "admin",
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

    return { config: maskEmailConfigSecrets(normalizeEmailConfig(payload)) };
  }

  @Post("test")
  async test(@Body() body: TestEmailRequestBody) {
    const input = extractTestEmailInput(body);
    const to = String(input.to || "").trim();
    if (!to) {
      throw new BadRequestException("Missing recipient address");
    }

    const result = await this.emailService.sendEmail(
      to,
      "Test email",
      "<p>This is a test email from Gush Admin.</p>",
      "This is a test email from Gush Admin.",
    );

    return { ok: result.ok };
  }
}
