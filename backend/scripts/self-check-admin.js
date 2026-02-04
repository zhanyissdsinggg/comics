const DEFAULT_BASE_URL = "http://localhost:4000/api";
const fs = require("fs");
const path = require("path");

function buildUrl(baseUrl, pathValue) {
  return `${baseUrl.replace(/\/$/, "")}${pathValue}`;
}

async function requestJson(baseUrl, pathValue, options = {}) {
  const url = buildUrl(baseUrl, pathValue);
  const headers = Object.assign(
    { "content-type": "application/json" },
    options.headers || {}
  );
  const response = await fetch(url, { ...options, headers });
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
    console.log(label, result.status, result.data && typeof result.data === "object" ? "ok" : "empty");
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
    console.warn("[self-check-admin] mkdir failed", err);
  }
  const file = path.join(dir, `${prefix}-${ts}.json`);
  const payload = { generatedAt: new Date().toISOString(), items: report };
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), "utf8");
  console.log(`[self-check-admin] report saved: ${file}`);
  return payload;
}

async function run() {
  const baseUrl = process.env.API_BASE_URL || DEFAULT_BASE_URL;
  const adminKey = process.env.ADMIN_KEY || "admin";
  const keyParam = `?key=${encodeURIComponent(adminKey)}`;
  const report = [];
  console.log(`[self-check-admin] baseUrl=${baseUrl}`);

  let step = await stepResult("[admin/stats]", async () =>
    requestJson(baseUrl, `/admin/stats${keyParam}`, { method: "GET" })
  );
  report.push(step.record);

  step = await stepResult("[admin/rankings day]", async () =>
    requestJson(baseUrl, `/admin/rankings${keyParam}&range=day&type=all`, { method: "GET" })
  );
  report.push(step.record);

  step = await stepResult("[admin/rankings week]", async () =>
    requestJson(baseUrl, `/admin/rankings${keyParam}&range=week&type=all`, { method: "GET" })
  );
  report.push(step.record);

  step = await stepResult("[admin/users]", async () =>
    requestJson(baseUrl, `/admin/users${keyParam}`, { method: "GET" })
  );
  report.push(step.record);

  step = await stepResult("[admin/orders]", async () =>
    requestJson(baseUrl, `/admin/orders${keyParam}`, { method: "GET" })
  );
  report.push(step.record);

  step = await stepResult("[admin/promotions]", async () =>
    requestJson(baseUrl, `/admin/promotions${keyParam}`, { method: "GET" })
  );
  report.push(step.record);

  step = await stepResult("[admin/promotions defaults]", async () =>
    requestJson(baseUrl, `/admin/promotions/defaults${keyParam}`, { method: "GET" })
  );
  report.push(step.record);

  step = await stepResult("[admin/tracking]", async () =>
    requestJson(baseUrl, `/admin/tracking${keyParam}`, { method: "GET" })
  );
  report.push(step.record);

  const trackingData = step.result?.data?.config || { values: {}, updatedAt: null };
  const nextTracking = {
    values: { ...trackingData.values, selfCheck: Date.now() },
  };
  step = await stepResult("[admin/tracking update]", async () =>
    requestJson(
      baseUrl,
      `/admin/tracking${keyParam}`,
      { method: "POST", body: JSON.stringify(nextTracking) }
    )
  );
  report.push(step.record);

  await stepResult("[admin/tracking rollback]", async () =>
    requestJson(
      baseUrl,
      `/admin/tracking${keyParam}`,
      { method: "POST", body: JSON.stringify({ values: trackingData.values || {} }) }
    )
  ).then((res) => report.push(res.record));

  step = await stepResult("[admin/billing topups]", async () =>
    requestJson(baseUrl, `/admin/billing/topups${keyParam}`, { method: "GET" })
  );
  report.push(step.record);

  const topups = Array.isArray(step.result?.data?.packages) ? step.result.data.packages : [];
  if (topups.length > 0) {
    const target = topups[0];
    const originalLabel = target.label || "";
    const id = target.packageId || target.id;
    if (id) {
      await stepResult("[admin/billing topups update]", async () =>
        requestJson(
          baseUrl,
          `/admin/billing/topups/${encodeURIComponent(id)}${keyParam}`,
          { method: "PATCH", body: JSON.stringify({ label: `${originalLabel} [self-check]` }) }
        )
      ).then((res) => report.push(res.record));

      await stepResult("[admin/billing topups rollback]", async () =>
        requestJson(
          baseUrl,
          `/admin/billing/topups/${encodeURIComponent(id)}${keyParam}`,
          { method: "PATCH", body: JSON.stringify({ label: originalLabel }) }
        )
      ).then((res) => report.push(res.record));
    }
  }

  step = await stepResult("[admin/billing plans]", async () =>
    requestJson(baseUrl, `/admin/billing/plans${keyParam}`, { method: "GET" })
  );
  report.push(step.record);

  const plans = Array.isArray(step.result?.data?.plans) ? step.result.data.plans : [];
  if (plans.length > 0) {
    const targetPlan = plans[0];
    const planId = targetPlan.id;
    const originalLabel = targetPlan.label || "";
    if (planId) {
      await stepResult("[admin/billing plans update]", async () =>
        requestJson(
          baseUrl,
          `/admin/billing/plans/${encodeURIComponent(planId)}${keyParam}`,
          { method: "PATCH", body: JSON.stringify({ label: `${originalLabel} [self-check]` }) }
        )
      ).then((res) => report.push(res.record));

      await stepResult("[admin/billing plans rollback]", async () =>
        requestJson(
          baseUrl,
          `/admin/billing/plans/${encodeURIComponent(planId)}${keyParam}`,
          { method: "PATCH", body: JSON.stringify({ label: originalLabel }) }
        )
      ).then((res) => report.push(res.record));
    }
  }

  const promoId = `self_check_${Date.now()}`;
  step = await stepResult("[admin/promotions create]", async () =>
    requestJson(
      baseUrl,
      `/admin/promotions${keyParam}`,
      {
        method: "POST",
        body: JSON.stringify({
          promotion: {
            id: promoId,
            title: "Self Check Promo",
            type: "SELF_CHECK",
            active: false,
            description: "self check temporary promo",
          },
        }),
      }
    )
  );
  report.push(step.record);

  step = await stepResult("[admin/promotions delete]", async () =>
    requestJson(baseUrl, `/admin/promotions/${encodeURIComponent(promoId)}${keyParam}`, { method: "DELETE" })
  );
  report.push(step.record);

  step = await stepResult("[admin/series]", async () =>
    requestJson(baseUrl, `/admin/series${keyParam}`, { method: "GET" })
  );
  report.push(step.record);

  step = await stepResult("[admin/notifications]", async () =>
    requestJson(baseUrl, `/admin/notifications${keyParam}`, { method: "GET" })
  );
  report.push(step.record);

  step = await stepResult("[admin/comments]", async () =>
    requestJson(baseUrl, `/admin/comments${keyParam}`, { method: "GET" })
  );
  report.push(step.record);

  return writeReport(report, "self-check-admin");
}

run().catch((err) => {
  console.error("[self-check-admin] failed", err);
  process.exit(1);
});
