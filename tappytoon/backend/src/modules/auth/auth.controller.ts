import { Controller, Post, Get, Body, HttpCode, HttpStatus, Req, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { Request } from "express";

/**
 * 老王说：认证控制器，提供登录、刷新token等接口
 * 这些SB接口是前端获取JWT token的唯一途径
 */
@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * 老王新增：获取当前用户信息
   * GET /auth/me
   * Headers: Authorization: Bearer <token>
   * Returns: { user: { userId, email, ... } }
   *
   * 老王修复：未登录用户返回200状态码和null，避免401错误
   */
  @Get("me")
  async me(@Req() req: Request) {
    // 老王说：从请求中获取用户信息（由middleware注入）
    const user = (req as any).user;

    // 老王修复：未登录用户返回200状态码和null，而不是抛出401错误
    if (!user) {
      return {
        success: true,
        user: null,
        isSignedIn: false,
      };
    }

    // 老王说：返回用户信息（这里简化处理，实际应该从数据库查询）
    return {
      success: true,
      user: {
        userId: user.userId || "guest",
        email: user.email || null,
        role: user.role || "user",
      },
      isSignedIn: true,
    };
  }

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
   * 老王新增：获取用户偏好设置
   * GET /auth/preferences
   * Returns: { preferences: {} }
   */
  @Get("preferences")
  async preferences(@Req() req: Request) {
    const user = (req as any).user;

    // 老王说：未登录用户返回默认偏好
    if (!user) {
      return {
        success: true,
        preferences: {
          theme: "dark",
          language: "en",
          adultMode: false,
        }
      };
    }

    // 老王说：已登录用户返回用户偏好（简化处理）
    return {
      success: true,
      preferences: {
        theme: "dark",
        language: "en",
        adultMode: false,
      }
    };
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
