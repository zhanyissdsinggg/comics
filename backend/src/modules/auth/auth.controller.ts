import { Body, Controller, Get, Post, Req, Res } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { Request, Response } from "express";
import { buildError, ERROR_CODES } from "../../common/utils/errors";
import { StatsService } from "../../common/services/stats.service";
import { buildCookieOptions } from "../../common/utils/cookies";
import { PrismaService } from "../../common/prisma/prisma.service";
import { checkRateLimitByIp } from "../../common/storage/limits";
import { getClientIp } from "../../common/utils/ip";
import { getUserIdFromRequest } from "../../common/utils/auth";
import { EmailService } from "../email/email.service";

function normalizeInput(value: any) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPassword(value: string) {
  return value.length >= 8;
}

function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly statsService: StatsService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService
  ) {}

  @Post("register")
  async register(
    @Body() body: any,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const email = normalizeInput(body?.email);
    const password = normalizeInput(body?.password);
    if (!isValidEmail(email) || !isValidPassword(password)) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST, {
        reason: "INVALID_EMAIL_OR_PASSWORD",
      });
    }
    const ip = getClientIp(req);
    const rate = await checkRateLimitByIp(this.prisma, ip, "auth_register", 20, 60);
    if (!rate.ok) {
      res.status(429);
      return buildError(ERROR_CODES.RATE_LIMITED, { retryAfterSec: rate.retryAfterSec });
    }
    const user = await this.authService.register(email, password);
    if (!user) {
      res.status(409);
      return buildError("USER_EXISTS");
    }
    const token = await this.authService.createSession(user.id);
    res.cookie("mn_session", token, buildCookieOptions({ httpOnly: true }));
    res.cookie("mn_user_id", user.id, buildCookieOptions());
    res.cookie("mn_user_email", user.email, buildCookieOptions());
    res.cookie("mn_is_signed_in", "1", buildCookieOptions());
    await this.statsService.recordRegistration(user.id);
    return { user: { id: user.id, email: user.email, emailVerified: user.emailVerified } };
  }

  @Post("login")
  async login(
    @Body() body: any,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const email = normalizeInput(body?.email);
    const password = normalizeInput(body?.password);
    if (!isValidEmail(email) || !isValidPassword(password)) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST, {
        reason: "INVALID_EMAIL_OR_PASSWORD",
      });
    }
    const ip = getClientIp(req);
    const rate = await checkRateLimitByIp(this.prisma, ip, "auth_login", 30, 60);
    if (!rate.ok) {
      res.status(429);
      return buildError(ERROR_CODES.RATE_LIMITED, { retryAfterSec: rate.retryAfterSec });
    }
    const user = await this.authService.login(email, password);
    if (!user) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }
    if (!user.emailVerified && process.env.REQUIRE_EMAIL_VERIFIED === "1") {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN, { reason: "EMAIL_NOT_VERIFIED" });
    }
    if (process.env.REQUIRE_LOGIN_OTP === "1") {
      const otp = generateOtpCode();
      await this.authService.createAuthToken(user.id, "LOGIN_OTP", 10, otp);
      await this.emailService.sendEmail(
        user.email,
        "Your login code",
        `<p>Your login code is <strong>${otp}</strong></p>`,
        `Your login code is ${otp}`
      );
      res.status(202);
      return { requiresOtp: true };
    }
    const token = await this.authService.createSession(user.id);
    res.cookie("mn_session", token, buildCookieOptions({ httpOnly: true }));
    res.cookie("mn_user_id", user.id, buildCookieOptions());
    res.cookie("mn_user_email", user.email, buildCookieOptions());
    res.cookie("mn_is_signed_in", "1", buildCookieOptions());
    await this.statsService.recordDailyActive(user.id);
    return { user: { id: user.id, email: user.email, emailVerified: user.emailVerified } };
  }

  @Post("logout")
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.mn_session;
    await this.authService.deleteSession(token);
    res.clearCookie("mn_session", buildCookieOptions({ httpOnly: true, maxAge: 0 }));
    res.clearCookie("mn_user_id", buildCookieOptions({ maxAge: 0 }));
    res.clearCookie("mn_user_email", buildCookieOptions({ maxAge: 0 }));
    res.cookie("mn_is_signed_in", "0", buildCookieOptions());
    return { ok: true };
  }

  @Get("me")
  async me(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.mn_session;
    const userId = await this.authService.getSessionUserId(token);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return {
      user: {
        id: userId,
        email: user?.email || "",
        emailVerified: Boolean(user?.emailVerified),
      },
    };
  }

  @Post("request-verify")
  async requestVerify(
    @Body() body: any,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const email = normalizeInput(body?.email);
    const userId = getUserIdFromRequest(req, false);
    const ip = getClientIp(req);
    const rate = await checkRateLimitByIp(this.prisma, ip, "auth_verify_request", 20, 60);
    if (!rate.ok) {
      res.status(429);
      return buildError(ERROR_CODES.RATE_LIMITED, { retryAfterSec: rate.retryAfterSec });
    }
    const user =
      email ? await this.prisma.user.findUnique({ where: { email } }) : null;
    const targetUser =
      user || (userId ? await this.prisma.user.findUnique({ where: { id: userId } }) : null);
    if (!targetUser) {
      return { ok: true };
    }
    const token = await this.authService.createAuthToken(targetUser.id, "VERIFY_EMAIL", 60 * 24);
    await this.emailService.sendVerifyEmail(targetUser.email, token);
    const responseBody: any = { ok: true };
    if (process.env.NODE_ENV !== "production") {
      responseBody.token = token;
    }
    return responseBody;
  }

  @Post("otp/request")
  async requestOtp(
    @Body() body: any,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const email = normalizeInput(body?.email);
    const phone = normalizeInput(body?.phone);
    const channel = normalizeInput(body?.channel) || process.env.OTP_CHANNEL || "email";
    if (!isValidEmail(email)) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
    }
    const ip = getClientIp(req);
    const rate = await checkRateLimitByIp(this.prisma, ip, "auth_otp_request", 20, 60);
    if (!rate.ok) {
      res.status(429);
      return buildError(ERROR_CODES.RATE_LIMITED, { retryAfterSec: rate.retryAfterSec });
    }
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { ok: true };
    }
    const otp = generateOtpCode();
    await this.authService.createAuthToken(user.id, "LOGIN_OTP", 10, otp);
    if (channel === "sms" && phone) {
      await this.emailService.sendSmsOtp(phone, otp);
    } else {
      await this.emailService.sendEmail(
        user.email,
        "Your login code",
        `<p>Your login code is <strong>${otp}</strong></p>`,
        `Your login code is ${otp}`,
        { priority: "high" }
      );
    }
    return { ok: true };
  }

  @Post("otp/verify")
  async verifyOtp(
    @Body() body: any,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const email = normalizeInput(body?.email);
    const code = normalizeInput(body?.code);
    if (!isValidEmail(email) || !code) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
    }
    const ip = getClientIp(req);
    const rate = await checkRateLimitByIp(this.prisma, ip, "auth_otp_verify", 40, 60);
    if (!rate.ok) {
      res.status(429);
      return buildError(ERROR_CODES.RATE_LIMITED, { retryAfterSec: rate.retryAfterSec });
    }
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }
    const record = await this.authService.consumeAuthToken(code, "LOGIN_OTP");
    if (!record || record.userId !== user.id) {
      const failure = await this.authService.recordOtpFailure(email);
      if (!failure.ok) {
        res.status(429);
        return buildError(ERROR_CODES.RATE_LIMITED, { retryAfterSec: failure.retryAfterSec || 60 });
      }
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }
    await this.authService.clearOtpFailures(email);
    const token = await this.authService.createSession(user.id);
    res.cookie("mn_session", token, buildCookieOptions({ httpOnly: true }));
    res.cookie("mn_user_id", user.id, buildCookieOptions());
    res.cookie("mn_user_email", user.email, buildCookieOptions());
    res.cookie("mn_is_signed_in", "1", buildCookieOptions());
    await this.statsService.recordDailyActive(user.id);
    return { user: { id: user.id, email: user.email, emailVerified: user.emailVerified } };
  }

  @Post("verify")
  async verify(
    @Body() body: any,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const token = normalizeInput(body?.token);
    if (!token) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
    }
    const ip = getClientIp(req);
    const rate = await checkRateLimitByIp(this.prisma, ip, "auth_verify", 40, 60);
    if (!rate.ok) {
      res.status(429);
      return buildError(ERROR_CODES.RATE_LIMITED, { retryAfterSec: rate.retryAfterSec });
    }
    const record = await this.authService.consumeAuthToken(token, "VERIFY_EMAIL");
    if (!record) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
    }
    await this.authService.markEmailVerified(record.userId);
    return { ok: true };
  }

  @Post("request-reset")
  async requestReset(
    @Body() body: any,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const email = normalizeInput(body?.email);
    if (!isValidEmail(email)) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
    }
    const ip = getClientIp(req);
    const rate = await checkRateLimitByIp(this.prisma, ip, "auth_reset_request", 20, 60);
    if (!rate.ok) {
      res.status(429);
      return buildError(ERROR_CODES.RATE_LIMITED, { retryAfterSec: rate.retryAfterSec });
    }
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { ok: true };
    }
    const token = await this.authService.createAuthToken(user.id, "RESET_PASSWORD", 60);
    await this.emailService.sendResetEmail(user.email, token);
    const responseBody: any = { ok: true };
    if (process.env.NODE_ENV !== "production") {
      responseBody.token = token;
    }
    return responseBody;
  }

  @Post("reset")
  async reset(
    @Body() body: any,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const token = normalizeInput(body?.token);
    const password = normalizeInput(body?.password);
    if (!token || !isValidPassword(password)) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
    }
    const ip = getClientIp(req);
    const rate = await checkRateLimitByIp(this.prisma, ip, "auth_reset", 30, 60);
    if (!rate.ok) {
      res.status(429);
      return buildError(ERROR_CODES.RATE_LIMITED, { retryAfterSec: rate.retryAfterSec });
    }
    const record = await this.authService.consumeAuthToken(token, "RESET_PASSWORD");
    if (!record) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
    }
    await this.authService.updatePassword(record.userId, password);
    return { ok: true };
  }
}
