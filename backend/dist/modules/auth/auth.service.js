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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const password_1 = require("../../common/utils/password");
let AuthService = class AuthService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async register(email, password) {
        const existing = await this.prisma.user.findUnique({ where: { email } });
        if (existing) {
            return null;
        }
        const hashed = (0, password_1.hashPassword)(password);
        const user = await this.prisma.user.create({
            data: { email, password: hashed, emailVerified: false },
        });
        await this.prisma.wallet.create({
            data: { userId: user.id, paidPts: 0, bonusPts: 0, plan: "free" },
        });
        return user;
    }
    async login(email, password) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) {
            return null;
        }
        if (user.isBlocked) {
            return null;
        }
        const ok = (0, password_1.verifyPassword)(password, user.password);
        if (!ok) {
            return null;
        }
        return user;
    }
    async createSession(userId) {
        const token = (0, crypto_1.randomUUID)();
        await this.prisma.session.create({
            data: { token, userId },
        });
        return token;
    }
    async getSessionUserId(token) {
        var _a;
        if (!token) {
            return null;
        }
        const session = await this.prisma.session.findUnique({
            where: { token },
            include: { user: true },
        });
        if (!session || ((_a = session.user) === null || _a === void 0 ? void 0 : _a.isBlocked)) {
            return null;
        }
        return session.userId || null;
    }
    async deleteSession(token) {
        if (!token) {
            return;
        }
        await this.prisma.session.deleteMany({ where: { token } });
    }
    async createAuthToken(userId, type, ttlMinutes = 30, tokenOverride) {
        const token = tokenOverride || (0, crypto_1.randomUUID)();
        const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
        await this.prisma.authToken.create({
            data: { userId, type, token, expiresAt },
        });
        return token;
    }
    async consumeAuthToken(token, type) {
        const record = await this.prisma.authToken.findUnique({ where: { token } });
        if (!record) {
            return null;
        }
        if (record.type !== type) {
            return null;
        }
        if (record.usedAt) {
            return null;
        }
        if (record.expiresAt.getTime() < Date.now()) {
            return null;
        }
        await this.prisma.authToken.update({
            where: { token },
            data: { usedAt: new Date() },
        });
        return record;
    }
    async recordOtpFailure(email, limit = 5, windowMinutes = 10) {
        const key = `otp:${email.toLowerCase()}`;
        const now = new Date();
        const resetAt = new Date(now.getTime() + windowMinutes * 60 * 1000);
        const existing = await this.prisma.rateLimitCounter.findUnique({
            where: { userId_action: { userId: key, action: "otp_fail" } },
        });
        if (!existing || existing.resetAt.getTime() < now.getTime()) {
            const counter = await this.prisma.rateLimitCounter.upsert({
                where: { userId_action: { userId: key, action: "otp_fail" } },
                update: { count: 1, resetAt },
                create: { userId: key, action: "otp_fail", count: 1, resetAt },
            });
            return { ok: true, remaining: limit - counter.count };
        }
        const nextCount = existing.count + 1;
        await this.prisma.rateLimitCounter.update({
            where: { userId_action: { userId: key, action: "otp_fail" } },
            data: { count: nextCount },
        });
        if (nextCount >= limit) {
            return {
                ok: false,
                remaining: 0,
                retryAfterSec: Math.ceil((existing.resetAt.getTime() - now.getTime()) / 1000),
            };
        }
        return { ok: true, remaining: limit - nextCount };
    }
    async clearOtpFailures(email) {
        const key = `otp:${email.toLowerCase()}`;
        await this.prisma.rateLimitCounter.deleteMany({
            where: { userId: key, action: "otp_fail" },
        });
    }
    async markEmailVerified(userId) {
        await this.prisma.user.update({
            where: { id: userId },
            data: { emailVerified: true, emailVerifiedAt: new Date() },
        });
    }
    async updatePassword(userId, password) {
        const hashed = (0, password_1.hashPassword)(password);
        await this.prisma.user.update({
            where: { id: userId },
            data: { password: hashed },
        });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuthService);
