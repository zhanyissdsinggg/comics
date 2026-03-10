import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { getRedisClient } from "../../../common/redis/client";
import { logger } from "../../../common/logger/winston.init";
import { isAdminAuthorized } from "../../../common/utils/admin";

const ADMIN_ACCESS_COOKIE_NAME = "admin_access_token";

type TokenSource = "bearer" | "cookie";

interface JwtPayload {
  role?: string;
  jti?: string;
}

function isLegacyBearerEnabled(): boolean {
  const flag = String(process.env.ADMIN_LEGACY_BEARER_ENABLED || "").trim();
  if (flag) {
    return flag === "1";
  }
  return process.env.NODE_ENV !== "production";
}

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const bearerToken = this.getBearerToken(request);
    const cookieToken = this.getCookieToken(request, ADMIN_ACCESS_COOKIE_NAME);
    const jwtCandidates: Array<{ source: TokenSource; token: string }> = [];

    if (bearerToken) {
      jwtCandidates.push({ source: "bearer", token: bearerToken });
    }
    if (cookieToken && cookieToken !== bearerToken) {
      jwtCandidates.push({ source: "cookie", token: cookieToken });
    }

    let lastJwtError: unknown = null;
    for (const candidate of jwtCandidates) {
      try {
        const payload = await this.verifyJwtToken(candidate.token);
        if (payload.role !== "admin") {
          throw new ForbiddenException("权限不足");
        }

        request.user = {
          userId: "admin",
          role: payload.role,
          jti: payload.jti,
          authSource: candidate.source,
        };
        return true;
      } catch (error) {
        if (error instanceof ForbiddenException) {
          throw error;
        }
        lastJwtError = error;
      }
    }

    if (isLegacyBearerEnabled() && isAdminAuthorized(request, request.body)) {
      request.user = {
        userId: "admin",
        role: "admin",
        authSource: "legacy_admin_key",
      };
      return true;
    }

    if (lastJwtError instanceof UnauthorizedException) {
      throw lastJwtError;
    }

    throw new ForbiddenException("认证失败");
  }

  private getBearerToken(request: any): string | null {
    const authHeader = request?.headers?.authorization;
    if (typeof authHeader !== "string") {
      return null;
    }
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return null;
    }
    const token = authHeader.slice(7).trim();
    return token || null;
  }

  private getCookieToken(request: any, cookieName: string): string | null {
    const token = request?.cookies?.[cookieName];
    if (typeof token !== "string") {
      return null;
    }
    const normalized = token.trim();
    return normalized || null;
  }

  private async verifyJwtToken(token: string): Promise<JwtPayload> {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify(token) as JwtPayload;
    } catch (error: any) {
      logger.warn("Admin JWT 验证失败", { message: error?.message });
      throw new UnauthorizedException("认证失败");
    }

    if (payload.jti) {
      const redis = getRedisClient();
      if (!redis) {
        logger.warn("Admin token blacklist check skipped: Redis unavailable");
        return payload;
      }

      try {
        const blacklistKey = `admin:token:blacklist:${payload.jti}`;
        const result = await redis.get(blacklistKey);
        if (result) {
          logger.warn("Admin JWT rejected: token is blacklisted", { jti: payload.jti });
          throw new UnauthorizedException("认证失败");
        }
      } catch (error) {
        if (error instanceof UnauthorizedException) {
          throw error;
        }
        logger.warn("Admin token blacklist check failed, allowing request", {
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return payload;
  }
}
