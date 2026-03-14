import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { logger } from "../../../common/logger/winston.init";
import { isAdminAuthorized } from "../../../common/utils/admin";
import { getAdminIdentityFromKey } from "../../../common/utils/admin-security";
import { isAdminTokenJtiRevoked } from "../utils/admin-token-revocation";
import {
  isAdminLegacyAdminKeyFallbackEnabled,
  isAdminTokenFallbackEnabled,
} from "../utils/admin-auth-transport";

const ADMIN_ACCESS_COOKIE_NAME = "admin_access_token";

type TokenSource = "bearer" | "cookie";

interface JwtPayload {
  role?: string;
  type?: string;
  jti?: string;
  adminId?: string;
}

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const bearerToken = this.getBearerToken(request);
    const cookieToken = this.getCookieToken(request, ADMIN_ACCESS_COOKIE_NAME);
    const jwtCandidates: Array<{ source: TokenSource; token: string }> = [];

    if (cookieToken) {
      jwtCandidates.push({ source: "cookie", token: cookieToken });
    }
    if (isAdminTokenFallbackEnabled() && bearerToken && bearerToken !== cookieToken) {
      jwtCandidates.push({ source: "bearer", token: bearerToken });
    }

    let lastJwtError: unknown = null;
    for (const candidate of jwtCandidates) {
      try {
        const payload = await this.verifyJwtToken(candidate.token);
        if (payload.role !== "admin") {
          throw new ForbiddenException("Permission denied");
        }

        const adminId = String(payload.adminId || "admin");
        request.user = {
          userId: adminId,
          role: payload.role,
          jti: payload.jti,
          authSource: candidate.source,
        };
        request.userId = adminId;
        return true;
      } catch (error) {
        if (error instanceof ForbiddenException) {
          throw error;
        }
        lastJwtError = error;
      }
    }

    if (isAdminLegacyAdminKeyFallbackEnabled() && isAdminAuthorized(request, request.body)) {
      const adminId = getAdminIdentityFromKey(bearerToken || "") || "admin";
      request.user = {
        userId: adminId,
        role: "admin",
        authSource: "legacy_admin_key",
      };
      request.userId = adminId;
      return true;
    }

    if (lastJwtError instanceof UnauthorizedException) {
      throw lastJwtError;
    }

    throw new ForbiddenException("Authentication failed");
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
      logger.warn("Admin JWT verification failed", { message: error?.message });
      throw new UnauthorizedException("Authentication failed");
    }

    if (payload.type === "refresh") {
      throw new UnauthorizedException("Authentication failed");
    }

    if (payload.jti) {
      const revoked = await isAdminTokenJtiRevoked(payload.jti, "guard");
      if (revoked) {
        logger.warn("Admin JWT rejected: token is blacklisted", { jti: payload.jti });
        throw new UnauthorizedException("Authentication failed");
      }
    }

    return payload;
  }
}
