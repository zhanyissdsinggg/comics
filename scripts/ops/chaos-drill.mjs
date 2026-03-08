import { spawnSync } from "node:child_process";
import process from "node:process";

function runCommand(command, env = {}) {
  console.log(`[chaos] run: ${command}`);
  const result = spawnSync(command, {
    shell: true,
    stdio: "inherit",
    env: {
      ...process.env,
      ...env,
    },
  });

  if (result.status !== 0) {
    throw new Error(`command failed (${result.status}): ${command}`);
  }
}

function normalizeBaseUrl(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "";
  }
  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

function run() {
  const backendUrl = normalizeBaseUrl(process.env.BACKEND_URL);
  const frontendUrl = normalizeBaseUrl(process.env.FRONTEND_URL);

  console.log("[chaos] starting non-destructive resilience drill");

  runCommand("npm --prefix backend run test -- src/health.controller.spec.ts --runInBand --passWithNoTests");

  if (!backendUrl) {
    console.log("[chaos] BACKEND_URL not provided, skipped live probes");
    console.log("[chaos] drill passed (local-only mode)");
    return;
  }

  const postDeployEnv = {
    BACKEND_URL: backendUrl,
    FRONTEND_URL: frontendUrl,
    OPS_ROUNDS: process.env.OPS_ROUNDS || "1",
    OPS_INTERVAL_MS: process.env.OPS_INTERVAL_MS || "2000",
    OPS_MAX_ENDPOINT_P95_MS: process.env.OPS_MAX_ENDPOINT_P95_MS || "1800",
    OPS_MAX_OBS_ERROR_RATE_PCT: process.env.OPS_MAX_OBS_ERROR_RATE_PCT || "2",
    OPS_MAX_OBS_P95_MS: process.env.OPS_MAX_OBS_P95_MS || "1500",
    OBSERVABILITY_KEY: process.env.OBSERVABILITY_KEY || "",
    OBS_REQUIRED: process.env.OBS_REQUIRED || "0",
  };
  runCommand("node scripts/ops/post-deploy-check.mjs", postDeployEnv);

  const loadTargets =
    process.env.LOAD_TARGETS ||
    `${backendUrl}/api/health,${backendUrl}/api/health/ready,${backendUrl}/api/meta/version`;

  const loadEnv = {
    LOAD_TARGETS: loadTargets,
    LOAD_DURATION_SEC: process.env.LOAD_DURATION_SEC || "15",
    LOAD_CONCURRENCY: process.env.LOAD_CONCURRENCY || "12",
    LOAD_TIMEOUT_MS: process.env.LOAD_TIMEOUT_MS || "5000",
    LOAD_MAX_ERROR_RATE_PCT: process.env.LOAD_MAX_ERROR_RATE_PCT || "1",
    LOAD_MAX_P95_MS: process.env.LOAD_MAX_P95_MS || "1800",
  };
  runCommand("node scripts/ops/load-smoke.mjs", loadEnv);

  console.log("[chaos] drill passed");
}

try {
  run();
} catch (error) {
  console.error("[chaos] drill failed", error);
  process.exit(1);
}
