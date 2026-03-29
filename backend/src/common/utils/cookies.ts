import type { Request } from "express";
import { getAppConfig, getCookieSecureDefault } from "../config/app-config";

type CookieOptions = {
  httpOnly?: boolean;
  sameSite?: "lax" | "strict" | "none";
  secure?: boolean;
  path?: string;
  domain?: string;
  maxAge?: number;
};

type CookieRequestContext = Pick<Request, "headers" | "get">;

const DEFAULT_MAX_AGE_SEC = 7 * 24 * 60 * 60;
const IPV4_HOST_PATTERN = /^\d{1,3}(?:\.\d{1,3}){3}$/;

function readHeaderValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0]?.trim() || "";
  }
  return String(value || "")
    .split(",")[0]
    .trim();
}

function normalizeHostname(value: string): string {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "";
  }

  try {
    if (normalized.includes("://")) {
      return new URL(normalized).hostname.toLowerCase();
    }
    return new URL(`http://${normalized}`).hostname.toLowerCase();
  } catch {
    return normalized.toLowerCase().replace(/:\d+$/, "");
  }
}

function getSiteKey(hostname: string): string {
  const normalizedHost = normalizeHostname(hostname);
  if (!normalizedHost) {
    return "";
  }

  if (
    normalizedHost === "localhost" ||
    normalizedHost.endsWith(".localhost") ||
    IPV4_HOST_PATTERN.test(normalizedHost)
  ) {
    return normalizedHost;
  }

  const segments = normalizedHost.split(".").filter(Boolean);
  if (segments.length <= 2) {
    return normalizedHost;
  }

  return segments.slice(-2).join(".");
}

function resolveRequestHost(request?: CookieRequestContext): string {
  if (!request) {
    return "";
  }

  const forwardedHost = readHeaderValue(request.headers?.["x-forwarded-host"] as string | string[] | undefined);
  const hostHeader = typeof request.get === "function" ? request.get("host") || "" : "";
  const rawHost = forwardedHost || hostHeader || readHeaderValue(request.headers?.host as string | string[] | undefined);
  return normalizeHostname(rawHost);
}

function resolveOriginHost(request?: CookieRequestContext): string {
  if (!request) {
    return "";
  }

  const originHeader = readHeaderValue(request.headers?.origin as string | string[] | undefined);
  return normalizeHostname(originHeader);
}

function resolveSameSite(
  overrides: CookieOptions,
  request?: CookieRequestContext,
): "lax" | "strict" | "none" {
  if (overrides.sameSite) {
    return overrides.sameSite;
  }

  const sameSiteEnv = String(getAppConfig().cookies.sameSite || "").trim().toLowerCase();
  if (["lax", "strict", "none"].includes(sameSiteEnv)) {
    return sameSiteEnv as "lax" | "strict" | "none";
  }

  const originHost = resolveOriginHost(request);
  const requestHost = resolveRequestHost(request);
  if (originHost && requestHost && getSiteKey(originHost) !== getSiteKey(requestHost)) {
    return "none";
  }

  return "lax";
}

export function buildCookieOptions(overrides: CookieOptions = {}, request?: CookieRequestContext) {
  const appConfig = getAppConfig();
  const sameSite = resolveSameSite(overrides, request);
  const secure = overrides.secure ?? getCookieSecureDefault(sameSite);
  const domain = overrides.domain ?? appConfig.cookies.domain;
  const maxAge = overrides.maxAge ?? DEFAULT_MAX_AGE_SEC;

  return {
    httpOnly: overrides.httpOnly ?? false,
    secure,
    sameSite,
    path: overrides.path ?? "/",
    domain,
    maxAge,
  } as CookieOptions;
}


