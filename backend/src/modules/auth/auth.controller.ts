import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpException,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import { randomBytes, randomInt } from "crypto";
import { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import { EmailService } from "../email/email.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import { buildCookieOptions } from "../../common/utils/cookies";
import { AuthService } from "./auth.service";
import { getRedisClient } from "../../common/redis/client";
import { logger } from "../../common/logger/winston.init";

type BcryptLike = {
  compare: (plainText: string, hashedText: string) => Promise<boolean>;
  hash: (plainText: string, saltRounds: number) => Promise<string>;
};

const bcrypt: BcryptLike = (() => {
  try {
    return require("bcrypt");
  } catch {
    return require("bcryptjs");
  }
})();

const GOOGLE_OAUTH_CLIENT = new OAuth2Client();
const SESSION_COOKIE_NAME = "mn_session";
const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60;
const AUTH_TAG_TYPE = "auth";
const PASSWORD_HASH_TAG = "passwordHash";
const EMAIL_VERIFIED_TAG = "emailVerified";
const GOOGLE_SUB_TAG = "googleSub";
const OTP_RATE_LIMIT_WINDOW_SECONDS = 10 * 60;
const OTP_RATE_LIMIT_PER_IP = 10;
const OTP_RATE_LIMIT_PER_EMAIL = 5;

type AuthenticatedRequest = Request & {
  userId?: string;
  userEmail?: string;
};

type GooglePayload = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
};

type EphemeralPayload = {
  email?: string;
  code?: string;
  channel?: string;
  phone?: string;
};

type EphemeralRequestResult = {
  success: true;
  ok: true;
  token?: string;
};

type LocalRateLimitState = {
  count: number;
  expiresAt: number;
};

@Controller("auth")
export class AuthController {
  private readonly otpRateLimitStore = new Map<string, LocalRateLimitState>();

  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  private normalizeEmail(email: string): string {
    return String(email || "").trim().toLowerCase();
  }

  private sanitizeName(name: unknown): string | null {
    if (typeof name !== "string") {
      return null;
    }
    const trimmed = name.trim();
    return trimmed ? trimmed.slice(0, 100) : null;
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private async getAuthTag(userId: string, tag: string): Promise<string | null> {
    const record = await this.prisma.userTag.findFirst({
      where: {
        userId,
        tagType: AUTH_TAG_TYPE,
        tag,
      },
      select: {
        tagValue: true,
      },
    });
    return record?.tagValue || null;
  }

  private async setAuthTag(userId: string, tag: string, value: string): Promise<void> {
    const existing = await this.prisma.userTag.findFirst({
      where: {
        userId,
        tagType: AUTH_TAG_TYPE,
        tag,
      },
      select: { id: true },
    });

    if (existing?.id) {
      await this.prisma.userTag.update({
        where: { id: existing.id },
        data: { tagValue: value },
      });
      return;
    }

    await this.prisma.userTag.create({
      data: {
        userId,
        tagType: AUTH_TAG_TYPE,
        tag,
        tagValue: value,
      },
    });
  }

  private async deleteAuthTag(userId: string, tag: string): Promise<void> {
    await this.prisma.userTag.deleteMany({
      where: {
        userId,
        tagType: AUTH_TAG_TYPE,
        tag,
      },
    });
  }

  private async findUserByGoogleSub(googleSub: string) {
    const binding = await this.prisma.userTag.findFirst({
      where: {
        tagType: AUTH_TAG_TYPE,
        tag: GOOGLE_SUB_TAG,
        tagValue: googleSub,
      },
      select: {
        userId: true,
      },
    });

    if (!binding?.userId) {
      return null;
    }

    return this.prisma.user.findUnique({
      where: { id: binding.userId },
      select: {
        id: true,
        email: true,
        name: true,
        isBlocked: true,
      },
    });
  }

  private async isEmailVerified(userId: string): Promise<boolean> {
    const raw = await this.getAuthTag(userId, EMAIL_VERIFIED_TAG);
    return raw === "1";
  }

  private async ensureWallet(userId: string): Promise<void> {
    await this.prisma.wallet.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  private async createSession(userId: string, res: Response): Promise<void> {
    const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);
    const sessionToken = randomBytes(32).toString("hex");

    await this.prisma.session.create({
      data: {
        userId,
        token: sessionToken,
        expiresAt,
      },
    });

    res.cookie(
      SESSION_COOKIE_NAME,
      sessionToken,
      buildCookieOptions({
        httpOnly: true,
        maxAge: SESSION_DURATION_SECONDS * 1000,
      }),
    );
  }

  private clearSessionCookie(res: Response): void {
    res.cookie(
      SESSION_COOKIE_NAME,
      "",
      buildCookieOptions({
        httpOnly: true,
        maxAge: 0,
      }),
    );
  }

  private async createEphemeralToken(
    prefix: string,
    payload: EphemeralPayload,
    ttlSeconds: number,
  ): Promise<string> {
    const token = randomBytes(24).toString("hex");
    const key = `${prefix}:${token}`;
    await this.prisma.idempotencyKey.upsert({
      where: { key },
      create: {
        key,
        response: JSON.stringify(payload),
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      },
      update: {
        response: JSON.stringify(payload),
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      },
    });
    return token;
  }

  private async readEphemeralToken(prefix: string, token: string): Promise<EphemeralPayload | null> {
    const normalized = String(token || "").trim();
    if (!normalized) {
      return null;
    }

    const key = `${prefix}:${normalized}`;
    const record = await this.prisma.idempotencyKey.findUnique({ where: { key } });
    if (!record) {
      return null;
    }

    if (record.expiresAt.getTime() <= Date.now()) {
      await this.prisma.idempotencyKey.delete({ where: { key } }).catch(() => undefined);
      return null;
    }

    try {
      const parsed = JSON.parse(String(record.response || "{}"));
      if (!parsed || typeof parsed !== "object") {
        return null;
      }
      return parsed as EphemeralPayload;
    } catch {
      return null;
    }
  }

  private async consumeEphemeralToken(prefix: string, token: string): Promise<EphemeralPayload | null> {
    const payload = await this.readEphemeralToken(prefix, token);
    if (!payload) {
      return null;
    }

    const key = `${prefix}:${String(token || "").trim()}`;
    await this.prisma.idempotencyKey.delete({ where: { key } }).catch(() => undefined);
    return payload;
  }

  private shouldExposeDebugTokens(): boolean {
    return process.env.AUTH_DEBUG_TOKENS === "1" && process.env.NODE_ENV !== "production";
  }

  private buildEphemeralRequestResult(token: string): EphemeralRequestResult {
    if (this.shouldExposeDebugTokens()) {
      return {
        success: true,
        ok: true,
        token,
      };
    }

    return {
      success: true,
      ok: true,
    };
  }

  private async toUserResponse(user: { id: string; email: string; name: string | null }) {
    const emailVerified = await this.isEmailVerified(user.id);
    return {
      id: user.id,
      userId: user.id,
      email: user.email,
      name: user.name,
      role: "user",
      emailVerified,
    };
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.trim()) {
      return forwarded.split(",")[0].trim();
    }
    if (Array.isArray(forwarded) && forwarded.length > 0) {
      return String(forwarded[0] || "").split(",")[0].trim() || "unknown";
    }
    return req.ip || req.socket?.remoteAddress || "unknown";
  }

  private bumpLocalRateLimit(key: string, windowSeconds: number): number {
    const now = Date.now();
    const current = this.otpRateLimitStore.get(key);
    if (!current || current.expiresAt <= now) {
      this.otpRateLimitStore.set(key, {
        count: 1,
        expiresAt: now + windowSeconds * 1000,
      });
      return 1;
    }

    current.count += 1;
    this.otpRateLimitStore.set(key, current);
    return current.count;
  }

  private async bumpRateLimit(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<void> {
    const redis = getRedisClient();
    let count = 0;

    if (redis) {
      try {
        count = Number(await redis.incr(key));
        if (count === 1) {
          await redis.expire(key, windowSeconds);
        }
      } catch (error: unknown) {
        logger.warn("[auth-otp] redis rate-limit fallback to local store", {
          key,
          message: error instanceof Error ? error.message : String(error),
        });
        count = this.bumpLocalRateLimit(key, windowSeconds);
      }
    } else {
      count = this.bumpLocalRateLimit(key, windowSeconds);
    }

    if (count > limit) {
      throw new HttpException(
        "Too many OTP requests. Please try again later.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async enforceOtpRateLimit(req: Request, email: string): Promise<void> {
    const ip = this.getClientIp(req);
    await this.bumpRateLimit(
      `auth:otp:request:ip:${ip}`,
      OTP_RATE_LIMIT_PER_IP,
      OTP_RATE_LIMIT_WINDOW_SECONDS,
    );
    await this.bumpRateLimit(
      `auth:otp:request:email:${email}`,
      OTP_RATE_LIMIT_PER_EMAIL,
      OTP_RATE_LIMIT_WINDOW_SECONDS,
    );
  }

  @Get("me")
  async me(@Req() req: AuthenticatedRequest) {
    const userId = req.userId;
    if (!userId) {
      return {
        success: true,
        user: null,
        isSignedIn: false,
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        isBlocked: true,
      },
    });

    if (!user || user.isBlocked) {
      return {
        success: true,
        user: null,
        isSignedIn: false,
      };
    }

    return {
      success: true,
      isSignedIn: true,
      user: await this.toUserResponse(user),
    };
  }

  @Post("register")
  @HttpCode(HttpStatus.OK)
  async register(
    @Body() body: { email?: string; password?: string; name?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const email = this.normalizeEmail(body?.email || "");
    const password = String(body?.password || "");

    if (!this.isValidEmail(email)) {
      throw new BadRequestException("Invalid email");
    }
    if (password.length < 6) {
      throw new BadRequestException("Password must be at least 6 characters");
    }

    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, isBlocked: true },
    });

    if (existing?.isBlocked) {
      throw new UnauthorizedException("Account is blocked");
    }

    let user = existing;
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          name: this.sanitizeName(body?.name),
        },
        select: { id: true, email: true, name: true, isBlocked: true },
      });
    }

    const existedHash = await this.getAuthTag(user.id, PASSWORD_HASH_TAG);
    if (existedHash) {
      throw new ConflictException("Email is already registered");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await this.setAuthTag(user.id, PASSWORD_HASH_TAG, passwordHash);
    if (!(await this.isEmailVerified(user.id))) {
      await this.setAuthTag(user.id, EMAIL_VERIFIED_TAG, "0");
    }

    await this.ensureWallet(user.id);
    await this.createSession(user.id, res);

    return {
      success: true,
      ok: true,
      isSignedIn: true,
      user: await this.toUserResponse(user),
    };
  }

  @Post("google/callback")
  @HttpCode(HttpStatus.OK)
  async googleCallback(
    @Body() body: { token?: string; mode?: "login" | "link" },
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const mode = body?.mode === "link" ? "link" : "login";
    const token = body?.token || "";
    const normalizedToken = typeof token === "string" ? token.trim() : "";
    if (!normalizedToken) {
      throw new BadRequestException("Missing Google token");
    }

    const googleClientId =
      process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
    if (!googleClientId) {
      throw new InternalServerErrorException("Google login is not configured");
    }

    let payload: GooglePayload | undefined;
    try {
      const ticket = await GOOGLE_OAUTH_CLIENT.verifyIdToken({
        idToken: normalizedToken,
        audience: googleClientId,
      });
      payload = ticket.getPayload() as GooglePayload | undefined;
    } catch {
      throw new UnauthorizedException("Invalid Google token");
    }

    const googleSub = String(payload?.sub || "").trim();
    const email = this.normalizeEmail(payload?.email || "");
    if (!googleSub) {
      throw new UnauthorizedException("Invalid Google account identity");
    }
    if (!email || !payload?.email_verified) {
      throw new UnauthorizedException("Google account email is not verified");
    }

    const normalizedName = this.sanitizeName(payload?.name);
    let user = await this.findUserByGoogleSub(googleSub);

    if (mode === "link") {
      if (!req.userId) {
        throw new UnauthorizedException("Please sign in before linking Google");
      }

      const currentUser = await this.prisma.user.findUnique({
        where: { id: req.userId },
        select: {
          id: true,
          email: true,
          name: true,
          isBlocked: true,
        },
      });

      if (!currentUser || currentUser.isBlocked) {
        throw new UnauthorizedException("Account is blocked");
      }

      if (user && user.id !== currentUser.id) {
        throw new ConflictException("This Google account is already linked to another user");
      }

      await this.setAuthTag(currentUser.id, GOOGLE_SUB_TAG, googleSub);
      if (currentUser.email === email) {
        await this.setAuthTag(currentUser.id, EMAIL_VERIFIED_TAG, "1");
      }

      return {
        success: true,
        ok: true,
        linked: true,
        user: await this.toUserResponse(currentUser),
      };
    }

    if (!user) {
      const emailUser = await this.prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          isBlocked: true,
        },
      });

      if (emailUser) {
        const existingGoogleSub = await this.getAuthTag(emailUser.id, GOOGLE_SUB_TAG);
        if (existingGoogleSub && existingGoogleSub !== googleSub) {
          throw new ConflictException("Email is already linked to another Google account");
        }

        user = await this.prisma.user.update({
          where: { id: emailUser.id },
          data: {
            name: normalizedName ?? undefined,
          },
          select: {
            id: true,
            email: true,
            name: true,
            isBlocked: true,
          },
        });
      } else {
        user = await this.prisma.user.create({
          data: {
            email,
            name: normalizedName,
          },
          select: {
            id: true,
            email: true,
            name: true,
            isBlocked: true,
          },
        });
      }
    }

    if (user.isBlocked) {
      throw new UnauthorizedException("Account is blocked");
    }

    await this.setAuthTag(user.id, GOOGLE_SUB_TAG, googleSub);
    await this.setAuthTag(user.id, EMAIL_VERIFIED_TAG, "1");
    await this.ensureWallet(user.id);
    await this.createSession(user.id, res);

    return {
      success: true,
      ok: true,
      isSignedIn: true,
      user: await this.toUserResponse(user),
    };
  }

  @Get("providers")
  async providers(@Req() req: AuthenticatedRequest) {
    if (!req.userId) {
      return {
        success: true,
        isSignedIn: false,
        providers: {
          google: false,
          password: false,
        },
      };
    }

    const [googleSub, passwordHash] = await Promise.all([
      this.getAuthTag(req.userId, GOOGLE_SUB_TAG),
      this.getAuthTag(req.userId, PASSWORD_HASH_TAG),
    ]);

    return {
      success: true,
      isSignedIn: true,
      providers: {
        google: Boolean(googleSub),
        password: Boolean(passwordHash),
      },
    };
  }

  @Post("google/unlink")
  @HttpCode(HttpStatus.OK)
  async unlinkGoogle(@Req() req: AuthenticatedRequest) {
    if (!req.userId) {
      throw new UnauthorizedException("Please sign in first");
    }

    const [googleSub, passwordHash] = await Promise.all([
      this.getAuthTag(req.userId, GOOGLE_SUB_TAG),
      this.getAuthTag(req.userId, PASSWORD_HASH_TAG),
    ]);

    if (!googleSub) {
      return {
        success: true,
        ok: true,
        unlinked: false,
      };
    }

    if (!passwordHash) {
      throw new BadRequestException("Set a password before unlinking Google");
    }

    await this.deleteAuthTag(req.userId, GOOGLE_SUB_TAG);

    return {
      success: true,
      ok: true,
      unlinked: true,
    };
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: { adminKey?: string; email?: string; password?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const adminKey = String(body?.adminKey || "").trim();
    if (adminKey) {
      throw new BadRequestException("Use /api/admin/auth/login for admin access");
    }

    const email = this.normalizeEmail(body?.email || "");
    const password = String(body?.password || "");

    if (!this.isValidEmail(email) || !password) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, isBlocked: true },
    });

    if (!user || user.isBlocked) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const passwordHash = await this.getAuthTag(user.id, PASSWORD_HASH_TAG);
    if (!passwordHash) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const valid = await bcrypt.compare(password, passwordHash);
    if (!valid) {
      throw new UnauthorizedException("Invalid email or password");
    }

    await this.ensureWallet(user.id);
    await this.createSession(user.id, res);

    return {
      success: true,
      ok: true,
      isSignedIn: true,
      user: await this.toUserResponse(user),
    };
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = String(req.cookies?.[SESSION_COOKIE_NAME] || "").trim();
    if (token) {
      await this.prisma.session.deleteMany({ where: { token } });
    }
    this.clearSessionCookie(res);

    return {
      success: true,
      ok: true,
      isSignedIn: false,
    };
  }

  @Post("request-verify")
  @HttpCode(HttpStatus.OK)
  async requestVerify(@Body("email") emailValue: string) {
    const email = this.normalizeEmail(emailValue || "");
    if (!this.isValidEmail(email)) {
      throw new BadRequestException("Invalid email");
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, isBlocked: true },
    });
    if (!user || user.isBlocked) {
      return { success: true, ok: true };
    }

    const token = await this.createEphemeralToken("verify", { email: user.email }, 24 * 60 * 60);
    await this.emailService.sendVerifyEmail(user.email, token);

    return this.buildEphemeralRequestResult(token);
  }

  @Post("verify")
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body("token") token: string) {
    const payload = await this.consumeEphemeralToken("verify", token);
    const email = this.normalizeEmail(payload?.email || "");
    if (!email) {
      throw new BadRequestException("Invalid or expired verification token");
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) {
      throw new BadRequestException("Invalid verification token");
    }

    await this.setAuthTag(user.id, EMAIL_VERIFIED_TAG, "1");

    return {
      success: true,
      ok: true,
    };
  }

  @Post("request-reset")
  @HttpCode(HttpStatus.OK)
  async requestReset(@Body("email") emailValue: string) {
    const email = this.normalizeEmail(emailValue || "");
    if (!this.isValidEmail(email)) {
      throw new BadRequestException("Invalid email");
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { email: true, isBlocked: true },
    });
    if (!user || user.isBlocked) {
      return { success: true, ok: true };
    }

    const token = await this.createEphemeralToken("reset", { email: user.email }, 30 * 60);
    await this.emailService.sendResetEmail(user.email, token);

    return this.buildEphemeralRequestResult(token);
  }

  @Post("reset")
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: { token?: string; password?: string }) {
    const password = String(body?.password || "");
    if (password.length < 6) {
      throw new BadRequestException("Password must be at least 6 characters");
    }

    const payload = await this.consumeEphemeralToken("reset", body?.token || "");
    const email = this.normalizeEmail(payload?.email || "");
    if (!email) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) {
      throw new BadRequestException("Invalid reset token");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await this.setAuthTag(user.id, PASSWORD_HASH_TAG, passwordHash);

    return {
      success: true,
      ok: true,
    };
  }

  @Post("otp/request")
  @HttpCode(HttpStatus.OK)
  async requestOtp(
    @Body() body: { email?: string; channel?: string; phone?: string },
    @Req() req: Request,
  ) {
    const email = this.normalizeEmail(body?.email || "");
    const channel = String(body?.channel || "email").toLowerCase() === "sms" ? "sms" : "email";
    const phone = String(body?.phone || "").trim();

    if (!this.isValidEmail(email)) {
      throw new BadRequestException("Invalid email");
    }
    if (channel === "sms" && !phone) {
      throw new BadRequestException("INVALID_REQUEST");
    }

    await this.enforceOtpRateLimit(req, email);

    const code = String(randomInt(100000, 1000000));
    const key = `otp:${email}`;
    await this.prisma.idempotencyKey.upsert({
      where: { key },
      create: {
        key,
        response: JSON.stringify({ email, code, channel, phone }),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
      update: {
        response: JSON.stringify({ email, code, channel, phone }),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    if (channel === "sms") {
      await this.emailService.sendSmsOtp(phone, code);
    } else {
      await this.emailService.sendEmail(
        email,
        "Your login code",
        `<p>Your login code is <strong>${code}</strong></p>`,
        `Your login code is ${code}`,
        { priority: "high" },
      );
    }

    return {
      success: true,
      ok: true,
    };
  }

  @Post("otp/verify")
  @HttpCode(HttpStatus.OK)
  async verifyOtp(
    @Body() body: { email?: string; code?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const email = this.normalizeEmail(body?.email || "");
    const code = String(body?.code || "").trim();

    if (!this.isValidEmail(email) || !code) {
      throw new BadRequestException("OTP failed.");
    }

    const key = `otp:${email}`;
    const record = await this.prisma.idempotencyKey.findUnique({ where: { key } });
    if (!record || record.expiresAt.getTime() <= Date.now()) {
      if (record) {
        await this.prisma.idempotencyKey.delete({ where: { key } }).catch(() => undefined);
      }
      throw new BadRequestException("OTP failed.");
    }

    let payload: EphemeralPayload = {};
    try {
      payload = JSON.parse(String(record.response || "{}"));
    } catch {
      payload = {};
    }

    if (String(payload?.code || "").trim() !== code) {
      throw new BadRequestException("OTP failed.");
    }

    await this.prisma.idempotencyKey.delete({ where: { key } }).catch(() => undefined);

    const user = await this.prisma.user.upsert({
      where: { email },
      create: {
        email,
        name: null,
      },
      update: {},
      select: {
        id: true,
        email: true,
        name: true,
        isBlocked: true,
      },
    });

    if (user.isBlocked) {
      throw new UnauthorizedException("Account is blocked");
    }

    await this.setAuthTag(user.id, EMAIL_VERIFIED_TAG, "1");
    await this.ensureWallet(user.id);
    await this.createSession(user.id, res);

    return {
      success: true,
      ok: true,
      isSignedIn: true,
      user: await this.toUserResponse(user),
    };
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(@Body("refreshToken") refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }

  @Get("preferences")
  async preferences(@Req() req: AuthenticatedRequest) {
    if (!req.userId) {
      return {
        success: true,
        preferences: {
          theme: "dark",
          language: "en",
          adultMode: false,
        },
      };
    }

    return {
      success: true,
      preferences: {
        theme: "dark",
        language: "en",
        adultMode: false,
      },
    };
  }

  @Post("validate")
  @HttpCode(HttpStatus.OK)
  async validate(@Body("token") token: string) {
    const valid = await this.authService.validateToken(token);
    return { valid };
  }
}
