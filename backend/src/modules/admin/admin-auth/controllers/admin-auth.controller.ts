import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Req,
  UsePipes,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { randomUUID } from "crypto";
import { IncomingHttpHeaders } from "http";
import { getAdminCookieSecureOverride, getAppConfig } from "../../../../common/config/app-config";
import { AdminLogService } from "../../../../common/services/admin-log.service";
import { getRedisClient } from "../../../../common/redis/client";
import { logger } from "../../../../common/logger/winston.init";
import { ValidationPipe } from "../../../../common/pipes/validation.pipe";
import {
  isAdminTotpEnabled,
  verifyAdminTotpCode,
} from "../../../../common/utils/admin-security";
import {
  AdminRole,
  buildAdminSessionProfile,
  normalizeAdminRole,
} from "../../permissions/admin-permissions";
import {
  isAdminTokenJtiRevoked,
  revokeAdminTokenJti,
} from "../../utils/admin-token-revocation";
import { isAdminTokenFallbackEnabled } from "../../utils/admin-auth-transport";
import { AdminLoginDto, AdminRefreshTokenDto } from "../../dtos/admin-auth.dto";
import { AdminMembersService } from "../../admin-system/services/admin-members.service";

const ADMIN_ACCESS_COOKIE_NAME = "admin_access_token";
const ADMIN_REFRESH_COOKIE_NAME = "admin_refresh_token";
const ACCESS_TOKEN_EXPIRES_SECONDS = 24 * 60 * 60;
const REFRESH_TOKEN_EXPIRES_SECONDS = 7 * 24 * 60 * 60;
const REDIS_OPERATION_TIMEOUT_MS = 1500;

type ResponseLike = {
  setHeader?: (name: string, value: string[]) => void;
};

type RequestLike = {
  headers?: IncomingHttpHeaders & {
    authorization?: string;
    "x-forwarded-for"?: string | string[];
  };
  cookies?: Record<string, string | undefined>;
  user?: {
    userId?: string;
    role?: string;
    jti?: string;
    authSource?: string;
  };
  userId?: string;
  ip?: string;
  connection?: {
    remoteAddress?: string | null;
  };
  res?: ResponseLike;
};
type LoginFailureReason = "invalid_credentials" | "invalid_two_factor_code";
type SessionTokenPayload = {
  role?: string;
  adminRole?: string;
  type?: string;
  jti?: string;
  adminId?: string;
};

@Controller("admin/auth")
export class AdminAuthController {
  constructor(
    private readonly jwtService: JwtService,
    private readonly adminLogService: AdminLogService,
    private readonly adminMembersService: AdminMembersService,
  ) {}

  @Post("login")
  @UsePipes(new ValidationPipe())
  async login(@Body() dto: AdminLoginDto, @Req() req: RequestLike) {
    const { email, password, totpCode } = dto;
    const clientIp = this.getClientIp(req);
    const redis = getRedisClient();
    const appConfig = getAppConfig();

    if (redis) {
      const failKey = `admin:login:fail:${clientIp}`;
      const failCount = await this.runRedisWithFallback(
        () => redis.get(failKey),
        null,
        "login:fail-count:get",
      );
      if (failCount && Number.parseInt(failCount, 10) >= 10) {
        logger.warn(`[admin-login] too many failures from ip=${clientIp}`);
        throw new HttpException(
          "Too many failed attempts. Please retry after 5 minutes.",
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    if (!appConfig.admin.passwordAuthEnabled) {
      throw new HttpException(
        "Server misconfigured: admin password auth is disabled",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const loginMember = await this.adminMembersService.resolveLoginMemberByEmail(
      String(email || "").trim(),
      String(password || ""),
    );
    const requiresTotp = loginMember?.member
      ? this.adminMembersService.isMemberTotpEnabled(loginMember.member) || isAdminTotpEnabled()
      : isAdminTotpEnabled();
    const isTotpValid = !requiresTotp
      || (
        loginMember?.member
          ? (
            this.adminMembersService.isMemberTotpEnabled(loginMember.member)
              ? this.adminMembersService.verifyMemberTotp(loginMember.member, totpCode || "")
              : verifyAdminTotpCode(totpCode || "")
          )
          : verifyAdminTotpCode(totpCode || "")
      );

    if (!loginMember || !isTotpValid) {
      const reason: LoginFailureReason = !loginMember
        ? "invalid_credentials"
        : "invalid_two_factor_code";

      await this.handleLoginFailure({
        redis,
        clientIp,
        reason,
      });

      throw new HttpException(
        reason === "invalid_two_factor_code" ? "Invalid two-factor code" : "Invalid email or password",
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (redis) {
      const failKey = `admin:login:fail:${clientIp}`;
      await this.runRedisWithFallback(
        () => redis.del(failKey),
        0,
        "login:fail-count:clear",
      );
    }

    const adminId = loginMember?.adminId || "admin";
    const adminRole = loginMember?.adminRole || AdminRole.SUPER_ADMIN;
    this.assignRequestIdentity(req, adminId, "login");
    await this.adminMembersService.touchLastLogin(adminId);

    const accessJti = randomUUID();
    const accessToken = this.jwtService.sign(
      { role: "admin", adminRole, adminId, timestamp: Date.now(), jti: accessJti },
      { expiresIn: `${ACCESS_TOKEN_EXPIRES_SECONDS}s` },
    );

    const refreshJti = randomUUID();
    const refreshToken = this.jwtService.sign(
      { role: "admin", adminRole, adminId, type: "refresh", timestamp: Date.now(), jti: refreshJti },
      { expiresIn: `${REFRESH_TOKEN_EXPIRES_SECONDS}s` },
    );

    await this.adminLogService.log("login_success", "auth", adminId, {
      message: "Admin logged in successfully",
      ip: clientIp,
      twoFactorEnabled: requiresTotp,
      adminId,
    }, req as any);

    this.setAuthCookies(req, accessToken, refreshToken);

    return {
      success: true,
      expiresIn: ACCESS_TOKEN_EXPIRES_SECONDS,
      sessionTransport: "cookie",
      session: loginMember?.session || buildAdminSessionProfile(adminId, adminRole),
    };
  }
  @Post("refresh")
  @HttpCode(200)
  @UsePipes(new ValidationPipe())
  async refresh(@Body() dto: AdminRefreshTokenDto, @Req() req: RequestLike) {
    const refreshToken = this.resolveRefreshToken(req, dto?.refreshToken);

    if (!refreshToken) {
      throw new HttpException("Missing refresh token", HttpStatus.UNAUTHORIZED);
    }

    try {
      const payload = this.jwtService.verify(refreshToken) as SessionTokenPayload;
      if (payload.type !== "refresh") {
        throw new HttpException("Invalid refresh token", HttpStatus.UNAUTHORIZED);
      }

      const revoked = await isAdminTokenJtiRevoked(payload.jti, "refresh");
      if (revoked) {
        throw new HttpException("Refresh token is invalid or expired", HttpStatus.UNAUTHORIZED);
      }

      const adminId = payload.adminId || "admin";
      const resolvedSession = await this.adminMembersService.resolveSessionProfile(
        adminId,
        normalizeAdminRole(payload.adminRole, AdminRole.SUPER_ADMIN),
      );
      const adminRole = resolvedSession.adminRole;
      const accessJti = randomUUID();
      const newAccessToken = this.jwtService.sign(
        { role: "admin", adminRole, adminId, timestamp: Date.now(), jti: accessJti },
        { expiresIn: `${ACCESS_TOKEN_EXPIRES_SECONDS}s` },
      );

      this.setAuthCookies(req, newAccessToken, refreshToken);

      return {
        success: true,
        expiresIn: ACCESS_TOKEN_EXPIRES_SECONDS,
        sessionTransport: "cookie",
        session: resolvedSession.session,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException("Refresh token is invalid or expired", HttpStatus.UNAUTHORIZED);
    }
  }

  @Post("verify")
  @HttpCode(200)
  async verify(@Body() body: { token?: string }, @Req() req: RequestLike) {
    const token = this.resolveAccessToken(req, body?.token);

    if (!token) {
      return {
        success: false,
        valid: false,
        message: "Missing token",
      };
    }

    try {
      const payload = this.jwtService.verify(token) as SessionTokenPayload;
      if (payload.type === "refresh") {
        return {
          success: false,
          valid: false,
          message: "Token is invalid or expired",
        };
      }

      const revoked = await isAdminTokenJtiRevoked(payload.jti, "verify");
      if (revoked) {
        return {
          success: false,
          valid: false,
          message: "Token is invalid or expired",
        };
      }

      const adminId = String(payload.adminId || "admin");
      const resolvedSession = await this.adminMembersService.resolveSessionProfile(
        adminId,
        normalizeAdminRole(payload.adminRole, AdminRole.SUPER_ADMIN),
      );

      return {
        success: true,
        valid: true,
        payload,
        session: resolvedSession.session,
      };
    } catch {
      return {
        success: false,
        valid: false,
        message: "Token is invalid or expired",
      };
    }
  }

  @Post("logout")
  @HttpCode(200)
  async logout(@Body() body: { token?: string; refreshToken?: string }, @Req() req: RequestLike) {
    const token = this.resolveAccessToken(req, body?.token);
    const refreshToken = this.resolveRefreshToken(req, body?.refreshToken);

    const accessSession = await this.revokeSessionToken(token, {
      ttlSeconds: ACCESS_TOKEN_EXPIRES_SECONDS,
      expectedType: "access",
      label: "logout:access",
    });
    const refreshSession = await this.revokeSessionToken(refreshToken, {
      ttlSeconds: REFRESH_TOKEN_EXPIRES_SECONDS,
      expectedType: "refresh",
      label: "logout:refresh",
    });

    const adminId = accessSession?.adminId || refreshSession?.adminId || "admin";
    this.assignRequestIdentity(req, adminId, "logout");

    await this.adminLogService.log("logout_success", "auth", adminId, {
      jti: accessSession?.jti || null,
      refreshJti: refreshSession?.jti || null,
      adminId,
    }, req as any);

    this.clearAuthCookies(req);
    return {
      success: true,
      message: "Logged out",
    };
  }

  private async handleLoginFailure(input: {
    redis: ReturnType<typeof getRedisClient>;
    clientIp: string;
    reason: LoginFailureReason;
  }): Promise<void> {
    const { redis, clientIp, reason } = input;

    if (redis) {
      const failKey = `admin:login:fail:${clientIp}`;
      const currentCount = await this.runRedisWithFallback(
        () => redis.incr(failKey),
        0,
        "login:fail-count:incr",
      );
      if (currentCount === 1) {
        await this.runRedisWithFallback(
          () => redis.expire(failKey, 300),
          0,
          "login:fail-count:expire",
        );
      }
      logger.warn(`[admin-login] ${reason} from ip=${clientIp}, failCount=${currentCount}`);
    }

    const reasonMessage = reason === "invalid_two_factor_code"
      ? "Invalid two-factor code"
      : "Invalid email or password";

    await this.adminLogService.log("login_failed", "auth", "admin", {
      reason: reasonMessage,
      ip: clientIp,
    });

    await this.sendSecurityAlert({
      ip: clientIp,
      reason,
    });
  }

  private async sendSecurityAlert(input: {
    ip: string;
    reason: LoginFailureReason;
  }): Promise<void> {
    const appConfig = getAppConfig();
    const webhook = String(appConfig.observability.alertWebhookUrl || "").trim();
    if (!webhook) {
      return;
    }

    const payload = {
      service: "gush-backend",
      type: "admin-login-failure",
      reason: input.reason,
      ip: input.ip,
      time: new Date().toISOString(),
      environment: appConfig.environment,
    };

    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      logger.warn("[admin-login] failed to send security alert", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private assignRequestIdentity(req: RequestLike, adminId: string, authSource?: string): void {
    req.userId = adminId;
    req.user = {
      ...(req.user || {}),
      userId: adminId,
      role: "admin",
      authSource: authSource || req.user?.authSource,
    };
  }

  private getClientIp(req: RequestLike): string {
    const forwarded = req?.headers?.["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.trim()) {
      return forwarded.split(",")[0].trim();
    }

    if (Array.isArray(forwarded) && forwarded.length > 0) {
      return String(forwarded[0] || "").split(",")[0].trim() || "unknown";
    }

    return req?.ip || req?.connection?.remoteAddress || "unknown";
  }

  private async runRedisWithFallback<T>(
    operation: () => Promise<T>,
    fallback: T,
    label: string,
  ): Promise<T> {
    let timeoutId: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<T>((resolve) => {
      timeoutId = setTimeout(() => {
        logger.warn(`[admin-auth] redis operation timed out: ${label}`);
        resolve(fallback);
      }, REDIS_OPERATION_TIMEOUT_MS);
    });

    const opPromise = operation().catch((error: unknown) => {
      logger.warn(`[admin-auth] redis operation failed: ${label}`, {
        message: error instanceof Error ? error.message : String(error),
      });
      return fallback;
    });

    try {
      return await Promise.race([opPromise, timeoutPromise]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  private async revokeSessionToken(
    token: string | null,
    input: {
      ttlSeconds: number;
      expectedType: "access" | "refresh";
      label: string;
    },
  ): Promise<{ jti: string | null; adminId: string | null } | null> {
    if (!token) {
      return null;
    }

    try {
      const payload = this.jwtService.verify(token) as SessionTokenPayload;
      if (input.expectedType === "refresh" && payload.type !== "refresh") {
        return null;
      }
      if (input.expectedType === "access" && payload.type === "refresh") {
        return null;
      }

      await revokeAdminTokenJti(payload.jti, input.ttlSeconds, input.label);
      return {
        jti: payload.jti ? String(payload.jti) : null,
        adminId: payload.adminId ? String(payload.adminId) : null,
      };
    } catch (error) {
      logger.warn(`[admin-auth] failed to revoke ${input.label}`, {
        message: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private getBearerToken(req: RequestLike): string | null {
    const authHeader = req?.headers?.authorization;
    if (typeof authHeader !== "string") {
      return null;
    }
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return null;
    }
    const token = authHeader.slice(7).trim();
    return token || null;
  }

  private resolveAccessToken(
    req: RequestLike,
    fallbackToken?: string,
  ): string | null {
    const cookieToken = this.getCookieToken(req, ADMIN_ACCESS_COOKIE_NAME);
    if (cookieToken) {
      return cookieToken;
    }

    if (!isAdminTokenFallbackEnabled()) {
      return null;
    }

    const normalizedFallback = String(fallbackToken || "").trim();
    if (normalizedFallback) {
      return normalizedFallback;
    }

    return this.getBearerToken(req);
  }

  private resolveRefreshToken(
    req: RequestLike,
    fallbackToken?: string,
  ): string | null {
    const cookieToken = this.getCookieToken(req, ADMIN_REFRESH_COOKIE_NAME);
    if (cookieToken) {
      return cookieToken;
    }

    if (!isAdminTokenFallbackEnabled()) {
      return null;
    }

    const normalizedFallback = String(fallbackToken || "").trim();
    return normalizedFallback || null;
  }

  private getCookieToken(req: RequestLike, cookieName: string): string | null {
    const token = req?.cookies?.[cookieName];
    if (typeof token !== "string") {
      return null;
    }
    const normalized = token.trim();
    return normalized || null;
  }

  private setAuthCookies(req: RequestLike, accessToken: string, refreshToken: string): void {
    const cookies = [
      this.buildCookie(ADMIN_ACCESS_COOKIE_NAME, accessToken, ACCESS_TOKEN_EXPIRES_SECONDS),
      this.buildCookie(ADMIN_REFRESH_COOKIE_NAME, refreshToken, REFRESH_TOKEN_EXPIRES_SECONDS),
    ];
    this.setCookies(req, cookies);
  }

  private clearAuthCookies(req: RequestLike): void {
    const cookies = [
      this.buildExpiredCookie(ADMIN_ACCESS_COOKIE_NAME),
      this.buildExpiredCookie(ADMIN_REFRESH_COOKIE_NAME),
    ];
    this.setCookies(req, cookies);
  }

  private setCookies(req: RequestLike, cookies: string[]): void {
    const response = req?.res;
    if (!response || typeof response.setHeader !== "function") {
      return;
    }
    response.setHeader("Set-Cookie", cookies);
  }

  private buildCookie(name: string, value: string, maxAge: number): string {
    const segments = [
      `${name}=${value}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Strict",
      `Max-Age=${maxAge}`,
    ];
    if (this.shouldUseSecureCookie()) {
      segments.push("Secure");
    }
    return segments.join("; ");
  }

  private buildExpiredCookie(name: string): string {
    const segments = [
      `${name}=`,
      "Path=/",
      "HttpOnly",
      "SameSite=Strict",
      "Max-Age=0",
      "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    ];
    if (this.shouldUseSecureCookie()) {
      segments.push("Secure");
    }
    return segments.join("; ");
  }

  private shouldUseSecureCookie(): boolean {
    const override = getAdminCookieSecureOverride();
    if (override) {
      return override === "true";
    }
    return getAppConfig().environment === "production";
  }
}


