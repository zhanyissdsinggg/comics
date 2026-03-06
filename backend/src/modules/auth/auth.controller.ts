import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import { randomBytes } from "crypto";
import { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import { EmailService } from "../email/email.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import { buildCookieOptions } from "../../common/utils/cookies";
import { AuthService } from "./auth.service";

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

type AuthenticatedRequest = Request & {
  userId?: string;
  userEmail?: string;
};

type GooglePayload = {
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

@Controller("auth")
export class AuthController {
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
    @Body("token") token: string,
    @Res({ passthrough: true }) res: Response,
  ) {
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

    const email = this.normalizeEmail(payload?.email || "");
    if (!email || !payload?.email_verified) {
      throw new UnauthorizedException("Google account email is not verified");
    }

    const normalizedName = this.sanitizeName(payload?.name);
    const user = await this.prisma.user.upsert({
      where: { email },
      create: {
        email,
        name: normalizedName,
      },
      update: {
        name: normalizedName ?? undefined,
      },
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

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: { adminKey?: string; email?: string; password?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const adminKey = String(body?.adminKey || "").trim();
    if (adminKey) {
      return this.authService.login(adminKey);
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

    const code = String(Math.floor(100000 + Math.random() * 900000));
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
