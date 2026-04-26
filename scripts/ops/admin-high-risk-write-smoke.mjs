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

function assertStatus(result, expected, step) {
  const expectedList = Array.isArray(expected) ? expected : [expected];
  if (!expectedList.includes(result.status)) {
    throw new Error(
      `${step} status mismatch: expected ${expectedList.join("/")}, got ${result.status}, body=${result.text}`,
    );
  }
}

function logStep(step, result) {
  const parts = [`[ops-admin-high-risk] ${step}`, `status=${result.status}`, `durationMs=${result.durationMs}`];
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

async function runRecommendationsRoundtrip(backendBaseUrl, cookieJar, suffix) {
  const slotName = `OPS SLOT ${suffix}`;
  const rankingName = `OPS RANK ${suffix}`;

  const createSlot = await requestJson(`${backendBaseUrl}/api/admin/recommendations/slots`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: slotName,
      seriesIds: ["series-001", "series-002"],
    }),
    cookieJar,
  });
  logStep("POST /api/admin/recommendations/slots", createSlot);
  assertStatus(createSlot, [200, 201], "create recommendation slot");
  const slotId = String(createSlot.payload?.slot?.id || "");
  if (!slotId) {
    throw new Error("create recommendation slot did not return slot.id");
  }

  const updateSlot = await requestJson(`${backendBaseUrl}/api/admin/recommendations/slots/${slotId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `${slotName} UPDATED`,
      seriesIds: ["series-003"],
    }),
    cookieJar,
  });
  logStep(`PATCH /api/admin/recommendations/slots/${slotId}`, updateSlot);
  assertStatus(updateSlot, [200], "update recommendation slot");

  const createRanking = await requestJson(`${backendBaseUrl}/api/admin/recommendations/rankings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: rankingName,
      rankingType: "POPULAR",
      timeRange: "WEEK",
      seriesType: "comic",
      adult: false,
      maxItems: 12,
      active: true,
    }),
    cookieJar,
  });
  logStep("POST /api/admin/recommendations/rankings", createRanking);
  assertStatus(createRanking, [200, 201], "create ranking config");
  const rankingId = String(createRanking.payload?.config?.id || "");
  if (!rankingId) {
    throw new Error("create ranking config did not return config.id");
  }

  const updateRanking = await requestJson(`${backendBaseUrl}/api/admin/recommendations/rankings/${rankingId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `${rankingName} UPDATED`,
      maxItems: 8,
      active: false,
    }),
    cookieJar,
  });
  logStep(`PATCH /api/admin/recommendations/rankings/${rankingId}`, updateRanking);
  assertStatus(updateRanking, [200], "update ranking config");

  const deleteRanking = await requestJson(`${backendBaseUrl}/api/admin/recommendations/rankings/${rankingId}`, {
    method: "DELETE",
    cookieJar,
  });
  logStep(`DELETE /api/admin/recommendations/rankings/${rankingId}`, deleteRanking);
  assertStatus(deleteRanking, [200], "delete ranking config");

  const deleteSlot = await requestJson(`${backendBaseUrl}/api/admin/recommendations/slots/${slotId}`, {
    method: "DELETE",
    cookieJar,
  });
  logStep(`DELETE /api/admin/recommendations/slots/${slotId}`, deleteSlot);
  assertStatus(deleteSlot, [200], "delete recommendation slot");
}

async function runPromotionsRoundtrip(backendBaseUrl, cookieJar, suffix) {
  const promoId = `ops-promo-${suffix}`;

  const createPromotion = await requestJson(`${backendBaseUrl}/api/admin/promotions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      promotion: {
        id: promoId,
        title: `OPS Promotion ${suffix}`,
        description: "QA smoke reversible promotion",
        type: "GENERIC",
        segment: "ALL",
        active: false,
        bonusMultiplier: 1,
        returningAfterDays: 7,
        autoGrant: false,
        ctaType: "STORE",
        ctaLabel: "View offer",
      },
    }),
    cookieJar,
  });
  logStep("POST /api/admin/promotions", createPromotion);
  assertStatus(createPromotion, [200, 201], "create promotion");

  const updatePromotion = await requestJson(`${backendBaseUrl}/api/admin/promotions/${promoId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      promotion: {
        title: `OPS Promotion ${suffix} Updated`,
        active: true,
      },
    }),
    cookieJar,
  });
  logStep(`PATCH /api/admin/promotions/${promoId}`, updatePromotion);
  assertStatus(updatePromotion, [200], "update promotion");

  const deletePromotion = await requestJson(`${backendBaseUrl}/api/admin/promotions/${promoId}`, {
    method: "DELETE",
    cookieJar,
  });
  logStep(`DELETE /api/admin/promotions/${promoId}`, deletePromotion);
  assertStatus(deletePromotion, [200], "delete promotion");
}

async function runBillingRoundtrip(backendBaseUrl, cookieJar, suffix) {
  const packageId = `ops_topup_${suffix}`;

  const createTopup = await requestJson(`${backendBaseUrl}/api/admin/billing/topups`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: packageId,
      name: `OPS Topup ${suffix}`,
      paidPts: 100,
      bonusPts: 10,
      price: 1.99,
      currency: "USD",
      active: true,
      label: "OPS",
      tags: ["ops", "smoke"],
    }),
    cookieJar,
  });
  logStep("POST /api/admin/billing/topups", createTopup);
  assertStatus(createTopup, [200, 201], "create billing topup");

  const updateTopup = await requestJson(`${backendBaseUrl}/api/admin/billing/topups/${packageId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      price: 2.49,
      currency: "USD",
      bonusPts: 20,
      active: false,
    }),
    cookieJar,
  });
  logStep(`PATCH /api/admin/billing/topups/${packageId}`, updateTopup);
  assertStatus(updateTopup, [200], "update billing topup");

  const deleteTopup = await requestJson(`${backendBaseUrl}/api/admin/billing/${packageId}`, {
    method: "DELETE",
    cookieJar,
  });
  logStep(`DELETE /api/admin/billing/${packageId}`, deleteTopup);
  assertStatus(deleteTopup, [200], "delete billing topup");

  const createPlan = await requestJson(`${backendBaseUrl}/api/admin/billing/plans`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: `ops-plan-${suffix}`,
      title: "OPS Plan",
    }),
    cookieJar,
  });
  logStep("POST /api/admin/billing/plans", createPlan);
  assertStatus(createPlan, [400], "create plan should be disabled");

  const updatePlan = await requestJson(`${backendBaseUrl}/api/admin/billing/plans/legacy`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "OPS Plan Updated",
    }),
    cookieJar,
  });
  logStep("PATCH /api/admin/billing/plans/legacy", updatePlan);
  assertStatus(updatePlan, [400], "update plan should be disabled");
}

async function run() {
  const backendBaseUrl = normalizeBaseUrl(process.env.BACKEND_URL);
  if (!backendBaseUrl) {
    throw new Error("BACKEND_URL is required");
  }
  ensureOpsWriteAllowed(backendBaseUrl);

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
    await runRecommendationsRoundtrip(backendBaseUrl, cookieJar, suffix);
    await runPromotionsRoundtrip(backendBaseUrl, cookieJar, suffix);
    await runBillingRoundtrip(backendBaseUrl, cookieJar, suffix);
  } finally {
    await logout(backendBaseUrl, cookieJar);
  }

  console.log("[ops-admin-high-risk] high-risk admin write smoke passed");
}

run().catch((error) => {
  console.error(
    `[ops-admin-high-risk] fatal=${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
import { ensureOpsWriteAllowed } from "./_write-guard.mjs";
