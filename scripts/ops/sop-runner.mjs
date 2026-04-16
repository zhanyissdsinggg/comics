import { spawn } from "node:child_process";
import process from "node:process";

const PROFILES = {
  daily: [
    "ops:admin-ui-live",
    "ops:admin-smoke",
    "ops:admin-write-smoke",
  ],
  deploy: [
    "ops:deploy-gate:strict:full",
    "ops:admin-high-risk-write-smoke",
    "ops:admin-sensitive-write-smoke",
    "ops:admin-content-write-smoke",
  ],
  weekly: [
    "ops:admin-routes",
    "ops:admin-schema-audit",
    "ops:load-smoke",
    "ops:chaos-drill",
    "ops:rollback-verify",
  ],
};

const DEFAULT_RETRY_TIMES = 1;

function readProfileArg() {
  const profile = String(process.argv[2] || "").trim().toLowerCase();
  if (!profile || !Object.prototype.hasOwnProperty.call(PROFILES, profile)) {
    const available = Object.keys(PROFILES).join(", ");
    throw new Error(`invalid profile. usage: node scripts/ops/sop-runner.mjs <${available}>`);
  }
  return profile;
}

function readRetryTimes() {
  const parsed = Number(process.env.OPS_SOP_RETRY_TIMES ?? DEFAULT_RETRY_TIMES);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_RETRY_TIMES;
  }
  return Math.floor(parsed);
}

function runNpmScript(scriptName) {
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === "win32";
    const command = isWindows ? "cmd.exe" : "npm";
    const args = isWindows ? ["/d", "/s", "/c", `npm run ${scriptName}`] : ["run", scriptName];
    const startedAt = Date.now();

    console.log(`[ops-sop] start ${scriptName}`);
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: false,
      env: process.env,
    });

    child.on("error", (error) => reject(error));
    child.on("exit", (code) => {
      const durationMs = Date.now() - startedAt;
      if (code === 0) {
        console.log(`[ops-sop] pass ${scriptName} (${durationMs}ms)`);
        resolve();
        return;
      }
      reject(new Error(`script failed: ${scriptName} (exit=${code}, durationMs=${durationMs})`));
    });
  });
}

async function runWithRetry(scriptName, retryTimes) {
  let attempt = 0;
  let lastError = null;

  while (attempt <= retryTimes) {
    attempt += 1;
    try {
      if (attempt > 1) {
        console.warn(`[ops-sop] retry ${scriptName} attempt=${attempt}/${retryTimes + 1}`);
      }
      await runNpmScript(scriptName);
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[ops-sop] fail ${scriptName} attempt=${attempt}/${retryTimes + 1} reason=${message}`);
      if (attempt > retryTimes) {
        throw lastError;
      }
    }
  }
}

async function run() {
  const profile = readProfileArg();
  const retryTimes = readRetryTimes();
  const scripts = PROFILES[profile];
  console.log(`[ops-sop] profile=${profile} retryTimes=${retryTimes} scripts=${scripts.join(",")}`);

  for (const scriptName of scripts) {
    // Sequential execution keeps logs readable and avoids conflicting write probes.
    await runWithRetry(scriptName, retryTimes);
  }

  console.log(`[ops-sop] profile ${profile} passed`);
}

run().catch((error) => {
  console.error(`[ops-sop] fatal=${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
