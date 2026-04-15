import process from "node:process";

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_INTERVAL_MS = 800;

function normalizeBaseUrl(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "";
  }
  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

function ensureHttps(url, allowHttp) {
  if (allowHttp) {
    return null;
  }
  if (!String(url).startsWith("https://")) {
    return `${url} is not HTTPS`;
  }
  return null;
}

async function fetchResponse(url, headers = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers,
    });
    return { ok: response.ok, status: response.status, headers: response.headers };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      headers: new Headers(),
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, headers = {}, attempts = DEFAULT_RETRY_ATTEMPTS) {
  const maxAttempts = Number.isFinite(attempts) && attempts > 0 ? Math.floor(attempts) : 1;
  let lastResult = null;
  for (let index = 1; index <= maxAttempts; index += 1) {
    const result = await fetchResponse(url, headers);
    lastResult = result;
    if (result.ok || result.status > 0) {
      return result;
    }
    if (index < maxAttempts) {
      await sleep(DEFAULT_RETRY_INTERVAL_MS);
    }
  }
  return lastResult || { ok: false, status: 0, headers: new Headers(), error: "fetch failed" };
}

function checkSecurityHeaders(scope, headers, failures, requireHsts) {
  const xContentTypeOptions = headers.get("x-content-type-options");
  const xFrameOptions = headers.get("x-frame-options");
  const referrerPolicy = headers.get("referrer-policy");
  const permissionsPolicy = headers.get("permissions-policy");
  const hsts = headers.get("strict-transport-security");
  const poweredBy = headers.get("x-powered-by");

  if (String(xContentTypeOptions || "").toLowerCase() !== "nosniff") {
    failures.push(`${scope} missing/invalid X-Content-Type-Options`);
  }
  if (!xFrameOptions) {
    failures.push(`${scope} missing X-Frame-Options`);
  }
  if (!referrerPolicy) {
    failures.push(`${scope} missing Referrer-Policy`);
  }
  if (!permissionsPolicy) {
    failures.push(`${scope} missing Permissions-Policy`);
  }
  if (requireHsts && !hsts) {
    failures.push(`${scope} missing Strict-Transport-Security`);
  }
  if (poweredBy) {
    failures.push(`${scope} should not expose X-Powered-By`);
  }
}

async function run() {
  const backendUrl = normalizeBaseUrl(process.env.BACKEND_URL);
  const frontendUrl = normalizeBaseUrl(process.env.FRONTEND_URL);
  const allowHttp = process.env.SEC_ALLOW_HTTP === "1";
  const requireHsts = process.env.SEC_REQUIRE_HSTS !== "0";
  const expectObsProtected = process.env.SEC_EXPECT_OBS_PROTECTED !== "0";
  const requireObservabilityEndpoint = process.env.SEC_REQUIRE_OBSERVABILITY_ENDPOINT === "1";

  if (!backendUrl || !frontendUrl) {
    throw new Error("BACKEND_URL and FRONTEND_URL are required");
  }

  const failures = [];
  const warnings = [];

  const backendHttpsError = ensureHttps(backendUrl, allowHttp);
  const frontendHttpsError = ensureHttps(frontendUrl, allowHttp);
  if (backendHttpsError) {
    failures.push(backendHttpsError);
  }
  if (frontendHttpsError) {
    failures.push(frontendHttpsError);
  }

  const backendHealth = await fetchWithRetry(`${backendUrl}/api/health`, {
    Accept: "application/json",
  });
  if (!backendHealth.ok) {
    failures.push(
      `backend health endpoint failed: status=${backendHealth.status}, error=${backendHealth.error || "n/a"}`,
    );
  } else {
    checkSecurityHeaders("backend /api/health", backendHealth.headers, failures, requireHsts);
  }

  const backendVersion = await fetchWithRetry(`${backendUrl}/api/meta/version`, {
    Accept: "application/json",
  });
  if (!backendVersion.ok) {
    failures.push(
      `backend meta version endpoint failed: status=${backendVersion.status}, error=${backendVersion.error || "n/a"}`,
    );
  } else {
    checkSecurityHeaders("backend /api/meta/version", backendVersion.headers, failures, requireHsts);
  }

  const frontendHome = await fetchWithRetry(`${frontendUrl}/`, {
    Accept: "text/html",
  });
  if (!frontendHome.ok) {
    failures.push(
      `frontend home endpoint failed: status=${frontendHome.status}, error=${frontendHome.error || "n/a"}`,
    );
  } else {
    checkSecurityHeaders("frontend /", frontendHome.headers, failures, requireHsts);
  }

  const observabilityWithoutKey = await fetchWithRetry(`${backendUrl}/api/meta/observability`, {
    Accept: "application/json",
  });
  if (!requireObservabilityEndpoint && observabilityWithoutKey.status === 404) {
    warnings.push("observability endpoint is not exposed (404); skipping observability access-policy check");
  } else if (expectObsProtected && observabilityWithoutKey.status !== 403) {
    failures.push(
      `observability endpoint should be protected (expected 403 without key, got ${observabilityWithoutKey.status})`,
    );
  } else if (!expectObsProtected && observabilityWithoutKey.status === 403) {
    warnings.push("observability endpoint is protected; set SEC_EXPECT_OBS_PROTECTED=1 if intended");
  }

  if (warnings.length > 0) {
    for (const warning of warnings) {
      console.warn(`[security-baseline] warning: ${warning}`);
    }
  }

  if (failures.length > 0) {
    console.error("[security-baseline] failed:");
    for (const failure of failures) {
      console.error(`[security-baseline] - ${failure}`);
    }
    process.exit(1);
  }

  console.log("[security-baseline] passed");
}

run().catch((error) => {
  console.error("[security-baseline] crashed", error);
  process.exit(1);
});
