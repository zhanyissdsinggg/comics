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

function normalizeCommit(value) {
  return String(value || "").trim().toLowerCase();
}

function commitMatches(actual, expected) {
  const left = normalizeCommit(actual);
  const right = normalizeCommit(expected);
  if (!left || !right) {
    return false;
  }
  return left.startsWith(right) || right.startsWith(left);
}

async function timedFetch(url, headers = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json,text/html",
        ...headers,
      },
    });
    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return {
      ok: response.ok,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      json,
      text,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      headers: {},
      json: null,
      text: "",
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, headers = {}, attempts = DEFAULT_RETRY_ATTEMPTS) {
  const maxAttempts = Number.isFinite(attempts) && attempts > 0 ? Math.floor(attempts) : 1;
  let lastResult = null;
  for (let index = 1; index <= maxAttempts; index += 1) {
    const result = await timedFetch(url, headers);
    lastResult = result;
    if (result.ok || result.status > 0) {
      return result;
    }
    if (index < maxAttempts) {
      await sleep(DEFAULT_RETRY_INTERVAL_MS);
    }
  }
  return lastResult || { ok: false, status: 0, headers: {}, json: null, text: "", error: "fetch failed" };
}

function readHeader(headers, key) {
  return String(headers?.[String(key || "").toLowerCase()] || "").trim();
}

async function run() {
  const backendUrl = normalizeBaseUrl(process.env.BACKEND_URL);
  const frontendUrl = normalizeBaseUrl(process.env.FRONTEND_URL);
  const expectedBackendCommit = normalizeCommit(process.env.EXPECT_BACKEND_COMMIT);
  const expectedFrontendCommit = normalizeCommit(process.env.EXPECT_FRONTEND_COMMIT);

  if (!backendUrl) {
    throw new Error("BACKEND_URL is required");
  }
  if (!frontendUrl) {
    throw new Error("FRONTEND_URL is required");
  }
  if (!expectedBackendCommit || !expectedFrontendCommit) {
    throw new Error("EXPECT_BACKEND_COMMIT and EXPECT_FRONTEND_COMMIT are required");
  }

  const failures = [];

  const backendVersion = await fetchWithRetry(`${backendUrl}/api/meta/version`);
  if (!backendVersion.ok) {
    failures.push(
      `backend version probe failed: status=${backendVersion.status}, error=${backendVersion.error || "n/a"}`,
    );
  }

  const backendCommit = String(backendVersion.json?.commit || "").trim();
  if (!commitMatches(backendCommit, expectedBackendCommit)) {
    failures.push(
      `backend commit mismatch: expected=${expectedBackendCommit}, actual=${backendCommit || "unknown"}`,
    );
  }

  const frontendIdentity = await fetchWithRetry(`${frontendUrl}/`);
  if (!frontendIdentity.ok) {
    failures.push(
      `frontend probe failed: status=${frontendIdentity.status}, error=${frontendIdentity.error || "n/a"}`,
    );
  }

  const frontendCommit = readHeader(frontendIdentity.headers, "x-gush-frontend-revision");
  if (!commitMatches(frontendCommit, expectedFrontendCommit)) {
    failures.push(
      `frontend commit mismatch: expected=${expectedFrontendCommit}, actual=${frontendCommit || "unknown"}`,
    );
  }

  console.log(`[rollback-verify] backend expected=${expectedBackendCommit} actual=${backendCommit || "unknown"}`);
  console.log(`[rollback-verify] frontend expected=${expectedFrontendCommit} actual=${frontendCommit || "unknown"}`);

  if (failures.length > 0) {
    console.error("[rollback-verify] failed:");
    for (const failure of failures) {
      console.error(`[rollback-verify] - ${failure}`);
    }
    process.exit(1);
  }

  console.log("[rollback-verify] passed");
}

run().catch((error) => {
  console.error(`[rollback-verify] crashed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
