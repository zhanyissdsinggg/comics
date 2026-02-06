import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

/**
 * 老王说：JWT策略，用于验证token的有效性
 * 这个SB策略会自动从请求头中提取Bearer token并验证
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || "tappytoon-jwt-secret-change-me",
    });
  }

  /**
   * 老王说：验证通过后会调用这个方法
   * payload包含我们在生成token时放入的数据
   */
  async validate(payload: any) {
    if (!payload.sub || payload.role !== "admin") {
      throw new UnauthorizedException("无效的token");
    }

    return {
      userId: payload.sub,
      username: payload.username,
      role: payload.role
    };
  }
}
