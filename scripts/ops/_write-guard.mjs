function readEnvFlag(name) {
  return String(process.env[name] || "").trim() === "1";
}

function normalizeHost(value) {
  if (!value) return "";
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isLocalHost(host) {
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function isProdHost(host) {
  const configured = String(process.env.OPS_PROD_HOSTS || "www.gushcomics.com,gushcomics.com")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (configured.includes(host)) return true;
  return false;
}

/**
 * Guardrail for any OPS smoke that performs writes.
 *
 * Required:
 * - OPS_ADMIN_WRITE_ALLOWED=1 (always)
 * - If target is remote (not localhost): OPS_ADMIN_WRITE_REMOTE_ALLOWED=1
 * - If target host is production: OPS_ADMIN_WRITE_PROD_ALLOWED=1
 *
 * This prevents accidental writes to production when someone copies env vars around.
 */
export function ensureOpsWriteAllowed(baseUrl) {
  if (!readEnvFlag("OPS_ADMIN_WRITE_ALLOWED")) {
    throw new Error("refusing to run without OPS_ADMIN_WRITE_ALLOWED=1");
  }

  const host = normalizeHost(baseUrl);
  if (!host) {
    // If baseUrl isn't parseable, treat it as unsafe.
    throw new Error("refusing to run: BACKEND_URL is missing or invalid");
  }

  if (isLocalHost(host)) {
    return;
  }

  if (!readEnvFlag("OPS_ADMIN_WRITE_REMOTE_ALLOWED")) {
    throw new Error(
      "refusing to run write smoke against remote target without OPS_ADMIN_WRITE_REMOTE_ALLOWED=1",
    );
  }

  if (isProdHost(host) && !readEnvFlag("OPS_ADMIN_WRITE_PROD_ALLOWED")) {
    throw new Error(
      "refusing to run write smoke against production host without OPS_ADMIN_WRITE_PROD_ALLOWED=1",
    );
  }
}

