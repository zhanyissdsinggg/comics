import { Injectable, UnauthorizedException, HttpException, HttpStatus } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { logger } from "../../common/logger/winston.init";

/**
 * 老王说：认证服务，负责生成和验证JWT token
 * 这个SB服务是整个认证系统的核心
 */
@Injectable()
export class AuthService {
  private loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_TIME_MS = 15 * 60 * 1000; // 15分钟

  constructor(private jwtService: JwtService) {}

  /**
   * 老王说：检查登录尝试次数，防止暴力破解
   * @param identifier 标识符（这里是"admin"）
   */
  private checkLoginAttempts(identifier: string): void {
    const now = Date.now();
    const attempts = this.loginAttempts.get(identifier);

    if (attempts) {
      // 如果超过锁定时间，重置计数
      if (now - attempts.lastAttempt > this.LOCKOUT_TIME_MS) {
        this.loginAttempts.delete(identifier);
        return;
      }

      // 如果超过最大尝试次数，拒绝登录
      if (attempts.count >= this.MAX_LOGIN_ATTEMPTS) {
        logger.warn(`管理员登录被锁定：${identifier}，尝试次数过多`);
        throw new HttpException("登录尝试次数过多，请稍后再试", HttpStatus.TOO_MANY_REQUESTS);
      }
    }
  }

  /**
   * 老王说：记录登录失败
   * @param identifier 标识符
   */
  private recordFailedAttempt(identifier: string): void {
    const attempts = this.loginAttempts.get(identifier);
    if (attempts) {
      attempts.count++;
      attempts.lastAttempt = Date.now();
    } else {
      this.loginAttempts.set(identifier, { count: 1, lastAttempt: Date.now() });
    }
  }

  /**
   * 老王说：清除登录失败记录
   * @param identifier 标识符
   */
  private clearLoginAttempts(identifier: string): void {
    this.loginAttempts.delete(identifier);
  }

  /**
   * 老王说：验证管理员密钥并生成JWT token
   * 密钥现在使用bcrypt哈希存储，防止明文泄露
   * @param adminKey 管理员密钥
   * @returns JWT token和刷新token
   */
  async login(adminKey: string) {
    const identifier = "admin";

    // 检查登录尝试次数
    this.checkLoginAttempts(identifier);

    if (!adminKey) {
      this.recordFailedAttempt(identifier);
      logger.warn(`管理员登录失败：密钥为空`);
      throw new UnauthorizedException("管理员密钥错误");
    }

    // 老王说：从环境变量获取哈希后的管理员密钥
    const ADMIN_KEY_HASH = process.env.ADMIN_KEY_HASH || "";

    if (!ADMIN_KEY_HASH) {
      logger.error(`环境变量ADMIN_KEY_HASH未设置，无法验证管理员密钥`);
      throw new UnauthorizedException("系统配置错误");
    }

    // 老王说：使用bcrypt验证密钥
    const isValid = await bcrypt.compare(adminKey, ADMIN_KEY_HASH);

    if (!isValid) {
      this.recordFailedAttempt(identifier);
      logger.warn(`管理员登录失败：密钥验证失败`);
      throw new UnauthorizedException("管理员密钥错误");
    }

    // 清除登录失败记录
    this.clearLoginAttempts(identifier);

    // 老王说：生成访问token，有效期1小时
    const payload = {
      sub: "admin",
      username: "admin",
      role: "admin",
      jti: `${Date.now()}-${Math.random()}`, // 添加jti用于token黑名单
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: "1h",
    });

    // 老王说：生成刷新token，有效期7天
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: "7d",
    });

    logger.info(`管理员登录成功`);

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600, // 1小时，单位：秒
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
        role: payload.role,
        jti: `${Date.now()}-${Math.random()}`, // 新的jti
      };

      const accessToken = this.jwtService.sign(newPayload, {
        expiresIn: "1h",
      });

      return {
        accessToken,
        expiresIn: 3600,
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

  /**
   * 老王说：生成管理员密钥的bcrypt哈希值
   * 这个方法用于初始化时生成ADMIN_KEY_HASH环境变量
   * @param adminKey 原始管理员密钥
   * @returns bcrypt哈希值
   */
  async hashAdminKey(adminKey: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(adminKey, saltRounds);
  }
}
