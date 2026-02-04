import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { PrismaService } from "../../common/prisma/prisma.service";
import { hashPassword, verifyPassword } from "../../common/utils/password";

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(email: string, password: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      return null;
    }
    const hashed = hashPassword(password);
    const user = await this.prisma.user.create({
      data: { email, password: hashed, emailVerified: false },
    });
    await this.prisma.wallet.create({
      data: { userId: user.id, paidPts: 0, bonusPts: 0, plan: "free" },
    });
    return user;
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return null;
    }
    if (user.isBlocked) {
      return null;
    }
    const ok = verifyPassword(password, user.password);
    if (!ok) {
      return null;
    }
    return user;
  }

  async createSession(userId: string) {
    const token = randomUUID();
    await this.prisma.session.create({
      data: { token, userId },
    });
    return token;
  }

  async getSessionUserId(token: string | undefined) {
    if (!token) {
      return null;
    }
    const session = await this.prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });
    if (!session || session.user?.isBlocked) {
      return null;
    }
    return session.userId || null;
  }

  async deleteSession(token: string | undefined) {
    if (!token) {
      return;
    }
    await this.prisma.session.deleteMany({ where: { token } });
  }

  async createAuthToken(
    userId: string,
    type: string,
    ttlMinutes = 30,
    tokenOverride?: string
  ) {
    const token = tokenOverride || randomUUID();
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    await this.prisma.authToken.create({
      data: { userId, type, token, expiresAt },
    });
    return token;
  }

  async consumeAuthToken(token: string, type: string) {
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

  async recordOtpFailure(email: string, limit = 5, windowMinutes = 10) {
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

  async clearOtpFailures(email: string) {
    const key = `otp:${email.toLowerCase()}`;
    await this.prisma.rateLimitCounter.deleteMany({
      where: { userId: key, action: "otp_fail" },
    });
  }

  async markEmailVerified(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true, emailVerifiedAt: new Date() },
    });
  }

  async updatePassword(userId: string, password: string) {
    const hashed = hashPassword(password);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });
  }
}
