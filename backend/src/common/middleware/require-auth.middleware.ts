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
];

const PUBLIC_GET_ONLY_PREFIXES = [
  "/api/ratings",
  "/api/comments",
  "/api/notifications",
  "/api/coupons",
];

const PROTECTED_PREFIXES = [
  "/api/wallet",
  "/api/entitlements",
  "/api/orders",
  "/api/payments",
  "/api/subscription",
  "/api/progress",
  "/api/follow",
  "/api/rewards",
  "/api/missions",
  "/api/bookmarks",
  "/api/history",
  "/api/preferences",
  "/api/events",
  "/api/notifications",
  "/api/comments",
  "/api/ratings",
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
