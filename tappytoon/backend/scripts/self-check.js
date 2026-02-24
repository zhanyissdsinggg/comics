const DEFAULT_BASE_URL = "http://localhost:4000/api";
const fs = require("fs");
const path = require("path");

function buildUrl(baseUrl, pathValue) {
  return `${baseUrl.replace(/\/$/, "")}${pathValue}`;
}

function extractCookies(response) {
  const jar = {};
  const header = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : response.headers.get("set-cookie")
      ? [response.headers.get("set-cookie")]
      : [];
  header
    .filter(Boolean)
    .forEach((cookieLine) => {
      const first = cookieLine.split(";")[0];
      const [name, value] = first.split("=");
      if (name) {
        jar[name.trim()] = value || "";
      }
    });
  return jar;
}

function mergeCookies(target, source) {
  Object.keys(source || {}).forEach((key) => {
    target[key] = source[key];
  });
}

function buildCookieHeader(jar) {
  return Object.entries(jar)
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
}

async function requestJson(baseUrl, pathValue, options = {}, jar = {}) {
  const url = buildUrl(baseUrl, pathValue);
  const headers = Object.assign(
    { "content-type": "application/json" },
    options.headers || {}
  );
  if (Object.keys(jar).length) {
    headers.cookie = buildCookieHeader(jar);
  }
  const response = await fetch(url, { ...options, headers });
  const cookies = extractCookies(response);
  mergeCookies(jar, cookies);
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (err) {
    data = { raw: text };
  }
  return { status: response.status, data };
}

async function withRetry(fn, retries = 2) {
  let lastErr = null;
  for (let i = 0; i <= retries; i += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  throw lastErr;
}

async function stepResult(label, fn) {
  const startedAt = Date.now();
  try {
    const result = await withRetry(fn);
    console.log(label, result);
    return {
      record: {
        ok: true,
        label,
        status: result?.status || 0,
        startedAt,
        endedAt: Date.now(),
      },
      result,
    };
  } catch (err) {
    console.log(label, "FAILED", err?.message || err);
    return {
      record: {
        ok: false,
        label,
        status: 0,
        startedAt,
        endedAt: Date.now(),
        error: err?.message || String(err),
      },
      result: null,
    };
  }
}

function writeReport(report, prefix) {
  const dir = process.env.REPORT_DIR || path.join(__dirname, "reports");
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    console.warn("[self-check] mkdir failed", err);
  }
  const file = path.join(dir, `${prefix}-${ts}.json`);
  const payload = { generatedAt: new Date().toISOString(), items: report };
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), "utf8");
  console.log(`[self-check] report saved: ${file}`);
  return payload;
}

async function run() {
  const baseUrl = process.env.API_BASE_URL || DEFAULT_BASE_URL;
  const jar = {};
  const report = [];
  console.log(`[self-check] baseUrl=${baseUrl}`);

  await new Promise((resolve) => setTimeout(resolve, 800));

  let step = await stepResult("[health]", async () => {
    const res = await requestJson(baseUrl, "/health", { method: "GET" }, jar);
    return { status: res.status, data: res.data };
  });
  report.push(step.record);

  const email = `check_${Date.now()}@example.com`;
  const password = "Password123!";
  step = await stepResult("[auth/register]", async () => {
    return requestJson(
      baseUrl,
      "/auth/register",
      { method: "POST", body: JSON.stringify({ email, password }) },
      jar
    );
  });
  report.push(step.record);
  let auth = step.result;
  if (auth && auth.status === 409) {
    step = await stepResult("[auth/login]", async () => {
      return requestJson(
        baseUrl,
        "/auth/login",
        { method: "POST", body: JSON.stringify({ email, password }) },
        jar
      );
    });
    report.push(step.record);
    auth = step.result;
  }
  if (auth) {
    console.log("[auth]", auth.status, auth.data);
  }

  step = await stepResult("[auth/me]", async () => {
    return requestJson(baseUrl, "/auth/me", { method: "GET" }, jar);
  });
  report.push(step.record);
  const me = step.result;
  if (me) {
    console.log("[me]", me.status, me.data);
  }

  step = await stepResult("[wallet]", async () => {
    return requestJson(baseUrl, "/wallet", { method: "GET" }, jar);
  });
  report.push(step.record);
  const wallet = step.result;
  if (wallet) {
    console.log("[wallet]", wallet.status, wallet.data);
  }

  step = await stepResult("[promotions]", async () => {
    return requestJson(baseUrl, "/promotions", { method: "GET" }, jar);
  });
  report.push(step.record);
  const promotions = step.result;
  if (promotions) {
    console.log(
      "[promotions]",
      promotions.status,
      Array.isArray(promotions.data?.promotions) ? promotions.data.promotions.length : 0
    );
  }

  step = await stepResult("[series]", async () => {
    return requestJson(baseUrl, "/series", { method: "GET" }, jar);
  });
  report.push(step.record);
  const seriesList = step.result;
  if (!seriesList || !Array.isArray(seriesList.data?.series) || seriesList.data.series.length === 0) {
    console.log("[self-check] no series found, stop.");
    return writeReport(report, "self-check");
  }
  const series =
    seriesList.data.series.find((item) => item && item.adult === false) ||
    seriesList.data.series[0];

  const detailPath = series?.adult
    ? `/series/${series.id}?adult=1`
    : `/series/${series.id}`;
  step = await stepResult("[series detail]", async () => {
    return requestJson(baseUrl, detailPath, { method: "GET" }, jar);
  });
  report.push(step.record);
  const detail = step.result;
  if (detail) {
    console.log("[series detail]", detail.status, detail.data?.series?.id || "");
  }

  const episodes = detail?.data?.episodes || [];
  const first = episodes[0];
  const second = episodes[1] || first;
  if (!first) {
    console.log("[self-check] no episodes found, stop.");
    return writeReport(report, "self-check");
  }

  step = await stepResult("[entitlements]", async () => {
    return requestJson(
      baseUrl,
      `/entitlements?seriesId=${encodeURIComponent(series.id)}`,
      { method: "GET" },
      jar
    );
  });
  report.push(step.record);
  const entitlement = step.result;
  if (entitlement) {
    console.log(
      "[entitlements]",
      entitlement.status,
      entitlement.data?.entitlement?.unlockedEpisodeIds?.length || 0
    );
  }

  step = await stepResult("[wallet/topup]", async () => {
    return requestJson(
      baseUrl,
      "/wallet/topup",
      { method: "POST", body: JSON.stringify({ packageId: "starter" }) },
      jar
    );
  });
  report.push(step.record);
  const topup = step.result;
  if (topup) {
    console.log("[topup]", topup.status, topup.data?.wallet?.paidPts || 0);
  }

  step = await stepResult("[entitlements unlock]", async () => {
    return requestJson(
      baseUrl,
      "/entitlements",
      {
        method: "POST",
        body: JSON.stringify({
          seriesId: series.id,
          episodeId: first.id,
          method: "WALLET",
          idempotencyKey: `unlock_${Date.now()}`,
        }),
      },
      jar
    );
  });
  report.push(step.record);
  const unlock = step.result;
  if (unlock) {
    console.log("[unlock]", unlock.status, unlock.data?.entitlement?.unlockedEpisodeIds?.length || 0);
  }

  step = await stepResult("[missions/report]", async () => {
    return requestJson(
      baseUrl,
      "/missions/report",
      { method: "POST", body: JSON.stringify({ eventType: "READ_EPISODE" }) },
      jar
    );
  });
  report.push(step.record);

  step = await stepResult("[missions]", async () => {
    return requestJson(baseUrl, "/missions", { method: "GET" }, jar);
  });
  report.push(step.record);
  const missions = step.result;
  if (missions) {
    console.log("[missions]", missions.status);
  }

  step = await stepResult("[rewards]", async () => {
    return requestJson(baseUrl, "/rewards", { method: "GET" }, jar);
  });
  report.push(step.record);
  const rewards = step.result;
  if (rewards) {
    console.log("[rewards]", rewards.status, rewards.data?.streakCount || 0);
  }

  step = await stepResult("[follow]", async () => {
    return requestJson(
      baseUrl,
      "/follow",
      { method: "POST", body: JSON.stringify({ seriesId: series.id, action: "FOLLOW" }) },
      jar
    );
  });
  report.push(step.record);

  step = await stepResult("[comments]", async () => {
    return requestJson(
      baseUrl,
      "/comments",
      { method: "POST", body: JSON.stringify({ seriesId: series.id, text: "Nice!" }) },
      jar
    );
  });
  report.push(step.record);

  step = await stepResult("[ratings]", async () => {
    return requestJson(
      baseUrl,
      "/ratings",
      { method: "POST", body: JSON.stringify({ seriesId: series.id, rating: 5 }) },
      jar
    );
  });
  report.push(step.record);

  step = await stepResult("[progress update]", async () => {
    return requestJson(
      baseUrl,
      "/progress/update",
      { method: "POST", body: JSON.stringify({ seriesId: series.id, lastEpisodeId: first.id, percent: 0.35 }) },
      jar
    );
  });
  report.push(step.record);

  step = await stepResult("[bookmarks add]", async () => {
    return requestJson(
      baseUrl,
      "/bookmarks",
      {
        method: "POST",
        body: JSON.stringify({
          seriesId: series.id,
          bookmark: { episodeId: first.id, percent: 0.2, pageIndex: 1, label: "Mark" },
        }),
      },
      jar
    );
  });
  report.push(step.record);

  step = await stepResult("[history add]", async () => {
    return requestJson(
      baseUrl,
      "/history",
      {
        method: "POST",
        body: JSON.stringify({ seriesId: series.id, episodeId: first.id, title: first.title, percent: 0.2 }),
      },
      jar
    );
  });
  report.push(step.record);

  step = await stepResult("[episode]", async () => {
    return requestJson(
      baseUrl,
      `/episode?seriesId=${encodeURIComponent(series.id)}&episodeId=${encodeURIComponent(first.id)}`,
      { method: "GET" },
      jar
    );
  });
  report.push(step.record);

  step = await stepResult("[search/log]", async () => {
    return requestJson(
      baseUrl,
      "/search/log",
      { method: "POST", body: JSON.stringify({ query: series.title || "test" }) },
      jar
    );
  });
  report.push(step.record);

  step = await stepResult("[search]", async () => {
    return requestJson(baseUrl, `/search?q=${encodeURIComponent(series.title || "test")}`, { method: "GET" }, jar);
  });
  report.push(step.record);

  step = await stepResult("[search/suggest]", async () => {
    return requestJson(baseUrl, `/search/suggest?q=${encodeURIComponent(series.title || "test")}`, { method: "GET" }, jar);
  });
  report.push(step.record);

  step = await stepResult("[search/hot]", async () => {
    return requestJson(baseUrl, "/search/hot", { method: "GET" }, jar);
  });
  report.push(step.record);

  step = await stepResult("[coupons/list]", async () => {
    return requestJson(baseUrl, "/coupons", { method: "GET" }, jar);
  });
  report.push(step.record);

  step = await stepResult("[coupons/claim]", async () => {
    return requestJson(
      baseUrl,
      "/coupons",
      { method: "POST", body: JSON.stringify({ code: "HOLIDAY10" }) },
      jar
    );
  });
  report.push(step.record);

  step = await stepResult("[orders]", async () => {
    return requestJson(baseUrl, "/orders", { method: "GET" }, jar);
  });
  report.push(step.record);

  step = await stepResult("[rankings]", async () => {
    return requestJson(baseUrl, "/rankings?type=popular", { method: "GET" }, jar);
  });
  report.push(step.record);

  step = await stepResult("[notifications]", async () => {
    return requestJson(baseUrl, "/notifications", { method: "GET" }, jar);
  });
  report.push(step.record);

  step = await stepResult("[subscription]", async () => {
    return requestJson(
      baseUrl,
      "/subscription",
      { method: "POST", body: JSON.stringify({ planId: "basic" }) },
      jar
    );
  });
  report.push(step.record);
  const subscribe = step.result;
  if (subscribe) {
    console.log("[subscription]", subscribe.status);
  }

  step = await stepResult("[subscription/cancel]", async () => {
    return requestJson(baseUrl, "/subscription", { method: "DELETE" }, jar);
  });
  report.push(step.record);

  step = await stepResult("[entitlements pack]", async () => {
    return requestJson(
      baseUrl,
      "/entitlements",
      {
        method: "POST",
        body: JSON.stringify({
          seriesId: series.id,
          method: "PACK",
          offerId: "unlock_pack_3",
          episodeIds: [first.id, second.id],
          idempotencyKey: `pack_${Date.now()}`,
        }),
      },
      jar
    );
  });
  report.push(step.record);

  step = await stepResult("[orders/reconcile]", async () => {
    return requestJson(baseUrl, "/orders/reconcile", { method: "POST", body: "{}" }, jar);
  });
  report.push(step.record);

  step = await stepResult("[logout]", async () => {
    return requestJson(baseUrl, "/auth/logout", { method: "POST", body: "{}" }, jar);
  });
  report.push(step.record);

  return writeReport(report, "self-check");
}

run().catch((err) => {
  console.error("[self-check] failed", err);
  process.exit(1);
});
