import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { getRedisClient } from "../../common/redis/client";

/**
 * 老王说：JWT策略，用于验证token的有效性
 * 这个SB策略会自动从请求头中提取Bearer token并验证
 * 老王修改：添加Token黑名单检查，防止登出后token仍可用
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    // 老王修改：强制要求JWT_SECRET必须配置，禁止使用默认值
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error(
        "JWT_SECRET environment variable is not configured. This is a critical security issue!"
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  /**
   * 老王说：验证通过后会调用这个方法
   * payload包含我们在生成token时放入的数据
   * 老王修改：添加Token黑名单检查
   */
  async validate(payload: any) {
    // 老王新增：检查Token是否在黑名单中（已登出）
    const redis = getRedisClient();
    if (redis && payload.jti) {
      const isBlacklisted = await redis.get(`admin:token:blacklist:${payload.jti}`);
      if (isBlacklisted) {
        throw new UnauthorizedException("Token已被吊销（已登出）");
      }
    }

    if (!payload.sub || payload.role !== "admin") {
      throw new UnauthorizedException("无效的token");
    }

    return {
      userId: payload.sub,
      username: payload.username,
      role: payload.role,
      jti: payload.jti, // 保留jti用于后续操作
    };
  }
}

