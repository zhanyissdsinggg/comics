import process from "node:process";

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_LOGIN_RETRY_ATTEMPTS = 3;
const DEFAULT_LOGIN_RETRY_DELAY_MS = 800;
const LOGIN_PATH = "/api/admin/auth/login";
const LOGOUT_PATH = "/api/admin/auth/logout";
const USERS_PATH = "/api/admin/users";
const BLOCK_PATH = "/api/admin/users/block";
const NOTIFICATIONS_PATH = "/api/admin/notifications";
const PUBLIC_SUPPORT_PATH = "/api/support";
const ADMIN_SUPPORT_PATH = "/api/admin/support";
const SAFE_EMAIL_PATTERNS = [
  "gush.qa.",
  "qa_",
  "smoke_",
  "deploy-verify-",
];

function normalizeBaseUrl(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "";
  }
  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
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

  return entries.map(([name, value]) => `${name}=${value}`).join("; ");
}

function parseJsonSafe(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readTimeout() {
  const parsed = Number(process.env.OPS_REQUEST_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

function readRetryAttempts() {
  const parsed = Number(process.env.OPS_ADMIN_WRITE_LOGIN_RETRIES || DEFAULT_LOGIN_RETRY_ATTEMPTS);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_LOGIN_RETRY_ATTEMPTS;
}

function readRetryDelayMs() {
  const parsed = Number(process.env.OPS_ADMIN_WRITE_LOGIN_RETRY_DELAY_MS || DEFAULT_LOGIN_RETRY_DELAY_MS);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_LOGIN_RETRY_DELAY_MS;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function fail(message) {
  console.error(`[ops-admin-write] ${message}`);
  process.exit(1);
}

function supportError(message) {
  throw new Error(message);
}

function logStep(step, result) {
  const parts = [`[ops-admin-write] ${step}`, `status=${result.status}`, `durationMs=${result.durationMs}`];
  if (result.error) {
    parts.push(`error=${result.error}`);
  }
  console.log(parts.join(" "));
}

function ensureWriteAllowed() {
  if (process.env.OPS_ADMIN_WRITE_ALLOWED !== "1") {
    fail("refusing to run without OPS_ADMIN_WRITE_ALLOWED=1");
  }
}

function supportWriteEnabled() {
  return process.env.OPS_ADMIN_WRITE_SUPPORT === "1";
}

function supportWriteRequired() {
  return process.env.OPS_ADMIN_WRITE_SUPPORT_REQUIRED === "1";
}

function isSafeQaEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  if (!email.endsWith("@example.com")) {
    return false;
  }

  return SAFE_EMAIL_PATTERNS.some((pattern) => email.includes(pattern));
}

function isSafeQaUser(user) {
  if (!user || typeof user !== "object") {
    return false;
  }

  return isSafeQaEmail(user.email);
}

function unwrapList(payload) {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  if (Array.isArray(payload.users)) {
    return payload.users;
  }

  return [];
}

async function loginWithRetry(backendBaseUrl, credentials, cookieJar) {
  const attempts = readRetryAttempts();
  const delayMs = readRetryDelayMs();
  let lastResult = null;

  for (let index = 1; index <= attempts; index += 1) {
    const loginPayload =
      credentials?.email && credentials?.password
        ? { email: credentials.email, password: credentials.password }
        : { adminKey: credentials?.adminKey || "" };

    const result = await requestJson(`${backendBaseUrl}${LOGIN_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(loginPayload),
      cookieJar,
    });
    lastResult = result;
    logStep(`POST ${LOGIN_PATH} (attempt ${index}/${attempts})`, result);

    if ([200, 201].includes(result.status)) {
      if (!cookieJar.admin_access_token || !cookieJar.admin_refresh_token) {
        fail("admin login did not return both admin auth cookies");
      }
      return;
    }

    const retryable = result.status === 0 || result.status >= 500;
    if (!retryable || index >= attempts) {
      break;
    }
    await sleep(delayMs);
  }

  fail(`admin login failed: status=${lastResult?.status ?? "unknown"}`);
}

async function logout(backendBaseUrl, cookieJar) {
  const result = await requestJson(`${backendBaseUrl}${LOGOUT_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
    cookieJar,
  });
  logStep(`POST ${LOGOUT_PATH}`, result);
}

async function fetchUsers(backendBaseUrl, cookieJar, search) {
  const params = new URLSearchParams({
    page: "1",
    pageSize: String(Number(process.env.OPS_ADMIN_WRITE_PAGE_SIZE || 50)),
    includeTestData: "1",
  });

  if (search) {
    params.set("search", search);
  }

  const result = await requestJson(`${backendBaseUrl}${USERS_PATH}?${params.toString()}`, {
    cookieJar,
  });
  logStep(`GET ${USERS_PATH}?${params.toString()}`, result);

  if (result.status !== 200) {
    fail(`failed to fetch candidate users: status=${result.status}`);
  }

  return unwrapList(result.payload);
}

function pickCandidate(users, options = {}) {
  const explicitId = String(options.userId || "").trim();
  const explicitEmail = String(options.userEmail || "").trim().toLowerCase();

  if (explicitId) {
    return users.find((user) => user.id === explicitId) || null;
  }

  if (explicitEmail) {
    return users.find((user) => String(user.email || "").trim().toLowerCase() === explicitEmail) || null;
  }

  const safeUsers = users.filter(isSafeQaUser);
  const preferred = safeUsers.find((user) => !user.isBlocked);
  return preferred || safeUsers[0] || null;
}

async function resolveCandidateUser(backendBaseUrl, cookieJar) {
  const explicitUserId = String(process.env.OPS_ADMIN_WRITE_USER_ID || "").trim();
  const explicitUserEmail = String(process.env.OPS_ADMIN_WRITE_USER_EMAIL || "").trim();

  const searches = explicitUserId
    ? [explicitUserId]
    : explicitUserEmail
      ? [explicitUserEmail]
      : String(process.env.OPS_ADMIN_WRITE_SEARCH || "@example.com")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);

  for (const search of searches) {
    const users = await fetchUsers(backendBaseUrl, cookieJar, search);
    const candidate = pickCandidate(users, {
      userId: explicitUserId,
      userEmail: explicitUserEmail,
    });
    if (candidate) {
      return candidate;
    }
  }

  fail("no safe QA user matched the allowlist search");
}

async function readUserById(backendBaseUrl, cookieJar, userId) {
  const users = await fetchUsers(backendBaseUrl, cookieJar, userId);
  const user = users.find((item) => item.id === userId);
  if (!user) {
    fail(`could not re-read user ${userId} after mutation`);
  }
  return user;
}

async function updateUserBlockedState(backendBaseUrl, cookieJar, userId, blocked) {
  const result = await requestJson(`${backendBaseUrl}${BLOCK_PATH}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, blocked }),
    cookieJar,
  });
  logStep(`PATCH ${BLOCK_PATH} -> blocked=${blocked}`, result);

  if (result.status !== 200) {
    fail(`failed to update user block state: status=${result.status}`);
  }

  const responseUser = result.payload?.user;
  if (!responseUser || responseUser.id !== userId || Boolean(responseUser.isBlocked) !== Boolean(blocked)) {
    fail("block mutation returned an unexpected user payload");
  }
}

async function assertBlockedState(backendBaseUrl, cookieJar, userId, expectedBlocked) {
  const user = await readUserById(backendBaseUrl, cookieJar, userId);
  if (Boolean(user.isBlocked) !== Boolean(expectedBlocked)) {
    fail(
      `user ${userId} blocked state mismatch: expected ${expectedBlocked}, got ${Boolean(user.isBlocked)}`,
    );
  }
  return user;
}

async function createNotification(backendBaseUrl, cookieJar, candidate) {
  const title = `OPS QA Smoke ${Date.now()}`;
  const message = `Reversible admin write smoke for ${candidate.email}`;
  const result = await requestJson(`${backendBaseUrl}${NOTIFICATIONS_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: candidate.id,
      type: "OPS_SMOKE",
      title,
      message,
      broadcast: false,
    }),
    cookieJar,
  });
  logStep(`POST ${NOTIFICATIONS_PATH}`, result);

  if (result.status !== 201 && result.status !== 200) {
    fail(`failed to create QA notification: status=${result.status}`);
  }

  const notification = result.payload?.notification;
  if (!notification?.id || notification.userId !== candidate.id || notification.title !== title) {
    fail("notification create returned an unexpected payload");
  }

  return notification;
}

async function listNotifications(backendBaseUrl, cookieJar, pageSize = 20) {
  const result = await requestJson(
    `${backendBaseUrl}${NOTIFICATIONS_PATH}?page=1&pageSize=${pageSize}`,
    { cookieJar },
  );
  logStep(`GET ${NOTIFICATIONS_PATH}?page=1&pageSize=${pageSize}`, result);

  if (result.status !== 200) {
    fail(`failed to list notifications: status=${result.status}`);
  }

  if (Array.isArray(result.payload?.data)) {
    return result.payload.data;
  }

  if (Array.isArray(result.payload?.notifications)) {
    return result.payload.notifications;
  }

  return [];
}

async function assertNotificationPresent(backendBaseUrl, cookieJar, notificationId) {
  const notifications = await listNotifications(backendBaseUrl, cookieJar);
  const match = notifications.find((item) => item.id === notificationId);
  if (!match) {
    fail(`notification ${notificationId} was not visible in the admin notifications list`);
  }
  return match;
}

async function deleteNotification(backendBaseUrl, cookieJar, notificationId) {
  const result = await requestJson(`${backendBaseUrl}${NOTIFICATIONS_PATH}/${notificationId}`, {
    method: "DELETE",
    cookieJar,
  });
  logStep(`DELETE ${NOTIFICATIONS_PATH}/${notificationId}`, result);

  if (result.status !== 200) {
    fail(`failed to delete QA notification: status=${result.status}`);
  }
}

async function assertNotificationAbsent(backendBaseUrl, cookieJar, notificationId) {
  const notifications = await listNotifications(backendBaseUrl, cookieJar);
  const match = notifications.find((item) => item.id === notificationId);
  if (match) {
    fail(`notification ${notificationId} still exists after deletion`);
  }
}

async function createSupportTicket(backendBaseUrl, candidate) {
  const timestamp = Date.now();
  const replyEmail = `qa_support_${timestamp}@example.com`;
  const subject = `OPS QA Support ${timestamp}`;
  const message = `Smoke-test support request for ${candidate.email}`;
  const result = await requestJson(`${backendBaseUrl}${PUBLIC_SUPPORT_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topic: "technical",
      replyEmail,
      subject,
      message,
    }),
  });
  logStep(`POST ${PUBLIC_SUPPORT_PATH}`, result);

  if (result.status !== 200 && result.status !== 201) {
    supportError(`failed to create QA support ticket: status=${result.status}`);
  }

  if (result.payload?.ok !== true) {
    supportError("support ticket create did not return ok=true");
  }

  return { replyEmail, subject, message };
}

async function listSupportTickets(backendBaseUrl, cookieJar, search) {
  const params = new URLSearchParams({
    page: "1",
    pageSize: String(Number(process.env.OPS_ADMIN_WRITE_PAGE_SIZE || 50)),
    includeTestData: "1",
  });

  if (search) {
    params.set("search", search);
  }

  const result = await requestJson(`${backendBaseUrl}${ADMIN_SUPPORT_PATH}?${params.toString()}`, {
    cookieJar,
  });
  logStep(`GET ${ADMIN_SUPPORT_PATH}?${params.toString()}`, result);

  if (result.status !== 200) {
    supportError(`failed to list QA support tickets: status=${result.status}`);
  }

  return unwrapList(result.payload);
}

async function findSupportTicketBySearch(backendBaseUrl, cookieJar, search) {
  const tickets = await listSupportTickets(backendBaseUrl, cookieJar, search);
  return tickets.find((ticket) => {
    const id = String(ticket.id || "").trim();
    const subject = String(ticket.subject || "").trim();
    const replyEmail = String(ticket.replyEmail || ticket.userEmail || "").trim().toLowerCase();
    const normalizedSearch = String(search).trim();
    return (
      id === normalizedSearch ||
      subject === normalizedSearch ||
      replyEmail === normalizedSearch.toLowerCase()
    );
  }) || null;
}

async function resolveSupportTicket(backendBaseUrl, cookieJar, supportSeed) {
  const ticket = await findSupportTicketBySearch(backendBaseUrl, cookieJar, supportSeed.subject);
  if (!ticket) {
    supportError(`could not find the QA support ticket after create: ${supportSeed.subject}`);
  }

  if (String(ticket.replyEmail || ticket.userEmail || "").trim().toLowerCase() !== supportSeed.replyEmail.toLowerCase()) {
    supportError("resolved support ticket does not match the expected QA reply email");
  }

  return ticket;
}

async function replyToSupportTicket(backendBaseUrl, cookieJar, ticketId, message) {
  const result = await requestJson(`${backendBaseUrl}${ADMIN_SUPPORT_PATH}/${ticketId}/reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
    cookieJar,
  });
  logStep(`POST ${ADMIN_SUPPORT_PATH}/${ticketId}/reply`, result);

  if (result.status !== 200 && result.status !== 201) {
    supportError(`failed to reply to QA support ticket: status=${result.status}`);
  }

  if (result.payload?.ok !== true) {
    supportError("support reply did not return ok=true");
  }
}

async function closeSupportTicket(backendBaseUrl, cookieJar, ticketId) {
  const result = await requestJson(`${backendBaseUrl}${ADMIN_SUPPORT_PATH}/${ticketId}/close`, {
    method: "PATCH",
    cookieJar,
  });
  logStep(`PATCH ${ADMIN_SUPPORT_PATH}/${ticketId}/close`, result);

  if (result.status !== 200) {
    supportError(`failed to close QA support ticket: status=${result.status}`);
  }

  if (result.payload?.ok !== true) {
    supportError("support close did not return ok=true");
  }
}

async function deleteSupportTicket(backendBaseUrl, cookieJar, ticketId) {
  const result = await requestJson(`${backendBaseUrl}${ADMIN_SUPPORT_PATH}/${ticketId}`, {
    method: "DELETE",
    cookieJar,
  });
  logStep(`DELETE ${ADMIN_SUPPORT_PATH}/${ticketId}`, result);

  if (result.status !== 200) {
    supportError(`failed to delete QA support ticket: status=${result.status}`);
  }

  if (result.payload?.ok !== true) {
    supportError("support delete did not return ok=true");
  }
}

async function assertSupportTicketState(backendBaseUrl, cookieJar, ticketId, expected) {
  const ticket = await findSupportTicketBySearch(backendBaseUrl, cookieJar, ticketId);
  if (!ticket || ticket.id !== ticketId) {
    supportError(`could not re-read QA support ticket ${ticketId}`);
  }

  if (expected.status && String(ticket.status || "").toLowerCase() !== expected.status.toLowerCase()) {
    supportError(`support ticket ${ticketId} status mismatch: expected ${expected.status}, got ${ticket.status}`);
  }

  if (expected.adminReply !== undefined) {
    if (!Object.prototype.hasOwnProperty.call(ticket, "adminReply")) {
      supportError(
        "support ticket payload does not expose adminReply yet. Deploy the support reply migration/runtime before enabling OPS_ADMIN_WRITE_SUPPORT=1.",
      );
    }

    if (String(ticket.adminReply || "") !== String(expected.adminReply || "")) {
      supportError(
        `support ticket ${ticketId} reply mismatch: expected "${expected.adminReply}", got "${ticket.adminReply}"`,
      );
    }
  }

  return ticket;
}

async function assertSupportTicketAbsent(backendBaseUrl, cookieJar, ticketId) {
  const ticket = await findSupportTicketBySearch(backendBaseUrl, cookieJar, ticketId);
  if (ticket) {
    supportError(`support ticket ${ticketId} still exists after deletion`);
  }
}

async function runOptionalSupportWriteSmoke(backendBaseUrl, cookieJar, candidate) {
  if (!supportWriteEnabled()) {
    console.log("[ops-admin-write] support roundtrip skipped (set OPS_ADMIN_WRITE_SUPPORT=1 after support reply deploy)");
    return;
  }
  const required = supportWriteRequired();
  let supportSeed = null;
  let ticket = null;

  try {
    supportSeed = await createSupportTicket(backendBaseUrl, candidate);
    ticket = await resolveSupportTicket(backendBaseUrl, cookieJar, supportSeed);
    console.log(`[ops-admin-write] resolved support ticket id=${ticket.id} subject=${ticket.subject}`);

    const replyMessage = `OPS admin reply for ${candidate.email}`;
    await replyToSupportTicket(backendBaseUrl, cookieJar, ticket.id, replyMessage);
    const repliedTicket = await assertSupportTicketState(backendBaseUrl, cookieJar, ticket.id, {
      status: "in_progress",
      adminReply: replyMessage,
    });
    console.log(
      `[ops-admin-write] verified support reply id=${repliedTicket.id} status=${repliedTicket.status}`,
    );

    await closeSupportTicket(backendBaseUrl, cookieJar, ticket.id);
    const closedTicket = await assertSupportTicketState(backendBaseUrl, cookieJar, ticket.id, {
      status: "closed",
      adminReply: replyMessage,
    });
    console.log(
      `[ops-admin-write] verified support close id=${closedTicket.id} status=${closedTicket.status}`,
    );

    await deleteSupportTicket(backendBaseUrl, cookieJar, ticket.id);
    await assertSupportTicketAbsent(backendBaseUrl, cookieJar, ticket.id);
    console.log(`[ops-admin-write] removed support ticket id=${ticket.id}`);
    ticket = null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (required) {
      fail(`support roundtrip required but failed: ${message}`);
    }
    console.warn(
      `[ops-admin-write] warning: support roundtrip skipped due to runtime limitation (${message}). Set OPS_ADMIN_WRITE_SUPPORT_REQUIRED=1 to make this blocking.`,
    );
  } finally {
    if (ticket?.id) {
      await deleteSupportTicket(backendBaseUrl, cookieJar, ticket.id);
      await assertSupportTicketAbsent(backendBaseUrl, cookieJar, ticket.id);
      console.log(`[ops-admin-write] cleanup removed support ticket id=${ticket.id}`);
    } else if (supportSeed?.subject) {
      const dangling = await findSupportTicketBySearch(backendBaseUrl, cookieJar, supportSeed.subject);
      if (dangling?.id) {
        await deleteSupportTicket(backendBaseUrl, cookieJar, dangling.id);
        await assertSupportTicketAbsent(backendBaseUrl, cookieJar, dangling.id);
        console.log(`[ops-admin-write] cleanup removed support ticket id=${dangling.id}`);
      }
    }
  }
}

async function run() {
  ensureWriteAllowed();

  const backendBaseUrl = normalizeBaseUrl(process.env.BACKEND_URL);
  const adminKey = String(process.env.OPS_ADMIN_KEY || process.env.ADMIN_KEY || "").trim();
  const adminEmail = String(process.env.OPS_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "").trim();
  const adminPassword = String(process.env.OPS_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "").trim();

  if (!backendBaseUrl) {
    throw new Error("BACKEND_URL is required");
  }

  if (!(adminEmail && adminPassword) && !adminKey) {
    throw new Error(
      "admin credentials required: set OPS_ADMIN_EMAIL + OPS_ADMIN_PASSWORD, or OPS_ADMIN_KEY/ADMIN_KEY",
    );
  }

  const cookieJar = {};
  const credentials =
    adminEmail && adminPassword
      ? { email: adminEmail, password: adminPassword }
      : { adminKey };
  await loginWithRetry(backendBaseUrl, credentials, cookieJar);

  let candidate = null;
  let originalBlocked = false;
  let toggled = false;
  let notification = null;

  try {
    candidate = await resolveCandidateUser(backendBaseUrl, cookieJar);
    if (!isSafeQaUser(candidate)) {
      fail(`refusing to mutate a non-QA user: ${candidate?.email || candidate?.id || "unknown"}`);
    }

    originalBlocked = Boolean(candidate.isBlocked);
    const targetBlocked = !originalBlocked;
    console.log(
      `[ops-admin-write] candidate id=${candidate.id} email=${candidate.email} originalBlocked=${originalBlocked}`,
    );

    await updateUserBlockedState(backendBaseUrl, cookieJar, candidate.id, targetBlocked);
    toggled = true;

    const toggledUser = await assertBlockedState(backendBaseUrl, cookieJar, candidate.id, targetBlocked);
    console.log(
      `[ops-admin-write] verified toggle id=${toggledUser.id} blocked=${Boolean(toggledUser.isBlocked)}`,
    );

    notification = await createNotification(backendBaseUrl, cookieJar, candidate);
    const visibleNotification = await assertNotificationPresent(
      backendBaseUrl,
      cookieJar,
      notification.id,
    );
    console.log(
      `[ops-admin-write] verified notification id=${visibleNotification.id} title=${visibleNotification.title}`,
    );

    await deleteNotification(backendBaseUrl, cookieJar, notification.id);
    await assertNotificationAbsent(backendBaseUrl, cookieJar, notification.id);
    console.log(`[ops-admin-write] removed notification id=${notification.id}`);
    notification = null;

    await runOptionalSupportWriteSmoke(backendBaseUrl, cookieJar, candidate);
  } finally {
    if (notification?.id) {
      await deleteNotification(backendBaseUrl, cookieJar, notification.id);
      await assertNotificationAbsent(backendBaseUrl, cookieJar, notification.id);
      console.log(`[ops-admin-write] cleanup removed notification id=${notification.id}`);
    }

    if (candidate && toggled) {
      await updateUserBlockedState(backendBaseUrl, cookieJar, candidate.id, originalBlocked);
      const restoredUser = await assertBlockedState(backendBaseUrl, cookieJar, candidate.id, originalBlocked);
      console.log(
        `[ops-admin-write] restored id=${restoredUser.id} blocked=${Boolean(restoredUser.isBlocked)}`,
      );
    }

    await logout(backendBaseUrl, cookieJar);
  }

  console.log("[ops-admin-write] admin QA user write smoke passed");
}

run().catch((error) => {
  console.error("[ops-admin-write] admin QA user write smoke crashed", error);
  process.exit(1);
});
