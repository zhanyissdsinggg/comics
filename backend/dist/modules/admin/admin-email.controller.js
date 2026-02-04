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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminEmailController = void 0;
const common_1 = require("@nestjs/common");
const admin_1 = require("../../common/utils/admin");
const errors_1 = require("../../common/utils/errors");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const email_service_1 = require("../email/email.service");
const crypto_1 = require("../../common/utils/crypto");
let AdminEmailController = class AdminEmailController {
    constructor(prisma, emailService) {
        this.prisma = prisma;
        this.emailService = emailService;
    }
    async getConfig(req, res) {
        if (!(0, admin_1.isAdminAuthorized)(req)) {
            res.status(403);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.FORBIDDEN);
        }
        const config = await this.prisma.emailConfig.findUnique({ where: { key: "default" } });
        const payload = ((config === null || config === void 0 ? void 0 : config.payload) || {});
        const safePayload = {
            ...payload,
            resendApiKey: payload.resendApiKey ? "????????" : "",
            sendgridApiKey: payload.sendgridApiKey ? "????????" : "",
            smsWebhookUrl: payload.smsWebhookUrl ? "????????" : "",
        };
        return { config: safePayload };
    }
    async save(body, req, res) {
        if (!(0, admin_1.isAdminAuthorized)(req, body)) {
            res.status(403);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.FORBIDDEN);
        }
        const existing = await this.prisma.emailConfig.findUnique({ where: { key: "default" } });
        const current = ((existing === null || existing === void 0 ? void 0 : existing.payload) || {});
        const nextResendKeyRaw = String((body === null || body === void 0 ? void 0 : body.resendApiKey) || "");
        const nextSendgridKeyRaw = String((body === null || body === void 0 ? void 0 : body.sendgridApiKey) || "");
        const nextSmsWebhookRaw = String((body === null || body === void 0 ? void 0 : body.smsWebhookUrl) || "");
        const shouldKeepResend = !nextResendKeyRaw || nextResendKeyRaw.includes("????");
        const shouldKeepSendgrid = !nextSendgridKeyRaw || nextSendgridKeyRaw.includes("????");
        const shouldKeepSms = !nextSmsWebhookRaw || nextSmsWebhookRaw.includes("????");
        const payload = {
            provider: String((body === null || body === void 0 ? void 0 : body.provider) || "console"),
            from: String((body === null || body === void 0 ? void 0 : body.from) || ""),
            webhookUrl: String((body === null || body === void 0 ? void 0 : body.webhookUrl) || ""),
            resendApiKey: shouldKeepResend ? current.resendApiKey || "" : (0, crypto_1.encryptString)(nextResendKeyRaw),
            sendgridApiKey: shouldKeepSendgrid
                ? current.sendgridApiKey || ""
                : (0, crypto_1.encryptString)(nextSendgridKeyRaw),
            smsWebhookUrl: shouldKeepSms ? current.smsWebhookUrl || "" : (0, crypto_1.encryptString)(nextSmsWebhookRaw),
            adminNotifyEmail: String((body === null || body === void 0 ? void 0 : body.adminNotifyEmail) || ""),
            testRecipient: String((body === null || body === void 0 ? void 0 : body.testRecipient) || ""),
            updatedAt: new Date().toISOString(),
        };
        if (payload.resendApiKey && !shouldKeepResend && !(0, crypto_1.isEncrypted)(payload.resendApiKey)) {
            payload.resendApiKey = (0, crypto_1.encryptString)(payload.resendApiKey);
        }
        if (payload.sendgridApiKey && !shouldKeepSendgrid && !(0, crypto_1.isEncrypted)(payload.sendgridApiKey)) {
            payload.sendgridApiKey = (0, crypto_1.encryptString)(payload.sendgridApiKey);
        }
        if (payload.smsWebhookUrl && !shouldKeepSms && !(0, crypto_1.isEncrypted)(payload.smsWebhookUrl)) {
            payload.smsWebhookUrl = (0, crypto_1.encryptString)(payload.smsWebhookUrl);
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
        }
        catch {
        }
        return { config: config.payload };
    }
    async test(body, req, res) {
        if (!(0, admin_1.isAdminAuthorized)(req, body)) {
            res.status(403);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.FORBIDDEN);
        }
        const to = String((body === null || body === void 0 ? void 0 : body.to) || "").trim();
        if (!to) {
            res.status(400);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.INVALID_REQUEST);
        }
        const result = await this.emailService.sendEmail(to, "Test email", "<p>This is a test email from Tappytoon Admin.</p>", "This is a test email from Tappytoon Admin.");
        return { ok: result.ok };
    }
};
exports.AdminEmailController = AdminEmailController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminEmailController.prototype, "getConfig", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminEmailController.prototype, "save", null);
__decorate([
    (0, common_1.Post)("test"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminEmailController.prototype, "test", null);
exports.AdminEmailController = AdminEmailController = __decorate([
    (0, common_1.Controller)("admin/email"),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        email_service_1.EmailService])
], AdminEmailController);
