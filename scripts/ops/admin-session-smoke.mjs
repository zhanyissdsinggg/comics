import process from "node:process";

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_READ_PATH = "/api/admin/series?page=1&pageSize=1";
const LOGIN_PATH = "/api/admin/auth/login";
const VERIFY_PATH = "/api/admin/auth/verify";
const LOGOUT_PATH = "/api/admin/auth/logout";
const REFRESH_PATH = "/api/admin/auth/refresh";

function normalizeBaseUrl(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "";
  }
  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

function ensureLeadingSlash(value, fallback) {
  const raw = String(value || "").trim();
  if (!raw) {
    return fallback;
  }
  return raw.startsWith("/") ? raw : `/${raw}`;
}

function parseJsonSafe(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function unwrapPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return {};
  }
  return payload.data && typeof payload.data === "object" ? payload.data : payload;
}

function readTimeout() {
  const parsed = Number(process.env.OPS_REQUEST_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

async function requestJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), readTimeout());
  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(options.headers || {}),
      },
    });
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      durationMs: Date.now() - startedAt,
      payload: parseJsonSafe(text),
      text,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      durationMs: Date.now() - startedAt,
      payload: null,
      text: "",
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function logStep(step, result) {
  const parts = [`[ops-admin] ${step}`, `status=${result.status}`, `durationMs=${result.durationMs}`];
  if (result.error) {
    parts.push(`error=${result.error}`);
  }
  console.log(parts.join(" "));
}

function fail(message) {
  console.error(`[ops-admin] ${message}`);
  process.exit(1);
}

async function run() {
  const backendBaseUrl = normalizeBaseUrl(process.env.BACKEND_URL);
  const adminKey = String(process.env.OPS_ADMIN_KEY || process.env.ADMIN_KEY || "").trim();
  const adminRequired = process.env.OPS_ADMIN_REQUIRED === "1";
  const readPath = ensureLeadingSlash(process.env.OPS_ADMIN_READ_PATH, DEFAULT_READ_PATH);

  if (!backendBaseUrl) {
    throw new Error("BACKEND_URL is required");
  }

  if (!adminKey) {
    const message = "admin smoke skipped: OPS_ADMIN_KEY/ADMIN_KEY not provided";
    if (adminRequired) {
      fail(message);
    }
    console.warn(`[ops-admin] ${message}`);
    return;
  }

  console.log(`[ops-admin] backend=${backendBaseUrl}`);
  console.log(`[ops-admin] readPath=${readPath}`);

  const unauthorizedRead = await requestJson(`${backendBaseUrl}${readPath}`);
  logStep(`GET ${readPath} (unauthorized)`, unauthorizedRead);
  if (![401, 403].includes(unauthorizedRead.status)) {
    fail(`expected unauthorized admin read to return 401/403, got ${unauthorizedRead.status}`);
  }

  const login = await requestJson(`${backendBaseUrl}${LOGIN_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminKey }),
  });
  logStep(`POST ${LOGIN_PATH}`, login);
  const loginBody = unwrapPayload(login.payload);
  if (![200, 201].includes(login.status) || loginBody.success !== true) {
    fail(`admin login failed: status=${login.status}`);
  }

  const accessToken = String(loginBody.accessToken || "").trim();
  const refreshToken = String(loginBody.refreshToken || "").trim();
  if (!accessToken || !refreshToken) {
    fail("admin login did not return both accessToken and refreshToken");
  }

  const verify = await requestJson(`${backendBaseUrl}${VERIFY_PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({}),
  });
  logStep(`POST ${VERIFY_PATH} (before logout)`, verify);
  if (unwrapPayload(verify.payload).valid !== true) {
    fail("verify before logout did not return valid=true");
  }

  const authorizedRead = await requestJson(`${backendBaseUrl}${readPath}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  logStep(`GET ${readPath} (authorized)`, authorizedRead);
  if (authorizedRead.status !== 200) {
    fail(`expected authorized admin read to return 200, got ${authorizedRead.status}`);
  }

  const logout = await requestJson(`${backendBaseUrl}${LOGOUT_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: accessToken, refreshToken }),
  });
  logStep(`POST ${LOGOUT_PATH}`, logout);
  if (unwrapPayload(logout.payload).success !== true) {
    fail("logout did not return success=true");
  }

  const verifyAfterLogout = await requestJson(`${backendBaseUrl}${VERIFY_PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({}),
  });
  logStep(`POST ${VERIFY_PATH} (after logout)`, verifyAfterLogout);
  if (unwrapPayload(verifyAfterLogout.payload).valid !== false) {
    fail("verify after logout did not return valid=false");
  }

  const refreshAfterLogout = await requestJson(`${backendBaseUrl}${REFRESH_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  logStep(`POST ${REFRESH_PATH} (after logout)`, refreshAfterLogout);
  if (![401, 403].includes(refreshAfterLogout.status)) {
    fail(`expected refresh after logout to return 401/403, got ${refreshAfterLogout.status}`);
  }

  const readAfterLogout = await requestJson(`${backendBaseUrl}${readPath}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  logStep(`GET ${readPath} (after logout)`, readAfterLogout);
  if (![401, 403].includes(readAfterLogout.status)) {
    fail(`expected admin read after logout to return 401/403, got ${readAfterLogout.status}`);
  }

  console.log("[ops-admin] admin session smoke passed");
}

run().catch((error) => {
  console.error("[ops-admin] admin session smoke crashed", error);
  process.exit(1);
});
