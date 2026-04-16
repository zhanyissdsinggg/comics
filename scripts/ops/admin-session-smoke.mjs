import process from "node:process";

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRY_ATTEMPTS = 2;
const DEFAULT_RETRY_INTERVAL_MS = 500;
const DEFAULT_READ_PATH = "/api/admin/series?page=1&pageSize=1";
const DEFAULT_READ_PATHS = [
  "/api/admin/series?page=1&pageSize=1",
  "/api/admin/users?page=1&pageSize=1",
  "/api/admin/support?page=1&pageSize=1",
  "/api/admin/orders?page=1&pageSize=1",
];
const LOGIN_PATH = "/api/admin/auth/login";
const VERIFY_PATH = "/api/admin/auth/verify";
const LOGOUT_PATH = "/api/admin/auth/logout";
const REFRESH_PATH = "/api/admin/auth/refresh";
const AUDIT_LOG_DELETE_PROBE_PATH = "/api/admin/logs/probe-log-id-for-deploy-check";

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

function splitSetCookieHeader(headerValue) {
  const items = [];
  let current = "";
  let inExpires = false;

  for (let index = 0; index < headerValue.length; index += 1) {
    const char = headerValue[index];
    const next = headerValue.slice(index, index + 8).toLowerCase();

    if (next === "expires=") {
      inExpires = true;
    }

    if (char === "," && !inExpires) {
      items.push(current.trim());
      current = "";
      continue;
    }

    current += char;

    if (inExpires && char === ";") {
      inExpires = false;
    }
  }

  if (current.trim()) {
    items.push(current.trim());
  }

  return items;
}

function readSetCookieHeaders(headers) {
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }

  const single = headers.get("set-cookie");
  if (!single) {
    return [];
  }

  return splitSetCookieHeader(single);
}

function updateCookieJar(cookieJar, response) {
  const setCookieHeaders = readSetCookieHeaders(response.headers);
  for (const entry of setCookieHeaders) {
    const [pair = "", ...attributes] = String(entry || "").split(";");
    const separatorIndex = pair.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const name = pair.slice(0, separatorIndex).trim();
    const value = pair.slice(separatorIndex + 1).trim();
    const shouldDelete = attributes.some((item) => {
      const normalized = String(item || "").trim().toLowerCase();
      return normalized === "max-age=0" || normalized === "expires=thu, 01 jan 1970 00:00:00 gmt";
    });

    if (!name) {
      continue;
    }

    if (shouldDelete || !value) {
      delete cookieJar[name];
      continue;
    }

    cookieJar[name] = value;
  }
}

function buildCookieHeader(cookieJar) {
  const entries = Object.entries(cookieJar).filter(([, value]) => String(value || "").trim());
  if (entries.length === 0) {
    return "";
  }

  return entries
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

function readTimeout() {
  const parsed = Number(process.env.OPS_REQUEST_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

function readRetryAttempts() {
  const parsed = Number(process.env.OPS_ADMIN_RETRY_ATTEMPTS || DEFAULT_RETRY_ATTEMPTS);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_RETRY_ATTEMPTS;
}

function readRetryIntervalMs() {
  const parsed = Number(process.env.OPS_ADMIN_RETRY_INTERVAL_MS || DEFAULT_RETRY_INTERVAL_MS);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_RETRY_INTERVAL_MS;
}

function getReadPaths() {
  const singlePath = String(process.env.OPS_ADMIN_READ_PATH || "").trim();
  if (singlePath) {
    return [ensureLeadingSlash(singlePath, DEFAULT_READ_PATH)];
  }

  const list = String(process.env.OPS_ADMIN_READ_PATHS || "")
    .split(",")
    .map((item) => ensureLeadingSlash(item, ""))
    .filter(Boolean);

  if (list.length > 0) {
    return [...new Set(list)];
  }

  return DEFAULT_READ_PATHS;
}

async function requestJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), readTimeout());
  const startedAt = Date.now();
  const {
    cookieJar = null,
    headers: requestHeaders = {},
    ...fetchOptions
  } = options;

  try {
    const cookieHeader = cookieJar ? buildCookieHeader(cookieJar) : "";
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        ...requestHeaders,
      },
    });
    if (cookieJar) {
      updateCookieJar(cookieJar, response);
    }
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestJsonWithRetry(url, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const shouldRetry = method === "GET" || method === "HEAD";
  if (!shouldRetry) {
    return requestJson(url, options);
  }

  const attempts = readRetryAttempts();
  const retryIntervalMs = readRetryIntervalMs();
  let lastResult = null;
  for (let index = 1; index <= attempts; index += 1) {
    const result = await requestJson(url, options);
    lastResult = result;
    const retryable = !result.ok && (result.status === 0 || result.status >= 500);
    if (!retryable || index >= attempts) {
      return result;
    }
    await sleep(retryIntervalMs);
  }

  return lastResult || {
    ok: false,
    status: 0,
    durationMs: 0,
    payload: null,
    text: "",
    error: "request failed",
  };
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

function assertPayloadPresent(result, label) {
  const hasJson = result.payload !== null;
  const hasText = String(result.text || "").trim().length > 0;
  if (!hasJson && !hasText) {
    fail(`${label} returned an empty response body`);
  }
}

async function assertReadPaths(backendBaseUrl, readPaths, label, expectedStatuses, headers = {}) {
  for (const readPath of readPaths) {
    const result = await requestJsonWithRetry(`${backendBaseUrl}${readPath}`, { headers });
    logStep(`GET ${readPath} (${label})`, result);
    if (!expectedStatuses.includes(result.status)) {
      fail(`expected ${label} admin read ${readPath} to return ${expectedStatuses.join("/")}, got ${result.status}`);
    }
    assertPayloadPresent(result, `${label} admin read ${readPath}`);
  }
}

async function assertAppendOnlyAuditDelete(backendBaseUrl, headers) {
  const result = await requestJson(`${backendBaseUrl}${AUDIT_LOG_DELETE_PROBE_PATH}`, {
    method: "DELETE",
    headers,
  });
  logStep(`DELETE ${AUDIT_LOG_DELETE_PROBE_PATH} (append-only probe)`, result);
  if (result.status !== 403) {
    fail(
      `expected append-only audit delete probe to return 403, got ${result.status}. Production is likely serving an older backend deployment.`,
    );
  }
  assertPayloadPresent(result, "append-only audit delete probe");
}

async function run() {
  const backendBaseUrl = normalizeBaseUrl(process.env.BACKEND_URL);
  const adminKey = String(process.env.OPS_ADMIN_KEY || process.env.ADMIN_KEY || "").trim();
  const adminEmail = String(process.env.OPS_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "").trim();
  const adminPassword = String(process.env.OPS_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "").trim();
  const adminRequired = process.env.OPS_ADMIN_REQUIRED === "1";
  const readPaths = getReadPaths();

  if (!backendBaseUrl) {
    throw new Error("BACKEND_URL is required");
  }

  const hasCredential = (adminEmail && adminPassword) || adminKey;
  if (!hasCredential) {
    const message = "admin smoke skipped: provide OPS_ADMIN_EMAIL+OPS_ADMIN_PASSWORD or OPS_ADMIN_KEY/ADMIN_KEY";
    if (adminRequired) {
      fail(message);
    }
    console.warn(`[ops-admin] ${message}`);
    return;
  }

  console.log(`[ops-admin] backend=${backendBaseUrl}`);
  console.log(`[ops-admin] readPaths=${readPaths.join(",")}`);

  await assertReadPaths(backendBaseUrl, readPaths, "unauthorized", [401, 403]);
  const cookieJar = {};

  const loginPayload = adminEmail && adminPassword
    ? { email: adminEmail, password: adminPassword }
    : { adminKey };

  const login = await requestJson(`${backendBaseUrl}${LOGIN_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(loginPayload),
    cookieJar,
  });
  logStep(`POST ${LOGIN_PATH}`, login);
  const loginBody = unwrapPayload(login.payload);
  if (![200, 201].includes(login.status) || loginBody.success !== true) {
    fail(`admin login failed: status=${login.status}`);
  }

  if (!cookieJar.admin_access_token || !cookieJar.admin_refresh_token) {
    fail("admin login did not set both admin auth cookies");
  }

  const verify = await requestJson(`${backendBaseUrl}${VERIFY_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
    cookieJar,
  });
  logStep(`POST ${VERIFY_PATH} (before logout)`, verify);
  if (unwrapPayload(verify.payload).valid !== true) {
    fail("verify before logout did not return valid=true");
  }

  await assertReadPaths(backendBaseUrl, readPaths, "authorized", [200], {
    Cookie: buildCookieHeader(cookieJar),
  });
  await assertAppendOnlyAuditDelete(backendBaseUrl, {
    Cookie: buildCookieHeader(cookieJar),
  });

  const logout = await requestJson(`${backendBaseUrl}${LOGOUT_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
    cookieJar,
  });
  logStep(`POST ${LOGOUT_PATH}`, logout);
  if (unwrapPayload(logout.payload).success !== true) {
    fail("logout did not return success=true");
  }

  const verifyAfterLogout = await requestJson(`${backendBaseUrl}${VERIFY_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
    cookieJar,
  });
  logStep(`POST ${VERIFY_PATH} (after logout)`, verifyAfterLogout);
  if (unwrapPayload(verifyAfterLogout.payload).valid !== false) {
    fail("verify after logout did not return valid=false");
  }

  const refreshAfterLogout = await requestJson(`${backendBaseUrl}${REFRESH_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
    cookieJar,
  });
  logStep(`POST ${REFRESH_PATH} (after logout)`, refreshAfterLogout);
  if (![401, 403].includes(refreshAfterLogout.status)) {
    fail(`expected refresh after logout to return 401/403, got ${refreshAfterLogout.status}`);
  }

  await assertReadPaths(backendBaseUrl, readPaths, "after logout", [401, 403], {
    Cookie: buildCookieHeader(cookieJar),
  });

  console.log("[ops-admin] admin session smoke passed");
}

run().catch((error) => {
  console.error("[ops-admin] admin session smoke crashed", error);
  process.exit(1);
});
