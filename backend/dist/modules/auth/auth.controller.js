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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const errors_1 = require("../../common/utils/errors");
const stats_service_1 = require("../../common/services/stats.service");
const cookies_1 = require("../../common/utils/cookies");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const limits_1 = require("../../common/storage/limits");
const ip_1 = require("../../common/utils/ip");
const auth_1 = require("../../common/utils/auth");
const email_service_1 = require("../email/email.service");
function normalizeInput(value) {
    return typeof value === "string" ? value.trim() : "";
}
function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
function isValidPassword(value) {
    return value.length >= 8;
}
function generateOtpCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
let AuthController = class AuthController {
    constructor(authService, statsService, prisma, emailService) {
        this.authService = authService;
        this.statsService = statsService;
        this.prisma = prisma;
        this.emailService = emailService;
    }
    async register(body, req, res) {
        const email = normalizeInput(body === null || body === void 0 ? void 0 : body.email);
        const password = normalizeInput(body === null || body === void 0 ? void 0 : body.password);
        if (!isValidEmail(email) || !isValidPassword(password)) {
            res.status(400);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.INVALID_REQUEST, {
                reason: "INVALID_EMAIL_OR_PASSWORD",
            });
        }
        const ip = (0, ip_1.getClientIp)(req);
        const rate = await (0, limits_1.checkRateLimitByIp)(this.prisma, ip, "auth_register", 20, 60);
        if (!rate.ok) {
            res.status(429);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.RATE_LIMITED, { retryAfterSec: rate.retryAfterSec });
        }
        const user = await this.authService.register(email, password);
        if (!user) {
            res.status(409);
            return (0, errors_1.buildError)("USER_EXISTS");
        }
        const token = await this.authService.createSession(user.id);
        res.cookie("mn_session", token, (0, cookies_1.buildCookieOptions)({ httpOnly: true }));
        res.cookie("mn_user_id", user.id, (0, cookies_1.buildCookieOptions)());
        res.cookie("mn_user_email", user.email, (0, cookies_1.buildCookieOptions)());
        res.cookie("mn_is_signed_in", "1", (0, cookies_1.buildCookieOptions)());
        await this.statsService.recordRegistration(user.id);
        return { user: { id: user.id, email: user.email, emailVerified: user.emailVerified } };
    }
    async login(body, req, res) {
        const email = normalizeInput(body === null || body === void 0 ? void 0 : body.email);
        const password = normalizeInput(body === null || body === void 0 ? void 0 : body.password);
        if (!isValidEmail(email) || !isValidPassword(password)) {
            res.status(400);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.INVALID_REQUEST, {
                reason: "INVALID_EMAIL_OR_PASSWORD",
            });
        }
        const ip = (0, ip_1.getClientIp)(req);
        const rate = await (0, limits_1.checkRateLimitByIp)(this.prisma, ip, "auth_login", 30, 60);
        if (!rate.ok) {
            res.status(429);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.RATE_LIMITED, { retryAfterSec: rate.retryAfterSec });
        }
        const user = await this.authService.login(email, password);
        if (!user) {
            res.status(401);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.UNAUTHENTICATED);
        }
        if (!user.emailVerified && process.env.REQUIRE_EMAIL_VERIFIED === "1") {
            res.status(403);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.FORBIDDEN, { reason: "EMAIL_NOT_VERIFIED" });
        }
        if (process.env.REQUIRE_LOGIN_OTP === "1") {
            const otp = generateOtpCode();
            await this.authService.createAuthToken(user.id, "LOGIN_OTP", 10, otp);
            await this.emailService.sendEmail(user.email, "Your login code", `<p>Your login code is <strong>${otp}</strong></p>`, `Your login code is ${otp}`);
            res.status(202);
            return { requiresOtp: true };
        }
        const token = await this.authService.createSession(user.id);
        res.cookie("mn_session", token, (0, cookies_1.buildCookieOptions)({ httpOnly: true }));
        res.cookie("mn_user_id", user.id, (0, cookies_1.buildCookieOptions)());
        res.cookie("mn_user_email", user.email, (0, cookies_1.buildCookieOptions)());
        res.cookie("mn_is_signed_in", "1", (0, cookies_1.buildCookieOptions)());
        await this.statsService.recordDailyActive(user.id);
        return { user: { id: user.id, email: user.email, emailVerified: user.emailVerified } };
    }
    async logout(req, res) {
        var _a;
        const token = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.mn_session;
        await this.authService.deleteSession(token);
        res.clearCookie("mn_session", (0, cookies_1.buildCookieOptions)({ httpOnly: true, maxAge: 0 }));
        res.clearCookie("mn_user_id", (0, cookies_1.buildCookieOptions)({ maxAge: 0 }));
        res.clearCookie("mn_user_email", (0, cookies_1.buildCookieOptions)({ maxAge: 0 }));
        res.cookie("mn_is_signed_in", "0", (0, cookies_1.buildCookieOptions)());
        return { ok: true };
    }
    async me(req, res) {
        var _a;
        const token = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.mn_session;
        const userId = await this.authService.getSessionUserId(token);
        if (!userId) {
            res.status(401);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.UNAUTHENTICATED);
        }
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        return {
            user: {
                id: userId,
                email: (user === null || user === void 0 ? void 0 : user.email) || "",
                emailVerified: Boolean(user === null || user === void 0 ? void 0 : user.emailVerified),
            },
        };
    }
    async requestVerify(body, req, res) {
        const email = normalizeInput(body === null || body === void 0 ? void 0 : body.email);
        const userId = (0, auth_1.getUserIdFromRequest)(req, false);
        const ip = (0, ip_1.getClientIp)(req);
        const rate = await (0, limits_1.checkRateLimitByIp)(this.prisma, ip, "auth_verify_request", 20, 60);
        if (!rate.ok) {
            res.status(429);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.RATE_LIMITED, { retryAfterSec: rate.retryAfterSec });
        }
        const user = email ? await this.prisma.user.findUnique({ where: { email } }) : null;
        const targetUser = user || (userId ? await this.prisma.user.findUnique({ where: { id: userId } }) : null);
        if (!targetUser) {
            return { ok: true };
        }
        const token = await this.authService.createAuthToken(targetUser.id, "VERIFY_EMAIL", 60 * 24);
        await this.emailService.sendVerifyEmail(targetUser.email, token);
        const responseBody = { ok: true };
        if (process.env.NODE_ENV !== "production") {
            responseBody.token = token;
        }
        return responseBody;
    }
    async requestOtp(body, req, res) {
        const email = normalizeInput(body === null || body === void 0 ? void 0 : body.email);
        const phone = normalizeInput(body === null || body === void 0 ? void 0 : body.phone);
        const channel = normalizeInput(body === null || body === void 0 ? void 0 : body.channel) || process.env.OTP_CHANNEL || "email";
        if (!isValidEmail(email)) {
            res.status(400);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.INVALID_REQUEST);
        }
        const ip = (0, ip_1.getClientIp)(req);
        const rate = await (0, limits_1.checkRateLimitByIp)(this.prisma, ip, "auth_otp_request", 20, 60);
        if (!rate.ok) {
            res.status(429);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.RATE_LIMITED, { retryAfterSec: rate.retryAfterSec });
        }
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) {
            return { ok: true };
        }
        const otp = generateOtpCode();
        await this.authService.createAuthToken(user.id, "LOGIN_OTP", 10, otp);
        if (channel === "sms" && phone) {
            await this.emailService.sendSmsOtp(phone, otp);
        }
        else {
            await this.emailService.sendEmail(user.email, "Your login code", `<p>Your login code is <strong>${otp}</strong></p>`, `Your login code is ${otp}`, { priority: "high" });
        }
        return { ok: true };
    }
    async verifyOtp(body, req, res) {
        const email = normalizeInput(body === null || body === void 0 ? void 0 : body.email);
        const code = normalizeInput(body === null || body === void 0 ? void 0 : body.code);
        if (!isValidEmail(email) || !code) {
            res.status(400);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.INVALID_REQUEST);
        }
        const ip = (0, ip_1.getClientIp)(req);
        const rate = await (0, limits_1.checkRateLimitByIp)(this.prisma, ip, "auth_otp_verify", 40, 60);
        if (!rate.ok) {
            res.status(429);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.RATE_LIMITED, { retryAfterSec: rate.retryAfterSec });
        }
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) {
            res.status(401);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.UNAUTHENTICATED);
        }
        const record = await this.authService.consumeAuthToken(code, "LOGIN_OTP");
        if (!record || record.userId !== user.id) {
            const failure = await this.authService.recordOtpFailure(email);
            if (!failure.ok) {
                res.status(429);
                return (0, errors_1.buildError)(errors_1.ERROR_CODES.RATE_LIMITED, { retryAfterSec: failure.retryAfterSec || 60 });
            }
            res.status(401);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.UNAUTHENTICATED);
        }
        await this.authService.clearOtpFailures(email);
        const token = await this.authService.createSession(user.id);
        res.cookie("mn_session", token, (0, cookies_1.buildCookieOptions)({ httpOnly: true }));
        res.cookie("mn_user_id", user.id, (0, cookies_1.buildCookieOptions)());
        res.cookie("mn_user_email", user.email, (0, cookies_1.buildCookieOptions)());
        res.cookie("mn_is_signed_in", "1", (0, cookies_1.buildCookieOptions)());
        await this.statsService.recordDailyActive(user.id);
        return { user: { id: user.id, email: user.email, emailVerified: user.emailVerified } };
    }
    async verify(body, req, res) {
        const token = normalizeInput(body === null || body === void 0 ? void 0 : body.token);
        if (!token) {
            res.status(400);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.INVALID_REQUEST);
        }
        const ip = (0, ip_1.getClientIp)(req);
        const rate = await (0, limits_1.checkRateLimitByIp)(this.prisma, ip, "auth_verify", 40, 60);
        if (!rate.ok) {
            res.status(429);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.RATE_LIMITED, { retryAfterSec: rate.retryAfterSec });
        }
        const record = await this.authService.consumeAuthToken(token, "VERIFY_EMAIL");
        if (!record) {
            res.status(400);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.INVALID_REQUEST);
        }
        await this.authService.markEmailVerified(record.userId);
        return { ok: true };
    }
    async requestReset(body, req, res) {
        const email = normalizeInput(body === null || body === void 0 ? void 0 : body.email);
        if (!isValidEmail(email)) {
            res.status(400);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.INVALID_REQUEST);
        }
        const ip = (0, ip_1.getClientIp)(req);
        const rate = await (0, limits_1.checkRateLimitByIp)(this.prisma, ip, "auth_reset_request", 20, 60);
        if (!rate.ok) {
            res.status(429);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.RATE_LIMITED, { retryAfterSec: rate.retryAfterSec });
        }
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) {
            return { ok: true };
        }
        const token = await this.authService.createAuthToken(user.id, "RESET_PASSWORD", 60);
        await this.emailService.sendResetEmail(user.email, token);
        const responseBody = { ok: true };
        if (process.env.NODE_ENV !== "production") {
            responseBody.token = token;
        }
        return responseBody;
    }
    async reset(body, req, res) {
        const token = normalizeInput(body === null || body === void 0 ? void 0 : body.token);
        const password = normalizeInput(body === null || body === void 0 ? void 0 : body.password);
        if (!token || !isValidPassword(password)) {
            res.status(400);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.INVALID_REQUEST);
        }
        const ip = (0, ip_1.getClientIp)(req);
        const rate = await (0, limits_1.checkRateLimitByIp)(this.prisma, ip, "auth_reset", 30, 60);
        if (!rate.ok) {
            res.status(429);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.RATE_LIMITED, { retryAfterSec: rate.retryAfterSec });
        }
        const record = await this.authService.consumeAuthToken(token, "RESET_PASSWORD");
        if (!record) {
            res.status(400);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.INVALID_REQUEST);
        }
        await this.authService.updatePassword(record.userId, password);
        return { ok: true };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)("register"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)("login"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)("logout"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Get)("me"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "me", null);
__decorate([
    (0, common_1.Post)("request-verify"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "requestVerify", null);
__decorate([
    (0, common_1.Post)("otp/request"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "requestOtp", null);
__decorate([
    (0, common_1.Post)("otp/verify"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyOtp", null);
__decorate([
    (0, common_1.Post)("verify"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verify", null);
__decorate([
    (0, common_1.Post)("request-reset"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "requestReset", null);
__decorate([
    (0, common_1.Post)("reset"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "reset", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)("auth"),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        stats_service_1.StatsService,
        prisma_service_1.PrismaService,
        email_service_1.EmailService])
], AuthController);
