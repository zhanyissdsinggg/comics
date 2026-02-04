"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuthMiddleware = requireAuthMiddleware;
const errors_1 = require("../utils/errors");
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
function isPublicPath(path, method) {
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
function requireAuthMiddleware(req, res, next) {
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
    const userId = req.userId;
    if (!userId) {
        res.status(401).json((0, errors_1.buildError)(errors_1.ERROR_CODES.UNAUTHENTICATED));
        return;
    }
    next();
}
