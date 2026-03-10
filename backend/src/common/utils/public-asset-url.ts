import type { Request } from "express";

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function normalizeAssetPath(assetPath: string): string {
  const normalized = assetPath.trim();
  if (!normalized) {
    return "/";
  }
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function readHeaderValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0]?.trim() || "";
  }
  return String(value || "")
    .split(",")[0]
    .trim();
}

export function getPublicAssetBaseUrl(request?: Pick<Request, "protocol" | "headers" | "get">): string {
  const configuredBase = String(process.env.PUBLIC_ASSET_BASE_URL || process.env.BACKEND_PUBLIC_URL || "").trim();
  if (configuredBase) {
    return normalizeBaseUrl(configuredBase);
  }

  if (!request) {
    return "";
  }

  const forwardedProto = readHeaderValue(request.headers?.["x-forwarded-proto"] as string | string[] | undefined);
  const forwardedHost = readHeaderValue(request.headers?.["x-forwarded-host"] as string | string[] | undefined);
  const hostHeader = typeof request.get === "function" ? request.get("host") || "" : "";
  const host = forwardedHost || hostHeader || readHeaderValue(request.headers?.host as string | string[] | undefined);
  const protocol = forwardedProto || request.protocol || "http";

  return host ? `${protocol}://${host}` : "";
}

export function buildPublicAssetUrl(
  request: Pick<Request, "protocol" | "headers" | "get"> | undefined,
  assetPath: string,
): string {
  const normalizedPath = normalizeAssetPath(assetPath);
  const baseUrl = getPublicAssetBaseUrl(request);
  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
}
