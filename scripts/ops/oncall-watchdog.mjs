import fs from "node:fs";
import process from "node:process";

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_P1_ERROR_RATE_PCT = 1;
const DEFAULT_P1_P95_MS = 2_000;
const DEFAULT_P2_ERROR_RATE_PCT = 0.5;
const DEFAULT_P2_P95_MS = 1_200;
const DEFAULT_P3_ERROR_RATE_PCT = 0.2;
const DEFAULT_P3_P95_MS = 800;

const SEVERITY_RANK = {
  OK: 0,
  P3: 1,
  P2: 2,
  P1: 3,
};

function readNumber(name, fallback) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function normalizeBaseUrl(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "";
  }
  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

function maxSeverity(current, next) {
  return SEVERITY_RANK[next] > SEVERITY_RANK[current] ? next : current;
}

async function fetchJson(url, headers = {}) {
  const timeoutMs = readNumber("WATCHDOG_TIMEOUT_MS", DEFAULT_TIMEOUT_MS);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...headers,
      },
    });
    const durationMs = Date.now() - startedAt;
    let body = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    return {
      ok: response.ok,
      status: response.status,
      durationMs,
      body,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      durationMs: Date.now() - startedAt,
      body: null,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

function buildMarkdownReport(payload) {
  const lines = [];
  lines.push("# OPS Watchdog Report");
  lines.push("");
  lines.push(`- Time: ${payload.time}`);
  lines.push(`- Backend: ${payload.backendUrl}`);
  lines.push(`- Severity: ${payload.severity}`);
  lines.push(`- Status: ${payload.status}`);
  lines.push("");
  lines.push("## Signals");
  lines.push("");
  lines.push(`- Error rate: ${payload.signals.errorRatePct.toFixed(2)}%`);
  lines.push(`- Slow rate: ${payload.signals.slowRatePct.toFixed(2)}%`);
  lines.push(`- Latency p95: ${payload.signals.p95Ms}ms`);
  lines.push(`- Latency p99: ${payload.signals.p99Ms}ms`);
  lines.push(`- Redis connected: ${payload.signals.redisConnected}`);
  lines.push("");
  lines.push("## Breaches");
  lines.push("");
  if (payload.breaches.length === 0) {
    lines.push("- None");
  } else {
    for (const item of payload.breaches) {
      lines.push(`- [${item.severity}] ${item.message}`);
    }
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

async function run() {
  const backendUrl = normalizeBaseUrl(process.env.BACKEND_URL);
  if (!backendUrl) {
    throw new Error("BACKEND_URL is required");
  }

  const observabilityKey = String(process.env.OBSERVABILITY_KEY || "").trim();
  const requireRedis = process.env.WATCHDOG_REQUIRE_REDIS === "1";
  const jsonPath = String(process.env.WATCHDOG_REPORT_JSON || "ops-watchdog-report.json").trim();
  const mdPath = String(process.env.WATCHDOG_REPORT_MD || "ops-watchdog-report.md").trim();

  const thresholds = {
    p1: {
      errorRatePct: readNumber("WATCHDOG_P1_ERROR_RATE_PCT", DEFAULT_P1_ERROR_RATE_PCT),
      p95Ms: readNumber("WATCHDOG_P1_P95_MS", DEFAULT_P1_P95_MS),
    },
    p2: {
      errorRatePct: readNumber("WATCHDOG_P2_ERROR_RATE_PCT", DEFAULT_P2_ERROR_RATE_PCT),
      p95Ms: readNumber("WATCHDOG_P2_P95_MS", DEFAULT_P2_P95_MS),
    },
    p3: {
      errorRatePct: readNumber("WATCHDOG_P3_ERROR_RATE_PCT", DEFAULT_P3_ERROR_RATE_PCT),
      p95Ms: readNumber("WATCHDOG_P3_P95_MS", DEFAULT_P3_P95_MS),
    },
  };

  const headers = {};
  if (observabilityKey) {
    headers["x-observability-key"] = observabilityKey;
  }

  const result = await fetchJson(`${backendUrl}/api/meta/observability`, headers);
  let severity = "OK";
  const breaches = [];
  let status = "ok";

  const payload = {
    time: new Date().toISOString(),
    backendUrl,
    severity: "OK",
    status,
    thresholds,
    signals: {
      errorRatePct: 0,
      slowRatePct: 0,
      p95Ms: 0,
      p99Ms: 0,
      redisConnected: false,
    },
    breaches,
  };

  if (!result.ok || !result.body || typeof result.body !== "object") {
    severity = "P1";
    status = "failed";
    breaches.push({
      severity: "P1",
      message: `observability endpoint unavailable: status=${result.status}, error=${result.error || "n/a"}`,
    });
  } else {
    const errorRatePct = Number(result.body?.requests?.errorRatePct || 0);
    const slowRatePct = Number(result.body?.requests?.slowRatePct || 0);
    const p95Ms = Number(result.body?.latencyMs?.p95 || 0);
    const p99Ms = Number(result.body?.latencyMs?.p99 || 0);
    const redisConnected = Boolean(result.body?.redis?.connected);

    payload.signals = {
      errorRatePct,
      slowRatePct,
      p95Ms,
      p99Ms,
      redisConnected,
    };

    if (errorRatePct >= thresholds.p1.errorRatePct || p95Ms >= thresholds.p1.p95Ms) {
      severity = maxSeverity(severity, "P1");
      breaches.push({
        severity: "P1",
        message: `errorRate=${errorRatePct.toFixed(2)}%, p95=${p95Ms}ms`,
      });
    } else if (errorRatePct >= thresholds.p2.errorRatePct || p95Ms >= thresholds.p2.p95Ms) {
      severity = maxSeverity(severity, "P2");
      breaches.push({
        severity: "P2",
        message: `errorRate=${errorRatePct.toFixed(2)}%, p95=${p95Ms}ms`,
      });
    } else if (errorRatePct >= thresholds.p3.errorRatePct || p95Ms >= thresholds.p3.p95Ms) {
      severity = maxSeverity(severity, "P3");
      breaches.push({
        severity: "P3",
        message: `errorRate=${errorRatePct.toFixed(2)}%, p95=${p95Ms}ms`,
      });
    }

    if (requireRedis && !redisConnected) {
      severity = maxSeverity(severity, "P2");
      breaches.push({
        severity: "P2",
        message: "redis is not connected while WATCHDOG_REQUIRE_REDIS=1",
      });
    }
  }

  payload.severity = severity;
  payload.status = severity === "OK" ? "ok" : "failed";

  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2));
  fs.writeFileSync(mdPath, buildMarkdownReport(payload));

  console.log(`[watchdog] severity=${payload.severity}`);
  console.log(`[watchdog] report json=${jsonPath}`);
  console.log(`[watchdog] report md=${mdPath}`);

  if (payload.severity !== "OK") {
    process.exit(1);
  }
}

run().catch((error) => {
  console.error("[watchdog] crashed", error);
  process.exit(1);
});
