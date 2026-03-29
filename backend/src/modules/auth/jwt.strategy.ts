import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { getAppConfig } from "../../common/config/app-config";
import { getRedisClient } from "../../common/redis/client";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const jwtSecret = getAppConfig().auth.jwtSecret;
    if (!jwtSecret) {
      throw new Error("JWT_SECRET is required before the auth strategy can start.");
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: {
    sub?: string;
    username?: string;
    role?: string;
    jti?: string;
  }) {
    const redis = getRedisClient();
    if (redis && payload.jti) {
      const isBlacklisted = await redis.get(`admin:token:blacklist:${payload.jti}`);
      if (isBlacklisted) {
        throw new UnauthorizedException("Token has already been revoked.");
      }
    }

    if (!payload.sub || payload.role !== "admin") {
      throw new UnauthorizedException("Invalid token.");
    }

    return {
      userId: payload.sub,
      username: payload.username,
      role: payload.role,
      jti: payload.jti,
    };
  }
}
