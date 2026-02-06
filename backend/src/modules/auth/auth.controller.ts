import { Controller, Post, Body, HttpCode, HttpStatus } from "@nestjs/common";
import { AuthService } from "./auth.service";

/**
 * 老王说：认证控制器，提供登录、刷新token等接口
 * 这些SB接口是前端获取JWT token的唯一途径
 */
@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * 老王说：管理员登录接口
   * POST /auth/login
   * Body: { adminKey: string }
   * Returns: { accessToken, refreshToken, expiresIn }
   */
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body("adminKey") adminKey: string) {
    return this.authService.login(adminKey);
  }

  /**
   * 老王说：刷新token接口
   * POST /auth/refresh
   * Body: { refreshToken: string }
   * Returns: { accessToken, expiresIn }
   */
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(@Body("refreshToken") refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }

  /**
   * 老王说：验证token接口
   * POST /auth/validate
   * Body: { token: string }
   * Returns: { valid: boolean }
   */
  @Post("validate")
  @HttpCode(HttpStatus.OK)
  async validate(@Body("token") token: string) {
    const valid = await this.authService.validateToken(token);
    return { valid };
  }
}
