type CookieOptions = {
  httpOnly?: boolean;
  sameSite?: "lax" | "strict" | "none";
  secure?: boolean;
  path?: string;
  domain?: string;
  maxAge?: number;
};

const DEFAULT_MAX_AGE_SEC = 7 * 24 * 60 * 60;

export function buildCookieOptions(overrides: CookieOptions = {}) {
  const isProd = process.env.NODE_ENV === "production";
  const secureEnv = process.env.COOKIE_SECURE;
  const secure = secureEnv ? secureEnv === "1" : isProd;
  const sameSiteEnv = (process.env.COOKIE_SAMESITE || "lax").toLowerCase();
  const sameSite = (["lax", "strict", "none"].includes(sameSiteEnv) ? sameSiteEnv : "lax") as
    | "lax"
    | "strict"
    | "none";
  const domain = process.env.COOKIE_DOMAIN;
  const maxAge = overrides.maxAge ?? DEFAULT_MAX_AGE_SEC;
  return {
    httpOnly: overrides.httpOnly ?? false,
    secure,
    sameSite,
    path: "/",
    domain,
    maxAge,
  } as CookieOptions;
}
