import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { isAdminAuthorized } from "../../common/utils/admin";
import { JwtService } from "@nestjs/jwt";

/**
 * 老王说：管理员认证中间件，支持两种认证方式：
 * 1. 旧的密钥认证（兼容性，逐步废弃）
 * 2. 新的JWT认证（推荐）
 */
@Injectable()
export class AdminKeyMiddleware implements NestMiddleware {
  constructor(private jwtService: JwtService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // 老王说：先尝试JWT认证
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
      const token = authHeader.slice(7);
      try {
        // 老王说：JwtService已经在module里配置了secret，不需要再传
        const payload = this.jwtService.verify(token);

        // 老王说：只要role是admin就通过，不需要sub字段
        if (payload.role === "admin") {
          // 老王说：JWT验证通过，将用户信息附加到请求对象
          (req as any).user = {
            userId: "admin",
            role: payload.role
          };
          next();
          return;
        }
      } catch (error) {
        // 老王说：JWT验证失败，继续尝试密钥认证
        console.error("JWT验证失败:", error.message);
      }
    }

    // 老王说：JWT认证失败，尝试旧的密钥认证（兼容性）
    if (isAdminAuthorized(req, req.body)) {
      next();
      return;
    }

    res.status(403).json({ error: "FORBIDDEN" });
  }
}
