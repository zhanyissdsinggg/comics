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
      await this.adminLogService.log({
        action: "login_failed",
        details: { reason: "Invalid admin key" },
        ipAddress: "unknown",
      });

      throw new HttpException("管理员密钥错误", HttpStatus.UNAUTHORIZED);
    }

    // 生成access token（1小时有效期）
    const accessToken = this.jwtService.sign(
      { role: "admin", timestamp: Date.now() },
      { expiresIn: "1h" },
    );

    // 生成refresh token（7天有效期）
    const refreshToken = this.jwtService.sign(
      { role: "admin", type: "refresh", timestamp: Date.now() },
      { expiresIn: "7d" },
    );

    // 记录成功的登录
    await this.adminLogService.log({
      action: "login_success",
      details: { message: "Admin logged in successfully" },
      ipAddress: "unknown",
    });

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
      // 验证refresh token
      const payload = this.jwtService.verify(refreshToken);

      if (payload.type !== "refresh") {
        throw new HttpException("无效的refresh token", HttpStatus.UNAUTHORIZED);
      }

      // 生成新的access token
      const newAccessToken = this.jwtService.sign(
        { role: "admin", timestamp: Date.now() },
        { expiresIn: "1h" },
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
}
