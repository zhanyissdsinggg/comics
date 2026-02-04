"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCookieOptions = buildCookieOptions;
const DEFAULT_MAX_AGE_SEC = 7 * 24 * 60 * 60;
function buildCookieOptions(overrides = {}) {
    var _a, _b;
    const isProd = process.env.NODE_ENV === "production";
    const secureEnv = process.env.COOKIE_SECURE;
    const secure = secureEnv ? secureEnv === "1" : isProd;
    const sameSiteEnv = (process.env.COOKIE_SAMESITE || "lax").toLowerCase();
    const sameSite = (["lax", "strict", "none"].includes(sameSiteEnv) ? sameSiteEnv : "lax");
    const domain = process.env.COOKIE_DOMAIN;
    const maxAge = (_a = overrides.maxAge) !== null && _a !== void 0 ? _a : DEFAULT_MAX_AGE_SEC;
    return {
        httpOnly: (_b = overrides.httpOnly) !== null && _b !== void 0 ? _b : false,
        secure,
        sameSite,
        path: "/",
        domain,
        maxAge,
    };
}
