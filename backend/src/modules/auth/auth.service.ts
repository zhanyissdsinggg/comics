import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

/**
 * 老王说：认证服务，负责生成和验证JWT token
 * 这个SB服务是整个认证系统的核心
 */
@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  /**
   * 老王说：验证管理员密钥并生成JWT token
   * @param adminKey 管理员密钥
   * @returns JWT token和刷新token
   */
  async login(adminKey: string) {
    const ADMIN_KEY = process.env.ADMIN_KEY || "";

    if (!adminKey || adminKey !== ADMIN_KEY) {
      throw new UnauthorizedException("管理员密钥错误");
    }

    // 老王说：生成访问token，有效期1小时
    const payload = {
      sub: "admin",
      username: "admin",
      role: "admin"
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: "1h"
    });

    // 老王说：生成刷新token，有效期7天
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: "7d"
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600 // 1小时，单位：秒
    };
  }

  /**
   * 老王说：使用刷新token获取新的访问token
   * @param refreshToken 刷新token
   * @returns 新的访问token
   */
  async refresh(refreshToken: string) {
    try {
      // 老王说：验证刷新token的有效性
      const payload = this.jwtService.verify(refreshToken);

      if (!payload.sub || payload.role !== "admin") {
        throw new UnauthorizedException("无效的刷新token");
      }

      // 老王说：生成新的访问token
      const newPayload = {
        sub: payload.sub,
        username: payload.username,
        role: payload.role
      };

      const accessToken = this.jwtService.sign(newPayload, {
        expiresIn: "1h"
      });

      return {
        accessToken,
        expiresIn: 3600
      };
    } catch (error) {
      throw new UnauthorizedException("刷新token无效或已过期");
    }
  }

  /**
   * 老王说：验证token的有效性
   * @param token JWT token
   * @returns 是否有效
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      const payload = this.jwtService.verify(token);
      return !!payload.sub && payload.role === "admin";
    } catch (error) {
      return false;
    }
  }
}
