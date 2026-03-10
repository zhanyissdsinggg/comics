import { BadRequestException, Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import { encryptString, isEncrypted } from "../../../../common/utils/crypto";
import { parseStoredJson, stringifyStoredJson } from "../../../../common/utils/stored-json";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";
import {
  DEFAULT_EMAIL_CONFIG,
  EmailConfigInput,
  isMaskedSecret,
  maskEmailConfigSecrets,
  normalizeEmailConfig,
} from "../../../email/email-config";
import { EmailService } from "../../../email/email.service";
import {
  TestEmailDto,
  TestEmailPayloadInput,
  UpdateEmailConfigDto,
} from "../dtos/admin-system.dto";

type EmailConfigRequestBody = UpdateEmailConfigDto & EmailConfigInput;
type TestEmailRequestBody = TestEmailDto & TestEmailPayloadInput;

type SecretFieldInput = {
  provided: boolean;
  value: string;
};

function extractEmailConfigInput(body: EmailConfigRequestBody): EmailConfigInput {
  return body?.config || body;
}

function extractTestEmailInput(body: TestEmailRequestBody): TestEmailPayloadInput {
  return body?.email || body;
}

function readSecretInput(value: unknown): SecretFieldInput {
  if (typeof value !== "string") {
    return { provided: false, value: "" };
  }
  return { provided: true, value: value.trim() };
}

function resolveStoredSecret(currentValue: string, input: SecretFieldInput): string {
  if (!input.provided || isMaskedSecret(input.value)) {
    return currentValue;
  }
  if (!input.value) {
    return "";
  }
  if (isEncrypted(input.value)) {
    return input.value;
  }
  return encryptString(input.value);
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
    const payload = normalizeEmailConfig(parseStoredJson(config?.payload, DEFAULT_EMAIL_CONFIG));
    return { config: maskEmailConfigSecrets(payload) };
  }

  @Post()
  async save(@Body() body: EmailConfigRequestBody, @Req() req: Request) {
    const existing = await this.prisma.emailConfig.findUnique({ where: { key: "default" } });
    const current = normalizeEmailConfig(parseStoredJson(existing?.payload, DEFAULT_EMAIL_CONFIG));
    const input = extractEmailConfigInput(body);

    const resendApiKeyInput = readSecretInput(input.resendApiKey);
    const sendgridApiKeyInput = readSecretInput(input.sendgridApiKey);
    const smsWebhookUrlInput = readSecretInput(input.smsWebhookUrl);

    const payload = {
      ...current,
      provider: String(input.provider || current.provider || "console"),
      from: String(input.from || "").trim(),
      webhookUrl: String(input.webhookUrl || "").trim(),
      resendApiKey: resolveStoredSecret(current.resendApiKey, resendApiKeyInput),
      sendgridApiKey: resolveStoredSecret(current.sendgridApiKey, sendgridApiKeyInput),
      smsWebhookUrl: resolveStoredSecret(current.smsWebhookUrl, smsWebhookUrlInput),
      adminNotifyEmail: String(input.adminNotifyEmail || "").trim(),
      testRecipient: String(input.testRecipient || "").trim(),
      updatedAt: new Date().toISOString(),
    };

    await this.prisma.emailConfig.upsert({
      where: { key: "default" },
      update: { payload: stringifyStoredJson(payload) },
      create: { key: "default", payload: stringifyStoredJson(payload), value: "default" },
    });

    const requestLike = req as Request & {
      userId?: string;
      user?: { userId?: string };
    };
    const adminId = requestLike.userId || requestLike.user?.userId || "admin";

    try {
      await this.prisma.auditLog.create({
        data: {
          userId: adminId,
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
