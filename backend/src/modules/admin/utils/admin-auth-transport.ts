function readBooleanFlag(name: string, fallback: boolean): boolean {
  const raw = String(process.env[name] || "").trim().toLowerCase();
  if (!raw) {
    return fallback;
  }

  return raw === "1" || raw === "true";
}

export function isAdminTokenFallbackEnabled(): boolean {
  return readBooleanFlag("ADMIN_TOKEN_FALLBACK_ENABLED", false);
}

export function isAdminLegacyAdminKeyFallbackEnabled(): boolean {
  return readBooleanFlag("ADMIN_LEGACY_BEARER_ENABLED", false);
}
