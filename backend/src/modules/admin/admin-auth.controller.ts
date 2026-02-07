import { Controller, Post, Body, HttpException, HttpStatus } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AdminLogService } from "../../common/services/admin-log.service";

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
   */
  @Post("login")
  async login(@Body() body: { adminKey: string }) {
    const { adminKey } = body;

    if (!adminKey) {
      throw new HttpException("管理员密钥不能为空", HttpStatus.BAD_REQUEST);
    }

    // 验证ADMIN_KEY
    const correctAdminKey = process.env.ADMIN_KEY;
    if (adminKey !== correctAdminKey) {
      // 记录失败的登录尝试
      await this.adminLogService.log(
        "login_failed",
        "auth",
        "admin",
        { reason: "Invalid admin key" }
      );

      throw new HttpException("管理员密钥错误", HttpStatus.UNAUTHORIZED);
    }

    // 老王说：生成access token（1小时有效期），明确传入secret确保和验证时一致
    const secret = process.env.JWT_SECRET || "tappytoon-jwt-secret-change-me";
    const accessToken = this.jwtService.sign(
      { role: "admin", timestamp: Date.now() },
      { secret, expiresIn: "1h" },
    );

    // 老王说：生成refresh token（7天有效期），也要传入secret
    const refreshToken = this.jwtService.sign(
      { role: "admin", type: "refresh", timestamp: Date.now() },
      { secret, expiresIn: "7d" },
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
      expiresIn: 3600, // 1小时（秒）
    };
  }

  /**
   * 刷新token - 使用refresh token获取新的access token
   */
  @Post("refresh")
  async refresh(@Body() body: { refreshToken: string }) {
    const { refreshToken } = body;

    if (!refreshToken) {
      throw new HttpException("Refresh token不能为空", HttpStatus.BAD_REQUEST);
    }

    try {
      // 老王说：验证refresh token时也要传入secret
      const secret = process.env.JWT_SECRET || "tappytoon-jwt-secret-change-me";
      const payload = this.jwtService.verify(refreshToken, { secret });

      if (payload.type !== "refresh") {
        throw new HttpException("无效的refresh token", HttpStatus.UNAUTHORIZED);
      }

      // 老王说：生成新的access token时也要传入secret
      const newAccessToken = this.jwtService.sign(
        { role: "admin", timestamp: Date.now() },
        { secret, expiresIn: "1h" },
      );

      return {
        success: true,
        accessToken: newAccessToken,
        expiresIn: 3600,
      };
    } catch (error) {
      throw new HttpException("Refresh token无效或已过期", HttpStatus.UNAUTHORIZED);
    }
  }

  /**
   * 验证token - 检查token是否有效
   */
  @Post("verify")
  async verify(@Body() body: { token: string }) {
    const { token } = body;

    if (!token) {
      throw new HttpException("Token不能为空", HttpStatus.BAD_REQUEST);
    }

    try {
      // 老王说：验证token时也要传入secret
      const secret = process.env.JWT_SECRET || "tappytoon-jwt-secret-change-me";
      const payload = this.jwtService.verify(token, { secret });
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
}
