import process from "node:process";

const DEFAULT_TIMEOUT_MS = 12_000;
const LOGIN_PATH = "/api/admin/auth/login";
const LOGOUT_PATH = "/api/admin/auth/logout";

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

async function requestJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  const startedAt = Date.now();
  const { cookieJar = null, headers: requestHeaders = {}, ...fetchOptions } = options;

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
      headers: response.headers,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      durationMs: Date.now() - startedAt,
      payload: null,
      text: "",
      error: error instanceof Error ? error.message : String(error),
      headers: new Headers(),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function assertStatus(result, expected, step) {
  const expectedList = Array.isArray(expected) ? expected : [expected];
  if (!expectedList.includes(result.status)) {
    throw new Error(
      `${step} status mismatch: expected ${expectedList.join("/")}, got ${result.status}, body=${result.text}`,
    );
  }
}

function logStep(step, result) {
  const parts = [`[ops-admin-sensitive] ${step}`, `status=${result.status}`, `durationMs=${result.durationMs}`];
  if (result.error) {
    parts.push(`error=${result.error}`);
  }
  console.log(parts.join(" "));
}

async function login(backendBaseUrl, cookieJar, credentials) {
  const loginPayload =
    credentials.email && credentials.password
      ? { email: credentials.email, password: credentials.password }
      : { adminKey: credentials.adminKey };

  const result = await requestJson(`${backendBaseUrl}${LOGIN_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(loginPayload),
    cookieJar,
  });
  logStep(`POST ${LOGIN_PATH}`, result);
  assertStatus(result, [200, 201], "admin login");

  if (!cookieJar.admin_access_token || !cookieJar.admin_refresh_token) {
    throw new Error("admin login missing auth cookies");
  }
}

async function logout(backendBaseUrl, cookieJar) {
  const result = await requestJson(`${backendBaseUrl}${LOGOUT_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
    cookieJar,
  });
  logStep(`POST ${LOGOUT_PATH}`, result);
  assertStatus(result, [200], "admin logout");
}

async function getQaUserId(backendBaseUrl, cookieJar) {
  const result = await requestJson(
    `${backendBaseUrl}/api/admin/users?page=1&pageSize=50&includeTestData=1&search=%40example.com`,
    { cookieJar },
  );
  logStep("GET /api/admin/users?page=1&pageSize=50&includeTestData=1&search=%40example.com", result);
  assertStatus(result, [200], "list qa users");

  const users = Array.isArray(result.payload?.data)
    ? result.payload.data
    : Array.isArray(result.payload?.users)
      ? result.payload.users
      : [];
  const qaUser = users.find((item) => {
    const email = String(item?.email || "").toLowerCase();
    return email.endsWith("@example.com");
  });
  if (!qaUser?.id) {
    throw new Error("no QA user found for marketing target test");
  }
  return String(qaUser.id);
}

async function runMarketingRoundtrip(backendBaseUrl, cookieJar, suffix, qaUserId) {
  const campaignName = `OPS Campaign ${suffix}`;

  const createCampaign = await requestJson(`${backendBaseUrl}/api/admin/marketing/campaigns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: campaignName,
      description: "QA reversible marketing campaign",
      type: "email",
      status: "draft",
      targetSegment: "qa",
      budget: 100,
      emailBudget: 50,
      pushBudget: 25,
      bannerBudget: 15,
      discountBudget: 10,
    }),
    cookieJar,
  });
  logStep("POST /api/admin/marketing/campaigns", createCampaign);
  assertStatus(createCampaign, [200, 201], "create marketing campaign");
  const campaignId = String(createCampaign.payload?.campaign?.id || "");
  if (!campaignId) {
    throw new Error("create marketing campaign did not return campaign.id");
  }

  const updateCampaign = await requestJson(`${backendBaseUrl}/api/admin/marketing/campaigns/${campaignId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status: "active",
      spent: 12,
    }),
    cookieJar,
  });
  logStep(`PATCH /api/admin/marketing/campaigns/${campaignId}`, updateCampaign);
  assertStatus(updateCampaign, [200], "update marketing campaign");

  const addTarget = await requestJson(`${backendBaseUrl}/api/admin/marketing/campaigns/${campaignId}/targets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userIds: [qaUserId],
    }),
    cookieJar,
  });
  logStep(`POST /api/admin/marketing/campaigns/${campaignId}/targets`, addTarget);
  assertStatus(addTarget, [200, 201], "add marketing target user");

  const updateTarget = await requestJson(
    `${backendBaseUrl}/api/admin/marketing/campaigns/${campaignId}/targets/${qaUserId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "sent",
        target: qaUserId,
      }),
      cookieJar,
    },
  );
  logStep(`PATCH /api/admin/marketing/campaigns/${campaignId}/targets/${qaUserId}`, updateTarget);
  assertStatus(updateTarget, [200], "update marketing target status");

  const today = new Date().toISOString().slice(0, 10);
  const saveAnalytics = await requestJson(`${backendBaseUrl}/api/admin/marketing/campaigns/${campaignId}/analytics`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dateKey: today,
      data: {
        sent: 10,
        opened: 6,
        clicked: 3,
        converted: 1,
        revenue: 5,
        openRate: 0.6,
        clickRate: 0.3,
        conversionRate: 0.1,
      },
    }),
    cookieJar,
  });
  logStep(`POST /api/admin/marketing/campaigns/${campaignId}/analytics`, saveAnalytics);
  assertStatus(saveAnalytics, [200, 201], "save marketing analytics");

  const updateBudget = await requestJson(`${backendBaseUrl}/api/admin/marketing/campaigns/${campaignId}/budget`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      totalBudget: 120,
      spent: 15,
    }),
    cookieJar,
  });
  logStep(`PATCH /api/admin/marketing/campaigns/${campaignId}/budget`, updateBudget);
  assertStatus(updateBudget, [200], "update marketing budget");

  const deleteCampaign = await requestJson(`${backendBaseUrl}/api/admin/marketing/campaigns/${campaignId}`, {
    method: "DELETE",
    cookieJar,
  });
  logStep(`DELETE /api/admin/marketing/campaigns/${campaignId}`, deleteCampaign);
  assertStatus(deleteCampaign, [200], "delete marketing campaign");
}

async function runOrdersGuardChecks(backendBaseUrl, cookieJar, qaUserId, suffix) {
  const fakeOrderId = `ops-nonexistent-order-${suffix}`;

  const refund = await requestJson(`${backendBaseUrl}/api/admin/orders/refund`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: qaUserId,
      orderId: fakeOrderId,
    }),
    cookieJar,
  });
  logStep("POST /api/admin/orders/refund (guard check)", refund);
  assertStatus(refund, [409, 404], "orders refund guard");

  const adjustNegative = await requestJson(`${backendBaseUrl}/api/admin/orders/adjust`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: qaUserId,
      paidDelta: -1,
      bonusDelta: 0,
    }),
    cookieJar,
  });
  logStep("POST /api/admin/orders/adjust (negative delta guard)", adjustNegative);
  assertStatus(adjustNegative, [400], "orders adjust negative guard");

  const removeNonexistent = await requestJson(`${backendBaseUrl}/api/admin/orders/${fakeOrderId}`, {
    method: "DELETE",
    cookieJar,
  });
  logStep(`DELETE /api/admin/orders/${fakeOrderId} (nonexistent guard)`, removeNonexistent);
  assertStatus(removeNonexistent, [404], "orders delete nonexistent guard");
}

async function run() {
  if (process.env.OPS_ADMIN_WRITE_ALLOWED !== "1") {
    throw new Error("refusing to run without OPS_ADMIN_WRITE_ALLOWED=1");
  }

  const backendBaseUrl = normalizeBaseUrl(process.env.BACKEND_URL);
  if (!backendBaseUrl) {
    throw new Error("BACKEND_URL is required");
  }

  const adminEmail = String(process.env.OPS_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "").trim();
  const adminPassword = String(process.env.OPS_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "").trim();
  const adminKey = String(process.env.OPS_ADMIN_KEY || process.env.ADMIN_KEY || "").trim();
  if (!(adminEmail && adminPassword) && !adminKey) {
    throw new Error("admin credentials required");
  }

  const cookieJar = {};
  const credentials =
    adminEmail && adminPassword
      ? { email: adminEmail, password: adminPassword }
      : { adminKey };
  const suffix = Date.now().toString(36);

  await login(backendBaseUrl, cookieJar, credentials);
  try {
    const qaUserId = await getQaUserId(backendBaseUrl, cookieJar);
    await runMarketingRoundtrip(backendBaseUrl, cookieJar, suffix, qaUserId);
    await runOrdersGuardChecks(backendBaseUrl, cookieJar, qaUserId, suffix);
  } finally {
    await logout(backendBaseUrl, cookieJar);
  }

  console.log("[ops-admin-sensitive] sensitive admin write smoke passed");
}

run().catch((error) => {
  console.error(
    `[ops-admin-sensitive] fatal=${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});

