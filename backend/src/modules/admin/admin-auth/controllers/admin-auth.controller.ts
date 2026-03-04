import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  Req,
  UsePipes,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { randomUUID } from "crypto";
import { AdminLogService } from "../../../../common/services/admin-log.service";
import { getRedisClient } from "../../../../common/redis/client";
import { logger } from "../../../../common/logger/winston.init";
import { ValidationPipe } from "../../../../common/pipes/validation.pipe";
import { AdminLoginDto, AdminRefreshTokenDto } from "../../dtos/admin-auth.dto";

const ADMIN_ACCESS_COOKIE_NAME = "admin_access_token";
const ADMIN_REFRESH_COOKIE_NAME = "admin_refresh_token";
const ACCESS_TOKEN_EXPIRES_SECONDS = 24 * 60 * 60;
const REFRESH_TOKEN_EXPIRES_SECONDS = 7 * 24 * 60 * 60;

type RequestLike = any;

@Controller("admin/auth")
export class AdminAuthController {
  constructor(
    private readonly jwtService: JwtService,
    private readonly adminLogService: AdminLogService,
  ) {}

  @Post("login")
  @UsePipes(new ValidationPipe())
  async login(@Body() dto: AdminLoginDto, @Req() req: RequestLike) {
    const { adminKey } = dto;
    const clientIp = req.ip || req.connection?.remoteAddress || "unknown";
    const redis = getRedisClient();

    if (redis) {
      const failKey = `admin:login:fail:${clientIp}`;
      const failCount = await redis.get(failKey);
      if (failCount && Number.parseInt(failCount, 10) >= 10) {
        logger.warn(`[admin-login] too many failures from ip=${clientIp}`);
        throw new HttpException(
          "登录失败次数过多，请5分钟后重试",
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const correctAdminKey = process.env.ADMIN_KEY;
    if (!correctAdminKey) {
      throw new HttpException(
        "服务器配置错误：ADMIN_KEY 未设置",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (adminKey !== correctAdminKey) {
      if (redis) {
        const failKey = `admin:login:fail:${clientIp}`;
        const currentCount = await redis.incr(failKey);
        if (currentCount === 1) {
          await redis.expire(failKey, 300);
        }
        logger.warn(`[admin-login] invalid key from ip=${clientIp}, failCount=${currentCount}`);
      }

      await this.adminLogService.log("login_failed", "auth", "admin", {
        reason: "Invalid admin key",
        ip: clientIp,
      });

      throw new HttpException("管理员密钥错误", HttpStatus.UNAUTHORIZED);
    }

    if (redis) {
      const failKey = `admin:login:fail:${clientIp}`;
      await redis.del(failKey);
    }

    const accessJti = randomUUID();
    const accessToken = this.jwtService.sign(
      { role: "admin", timestamp: Date.now(), jti: accessJti },
      { expiresIn: `${ACCESS_TOKEN_EXPIRES_SECONDS}s` },
    );

    const refreshJti = randomUUID();
    const refreshToken = this.jwtService.sign(
      { role: "admin", type: "refresh", timestamp: Date.now(), jti: refreshJti },
      { expiresIn: `${REFRESH_TOKEN_EXPIRES_SECONDS}s` },
    );

    await this.adminLogService.log("login_success", "auth", "admin", {
      message: "Admin logged in successfully",
      ip: clientIp,
    });

    this.setAuthCookies(req, accessToken, refreshToken);

    return {
      success: true,
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRES_SECONDS,
    };
  }

  @Post("refresh")
  @UsePipes(new ValidationPipe())
  async refresh(@Body() dto: AdminRefreshTokenDto, @Req() req: RequestLike) {
    const refreshToken =
      dto?.refreshToken || this.getCookieToken(req, ADMIN_REFRESH_COOKIE_NAME);

    if (!refreshToken) {
      throw new HttpException("缺少 refresh token", HttpStatus.UNAUTHORIZED);
    }

    try {
      const payload = this.jwtService.verify(refreshToken) as { type?: string };
      if (payload.type !== "refresh") {
        throw new HttpException("无效的 refresh token", HttpStatus.UNAUTHORIZED);
      }

      const accessJti = randomUUID();
      const newAccessToken = this.jwtService.sign(
        { role: "admin", timestamp: Date.now(), jti: accessJti },
        { expiresIn: `${ACCESS_TOKEN_EXPIRES_SECONDS}s` },
      );

      this.setAuthCookies(req, newAccessToken, refreshToken);

      return {
        success: true,
        accessToken: newAccessToken,
        refreshToken,
        expiresIn: ACCESS_TOKEN_EXPIRES_SECONDS,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException("Refresh token 无效或已过期", HttpStatus.UNAUTHORIZED);
    }
  }

  @Post("verify")
  async verify(@Body() body: { token?: string }, @Req() req: RequestLike) {
    const token =
      body?.token ||
      this.getBearerToken(req) ||
      this.getCookieToken(req, ADMIN_ACCESS_COOKIE_NAME);

    if (!token) {
      return {
        success: false,
        valid: false,
        message: "缺少 token",
      };
    }

    try {
      const payload = this.jwtService.verify(token);
      return {
        success: true,
        valid: true,
        payload,
      };
    } catch {
      return {
        success: false,
        valid: false,
        message: "Token 无效或已过期",
      };
    }
  }

  @Post("logout")
  async logout(@Body() body: { token?: string }, @Req() req: RequestLike) {
    const token =
      body?.token ||
      this.getBearerToken(req) ||
      this.getCookieToken(req, ADMIN_ACCESS_COOKIE_NAME);

    if (!token) {
      this.clearAuthCookies(req);
      return {
        success: true,
        message: "已退出登录",
      };
    }

    try {
      const payload = this.jwtService.verify(token) as { jti?: string };
      if (payload.jti) {
        const redis = getRedisClient();
        if (redis) {
          const blacklistKey = `admin:token:blacklist:${payload.jti}`;
          await redis.setex(blacklistKey, ACCESS_TOKEN_EXPIRES_SECONDS, "1");
          logger.info(`[admin-logout] token blacklisted jti=${payload.jti}`);
        } else {
          logger.warn("[admin-logout] redis unavailable, skip blacklist");
        }
      }

      await this.adminLogService.log("logout_success", "auth", "admin", {
        jti: payload.jti,
      });

      this.clearAuthCookies(req);
      return {
        success: true,
        message: "退出成功",
      };
    } catch {
      this.clearAuthCookies(req);
      throw new HttpException("Token 无效或已过期", HttpStatus.UNAUTHORIZED);
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
    if (process.env.ADMIN_COOKIE_SECURE) {
      return process.env.ADMIN_COOKIE_SECURE === "true";
    }
    return process.env.NODE_ENV === "production";
  }
}
