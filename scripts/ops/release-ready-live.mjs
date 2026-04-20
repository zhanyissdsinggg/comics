import { spawn } from "node:child_process";
import process from "node:process";
import { writeFileSync } from "node:fs";

const DEFAULT_LIVE_URL = "https://www.gushcomics.com";
const DEFAULT_REPORT_JSON = "ops-release-ready-report.json";
const DEFAULT_REPORT_MD = "ops-release-ready-report.md";

function hasAdminCredentials(env) {
  const email = String(env.OPS_ADMIN_EMAIL || env.ADMIN_EMAIL || "").trim();
  const password = String(env.OPS_ADMIN_PASSWORD || env.ADMIN_PASSWORD || "").trim();
  const adminKey = String(env.OPS_ADMIN_KEY || env.ADMIN_KEY || "").trim();
  return Boolean((email && password) || adminKey);
}

function runNpmScript(scriptName, env) {
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === "win32";
    const command = isWindows ? "cmd.exe" : "npm";
    const args = isWindows ? ["/d", "/s", "/c", `npm run ${scriptName}`] : ["run", scriptName];
    const startedAt = Date.now();

    console.log(`[release-ready] start ${scriptName}`);
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: false,
      env,
    });

    child.on("error", (error) => reject(error));
    child.on("exit", (code) => {
      const durationMs = Date.now() - startedAt;
      if (code === 0) {
        console.log(`[release-ready] pass ${scriptName} (${durationMs}ms)`);
        resolve();
        return;
      }
      reject(new Error(`${scriptName} failed (exit=${code}, durationMs=${durationMs})`));
    });
  });
}

function readRetryTimes() {
  const parsed = Number(process.env.OPS_RELEASE_RETRY_TIMES || "1");
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 1;
  }
  return Math.floor(parsed);
}

function readRequireFull() {
  return String(process.env.OPS_RELEASE_REQUIRE_FULL || "").trim() === "1";
}

function createReportBase(input) {
  return {
    timestamp: new Date().toISOString(),
    backendUrl: input.backendUrl,
    frontendUrl: input.frontendUrl,
    retryTimes: input.retryTimes,
    requireFull: input.requireFull,
    hasObservabilityKey: input.hasObs,
    hasAdminCredentials: input.hasAdmin,
    baseline: { status: "pending", error: null },
    full: { status: "pending", error: null },
    verdict: "pending",
  };
}

function writeReportFiles(report) {
  const jsonPath = String(process.env.OPS_RELEASE_REPORT_JSON || DEFAULT_REPORT_JSON).trim() || DEFAULT_REPORT_JSON;
  const mdPath = String(process.env.OPS_RELEASE_REPORT_MD || DEFAULT_REPORT_MD).trim() || DEFAULT_REPORT_MD;
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const lines = [
    "# Live Release Ready Report",
    "",
    `- timestamp: ${report.timestamp}`,
    `- backend: ${report.backendUrl}`,
    `- frontend: ${report.frontendUrl}`,
    `- retryTimes: ${report.retryTimes}`,
    `- requireFull: ${report.requireFull ? "yes" : "no"}`,
    `- hasObservabilityKey: ${report.hasObservabilityKey ? "yes" : "no"}`,
    `- hasAdminCredentials: ${report.hasAdminCredentials ? "yes" : "no"}`,
    `- baseline: ${report.baseline.status}`,
    `- full: ${report.full.status}`,
    `- verdict: ${report.verdict}`,
  ];

  if (report.baseline.error) {
    lines.push(`- baselineError: ${report.baseline.error}`);
  }
  if (report.full.error) {
    lines.push(`- fullError: ${report.full.error}`);
  }

  writeFileSync(mdPath, `${lines.join("\n")}\n`, "utf8");
  console.log(`[release-ready] report json=${jsonPath}`);
  console.log(`[release-ready] report md=${mdPath}`);
}

async function runWithRetry(scriptName, env, retryTimes) {
  let attempt = 0;
  let lastError = null;
  while (attempt <= retryTimes) {
    attempt += 1;
    try {
      if (attempt > 1) {
        console.warn(`[release-ready] retry ${scriptName} attempt=${attempt}/${retryTimes + 1}`);
      }
      await runNpmScript(scriptName, env);
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[release-ready] fail ${scriptName} attempt=${attempt}/${retryTimes + 1} reason=${message}`);
      if (attempt > retryTimes) {
        throw lastError;
      }
    }
  }
}

async function main() {
  const backendUrl = String(process.env.BACKEND_URL || "").trim() || DEFAULT_LIVE_URL;
  const frontendUrl = String(process.env.FRONTEND_URL || "").trim() || DEFAULT_LIVE_URL;
  const env = {
    ...process.env,
    BACKEND_URL: backendUrl,
    FRONTEND_URL: frontendUrl,
  };

  const hasObs = Boolean(String(env.OBSERVABILITY_KEY || "").trim());
  const hasAdmin = hasAdminCredentials(env);
  const retryTimes = readRetryTimes();
  const requireFull = readRequireFull();
  const report = createReportBase({ backendUrl, frontendUrl, retryTimes, requireFull, hasObs, hasAdmin });

  console.log(`[release-ready] backend=${backendUrl}`);
  console.log(`[release-ready] frontend=${frontendUrl}`);
  console.log(`[release-ready] hasObservabilityKey=${hasObs ? "yes" : "no"}`);
  console.log(`[release-ready] hasAdminCredentials=${hasAdmin ? "yes" : "no"}`);
  console.log(`[release-ready] retryTimes=${retryTimes}`);
  console.log(`[release-ready] requireFull=${requireFull ? "yes" : "no"}`);

  try {
    await runWithRetry("ops:deploy-gate:strict:live", env, retryTimes);
    report.baseline.status = "pass";
  } catch (error) {
    report.baseline.status = "fail";
    report.baseline.error = error instanceof Error ? error.message : String(error);
    report.verdict = "fail";
    writeReportFiles(report);
    throw error;
  }

  if (hasObs && hasAdmin) {
    console.log("[release-ready] prerequisites met, running full strict deploy gate");
    try {
      await runWithRetry("ops:deploy-gate:strict:full", env, retryTimes);
      report.full.status = "pass";
    } catch (error) {
      report.full.status = "fail";
      report.full.error = error instanceof Error ? error.message : String(error);
      report.verdict = "fail";
      writeReportFiles(report);
      throw error;
    }
  } else if (requireFull) {
    const message = "full strict deploy gate required but missing OBSERVABILITY_KEY or admin credentials";
    report.full.status = "skipped";
    report.full.error = message;
    report.verdict = "fail";
    writeReportFiles(report);
    throw new Error(message);
  } else {
    report.full.status = "skipped";
    console.warn(
      "[release-ready] full strict deploy gate skipped (requires OBSERVABILITY_KEY + admin credentials).",
    );
  }

  report.verdict = "pass";
  writeReportFiles(report);
  console.log("[release-ready] live release gate passed");
}

main().catch((error) => {
  console.error(`[release-ready] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
