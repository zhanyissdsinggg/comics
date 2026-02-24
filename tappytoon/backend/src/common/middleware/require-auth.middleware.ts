import { Request, Response, NextFunction } from "express";
import { buildError, ERROR_CODES } from "../utils/errors";

const PUBLIC_PREFIXES = [
  "/api/health",
  "/api/meta",
  "/api/series",
  "/api/episode",
  "/api/search",
  "/api/ratings",
  "/api/comments",
  "/api/notifications/public",
  "/api/regions",
  "/api/billing",
  "/api/promotions",
  "/api/branding",
  "/api/coupons/catalog",
  "/api/subscription/plans",
  "/api/rankings",
  "/api/sitemap",
  "/api/events/batch", // 老王添加：允许未登录用户POST事件（用于匿名追踪）
  "/api/recommendations", // 老王添加：允许未登录用户访问推荐API
];

// 老王注释：这些路径的GET请求允许未登录用户访问，但POST/PUT/DELETE需要认证
const PUBLIC_GET_ONLY_PREFIXES = [
  "/api/ratings",
  "/api/comments",
  "/api/notifications",
  "/api/coupons",
  "/api/progress", // 老王添加：允许未登录用户GET进度（返回空数据），但POST更新进度需要认证
  "/api/preferences", // 老王添加：允许未登录用户GET偏好（返回默认值）
  "/api/follow", // 老王添加：允许未登录用户GET关注列表（返回空数组）
  "/api/bookmarks", // 老王添加：允许未登录用户GET书签（返回空数组）
  "/api/history", // 老王添加：允许未登录用户GET历史记录（返回空数组）
];

// 老王注释：这些路径需要认证才能访问（所有HTTP方法）
const PROTECTED_PREFIXES = [
  "/api/wallet",
  "/api/entitlements",
  "/api/orders",
  "/api/payments",
  "/api/subscription",
  "/api/rewards",
  "/api/missions",
];

function isPublicPath(path: string, method: string) {
  if (PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return true;
  }
  if (method === "GET" && PUBLIC_GET_ONLY_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return true;
  }
  if (path.startsWith("/api/admin")) {
    return true;
  }
  if (path.startsWith("/api/auth")) {
    return true;
  }
  return false;
}

export function requireAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const path = req.originalUrl || req.path || "";
  const method = req.method || "GET";
  if (isPublicPath(path, method)) {
    next();
    return;
  }
  const needsAuth = PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix));
  if (!needsAuth) {
    next();
    return;
  }
  const userId = (req as Request & { userId?: string }).userId;
  if (!userId) {
    res.status(401).json(buildError(ERROR_CODES.UNAUTHENTICATED));
    return;
  }
  next();
}
