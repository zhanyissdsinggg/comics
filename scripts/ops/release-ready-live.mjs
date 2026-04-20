import { spawn } from "node:child_process";
import process from "node:process";

const DEFAULT_LIVE_URL = "https://www.gushcomics.com";

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

  console.log(`[release-ready] backend=${backendUrl}`);
  console.log(`[release-ready] frontend=${frontendUrl}`);
  console.log(`[release-ready] hasObservabilityKey=${hasObs ? "yes" : "no"}`);
  console.log(`[release-ready] hasAdminCredentials=${hasAdmin ? "yes" : "no"}`);
  console.log(`[release-ready] retryTimes=${retryTimes}`);

  await runWithRetry("ops:deploy-gate:strict:live", env, retryTimes);

  if (hasObs && hasAdmin) {
    console.log("[release-ready] prerequisites met, running full strict deploy gate");
    await runWithRetry("ops:deploy-gate:strict:full", env, retryTimes);
  } else {
    console.warn(
      "[release-ready] full strict deploy gate skipped (requires OBSERVABILITY_KEY + admin credentials).",
    );
  }

  console.log("[release-ready] live release gate passed");
}

main().catch((error) => {
  console.error(`[release-ready] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
