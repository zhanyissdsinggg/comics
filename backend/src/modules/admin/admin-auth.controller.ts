import { Controller, Post, Body, HttpException, HttpStatus, Req, UsePipes } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AdminLogService } from "../../common/services/admin-log.service";
import { getRedisClient } from "../../common/redis/client";
import { randomUUID } from "crypto";
import { AdminLoginDto, AdminRefreshTokenDto } from "./dtos/admin-auth.dto";
import { ValidationPipe } from "../../common/pipes/validation.pipe";

/**
 * 老王说：管理员认证控制器 - 处理JWT登录和token刷新
 */
@Controller("admin/auth")
export class AdminAuthController {
  constructor(
    private readonly jwtService: JwtService,
    private readonly adminLogService: AdminLogService,
  ) {}

  /**
   * 管理员登录 - 验证ADMIN_KEY并返回JWT token
   * 老王新增：添加速率限制，防止暴力破解
   * 老王修改：使用AdminLoginDto进行输入验证
   */
  @Post("login")
  @UsePipes(new ValidationPipe())
  async login(@Body() dto: AdminLoginDto, @Req() req: any) {
    const { adminKey } = dto;

    // 老王新增：检查登录失败次数（速率限制）
    const clientIp = req.ip || req.connection.remoteAddress || "unknown";
    const redis = getRedisClient();

    if (redis) {
      const failKey = `admin:login:fail:${clientIp}`;
      const failCount = await redis.get(failKey);

      if (failCount && parseInt(failCount) >= 10) {
        console.warn(`[login] IP ${clientIp} 登录失败次数过多，已被限制`);
        throw new HttpException(
          "登录失败次数过多，请5分钟后重试",
          HttpStatus.TOO_MANY_REQUESTS
        );
      }
    }

    // 验证ADMIN_KEY
    const correctAdminKey = process.env.ADMIN_KEY;
    if (adminKey !== correctAdminKey) {
      // 老王新增：记录失败次数
      if (redis) {
        const failKey = `admin:login:fail:${clientIp}`;
        const currentCount = await redis.incr(failKey);
        if (currentCount === 1) {
          await redis.expire(failKey, 300); // 5分钟过期
        }
        console.warn(`[login] IP ${clientIp} 登录失败，当前失败次数: ${currentCount}`);
      }

      // 记录失败的登录尝试
      await this.adminLogService.log(
        "login_failed",
        "auth",
        "admin",
        { reason: "Invalid admin key", ip: clientIp }
      );

      throw new HttpException("管理员密钥错误", HttpStatus.UNAUTHORIZED);
    }

    // 老王新增：登录成功，清除失败计数
    if (redis) {
      const failKey = `admin:login:fail:${clientIp}`;
      await redis.del(failKey);
    }

    // 老王修改：生成access token（24小时有效期）+ jti用于token吊销
    // jti是JWT ID，用于在Redis黑名单中标识token
    const jti = randomUUID();
    const accessToken = this.jwtService.sign(
      { role: "admin", timestamp: Date.now(), jti },
      { expiresIn: "24h" }
    );

    // 老王说：生成refresh token（7天有效期）
    const refreshJti = randomUUID();
    const refreshToken = this.jwtService.sign(
      { role: "admin", type: "refresh", timestamp: Date.now(), jti: refreshJti },
      { expiresIn: "7d" }
    );

    // 记录成功的登录
    await this.adminLogService.log(
      "login_success",
      "auth",
      "admin",
      { message: "Admin logged in successfully" }
    );

    return {
      success: true,
      accessToken,
      refreshToken,
      expiresIn: 86400, // 24小时（秒）
    };
  }

  /**
   * 刷新token - 使用refresh token获取新的access token
   * 老王修改：使用AdminRefreshTokenDto进行输入验证
   */
  @Post("refresh")
  @UsePipes(new ValidationPipe())
  async refresh(@Body() dto: AdminRefreshTokenDto) {
    const { refreshToken } = dto;

    try {
      // 老王说：验证refresh token，不传入secret参数
      const payload = this.jwtService.verify(refreshToken);

      if (payload.type !== "refresh") {
        throw new HttpException("无效的refresh token", HttpStatus.UNAUTHORIZED);
      }

      // 老王修改：生成新的access token（24小时有效期）+ jti用于token吊销
      const jti = randomUUID();
      const newAccessToken = this.jwtService.sign(
        { role: "admin", timestamp: Date.now(), jti },
        { expiresIn: "24h" }
      );

      return {
        success: true,
        accessToken: newAccessToken,
        expiresIn: 86400, // 24小时（秒）
      };
    } catch (error) {
      throw new HttpException("Refresh token无效或已过期", HttpStatus.UNAUTHORIZED);
    }
  }

  /**
   * 验证token - 检查token是否有效
   * 老王修改：添加基础验证
   */
  @Post("verify")
  async verify(@Body() body: { token: string }) {
    const { token } = body;

    try {
      // 老王说：验证token，不传入secret参数
      const payload = this.jwtService.verify(token);
      return {
        success: true,
        valid: true,
        payload,
      };
    } catch (error) {
      return {
        success: false,
        valid: false,
        message: "Token无效或已过期",
      };
    }
  }

  /**
   * 老王新增：管理员登出 - 将token加入Redis黑名单
   * 这个SB功能很重要，防止token泄露后被滥用！
   */
  @Post("logout")
  async logout(@Body() body: { token: string }) {
    const { token } = body;

    try {
      // 老王说：先验证token是否有效
      const payload = this.jwtService.verify(token);

      if (!payload.jti) {
        // 老王说：旧token没有jti，无法吊销，但也算登出成功
        console.warn("[logout] Token没有jti，无法加入黑名单（可能是旧token）");
        return {
          success: true,
          message: "登出成功（旧token无法吊销）",
        };
      }

      // 老王说：将jti加入Redis黑名单，TTL设置为24小时（与token过期时间一致）
      const redis = getRedisClient();
      if (redis) {
        const blacklistKey = `admin:token:blacklist:${payload.jti}`;
        await redis.setex(blacklistKey, 86400, "1"); // 24小时 = 86400秒
        console.log(`[logout] Token已加入黑名单: ${payload.jti}`);
      } else {
        console.warn("[logout] Redis不可用，无法将token加入黑名单");
      }

      // 记录登出日志
      await this.adminLogService.log(
        "logout_success",
        "auth",
        "admin",
        { jti: payload.jti }
      );

      return {
        success: true,
        message: "登出成功",
      };
    } catch (error) {
      throw new HttpException("Token无效或已过期", HttpStatus.UNAUTHORIZED);
    }
  }
}
