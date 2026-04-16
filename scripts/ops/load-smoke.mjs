import process from "node:process";

const DEFAULT_DURATION_SEC = 30;
const DEFAULT_CONCURRENCY = 20;
const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_MAX_ERROR_RATE_PCT = 1;
const DEFAULT_MAX_P95_MS = 1_200;

function normalizeBaseUrl(value) {
  if (!value) {
    return "";
  }
  return String(value).trim().replace(/\/+$/, "");
}

function resolveTargets() {
  const explicitTargets = String(process.env.LOAD_TARGETS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (explicitTargets.length > 0) {
    return explicitTargets;
  }

  const backendBaseUrl = normalizeBaseUrl(process.env.BACKEND_URL);
  if (!backendBaseUrl) {
    throw new Error(
      "LOAD_TARGETS is required. You can also set BACKEND_URL to auto-use default targets: /api/health,/api/health/ready,/api/series?adult=0",
    );
  }

  const derivedTargets = [
    `${backendBaseUrl}/api/health`,
    `${backendBaseUrl}/api/health/ready`,
    `${backendBaseUrl}/api/series?adult=0`,
  ];
  console.log(`[load] LOAD_TARGETS not provided; using derived defaults from BACKEND_URL=${backendBaseUrl}`);
  return derivedTargets;
}

function readNumber(name, fallback) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function percentile(values, p) {
  if (!values.length) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length) - 1;
  const index = Math.max(0, Math.min(sorted.length - 1, rank));
  return sorted[index];
}

async function requestWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  try {
    const response = await fetch(url, { signal: controller.signal });
    return {
      ok: response.ok,
      status: response.status,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function runTarget(targetUrl, options) {
  const endAt = Date.now() + options.durationSec * 1_000;
  const latencies = [];
  let success = 0;
  let failure = 0;

  async function worker() {
    while (Date.now() < endAt) {
      const result = await requestWithTimeout(targetUrl, options.timeoutMs);
      latencies.push(result.latencyMs);
      if (result.ok) {
        success += 1;
      } else {
        failure += 1;
      }
    }
  }

  const workers = Array.from({ length: options.concurrency }, () => worker());
  await Promise.all(workers);

  const total = success + failure;
  const errorRatePct = total > 0 ? (failure / total) * 100 : 100;
  const rps = total / options.durationSec;

  return {
    targetUrl,
    success,
    failure,
    total,
    errorRatePct,
    rps,
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
  };
}

async function run() {
  const targets = resolveTargets();

  const options = {
    durationSec: readNumber("LOAD_DURATION_SEC", DEFAULT_DURATION_SEC),
    concurrency: readNumber("LOAD_CONCURRENCY", DEFAULT_CONCURRENCY),
    timeoutMs: readNumber("LOAD_TIMEOUT_MS", DEFAULT_TIMEOUT_MS),
    maxErrorRatePct: readNumber("LOAD_MAX_ERROR_RATE_PCT", DEFAULT_MAX_ERROR_RATE_PCT),
    maxP95Ms: readNumber("LOAD_MAX_P95_MS", DEFAULT_MAX_P95_MS),
  };

  console.log(
    `[load] start duration=${options.durationSec}s concurrency=${options.concurrency} timeout=${options.timeoutMs}ms`,
  );

  const failures = [];

  for (const target of targets) {
    const result = await runTarget(target, options);
    console.log(
      `[load] ${target} total=${result.total} success=${result.success} failure=${result.failure} errorRate=${result.errorRatePct.toFixed(
        2,
      )}% rps=${result.rps.toFixed(2)} p50=${result.p50}ms p95=${result.p95}ms p99=${result.p99}ms`,
    );

    if (result.total === 0) {
      failures.push(`${target} produced zero requests`);
      continue;
    }
    if (result.errorRatePct > options.maxErrorRatePct) {
      failures.push(
        `${target} errorRate ${result.errorRatePct.toFixed(
          2,
        )}% exceeds ${options.maxErrorRatePct}%`,
      );
    }
    if (result.p95 > options.maxP95Ms) {
      failures.push(`${target} p95 ${result.p95}ms exceeds ${options.maxP95Ms}ms`);
    }
  }

  if (failures.length > 0) {
    console.error("[load] load smoke failed:");
    for (const item of failures) {
      console.error(`[load] - ${item}`);
    }
    process.exit(1);
  }

  console.log("[load] load smoke passed");
}

run().catch((error) => {
  console.error("[load] crashed", error);
  process.exit(1);
});
