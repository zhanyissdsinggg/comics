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
  const parts = [`[ops-admin-content] ${step}`, `status=${result.status}`, `durationMs=${result.durationMs}`];
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

async function ensureSeriesDeleted(backendBaseUrl, cookieJar, seriesId) {
  if (!seriesId) {
    return;
  }
  const deleteSeries = await requestJson(`${backendBaseUrl}/api/admin/series/${seriesId}`, {
    method: "DELETE",
    cookieJar,
  });
  logStep(`DELETE /api/admin/series/${seriesId} (cleanup)`, deleteSeries);
  if (![200, 404].includes(deleteSeries.status)) {
    throw new Error(`cleanup series delete failed: ${deleteSeries.status}`);
  }
}

async function runSeriesEpisodeCreditsRoundtrip(backendBaseUrl, cookieJar, suffix) {
  const seriesId = `ops-series-${suffix}`;
  const episodeOneId = `${seriesId}-e1`;
  const episodeTwoId = `${seriesId}-e2`;

  const createSeries = await requestJson(`${backendBaseUrl}/api/admin/series`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      series: {
        id: seriesId,
        title: `OPS Series ${suffix}`,
        type: "comic",
        description: "Reversible ops smoke series",
        isPublished: true,
        genres: ["Action", "Fantasy"],
      },
    }),
    cookieJar,
  });
  logStep("POST /api/admin/series", createSeries);
  assertStatus(createSeries, [200, 201], "create series");

  const updateSeries = await requestJson(`${backendBaseUrl}/api/admin/series/${seriesId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      series: {
        title: `OPS Series ${suffix} Updated`,
        status: "Ongoing",
        coverTone: "#112233",
        author: `Ops Author ${suffix}`,
      },
    }),
    cookieJar,
  });
  logStep(`PATCH /api/admin/series/${seriesId}`, updateSeries);
  assertStatus(updateSeries, [200], "update series");

  const updateCredits = await requestJson(`${backendBaseUrl}/api/admin/series/${seriesId}/credits`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      credits: [
        {
          name: `Ops Writer ${suffix}`,
          role: "writer",
          type: "person",
          sortOrder: 0,
          isPrimary: true,
          isPublic: true,
        },
        {
          name: `Ops Studio ${suffix}`,
          role: "studio",
          type: "studio",
          sortOrder: 1,
          isPrimary: false,
          isPublic: true,
        },
      ],
    }),
    cookieJar,
  });
  logStep(`PATCH /api/admin/series/${seriesId}/credits`, updateCredits);
  assertStatus(updateCredits, [200], "update series credits");

  const fetchCredits = await requestJson(`${backendBaseUrl}/api/admin/series/${seriesId}/credits`, {
    cookieJar,
  });
  logStep(`GET /api/admin/series/${seriesId}/credits`, fetchCredits);
  assertStatus(fetchCredits, [200], "get series credits");

  const createEpisodeOne = await requestJson(`${backendBaseUrl}/api/admin/series/${seriesId}/episodes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      episode: {
        id: episodeOneId,
        number: 1,
        title: "OPS Episode 1",
        releasedAt: new Date().toISOString(),
        pricePts: 0,
        previewFreePages: 3,
        ttfEligible: false,
      },
    }),
    cookieJar,
  });
  logStep(`POST /api/admin/series/${seriesId}/episodes (e1)`, createEpisodeOne);
  assertStatus(createEpisodeOne, [200, 201], "create episode one");

  const createEpisodeTwo = await requestJson(`${backendBaseUrl}/api/admin/series/${seriesId}/episodes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      episode: {
        id: episodeTwoId,
        number: 2,
        title: "OPS Episode 2",
        releasedAt: new Date().toISOString(),
        pricePts: 10,
        previewFreePages: 1,
        ttfEligible: true,
      },
    }),
    cookieJar,
  });
  logStep(`POST /api/admin/series/${seriesId}/episodes (e2)`, createEpisodeTwo);
  assertStatus(createEpisodeTwo, [200, 201], "create episode two");

  const updateEpisodeTwo = await requestJson(`${backendBaseUrl}/api/admin/series/${seriesId}/episodes/${episodeTwoId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      episode: {
        title: "OPS Episode 2 Updated",
        pricePts: 5,
        previewFreePages: 2,
      },
    }),
    cookieJar,
  });
  logStep(`PATCH /api/admin/series/${seriesId}/episodes/${episodeTwoId}`, updateEpisodeTwo);
  assertStatus(updateEpisodeTwo, [200], "update episode two");

  const reorderEpisodes = await requestJson(`${backendBaseUrl}/api/admin/series/${seriesId}/episodes/reorder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [
        { id: episodeOneId, number: 2 },
        { id: episodeTwoId, number: 1 },
      ],
    }),
    cookieJar,
  });
  logStep(`POST /api/admin/series/${seriesId}/episodes/reorder`, reorderEpisodes);
  assertStatus(reorderEpisodes, [200, 201], "reorder episodes");

  const listEpisodes = await requestJson(`${backendBaseUrl}/api/admin/series/${seriesId}/episodes?page=1&pageSize=20`, {
    cookieJar,
  });
  logStep(`GET /api/admin/series/${seriesId}/episodes`, listEpisodes);
  assertStatus(listEpisodes, [200], "list episodes");

  const deleteEpisodeOne = await requestJson(`${backendBaseUrl}/api/admin/series/${seriesId}/episodes/${episodeOneId}`, {
    method: "DELETE",
    cookieJar,
  });
  logStep(`DELETE /api/admin/series/${seriesId}/episodes/${episodeOneId}`, deleteEpisodeOne);
  assertStatus(deleteEpisodeOne, [200], "delete episode one");

  const deleteEpisodeTwo = await requestJson(`${backendBaseUrl}/api/admin/series/${seriesId}/episodes/${episodeTwoId}`, {
    method: "DELETE",
    cookieJar,
  });
  logStep(`DELETE /api/admin/series/${seriesId}/episodes/${episodeTwoId}`, deleteEpisodeTwo);
  assertStatus(deleteEpisodeTwo, [200], "delete episode two");

  const deleteSeries = await requestJson(`${backendBaseUrl}/api/admin/series/${seriesId}`, {
    method: "DELETE",
    cookieJar,
  });
  logStep(`DELETE /api/admin/series/${seriesId}`, deleteSeries);
  assertStatus(deleteSeries, [200], "delete series");
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
  const seriesId = `ops-series-${suffix}`;

  await login(backendBaseUrl, cookieJar, credentials);
  try {
    await runSeriesEpisodeCreditsRoundtrip(backendBaseUrl, cookieJar, suffix);
  } finally {
    await ensureSeriesDeleted(backendBaseUrl, cookieJar, seriesId);
    await logout(backendBaseUrl, cookieJar);
  }

  console.log("[ops-admin-content] content write smoke passed");
}

run().catch((error) => {
  console.error(
    `[ops-admin-content] fatal=${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
