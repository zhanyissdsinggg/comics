import { Injectable } from "@nestjs/common";
import { getAppConfig, getPrimaryFrontendOrigin } from "../../common/config/app-config";
import { logger } from "../../common/logger/winston.init";
import { PrismaService } from "../../common/prisma/prisma.service";
import { decryptString } from "../../common/utils/crypto";
import { parseStoredJson } from "../../common/utils/stored-json";
import {
  DEFAULT_EMAIL_CONFIG,
  EmailConfigPayload,
  normalizeEmailConfig,
} from "./email-config";

function getFrontendOrigin(): string {
  return getPrimaryFrontendOrigin();
}

const CACHE_TTL_MS = 60_000;
const RETRY_INTERVAL_MS = 60_000;
const MAX_RETRIES = 5;

type SendResult = { ok: boolean; status?: number; error?: string };
type EmailJobRow = {
  id: string;
  status: string;
  provider: string;
  to: string;
  subject: string;
  payload: string | null;
  priority: string;
  retries: number;
  lastAttemptAt: Date | null;
  error: string | null;
};

type EmailMessagePayload = {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
};

type EmailPriority = "high" | "normal" | string;

@Injectable()
export class EmailService {
  private cache: { value: EmailConfigPayload; loadedAt: number } | null = null;
  private retryTimer: NodeJS.Timeout | null = null;

  constructor(private readonly prisma: PrismaService) {}

  startRetryLoop(): void {
    if (this.retryTimer) {
      return;
    }

    this.retryTimer = setInterval(() => {
      this.retryFailedJobs().catch(() => undefined);
    }, RETRY_INTERVAL_MS);
  }

  stopRetryLoop(): void {
    if (!this.retryTimer) {
      return;
    }

    clearInterval(this.retryTimer);
    this.retryTimer = null;
  }

  private async loadConfig(): Promise<EmailConfigPayload> {
    const now = Date.now();
    if (this.cache && now - this.cache.loadedAt < CACHE_TTL_MS) {
      return this.cache.value;
    }

    const config = await this.prisma.emailConfig.findUnique({
      where: { key: "default" },
    });
    const stored = normalizeEmailConfig(
      parseStoredJson(config?.payload, DEFAULT_EMAIL_CONFIG),
    );
    const payload: EmailConfigPayload = {
      ...stored,
      resendApiKey: decryptString(stored.resendApiKey),
      sendgridApiKey: decryptString(stored.sendgridApiKey),
      smsWebhookUrl: decryptString(stored.smsWebhookUrl),
    };

    this.cache = { value: payload, loadedAt: now };
    return payload;
  }

  private async sendViaWebhook(
    payload: EmailMessagePayload,
    webhookUrl: string,
  ): Promise<SendResult> {
    if (!webhookUrl) {
      return { ok: false, error: "NO_WEBHOOK" };
    }

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return { ok: response.ok, status: response.status };
    } catch {
      return { ok: false, error: "WEBHOOK_ERROR" };
    }
  }

  private async sendViaResend(
    payload: EmailMessagePayload,
    apiKey: string,
  ): Promise<SendResult> {
    if (!apiKey) {
      return { ok: false, error: "NO_RESEND_KEY" };
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: payload.from,
          to: payload.to,
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
        }),
      });
      return { ok: response.ok, status: response.status };
    } catch {
      return { ok: false, error: "RESEND_ERROR" };
    }
  }

  private async sendViaSendgrid(
    payload: EmailMessagePayload,
    apiKey: string,
  ): Promise<SendResult> {
    if (!apiKey) {
      return { ok: false, error: "NO_SENDGRID_KEY" };
    }

    try {
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: payload.to }] }],
          from: { email: payload.from },
          subject: payload.subject,
          content: [
            { type: "text/plain", value: payload.text },
            { type: "text/html", value: payload.html },
          ],
        }),
      });
      return { ok: response.ok, status: response.status };
    } catch {
      return { ok: false, error: "SENDGRID_ERROR" };
    }
  }

  private async sendViaSmsWebhook(
    to: string,
    message: string,
    webhookUrl: string,
  ): Promise<SendResult> {
    if (!webhookUrl) {
      return { ok: false, error: "NO_SMS_WEBHOOK" };
    }

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, message }),
      });
      return { ok: response.ok, status: response.status };
    } catch {
      return { ok: false, error: "SMS_WEBHOOK_ERROR" };
    }
  }

  private async attemptSend(
    payload: EmailMessagePayload,
    provider: string,
    config: EmailConfigPayload,
  ): Promise<SendResult> {
    if (provider === "webhook") {
      return this.sendViaWebhook(payload, config.webhookUrl || "");
    }
    if (provider === "resend") {
      return this.sendViaResend(payload, config.resendApiKey || "");
    }
    if (provider === "sendgrid") {
      return this.sendViaSendgrid(payload, config.sendgridApiKey || "");
    }

    logger.info("Email sent via console provider", { payload });
    return { ok: true };
  }

  private async attemptSendWithPriority(
    payload: EmailMessagePayload,
    provider: string,
    config: EmailConfigPayload,
    priority: EmailPriority,
  ): Promise<SendResult> {
    const result = await this.attemptSend(payload, provider, config);
    if (!result.ok && priority === "high") {
      return this.attemptSend(payload, provider, config);
    }
    return result;
  }

  private async notifyAdminFailure(
    config: EmailConfigPayload,
    payload: EmailMessagePayload,
    error: string,
  ): Promise<void> {
    const appConfig = getAppConfig();
    const adminEmail = config.adminNotifyEmail || appConfig.email.adminNotifyEmail || "";
    if (!adminEmail) {
      return;
    }

    const message = `Email send failed for ${payload.to}. Subject: ${payload.subject}. Error: ${error}`;
    const provider = config.provider || appConfig.email.provider || "console";
    const alertPayload: EmailMessagePayload = {
      from: config.from || appConfig.email.from || "no-reply@gush.local",
      to: adminEmail,
      subject: "[Alert] Email delivery failed",
      html: `<p>${message}</p>`,
      text: message,
    };
    await this.attemptSend(alertPayload, provider, config);
  }

  private async createJob(input: {
    provider: string;
    to: string;
    subject: string;
    payload: EmailMessagePayload;
    priority: EmailPriority;
  }): Promise<EmailJobRow> {
    return this.prisma.emailJob.create({
      data: {
        status: "QUEUED",
        provider: input.provider,
        to: input.to,
        subject: input.subject,
        payload: JSON.stringify(input.payload),
        priority: String(input.priority || "normal"),
        retries: 0,
        lastAttemptAt: new Date(),
        error: "",
      },
    }) as unknown as EmailJobRow;
  }

  private async updateJob(jobId: string, patch: Partial<EmailJobRow>): Promise<void> {
    try {
      await this.prisma.emailJob.update({
        where: { id: jobId },
        data: {
          status: patch.status,
          provider: patch.provider,
          to: patch.to,
          subject: patch.subject,
          payload: patch.payload,
          priority: patch.priority,
          retries: patch.retries,
          lastAttemptAt: patch.lastAttemptAt ?? undefined,
          error: patch.error ?? undefined,
        },
      });
    } catch (error) {
      // Do not fail the user-facing auth flows if the internal job table is misconfigured.
      logger.warn("Email job update failed", { jobId, error });
    }
  }

  private parseJobPayload(raw: unknown): EmailMessagePayload | null {
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(String(raw));
      if (!parsed || typeof parsed !== "object") {
        return null;
      }
      return parsed as EmailMessagePayload;
    } catch {
      return null;
    }
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    text: string,
    options: { priority?: EmailPriority } = {},
  ): Promise<{ ok: boolean }> {
    const config = await this.loadConfig();
    const appConfig = getAppConfig();
    const provider = config.provider || appConfig.email.provider || "console";
    const from = config.from || appConfig.email.from || "no-reply@gush.local";
    const payload: EmailMessagePayload = { from, to, subject, html, text };
    const priority = options.priority || "normal";

    const job = await this.createJob({ provider, to, subject, payload, priority });

    let result = await this.attemptSendWithPriority(payload, provider, config, priority);
    if (!result.ok) {
      const retry = await this.attemptSendWithPriority(payload, provider, config, priority);
      result = retry.ok ? retry : result;
      await this.updateJob(job.id, {
        retries: (job.retries || 0) + 1,
        status: retry.ok ? "SENT" : "FAILED",
        error: retry.ok ? "" : retry.error || "SEND_FAILED",
        lastAttemptAt: new Date(),
      });
      if (!retry.ok) {
        await this.notifyAdminFailure(config, payload, retry.error || "SEND_FAILED");
      }
      return { ok: retry.ok };
    }

    await this.updateJob(job.id, {
      status: "SENT",
      error: "",
      lastAttemptAt: new Date(),
    });
    return { ok: true };
  }

  async retryJobById(jobId: string): Promise<{ ok: boolean; error?: string }> {
    const job = await this.prisma.emailJob.findUnique({ where: { id: jobId } });
    const payload = this.parseJobPayload(job?.payload);
    if (!job || !payload) {
      return { ok: false, error: "JOB_NOT_FOUND" };
    }

    const config = await this.loadConfig();
    const provider = job.provider || "console";
    const result = await this.attemptSend(payload, provider, config);
    await this.updateJob(jobId, {
      status: result.ok ? "SENT" : "FAILED",
      error: result.ok ? "" : result.error || "SEND_FAILED",
      retries: (job.retries || 0) + 1,
      lastAttemptAt: new Date(),
    });
    if (!result.ok) {
      await this.notifyAdminFailure(config, payload, result.error || "SEND_FAILED");
    }
    return { ok: result.ok };
  }

  async retryFailedJobs(): Promise<void> {
    const config = await this.loadConfig();
    const failed = await this.prisma.emailJob.findMany({
      where: {
        status: "FAILED",
        retries: { lt: MAX_RETRIES },
      },
      orderBy: { lastAttemptAt: "desc" },
      take: 20,
    });

    for (const job of failed) {
      const payload = this.parseJobPayload(job.payload);
      if (!payload) {
        continue;
      }

      const provider = job.provider || "console";
      const result = await this.attemptSend(payload, provider, config);
      await this.updateJob(job.id, {
        status: result.ok ? "SENT" : "FAILED",
        error: result.ok ? "" : result.error || "SEND_FAILED",
        retries: (job.retries || 0) + 1,
        lastAttemptAt: new Date(),
      });
      if (!result.ok) {
        await this.notifyAdminFailure(config, payload, result.error || "SEND_FAILED");
      }
    }
  }

  async sendVerifyEmail(email: string, token: string): Promise<{ ok: boolean }> {
    const origin = getFrontendOrigin();
    const link = `${origin}/auth/verify?token=${token}`;
    const subject = "Verify your email";
    const text = `Verify your email: ${link}`;
    const html = `<p>Verify your email:</p><p><a href="${link}">${link}</a></p>`;
    return this.sendEmail(email, subject, html, text, { priority: "high" });
  }

  async sendResetEmail(email: string, token: string): Promise<{ ok: boolean }> {
    const origin = getFrontendOrigin();
    const link = `${origin}/auth/reset?token=${token}`;
    const subject = "Reset your password";
    const text = `Reset your password: ${link}`;
    const html = `<p>Reset your password:</p><p><a href="${link}">${link}</a></p>`;
    return this.sendEmail(email, subject, html, text, { priority: "high" });
  }

  async sendSmsOtp(phone: string, code: string): Promise<SendResult> {
    const config = await this.loadConfig();
    const webhookUrl = config.smsWebhookUrl || getAppConfig().email.smsWebhookUrl || "";
    return this.sendViaSmsWebhook(phone, `Your login code is ${code}`, webhookUrl);
  }
}
