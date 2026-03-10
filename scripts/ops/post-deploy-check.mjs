import process from "node:process";

const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_ROUNDS = 3;
const DEFAULT_INTERVAL_MS = 3_000;
const DEFAULT_MAX_ENDPOINT_P95_MS = 1_500;
const DEFAULT_MAX_FRONTEND_P95_MS = 1_800;
const DEFAULT_MAX_OBS_ERROR_RATE_PCT = 2;
const DEFAULT_MAX_OBS_P95_MS = 1_200;

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

function ensureLeadingSlash(path) {
  const raw = String(path || "").trim();
  if (!raw) {
    return "/";
  }
  return raw.startsWith("/") ? raw : `/${raw}`;
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

function commitMatches(actual, expected) {
  const left = String(actual || "").trim().toLowerCase();
  const right = String(expected || "").trim().toLowerCase();
  if (!left || !right) {
    return false;
  }
  return left.startsWith(right) || right.startsWith(left);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function timedFetch(url, options = {}) {
  const timeoutMs = readNumber("OPS_REQUEST_TIMEOUT_MS", DEFAULT_REQUEST_TIMEOUT_MS);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
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

async function run() {
  const backendBaseUrl = normalizeBaseUrl(process.env.BACKEND_URL);
  const frontendBaseUrl = normalizeBaseUrl(process.env.FRONTEND_URL);
  const expectedBackendCommit = String(process.env.EXPECT_BACKEND_COMMIT || "").trim();
  const observabilityKey = String(process.env.OBSERVABILITY_KEY || "").trim();
  const observabilityRequired = process.env.OBS_REQUIRED === "1";

  if (!backendBaseUrl) {
    throw new Error("BACKEND_URL is required");
  }

  const rounds = readNumber("OPS_ROUNDS", DEFAULT_ROUNDS);
  const intervalMs = readNumber("OPS_INTERVAL_MS", DEFAULT_INTERVAL_MS);
  const maxEndpointP95Ms = readNumber("OPS_MAX_ENDPOINT_P95_MS", DEFAULT_MAX_ENDPOINT_P95_MS);
  const maxFrontendP95Ms = readNumber("OPS_MAX_FRONTEND_P95_MS", DEFAULT_MAX_FRONTEND_P95_MS);
  const maxObsErrorRatePct = readNumber(
    "OPS_MAX_OBS_ERROR_RATE_PCT",
    DEFAULT_MAX_OBS_ERROR_RATE_PCT,
  );
  const maxObsP95Ms = readNumber("OPS_MAX_OBS_P95_MS", DEFAULT_MAX_OBS_P95_MS);

  const frontendRoutes = String(process.env.FRONTEND_ROUTES || "/,/search,/store,/admin/login")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map(ensureLeadingSlash);

  const backendPaths = [
    "/api/health/live",
    "/api/health/ready",
    "/api/health/detail",
    "/api/meta/version",
  ];

  const latencyByRoute = new Map();
  const failures = [];
  let latestVersion = null;

  console.log(`[ops] post-deploy verification started (rounds=${rounds})`);
  console.log(`[ops] backend=${backendBaseUrl}`);
  if (frontendBaseUrl) {
    console.log(`[ops] frontend=${frontendBaseUrl}`);
  }
  if (expectedBackendCommit) {
    console.log(`[ops] expected backend commit=${expectedBackendCommit}`);
  }

  for (let round = 1; round <= rounds; round += 1) {
    console.log(`[ops] round ${round}/${rounds}`);

    for (const path of backendPaths) {
      const routeKey = `backend ${path}`;
      const url = `${backendBaseUrl}${path}`;
      const result = await timedFetch(url);

      if (!latencyByRoute.has(routeKey)) {
        latencyByRoute.set(routeKey, []);
      }
      latencyByRoute.get(routeKey).push(result.durationMs);

      if (!result.ok) {
        failures.push(
          `${routeKey} failed: status=${result.status}, durationMs=${result.durationMs}, error=${
            result.error || "n/a"
          }`,
        );
      } else {
        console.log(`[ops] ${routeKey} -> ${result.status} (${result.durationMs}ms)`);
      }

      if (path === "/api/meta/version" && result.body && typeof result.body === "object") {
        latestVersion = result.body;
      }
    }

    if (frontendBaseUrl) {
      for (const route of frontendRoutes) {
        const routeKey = `frontend ${route}`;
        const url = `${frontendBaseUrl}${route}`;
        const result = await timedFetch(url, {
          headers: {
            Accept: "text/html",
          },
        });

        if (!latencyByRoute.has(routeKey)) {
          latencyByRoute.set(routeKey, []);
        }
        latencyByRoute.get(routeKey).push(result.durationMs);

        if (!result.ok) {
          failures.push(
            `${routeKey} failed: status=${result.status}, durationMs=${result.durationMs}, error=${
              result.error || "n/a"
            }`,
          );
        } else {
          console.log(`[ops] ${routeKey} -> ${result.status} (${result.durationMs}ms)`);
        }
      }
    }

    if (round < rounds) {
      await sleep(intervalMs);
    }
  }

  for (const [routeKey, samples] of latencyByRoute.entries()) {
    const p95 = percentile(samples, 95);
    const threshold = routeKey.startsWith("frontend ") ? maxFrontendP95Ms : maxEndpointP95Ms;
    if (p95 > threshold) {
      failures.push(`${routeKey} p95=${p95}ms exceeds threshold ${threshold}ms`);
    }
    console.log(
      `[ops] latency ${routeKey}: p50=${percentile(samples, 50)}ms p95=${p95}ms p99=${percentile(
        samples,
        99,
      )}ms`,
    );
  }

  if (expectedBackendCommit) {
    const actualCommit = String(latestVersion?.commit || "").trim();
    if (!commitMatches(actualCommit, expectedBackendCommit)) {
      failures.push(
        `backend commit mismatch: expected=${expectedBackendCommit}, actual=${actualCommit || "unknown"}`,
      );
    } else {
      console.log(`[ops] backend commit matched: ${actualCommit}`);
    }
  }

  const observabilityHeaders = {};
  if (observabilityKey) {
    observabilityHeaders["x-observability-key"] = observabilityKey;
  }
  const observabilityResult = await timedFetch(`${backendBaseUrl}/api/meta/observability`, {
    headers: observabilityHeaders,
  });

  if (!observabilityResult.ok) {
    const message = `observability check skipped/failed: status=${observabilityResult.status}, error=${
      observabilityResult.error || "n/a"
    }`;
    if (observabilityRequired) {
      failures.push(message);
    } else {
      console.warn(`[ops] ${message}`);
    }
  } else if (observabilityResult.body && typeof observabilityResult.body === "object") {
    const errorRatePct = Number(observabilityResult.body?.requests?.errorRatePct || 0);
    const obsP95 = Number(observabilityResult.body?.latencyMs?.p95 || 0);
    console.log(
      `[ops] observability: errorRatePct=${errorRatePct.toFixed(
        2,
      )}, p95=${obsP95}ms, redis=${String(observabilityResult.body?.redis?.status || "unknown")}`,
    );

    if (errorRatePct > maxObsErrorRatePct) {
      failures.push(
        `observability errorRatePct ${errorRatePct.toFixed(
          2,
        )}% exceeds threshold ${maxObsErrorRatePct}%`,
      );
    }
    if (obsP95 > maxObsP95Ms) {
      failures.push(
        `observability latency p95 ${obsP95}ms exceeds threshold ${maxObsP95Ms}ms`,
      );
    }
  }

  if (failures.length > 0) {
    console.error("[ops] post-deploy verification failed:");
    for (const failure of failures) {
      console.error(`[ops] - ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("[ops] post-deploy verification passed");
}

run().catch((error) => {
  console.error("[ops] post-deploy verification crashed", error);
  process.exit(1);
});
