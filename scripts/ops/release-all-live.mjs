import { spawn } from "node:child_process";
import process from "node:process";
import { existsSync, readFileSync } from "node:fs";

const DEFAULT_SUMMARY_JSON_PATH = "ops-release-summary.json";

function runNpmScript(scriptName, env) {
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === "win32";
    const command = isWindows ? "cmd.exe" : "npm";
    const args = isWindows ? ["/d", "/s", "/c", `npm run ${scriptName}`] : ["run", scriptName];
    const startedAt = Date.now();

    console.log(`[release-all] start ${scriptName}`);
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: false,
      env,
    });

    child.on("error", (error) => reject(error));
    child.on("exit", (code) => {
      const durationMs = Date.now() - startedAt;
      if (code === 0) {
        console.log(`[release-all] pass ${scriptName} (${durationMs}ms)`);
        resolve();
        return;
      }
      reject(new Error(`${scriptName} failed (exit=${code}, durationMs=${durationMs})`));
    });
  });
}

function readSummaryVerdict() {
  const path = String(process.env.OPS_RELEASE_SUMMARY_JSON || DEFAULT_SUMMARY_JSON_PATH).trim() || DEFAULT_SUMMARY_JSON_PATH;
  if (!existsSync(path)) {
    return { verdict: "UNKNOWN", path, reason: "summary file not found" };
  }
  try {
    const payload = JSON.parse(readFileSync(path, "utf8"));
    return { verdict: String(payload?.verdict || "UNKNOWN"), path, reason: null };
  } catch (error) {
    return {
      verdict: "UNKNOWN",
      path,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  const env = { ...process.env };
  await runNpmScript("ops:release:ready-live", env);
  await runNpmScript("ops:release:summary", env);

  const summary = readSummaryVerdict();
  console.log(`[release-all] summary verdict=${summary.verdict} path=${summary.path}`);
  if (summary.reason) {
    console.warn(`[release-all] summary parse warning: ${summary.reason}`);
  }
}

main().catch((error) => {
  console.error(`[release-all] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
