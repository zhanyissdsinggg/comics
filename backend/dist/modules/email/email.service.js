"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const crypto_1 = require("../../common/utils/crypto");
const mock_store_1 = require("../../common/storage/mock-store");
function getFrontendOrigin() {
    var _a, _b;
    return ((_b = (_a = process.env.FRONTEND_ORIGIN) === null || _a === void 0 ? void 0 : _a.split(",")[0]) === null || _b === void 0 ? void 0 : _b.trim()) || "http://localhost:3000";
}
const CACHE_TTL_MS = 60000;
const RETRY_INTERVAL_MS = 60000;
const MAX_RETRIES = 5;
let EmailService = class EmailService {
    constructor(prisma) {
        this.prisma = prisma;
        this.cache = null;
        this.retryTimer = null;
    }
    startRetryLoop() {
        if (this.retryTimer) {
            return;
        }
        this.retryTimer = setInterval(() => {
            this.retryFailedJobs().catch(() => undefined);
        }, RETRY_INTERVAL_MS);
    }
    async loadConfig() {
        const now = Date.now();
        if (this.cache && now - this.cache.loadedAt < CACHE_TTL_MS) {
            return this.cache.value;
        }
        const config = await this.prisma.emailConfig.findUnique({
            where: { key: "default" },
        });
        const payload = ((config === null || config === void 0 ? void 0 : config.payload) || {});
        if (payload.resendApiKey) {
            payload.resendApiKey = (0, crypto_1.decryptString)(payload.resendApiKey);
        }
        if (payload.sendgridApiKey) {
            payload.sendgridApiKey = (0, crypto_1.decryptString)(payload.sendgridApiKey);
        }
        if (payload.smsWebhookUrl) {
            payload.smsWebhookUrl = (0, crypto_1.decryptString)(payload.smsWebhookUrl);
        }
        this.cache = { value: payload, loadedAt: now };
        return payload;
    }
    async sendViaWebhook(payload, webhookUrl) {
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
        }
        catch {
            return { ok: false, error: "WEBHOOK_ERROR" };
        }
    }
    async sendViaResend(payload, apiKey) {
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
        }
        catch {
            return { ok: false, error: "RESEND_ERROR" };
        }
    }
    async sendViaSendgrid(payload, apiKey) {
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
        }
        catch {
            return { ok: false, error: "SENDGRID_ERROR" };
        }
    }
    async sendViaSmsWebhook(to, message, webhookUrl) {
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
        }
        catch {
            return { ok: false, error: "SMS_WEBHOOK_ERROR" };
        }
    }
    async attemptSend(payload, provider, config) {
        if (provider === "webhook") {
            return this.sendViaWebhook(payload, config.webhookUrl || "");
        }
        if (provider === "resend") {
            return this.sendViaResend(payload, config.resendApiKey || "");
        }
        if (provider === "sendgrid") {
            return this.sendViaSendgrid(payload, config.sendgridApiKey || "");
        }
        console.log("[email]", payload);
        return { ok: true };
    }
    async attemptSendWithPriority(payload, provider, config, priority) {
        const result = await this.attemptSend(payload, provider, config);
        if (!result.ok && priority === "high") {
            return this.attemptSend(payload, provider, config);
        }
        return result;
    }
    async notifyAdminFailure(config, payload, error) {
        const adminEmail = config.adminNotifyEmail || process.env.ADMIN_NOTIFY_EMAIL || "";
        if (!adminEmail) {
            return;
        }
        const message = `Email send failed for ${payload.to}. Subject: ${payload.subject}. Error: ${error}`;
        const provider = config.provider || process.env.EMAIL_PROVIDER || "console";
        const alertPayload = {
            from: config.from || process.env.EMAIL_FROM || "no-reply@tappytoon.local",
            to: adminEmail,
            subject: "[Alert] Email delivery failed",
            html: `<p>${message}</p>`,
            text: message,
        };
        await this.attemptSend(alertPayload, provider, config);
    }
    async sendEmail(to, subject, html, text, options = {}) {
        const config = await this.loadConfig();
        const provider = config.provider || process.env.EMAIL_PROVIDER || "console";
        const from = config.from || process.env.EMAIL_FROM || "no-reply@tappytoon.local";
        const payload = { from, to, subject, html, text };
        const priority = options.priority || "normal";
        const job = (0, mock_store_1.addEmailJob)({
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
            (0, mock_store_1.updateEmailJob)(job.id, {
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
        (0, mock_store_1.updateEmailJob)(job.id, {
            status: "SENT",
            error: "",
            lastAttemptAt: new Date().toISOString(),
        });
        return { ok: true };
    }
    async retryJobById(jobId) {
        const job = (0, mock_store_1.getEmailJob)(jobId);
        if (!job || !job.payload) {
            return { ok: false, error: "JOB_NOT_FOUND" };
        }
        const config = await this.loadConfig();
        const payload = job.payload;
        const provider = job.provider || "console";
        const result = await this.attemptSend(payload, provider, config);
        (0, mock_store_1.updateEmailJob)(jobId, {
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
    async retryFailedJobs() {
        const config = await this.loadConfig();
        const failed = (0, mock_store_1.listFailedEmailJobs)(20);
        for (const job of failed) {
            const full = (0, mock_store_1.getEmailJob)(job.id);
            if (!(full === null || full === void 0 ? void 0 : full.payload)) {
                continue;
            }
            if ((full.retries || 0) >= MAX_RETRIES) {
                continue;
            }
            const payload = full.payload;
            const provider = full.provider || "console";
            const result = await this.attemptSend(payload, provider, config);
            (0, mock_store_1.updateEmailJob)(job.id, {
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
    async sendVerifyEmail(email, token) {
        const origin = getFrontendOrigin();
        const link = `${origin}/auth/verify?token=${token}`;
        const subject = "Verify your email";
        const text = `Verify your email: ${link}`;
        const html = `<p>Verify your email:</p><p><a href="${link}">${link}</a></p>`;
        return this.sendEmail(email, subject, html, text, { priority: "high" });
    }
    async sendResetEmail(email, token) {
        const origin = getFrontendOrigin();
        const link = `${origin}/auth/reset?token=${token}`;
        const subject = "Reset your password";
        const text = `Reset your password: ${link}`;
        const html = `<p>Reset your password:</p><p><a href="${link}">${link}</a></p>`;
        return this.sendEmail(email, subject, html, text, { priority: "high" });
    }
    async sendSmsOtp(phone, code) {
        const config = await this.loadConfig();
        const webhookUrl = config.smsWebhookUrl || process.env.SMS_WEBHOOK_URL || "";
        return this.sendViaSmsWebhook(phone, `Your login code is ${code}`, webhookUrl);
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EmailService);
