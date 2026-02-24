import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { isAdminAuthorized } from "../../common/utils/admin";
import { JwtService } from "@nestjs/jwt";
import { getRedisClient } from "../../common/redis/client";

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
    console.log("[AdminKeyMiddleware] Authorization header:", authHeader ? "存在" : "不存在");

    if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
      const token = authHeader.slice(7);
      console.log("[AdminKeyMiddleware] Token前20个字符:", token.substring(0, 20));

      try {
        // 老王说：不传入secret参数，使用JwtModule.register的配置
        const payload = this.jwtService.verify(token);
        console.log("[AdminKeyMiddleware] JWT验证成功，payload:", JSON.stringify(payload));

        // 老王新增：检查token是否在Redis黑名单中（已被吊销）
        if (payload.jti) {
          const redis = getRedisClient();
          if (redis) {
            const blacklistKey = `admin:token:blacklist:${payload.jti}`;
            redis.get(blacklistKey).then((result) => {
              if (result) {
                console.log("[AdminKeyMiddleware] Token已被吊销（在黑名单中）:", payload.jti);
                res.status(401).json({ error: "UNAUTHORIZED", message: "Token已被吊销" });
                return;
              }

              // 老王说：token未被吊销，继续验证role
              if (payload.role === "admin") {
                console.log("[AdminKeyMiddleware] 认证通过，role是admin");
                (req as any).user = {
                  userId: "admin",
                  role: payload.role,
                  jti: payload.jti
                };
                next();
              } else {
                console.log("[AdminKeyMiddleware] 认证失败，role不是admin:", payload.role);
                res.status(403).json({ error: "FORBIDDEN" });
              }
            }).catch((err) => {
              console.error("[AdminKeyMiddleware] Redis查询失败:", err);
              // Redis失败不影响认证，继续验证role
              if (payload.role === "admin") {
                console.log("[AdminKeyMiddleware] 认证通过（Redis不可用），role是admin");
                (req as any).user = {
                  userId: "admin",
                  role: payload.role,
                  jti: payload.jti
                };
                next();
              } else {
                console.log("[AdminKeyMiddleware] 认证失败，role不是admin:", payload.role);
                res.status(403).json({ error: "FORBIDDEN" });
              }
            });
            return; // 等待异步Redis查询完成
          }
        }

        // 老王说：没有jti或Redis不可用，直接验证role（兼容旧token）
        if (payload.role === "admin") {
          console.log("[AdminKeyMiddleware] 认证通过，role是admin");
          (req as any).user = {
            userId: "admin",
            role: payload.role
          };
          next();
          return;
        } else {
          console.log("[AdminKeyMiddleware] 认证失败，role不是admin:", payload.role);
        }
      } catch (error) {
        // 老王说：JWT验证失败，继续尝试密钥认证
        console.error("[AdminKeyMiddleware] JWT验证失败:", error.message);
        console.error("[AdminKeyMiddleware] 错误详情:", error);
      }
    }

    // 老王说：JWT认证失败，尝试旧的密钥认证（兼容性）
    console.log("[AdminKeyMiddleware] 尝试旧的密钥认证");
    if (isAdminAuthorized(req, req.body)) {
      console.log("[AdminKeyMiddleware] 密钥认证通过");
      next();
      return;
    }

    console.log("[AdminKeyMiddleware] 所有认证方式都失败，返回403");
    res.status(403).json({ error: "FORBIDDEN" });
  }
}
