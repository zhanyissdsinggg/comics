import { Injectable } from "@nestjs/common";
import { logger } from "../../common/logger/winston.init";
import { PrismaService } from "../../common/prisma/prisma.service";
import {
  addEmailJob,
  getEmailJob,
  listFailedEmailJobs,
  updateEmailJob,
} from "../../common/storage/mock-store";
import { decryptString } from "../../common/utils/crypto";
import { parseStoredJson } from "../../common/utils/stored-json";
import {
  DEFAULT_EMAIL_CONFIG,
  EmailConfigPayload,
  normalizeEmailConfig,
} from "./email-config";

function getFrontendOrigin(): string {
  return process.env.FRONTEND_ORIGIN?.split(",")[0]?.trim() || "http://localhost:3000";
}

const CACHE_TTL_MS = 60_000;
const RETRY_INTERVAL_MS = 60_000;
const MAX_RETRIES = 5;

type SendResult = { ok: boolean; status?: number; error?: string };

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
    const adminEmail = config.adminNotifyEmail || process.env.ADMIN_NOTIFY_EMAIL || "";
    if (!adminEmail) {
      return;
    }

    const message = `Email send failed for ${payload.to}. Subject: ${payload.subject}. Error: ${error}`;
    const provider = config.provider || process.env.EMAIL_PROVIDER || "console";
    const alertPayload: EmailMessagePayload = {
      from: config.from || process.env.EMAIL_FROM || "no-reply@gush.local",
      to: adminEmail,
      subject: "[Alert] Email delivery failed",
      html: `<p>${message}</p>`,
      text: message,
    };
    await this.attemptSend(alertPayload, provider, config);
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    text: string,
    options: { priority?: EmailPriority } = {},
  ): Promise<{ ok: boolean }> {
    const config = await this.loadConfig();
    const provider = config.provider || process.env.EMAIL_PROVIDER || "console";
    const from = config.from || process.env.EMAIL_FROM || "no-reply@gush.local";
    const payload: EmailMessagePayload = { from, to, subject, html, text };
    const priority = options.priority || "normal";

    const job = addEmailJob({
      provider,
      to,
      subject,
      status: "PENDING",
      retries: 0,
      lastAttemptAt: new Date().toISOString(),
      payload,
      priority,
    });

    let result = await this.attemptSendWithPriority(payload, provider, config, priority);
    if (!result.ok) {
      const retry = await this.attemptSendWithPriority(payload, provider, config, priority);
      result = retry.ok ? retry : result;
      updateEmailJob(job.id, {
        retries: job.retries + 1,
        status: retry.ok ? "SENT" : "FAILED",
        error: retry.ok ? "" : retry.error || "SEND_FAILED",
        lastAttemptAt: new Date().toISOString(),
      });
      if (!retry.ok) {
        await this.notifyAdminFailure(config, payload, retry.error || "SEND_FAILED");
      }
      return { ok: retry.ok };
    }

    updateEmailJob(job.id, {
      status: "SENT",
      error: "",
      lastAttemptAt: new Date().toISOString(),
    });
    return { ok: true };
  }

  async retryJobById(jobId: string): Promise<{ ok: boolean; error?: string }> {
    const job = getEmailJob(jobId);
    if (!job || !job.payload) {
      return { ok: false, error: "JOB_NOT_FOUND" };
    }

    const config = await this.loadConfig();
    const payload = job.payload as EmailMessagePayload;
    const provider = job.provider || "console";
    const result = await this.attemptSend(payload, provider, config);
    updateEmailJob(jobId, {
      status: result.ok ? "SENT" : "FAILED",
      error: result.ok ? "" : result.error || "SEND_FAILED",
      retries: (job.retries || 0) + 1,
      lastAttemptAt: new Date().toISOString(),
    });
    if (!result.ok) {
      await this.notifyAdminFailure(config, payload, result.error || "SEND_FAILED");
    }
    return { ok: result.ok };
  }

  async retryFailedJobs(): Promise<void> {
    const config = await this.loadConfig();
    const failed = listFailedEmailJobs(20);
    for (const job of failed) {
      const full = getEmailJob(job.id);
      if (!full?.payload) {
        continue;
      }
      if ((full.retries || 0) >= MAX_RETRIES) {
        continue;
      }

      const payload = full.payload as EmailMessagePayload;
      const provider = full.provider || "console";
      const result = await this.attemptSend(payload, provider, config);
      updateEmailJob(job.id, {
        status: result.ok ? "SENT" : "FAILED",
        error: result.ok ? "" : result.error || "SEND_FAILED",
        retries: (full.retries || 0) + 1,
        lastAttemptAt: new Date().toISOString(),
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
    const webhookUrl = config.smsWebhookUrl || process.env.SMS_WEBHOOK_URL || "";
    return this.sendViaSmsWebhook(phone, `Your login code is ${code}`, webhookUrl);
  }
}
